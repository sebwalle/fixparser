/**
 * Relaxed FIX parser - accepts multiple delimiter formats
 *
 * This parser is forgiving and accepts:
 * - SOH (\x01) - standard FIX delimiter
 * - Pipe (|) - common in human-readable FIX
 * - Caret (^) - alternative delimiter
 *
 * All delimiters are normalized to SOH internally.
 */

import { ParsedMessage, ParsedField, MessageSummary } from '../types';
import { getTagName } from './dictionary';

const SOH = '\x01';

/**
 * Detects the delimiter used in the raw FIX message
 */
function detectDelimiter(raw: string): string {
  if (raw.includes(SOH)) return SOH;
  if (raw.includes('|')) return '|';
  if (raw.includes('^')) return '^';
  return SOH; // default
}

/**
 * Normalizes all delimiters to SOH
 */
function normalizeDelimiters(raw: string): string {
  const delimiter = detectDelimiter(raw);
  if (delimiter === SOH) return raw;

  return raw.split(delimiter).join(SOH);
}

/**
 * Extracts summary fields from parsed fields
 */
function extractSummary(fields: ParsedField[]): MessageSummary {
  const summary: MessageSummary = {};
  const fieldMap = new Map(fields.map((f) => [f.tag, f.value]));

  summary.msgType = fieldMap.get('35');
  summary.clOrdId = fieldMap.get('11');
  summary.orderId = fieldMap.get('37');
  summary.symbol = fieldMap.get('55');
  summary.side = fieldMap.get('54');
  summary.qty = fieldMap.get('38');
  summary.price = fieldMap.get('44');

  // TransType: prefer 60 (TransactTime), then 150 (ExecType), then 39 (OrdStatus)
  summary.transType = fieldMap.get('60') || fieldMap.get('150') || fieldMap.get('39');

  // OrdStatus: tag 39
  summary.ordStatus = fieldMap.get('39');

  // orderKey is the same as clOrdId (tag 11)
  summary.orderKey = summary.clOrdId;

  return summary;
}

/**
 * Calculates the order key from ClOrdID (tag 11)
 */
function calculateOrderKey(fields: ParsedField[]): string | undefined {
  const clOrdId = fields.find((f) => f.tag === '11');
  return clOrdId?.value;
}

/**
 * Generates warnings for unusual patterns
 */
function generateWarnings(raw: string, normalized: string, fields: ParsedField[]): string[] {
  const warnings: string[] = [];

  // Check if delimiter was normalized
  const originalDelimiter = detectDelimiter(raw);
  if (originalDelimiter !== SOH) {
    warnings.push(
      `Non-standard delimiter detected ('${originalDelimiter === '|' ? 'pipe' : 'caret'}') and normalized to SOH`
    );
  }

  // Check for missing standard header fields
  const fieldTags = new Set(fields.map((f) => f.tag));
  if (!fieldTags.has('8')) {
    warnings.push('Missing BeginString (tag 8)');
  }
  if (!fieldTags.has('35')) {
    warnings.push('Missing MsgType (tag 35)');
  }

  // Check for duplicate tags
  const tagCounts = new Map<string, number>();
  fields.forEach((f) => {
    tagCounts.set(f.tag, (tagCounts.get(f.tag) || 0) + 1);
  });
  tagCounts.forEach((count, tag) => {
    if (count > 1) {
      warnings.push(`Duplicate tag ${tag} appears ${count} times`);
    }
  });

  // Check for empty values
  const emptyFields = fields.filter((f) => f.value === '');
  if (emptyFields.length > 0) {
    warnings.push(
      `Empty values found in tags: ${emptyFields.map((f) => f.tag).join(', ')}`
    );
  }

  return warnings;
}

/**
 * Parses a FIX message with relaxed rules
 *
 * Accepts multiple delimiter formats and handles malformed messages gracefully.
 * Returns a parsed message structure with fields, summary, warnings, and metadata.
 */
export function parseRelaxed(raw: string): ParsedMessage {
  // Normalize delimiters to SOH
  const normalized = normalizeDelimiters(raw);

  // Split by SOH and parse each field
  const parts = normalized.split(SOH).filter((part) => part.length > 0);
  const fields: ParsedField[] = [];

  for (const part of parts) {
    const equalIndex = part.indexOf('=');
    if (equalIndex === -1) {
      // No equals sign - treat entire part as value with unknown tag
      fields.push({
        tag: '?',
        name: 'Unknown',
        value: part,
      });
      continue;
    }

    const tag = part.substring(0, equalIndex);
    const value = part.substring(equalIndex + 1);

    fields.push({
      tag,
      name: getTagName(tag),
      value,
    });
  }

  // Extract summary
  const summary = extractSummary(fields);

  // Calculate order key
  const orderKey = calculateOrderKey(fields);

  // Generate warnings
  const warnings = generateWarnings(raw, normalized, fields);

  return {
    fields,
    summary,
    warnings,
    orderKey,
    raw: normalized, // Store normalized version
  };
}
