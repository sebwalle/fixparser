/**
 * Strict FIX parser - validates FIX protocol compliance
 *
 * This parser only accepts properly formatted FIX messages with SOH delimiters
 * and validates the structure according to FIX protocol rules.
 */

import { ParsedMessage, ParseIssue } from '../types';
import { parseRelaxed } from './parser';

const SOH = '\x01';

/**
 * Result of strict parsing - either success or error with issues
 */
export type StrictParseResult =
  | { success: true; message: ParsedMessage }
  | { success: false; error: string; issues: ParseIssue[] };

/**
 * Validates that the message uses SOH delimiters
 */
function validateDelimiters(raw: string): ParseIssue[] {
  const issues: ParseIssue[] = [];

  // Check for pipe delimiters
  if (raw.includes('|')) {
    const positions = [];
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === '|') positions.push(i);
    }
    issues.push({
      type: 'invalid_delimiter',
      message: `Found pipe character ('|') instead of SOH. Use SOH (\\x01) as delimiter.`,
      position: positions[0],
    });
  }

  // Check for caret delimiters
  if (raw.includes('^')) {
    const positions = [];
    for (let i = 0; i < raw.length; i++) {
      if (raw[i] === '^') positions.push(i);
    }
    issues.push({
      type: 'invalid_delimiter',
      message: `Found caret character ('^') instead of SOH. Use SOH (\\x01) as delimiter.`,
      position: positions[0],
    });
  }

  return issues;
}

/**
 * Validates tag=value format for all fields
 */
function validateFormat(raw: string): ParseIssue[] {
  const issues: ParseIssue[] = [];
  const parts = raw.split(SOH).filter((part) => part.length > 0);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const equalIndex = part.indexOf('=');

    if (equalIndex === -1) {
      issues.push({
        type: 'missing_equals',
        message: `Field at position ${i} is missing '=' separator: "${part}"`,
        position: i,
      });
      continue;
    }

    const tag = part.substring(0, equalIndex);

    // Validate tag is numeric
    if (!/^\d+$/.test(tag)) {
      issues.push({
        type: 'invalid_tag',
        message: `Tag must be numeric, found: "${tag}"`,
        position: i,
      });
    }

    // Validate tag is not empty
    if (tag === '') {
      issues.push({
        type: 'empty_tag',
        message: `Empty tag at position ${i}`,
        position: i,
      });
    }
  }

  return issues;
}

/**
 * Validates required FIX header fields
 */
function validateRequiredFields(raw: string): ParseIssue[] {
  const issues: ParseIssue[] = [];
  const parts = raw.split(SOH).filter((part) => part.length > 0);
  const tags = new Set<string>();

  for (const part of parts) {
    const equalIndex = part.indexOf('=');
    if (equalIndex !== -1) {
      const tag = part.substring(0, equalIndex);
      tags.add(tag);
    }
  }

  // Check for required header fields
  const requiredTags = [
    { tag: '8', name: 'BeginString' },
    { tag: '9', name: 'BodyLength' },
    { tag: '35', name: 'MsgType' },
  ];

  for (const { tag, name } of requiredTags) {
    if (!tags.has(tag)) {
      issues.push({
        type: 'missing_required_field',
        message: `Missing required field: ${name} (tag ${tag})`,
      });
    }
  }

  return issues;
}

/**
 * Validates that BeginString is first and CheckSum is last (if present)
 */
function validateFieldOrder(raw: string): ParseIssue[] {
  const issues: ParseIssue[] = [];
  const parts = raw.split(SOH).filter((part) => part.length > 0);

  if (parts.length === 0) {
    return issues;
  }

  // Check if first field is BeginString (tag 8)
  const firstField = parts[0];
  if (firstField.startsWith('8=')) {
    // OK - correct order
  } else {
    const equalIndex = firstField.indexOf('=');
    const firstTag = equalIndex !== -1 ? firstField.substring(0, equalIndex) : '?';
    issues.push({
      type: 'invalid_field_order',
      message: `BeginString (tag 8) must be first field, found tag ${firstTag} first`,
      position: 0,
    });
  }

  // Check if last field is CheckSum (tag 10) if it exists
  const lastField = parts[parts.length - 1];
  const hasChecksum = raw.includes(`${SOH}10=`) || lastField.startsWith('10=');

  if (hasChecksum && !lastField.startsWith('10=')) {
    issues.push({
      type: 'invalid_field_order',
      message: `CheckSum (tag 10) must be last field if present`,
      position: parts.length - 1,
    });
  }

  return issues;
}

/**
 * Checks for whitespace issues
 */
function validateWhitespace(raw: string): ParseIssue[] {
  const issues: ParseIssue[] = [];

  // Check for leading/trailing whitespace in the entire message
  if (raw.startsWith(' ') || raw.startsWith('\t') || raw.startsWith('\n')) {
    issues.push({
      type: 'whitespace_issue',
      message: 'Message has leading whitespace',
      position: 0,
    });
  }

  if (raw.endsWith(' ') || raw.endsWith('\t') || raw.endsWith('\n')) {
    issues.push({
      type: 'whitespace_issue',
      message: 'Message has trailing whitespace',
      position: raw.length - 1,
    });
  }

  return issues;
}

/**
 * Parses a FIX message with strict validation
 *
 * Only accepts messages that conform to FIX protocol standards:
 * - SOH delimiters only
 * - tag=value format
 * - Required header fields present
 * - Proper field ordering
 *
 * Returns either a parsed message or an error with detailed issues.
 */
export function parseStrict(raw: string): StrictParseResult {
  const issues: ParseIssue[] = [];

  // Run all validations
  issues.push(...validateDelimiters(raw));
  issues.push(...validateFormat(raw));
  issues.push(...validateRequiredFields(raw));
  issues.push(...validateFieldOrder(raw));
  issues.push(...validateWhitespace(raw));

  // If any issues found, return error
  if (issues.length > 0) {
    return {
      success: false,
      error: `FIX message validation failed with ${issues.length} issue(s)`,
      issues,
    };
  }

  // No issues - parse with relaxed parser
  const message = parseRelaxed(raw);

  return {
    success: true,
    message,
  };
}
