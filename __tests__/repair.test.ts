/**
 * Tests for FIX message repair suggestion generation
 */

import { describe, it, expect } from 'vitest';
import { generateRepairSuggestions, autoRepair } from '../lib/fix/repair';
import { ParseIssue } from '../lib/types';

const SOH = '\x01';

describe('generateRepairSuggestions', () => {
  describe('delimiter normalization', () => {
    it('should suggest normalizing pipe delimiters', () => {
      const raw = '8=FIX.4.4|9=100|35=D|';
      const issues: ParseIssue[] = [
        {
          type: 'invalid_delimiter',
          message: "Found pipe character ('|') instead of SOH",
          position: 9,
        },
      ];

      const suggestions = generateRepairSuggestions(raw, issues);

      const wantSuggestions = {
        normalize_delimiters: true,
      };

      const gotSuggestions: Record<string, boolean> = {};
      suggestions.forEach((s) => {
        gotSuggestions[s.type] = true;
      });

      expect(gotSuggestions.normalize_delimiters).toBe(wantSuggestions.normalize_delimiters);

      const delimiterSuggestion = suggestions.find((s) => s.type === 'normalize_delimiters');
      expect(delimiterSuggestion?.description).toContain('pipe');
      expect(delimiterSuggestion?.preview).toBeDefined();
    });

    it('should suggest normalizing caret delimiters', () => {
      const raw = '8=FIX.4.4^9=100^35=D^';
      const issues: ParseIssue[] = [
        {
          type: 'invalid_delimiter',
          message: "Found caret character ('^') instead of SOH",
          position: 9,
        },
      ];

      const suggestions = generateRepairSuggestions(raw, issues);

      const delimiterSuggestion = suggestions.find((s) => s.type === 'normalize_delimiters');
      expect(delimiterSuggestion).toBeDefined();
      expect(delimiterSuggestion?.description).toContain('caret');
    });
  });

  describe('whitespace cleanup', () => {
    it('should suggest trimming whitespace', () => {
      const raw = ` 8=FIX.4.4${SOH}9=100${SOH}35=D${SOH} `;
      const issues: ParseIssue[] = [
        {
          type: 'whitespace_issue',
          message: 'Message has leading whitespace',
          position: 0,
        },
        {
          type: 'whitespace_issue',
          message: 'Message has trailing whitespace',
          position: raw.length - 1,
        },
      ];

      const suggestions = generateRepairSuggestions(raw, issues);

      const wantSuggestions = {
        trim_whitespace: true,
      };

      const gotSuggestions: Record<string, boolean> = {};
      suggestions.forEach((s) => {
        gotSuggestions[s.type] = true;
      });

      expect(gotSuggestions.trim_whitespace).toBe(wantSuggestions.trim_whitespace);

      const whitespaceSuggestion = suggestions.find((s) => s.type === 'trim_whitespace');
      expect(whitespaceSuggestion?.description).toContain('whitespace');
      expect(whitespaceSuggestion?.preview).toBeDefined();
    });
  });

  describe('missing equals signs', () => {
    it('should suggest adding equals sign after numeric tag', () => {
      const raw = `8=FIX.4.4${SOH}35D${SOH}`;
      const issues: ParseIssue[] = [
        {
          type: 'missing_equals',
          message: 'Field at position 1 is missing \'=\' separator: "35D"',
          position: 1,
        },
      ];

      const suggestions = generateRepairSuggestions(raw, issues);

      const wantSuggestions = {
        add_equals: true,
      };

      const gotSuggestions: Record<string, boolean> = {};
      suggestions.forEach((s) => {
        gotSuggestions[s.type] = true;
      });

      expect(gotSuggestions.add_equals).toBe(wantSuggestions.add_equals);

      const equalsSuggestion = suggestions.find((s) => s.type === 'add_equals');
      expect(equalsSuggestion?.description).toContain('35');
      expect(equalsSuggestion?.preview).toContain('35=D');
    });
  });

  describe('invalid tag format', () => {
    it('should suggest fixing non-numeric tags', () => {
      const raw = `8=FIX.4.4${SOH}ABC=value${SOH}`;
      const issues: ParseIssue[] = [
        {
          type: 'invalid_tag',
          message: 'Tag must be numeric, found: "ABC"',
          position: 1,
        },
      ];

      const suggestions = generateRepairSuggestions(raw, issues);

      const wantSuggestions = {
        fix_tag_format: true,
      };

      const gotSuggestions: Record<string, boolean> = {};
      suggestions.forEach((s) => {
        gotSuggestions[s.type] = true;
      });

      expect(gotSuggestions.fix_tag_format).toBe(wantSuggestions.fix_tag_format);

      const tagSuggestion = suggestions.find((s) => s.type === 'fix_tag_format');
      expect(tagSuggestion?.description).toContain('numeric');
    });
  });

  describe('missing required fields', () => {
    it('should suggest adding missing required fields', () => {
      const raw = `35=D${SOH}11=ORDER123${SOH}`;
      const issues: ParseIssue[] = [
        {
          type: 'missing_required_field',
          message: 'Missing required field: BeginString (tag 8)',
        },
        {
          type: 'missing_required_field',
          message: 'Missing required field: BodyLength (tag 9)',
        },
      ];

      const suggestions = generateRepairSuggestions(raw, issues);

      const wantSuggestions = {
        add_required_fields: true,
      };

      const gotSuggestions: Record<string, boolean> = {};
      suggestions.forEach((s) => {
        gotSuggestions[s.type] = true;
      });

      expect(gotSuggestions.add_required_fields).toBe(wantSuggestions.add_required_fields);

      const requiredSuggestion = suggestions.find((s) => s.type === 'add_required_fields');
      expect(requiredSuggestion?.description).toContain('BeginString');
      expect(requiredSuggestion?.description).toContain('BodyLength');
    });
  });

  describe('field order issues', () => {
    it('should suggest moving BeginString to beginning', () => {
      const raw = `35=D${SOH}8=FIX.4.4${SOH}`;
      const issues: ParseIssue[] = [
        {
          type: 'invalid_field_order',
          message: 'BeginString (tag 8) must be first field, found tag 35 first',
          position: 0,
        },
      ];

      const suggestions = generateRepairSuggestions(raw, issues);

      const wantSuggestions = {
        reorder_fields: true,
      };

      const gotSuggestions: Record<string, boolean> = {};
      suggestions.forEach((s) => {
        gotSuggestions[s.type] = true;
      });

      expect(gotSuggestions.reorder_fields).toBe(wantSuggestions.reorder_fields);

      const orderSuggestion = suggestions.find((s) => s.type === 'reorder_fields');
      expect(orderSuggestion?.description).toContain('BeginString');
      expect(orderSuggestion?.description).toContain('beginning');
    });

    it('should suggest moving CheckSum to end', () => {
      const raw = `8=FIX.4.4${SOH}10=123${SOH}35=D${SOH}`;
      const issues: ParseIssue[] = [
        {
          type: 'invalid_field_order',
          message: 'CheckSum (tag 10) must be last field if present',
          position: 2,
        },
      ];

      const suggestions = generateRepairSuggestions(raw, issues);

      const orderSuggestion = suggestions.find((s) => s.type === 'reorder_fields');
      expect(orderSuggestion).toBeDefined();
      expect(orderSuggestion?.description).toContain('CheckSum');
      expect(orderSuggestion?.description).toContain('end');
    });
  });

  describe('multiple issues', () => {
    it('should generate multiple suggestions for multiple issues', () => {
      const raw = ' 8=FIX.4.4|9=100|35=D| ';
      const issues: ParseIssue[] = [
        {
          type: 'whitespace_issue',
          message: 'Message has leading whitespace',
          position: 0,
        },
        {
          type: 'whitespace_issue',
          message: 'Message has trailing whitespace',
          position: raw.length - 1,
        },
        {
          type: 'invalid_delimiter',
          message: "Found pipe character ('|') instead of SOH",
          position: 9,
        },
      ];

      const suggestions = generateRepairSuggestions(raw, issues);

      const wantSuggestions = {
        normalize_delimiters: true,
        trim_whitespace: true,
      };

      const gotSuggestions: Record<string, boolean> = {};
      suggestions.forEach((s) => {
        gotSuggestions[s.type] = true;
      });

      expect(gotSuggestions.normalize_delimiters).toBe(wantSuggestions.normalize_delimiters);
      expect(gotSuggestions.trim_whitespace).toBe(wantSuggestions.trim_whitespace);
    });
  });

  describe('generic fallback', () => {
    it('should provide generic suggestion when specific ones cannot be generated', () => {
      const raw = `8=FIX.4.4${SOH}9=100${SOH}35=D${SOH}`;
      const issues: ParseIssue[] = [
        {
          type: 'unknown_issue',
          message: 'Some unknown problem',
        },
      ];

      const suggestions = generateRepairSuggestions(raw, issues);

      expect(suggestions.length).toBeGreaterThan(0);
      const genericSuggestion = suggestions.find((s) => s.type === 'general');
      expect(genericSuggestion).toBeDefined();
    });
  });

  describe('no issues', () => {
    it('should return empty array when no issues provided', () => {
      const raw = `8=FIX.4.4${SOH}9=100${SOH}35=D${SOH}`;
      const issues: ParseIssue[] = [];

      const suggestions = generateRepairSuggestions(raw, issues);

      expect(suggestions).toHaveLength(0);
    });
  });
});

describe('autoRepair', () => {
  it('should normalize pipe delimiters', () => {
    const input = '8=FIX.4.4|9=100|35=D|';
    const result = autoRepair(input);

    expect(result).not.toBeNull();
    expect(result).toBe(`8=FIX.4.4${SOH}9=100${SOH}35=D${SOH}`);
  });

  it('should normalize caret delimiters', () => {
    const input = '8=FIX.4.4^9=100^35=D^';
    const result = autoRepair(input);

    expect(result).not.toBeNull();
    expect(result).toBe(`8=FIX.4.4${SOH}9=100${SOH}35=D${SOH}`);
  });

  it('should trim whitespace', () => {
    const input = ` 8=FIX.4.4${SOH}9=100${SOH}35=D${SOH} `;
    const result = autoRepair(input);

    expect(result).not.toBeNull();
    expect(result).toBe(`8=FIX.4.4${SOH}9=100${SOH}35=D${SOH}`);
  });

  it('should apply both trimming and delimiter normalization', () => {
    const input = ' 8=FIX.4.4|9=100|35=D| ';
    const result = autoRepair(input);

    expect(result).not.toBeNull();
    expect(result).toBe(`8=FIX.4.4${SOH}9=100${SOH}35=D${SOH}`);
  });

  it('should return null when no repairs needed', () => {
    const input = `8=FIX.4.4${SOH}9=100${SOH}35=D${SOH}`;
    const result = autoRepair(input);

    expect(result).toBeNull();
  });

  it('should handle empty string', () => {
    const input = '';
    const result = autoRepair(input);

    expect(result).toBeNull();
  });

  it('should handle string with only whitespace', () => {
    const input = '   ';
    const result = autoRepair(input);

    expect(result).not.toBeNull();
    expect(result).toBe('');
  });
});
