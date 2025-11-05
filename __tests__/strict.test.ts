/**
 * Tests for strict FIX parser
 */

import { describe, it, expect } from 'vitest';
import { parseStrict } from '../lib/fix/strict';

const SOH = '\x01';

describe('parseStrict', () => {
  describe('valid messages', () => {
    it('should successfully parse valid FIX message', () => {
      const input = [
        '8=FIX.4.4',
        '9=100',
        '35=D',
        '11=ORDER123',
        '55=AAPL',
        '54=1',
        '38=100',
      ].join(SOH);

      const result = parseStrict(input);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.message.fields.length).toBeGreaterThan(0);
        expect(result.message.summary.msgType).toBe('D');
        expect(result.message.summary.clOrdId).toBe('ORDER123');
      }
    });

    it('should successfully parse message with checksum at end', () => {
      const input = [
        '8=FIX.4.4',
        '9=100',
        '35=D',
        '11=ORDER123',
        '55=AAPL',
        '10=123',
      ].join(SOH);

      const result = parseStrict(input);

      expect(result.success).toBe(true);
    });
  });

  describe('delimiter validation', () => {
    it('should reject message with pipe delimiters', () => {
      const input = '8=FIX.4.4|9=100|35=D|11=ORDER123|';

      const result = parseStrict(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        const wantIssues = {
          invalid_delimiter: true,
        };

        const gotIssues: Record<string, boolean> = {};
        result.issues.forEach((issue) => {
          gotIssues[issue.type] = true;
        });

        expect(gotIssues.invalid_delimiter).toBe(wantIssues.invalid_delimiter);
        expect(result.issues.some((i) => i.message.includes('pipe'))).toBe(true);
      }
    });

    it('should reject message with caret delimiters', () => {
      const input = '8=FIX.4.4^9=100^35=D^11=ORDER123^';

      const result = parseStrict(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.type === 'invalid_delimiter')).toBe(true);
        expect(result.issues.some((i) => i.message.includes('caret'))).toBe(true);
      }
    });
  });

  describe('format validation', () => {
    it('should reject field without equals sign', () => {
      const input = `8=FIX.4.4${SOH}9=100${SOH}35=D${SOH}InvalidField${SOH}`;

      const result = parseStrict(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.type === 'missing_equals')).toBe(true);
        expect(result.issues.some((i) => i.message.includes('InvalidField'))).toBe(true);
      }
    });

    it('should reject field with non-numeric tag', () => {
      const input = `8=FIX.4.4${SOH}9=100${SOH}35=D${SOH}ABC=value${SOH}`;

      const result = parseStrict(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.type === 'invalid_tag')).toBe(true);
        expect(result.issues.some((i) => i.message.includes('ABC'))).toBe(true);
      }
    });

    it('should reject field with empty tag', () => {
      const input = `8=FIX.4.4${SOH}9=100${SOH}35=D${SOH}=value${SOH}`;

      const result = parseStrict(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.type === 'empty_tag')).toBe(true);
      }
    });
  });

  describe('required fields validation', () => {
    it('should reject message missing BeginString', () => {
      const input = `9=100${SOH}35=D${SOH}11=ORDER123${SOH}`;

      const result = parseStrict(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        const wantIssues = {
          missing_required_field: true,
        };

        const gotIssues: Record<string, boolean> = {};
        result.issues.forEach((issue) => {
          gotIssues[issue.type] = true;
        });

        expect(gotIssues.missing_required_field).toBe(wantIssues.missing_required_field);
        expect(result.issues.some((i) => i.message.includes('BeginString'))).toBe(true);
      }
    });

    it('should reject message missing BodyLength', () => {
      const input = `8=FIX.4.4${SOH}35=D${SOH}11=ORDER123${SOH}`;

      const result = parseStrict(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.type === 'missing_required_field')).toBe(true);
        expect(result.issues.some((i) => i.message.includes('BodyLength'))).toBe(true);
      }
    });

    it('should reject message missing MsgType', () => {
      const input = `8=FIX.4.4${SOH}9=100${SOH}11=ORDER123${SOH}`;

      const result = parseStrict(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.type === 'missing_required_field')).toBe(true);
        expect(result.issues.some((i) => i.message.includes('MsgType'))).toBe(true);
      }
    });

    it('should accept message with all required fields', () => {
      const input = `8=FIX.4.4${SOH}9=100${SOH}35=D${SOH}11=ORDER123${SOH}`;

      const result = parseStrict(input);

      expect(result.success).toBe(true);
    });
  });

  describe('field order validation', () => {
    it('should reject message with BeginString not first', () => {
      const input = `35=D${SOH}8=FIX.4.4${SOH}9=100${SOH}11=ORDER123${SOH}`;

      const result = parseStrict(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.type === 'invalid_field_order')).toBe(true);
        expect(result.issues.some((i) => i.message.includes('must be first'))).toBe(true);
      }
    });

    it('should reject message with CheckSum not last', () => {
      const input = `8=FIX.4.4${SOH}9=100${SOH}10=123${SOH}35=D${SOH}11=ORDER123${SOH}`;

      const result = parseStrict(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.type === 'invalid_field_order')).toBe(true);
        expect(result.issues.some((i) => i.message.includes('must be last'))).toBe(true);
      }
    });

    it('should accept message with correct field order', () => {
      const input = `8=FIX.4.4${SOH}9=100${SOH}35=D${SOH}11=ORDER123${SOH}10=123${SOH}`;

      const result = parseStrict(input);

      expect(result.success).toBe(true);
    });
  });

  describe('whitespace validation', () => {
    it('should reject message with leading whitespace', () => {
      const input = ` 8=FIX.4.4${SOH}9=100${SOH}35=D${SOH}`;

      const result = parseStrict(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.type === 'whitespace_issue')).toBe(true);
        expect(result.issues.some((i) => i.message.includes('leading'))).toBe(true);
      }
    });

    it('should reject message with trailing whitespace', () => {
      const input = `8=FIX.4.4${SOH}9=100${SOH}35=D${SOH} `;

      const result = parseStrict(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.type === 'whitespace_issue')).toBe(true);
        expect(result.issues.some((i) => i.message.includes('trailing'))).toBe(true);
      }
    });

    it('should reject message with tab whitespace', () => {
      const input = `\t8=FIX.4.4${SOH}9=100${SOH}35=D${SOH}`;

      const result = parseStrict(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.type === 'whitespace_issue')).toBe(true);
      }
    });

    it('should reject message with newline whitespace', () => {
      const input = `8=FIX.4.4${SOH}9=100${SOH}35=D${SOH}\n`;

      const result = parseStrict(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.some((i) => i.type === 'whitespace_issue')).toBe(true);
      }
    });
  });

  describe('multiple issues', () => {
    it('should report all issues found', () => {
      const input = ' 8=FIX.4.4|35=D|ABC=value|';

      const result = parseStrict(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        const wantIssueTypes = {
          whitespace_issue: true,
          invalid_delimiter: true,
          invalid_tag: true,
          missing_required_field: true,
        };

        const gotIssueTypes: Record<string, boolean> = {};
        result.issues.forEach((issue) => {
          gotIssueTypes[issue.type] = true;
        });

        expect(gotIssueTypes.whitespace_issue).toBe(wantIssueTypes.whitespace_issue);
        expect(gotIssueTypes.invalid_delimiter).toBe(wantIssueTypes.invalid_delimiter);
        expect(gotIssueTypes.invalid_tag).toBe(wantIssueTypes.invalid_tag);
        expect(gotIssueTypes.missing_required_field).toBe(wantIssueTypes.missing_required_field);

        expect(result.issues.length).toBeGreaterThan(3);
      }
    });

    it('should include issue count in error message', () => {
      const input = '8=FIX.4.4|35=D|';

      const result = parseStrict(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/\d+ issue\(s\)/);
      }
    });
  });

  describe('issue positions', () => {
    it('should include position for delimiter issues', () => {
      const input = '8=FIX.4.4|35=D|';

      const result = parseStrict(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        const delimiterIssue = result.issues.find((i) => i.type === 'invalid_delimiter');
        expect(delimiterIssue?.position).toBeDefined();
      }
    });

    it('should include position for format issues', () => {
      const input = `8=FIX.4.4${SOH}9=100${SOH}InvalidField${SOH}`;

      const result = parseStrict(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatIssue = result.issues.find((i) => i.type === 'missing_equals');
        expect(formatIssue?.position).toBeDefined();
      }
    });

    it('should include position for whitespace issues', () => {
      const input = ` 8=FIX.4.4${SOH}9=100${SOH}35=D${SOH}`;

      const result = parseStrict(input);

      expect(result.success).toBe(false);
      if (!result.success) {
        const whitespaceIssue = result.issues.find((i) => i.type === 'whitespace_issue');
        expect(whitespaceIssue?.position).toBeDefined();
        expect(whitespaceIssue?.position).toBe(0);
      }
    });
  });
});
