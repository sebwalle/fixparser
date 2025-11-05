/**
 * FIX message repair suggestion engine
 *
 * Analyzes parse issues and generates actionable repair suggestions
 * with previews of the suggested changes.
 */

import { ParseIssue, RepairSuggestion } from '../types';

const SOH = '\x01';

/**
 * Generates repair suggestions based on parse issues
 */
export function generateRepairSuggestions(
  raw: string,
  issues: ParseIssue[]
): RepairSuggestion[] {
  const suggestions: RepairSuggestion[] = [];
  const issueTypes = new Set(issues.map((i) => i.type));

  // Delimiter normalization
  if (issueTypes.has('invalid_delimiter')) {
    const hasPipe = raw.includes('|');
    const hasCaret = raw.includes('^');

    if (hasPipe || hasCaret) {
      const delimiter = hasPipe ? '|' : '^';
      const delimiterName = hasPipe ? 'pipe' : 'caret';
      const preview = raw
        .split(delimiter)
        .join(SOH)
        .substring(0, 100);

      suggestions.push({
        type: 'normalize_delimiters',
        description: `Replace ${delimiterName} characters with SOH (\\x01) delimiter`,
        preview: `${preview}${raw.length > 100 ? '...' : ''}`,
      });
    }
  }

  // Whitespace cleanup
  if (issueTypes.has('whitespace_issue')) {
    const trimmed = raw.trim();
    const preview = trimmed.substring(0, 100);

    suggestions.push({
      type: 'trim_whitespace',
      description: 'Remove leading and trailing whitespace',
      preview: `${preview}${trimmed.length > 100 ? '...' : ''}`,
    });
  }

  // Missing equals signs
  if (issueTypes.has('missing_equals')) {
    const missingEqualsIssues = issues.filter((i) => i.type === 'missing_equals');

    if (missingEqualsIssues.length > 0) {
      const firstIssue = missingEqualsIssues[0];
      const match = firstIssue.message.match(/"([^"]+)"/);
      const problematicPart = match ? match[1] : '';

      // Try to detect if it's a numeric tag without equals
      if (problematicPart && /^\d+/.test(problematicPart)) {
        const tagMatch = problematicPart.match(/^(\d+)(.*)$/);
        if (tagMatch) {
          const tag = tagMatch[1];
          const value = tagMatch[2];
          const suggested = `${tag}=${value}`;

          suggestions.push({
            type: 'add_equals',
            description: `Add '=' separator after numeric tag ${tag}`,
            preview: `...${suggested}...`,
          });
        }
      }
    }
  }

  // Invalid tag (non-numeric)
  if (issueTypes.has('invalid_tag')) {
    suggestions.push({
      type: 'fix_tag_format',
      description: 'Ensure all tags are numeric values',
      preview: 'Example: 35=D (tag must be a number)',
    });
  }

  // Missing required fields
  if (issueTypes.has('missing_required_field')) {
    const missingFields = issues
      .filter((i) => i.type === 'missing_required_field')
      .map((i) => {
        const match = i.message.match(/(\w+) \(tag (\d+)\)/);
        return match ? { name: match[1], tag: match[2] } : null;
      })
      .filter((f) => f !== null);

    if (missingFields.length > 0) {
      const fieldList = missingFields
        .map((f) => `${f!.name} (${f!.tag})`)
        .join(', ');

      suggestions.push({
        type: 'add_required_fields',
        description: `Add missing required fields: ${fieldList}`,
        preview: 'Example: 8=FIX.4.4 (BeginString must be present)',
      });
    }
  }

  // Field order issues
  if (issueTypes.has('invalid_field_order')) {
    const orderIssues = issues.filter((i) => i.type === 'invalid_field_order');

    for (const issue of orderIssues) {
      if (issue.message.includes('BeginString')) {
        suggestions.push({
          type: 'reorder_fields',
          description: 'Move BeginString (tag 8) to the beginning of the message',
          preview: '8=FIX.4.4' + SOH + '...',
        });
      } else if (issue.message.includes('CheckSum')) {
        suggestions.push({
          type: 'reorder_fields',
          description: 'Move CheckSum (tag 10) to the end of the message',
          preview: '...' + SOH + '10=123',
        });
      }
    }
  }

  // Generic suggestion if no specific ones were generated
  if (suggestions.length === 0 && issues.length > 0) {
    suggestions.push({
      type: 'general',
      description: `Fix ${issues.length} validation issue(s) found in the message`,
      preview: 'Review the issues list and correct the message format',
    });
  }

  return suggestions;
}

/**
 * Attempts to automatically repair common issues
 *
 * This function applies simple, safe transformations:
 * - Normalize delimiters to SOH
 * - Trim whitespace
 *
 * Returns the repaired message or null if no repairs could be made.
 */
export function autoRepair(raw: string): string | null {
  let repaired = raw;
  let modified = false;

  // Trim whitespace
  const trimmed = repaired.trim();
  if (trimmed !== repaired) {
    repaired = trimmed;
    modified = true;
  }

  // Normalize pipe delimiters
  if (repaired.includes('|')) {
    repaired = repaired.split('|').join(SOH);
    modified = true;
  }

  // Normalize caret delimiters
  if (repaired.includes('^')) {
    repaired = repaired.split('^').join(SOH);
    modified = true;
  }

  return modified ? repaired : null;
}
