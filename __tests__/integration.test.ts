/**
 * Integration tests demonstrating complete parsing workflow
 */

import { describe, it, expect } from 'vitest';
import { parseRelaxed } from '../lib/fix/parser';
import { parseStrict } from '../lib/fix/strict';
import { generateRepairSuggestions, autoRepair } from '../lib/fix/repair';
import { SAMPLE_MESSAGES } from '../lib/fix/samples';

const SOH = '\x01';

describe('Integration Tests', () => {
  describe('complete parsing workflow', () => {
    it('should parse valid message with relaxed parser', () => {
      const message = SAMPLE_MESSAGES[0].message; // New Order Single
      const result = parseRelaxed(message);

      expect(result.fields.length).toBeGreaterThan(0);
      expect(result.summary.msgType).toBe('D');
      expect(result.summary.clOrdId).toBe('ORDER001');
      expect(result.summary.symbol).toBe('AAPL');
      expect(result.orderKey).toBe('ORDER001');
      expect(result.warnings).toHaveLength(0);
    });

    it('should parse all sample messages successfully', () => {
      for (const sample of SAMPLE_MESSAGES) {
        const result = parseRelaxed(sample.message);

        expect(result.fields.length).toBeGreaterThan(0);
        expect(result.summary.msgType).toBeDefined();
      }
    });

    it('should handle malformed message with repair suggestions', () => {
      // Malformed message with pipe delimiters and whitespace
      const malformed = ' 8=FIX.4.4|9=100|35=D|11=ORDER123|55=AAPL| ';

      // Try strict parse - should fail
      const strictResult = parseStrict(malformed);
      expect(strictResult.success).toBe(false);

      if (!strictResult.success) {
        // Generate repair suggestions
        const suggestions = generateRepairSuggestions(malformed, strictResult.issues);
        expect(suggestions.length).toBeGreaterThan(0);

        // Apply auto repair
        const repaired = autoRepair(malformed);
        expect(repaired).not.toBeNull();

        if (repaired) {
          // Try parsing repaired message
          const relaxedResult = parseRelaxed(repaired);
          expect(relaxedResult.fields.length).toBeGreaterThan(0);
          expect(relaxedResult.summary.msgType).toBe('D');
          expect(relaxedResult.summary.clOrdId).toBe('ORDER123');
        }
      }
    });
  });

  describe('order tracking workflow', () => {
    it('should track order lifecycle across multiple messages', () => {
      // Get execution report messages for same order
      const newOrder = SAMPLE_MESSAGES[0]; // New Order Single
      const newExec = SAMPLE_MESSAGES[1]; // Execution Report - New
      const partialFill = SAMPLE_MESSAGES[2]; // Execution Report - Partial Fill
      const filled = SAMPLE_MESSAGES[3]; // Execution Report - Filled

      const messages = [newOrder, newExec, partialFill, filled].map((sample) =>
        parseRelaxed(sample.message)
      );

      // All should have same orderKey
      const orderKeys = messages.map((m) => m.orderKey);
      expect(orderKeys.every((key) => key === 'ORDER001')).toBe(true);

      // Check status progression
      const statuses = messages.map((m) => m.summary.ordStatus).filter(Boolean);
      expect(statuses).toEqual(['0', '1', '2']);

      // Verify message types
      const msgTypes = messages.map((m) => m.summary.msgType);
      expect(msgTypes).toEqual(['D', '8', '8', '8']);
    });
  });

  describe('field dictionary integration', () => {
    it('should provide human-readable names for all standard tags', () => {
      const message = SAMPLE_MESSAGES[0].message;
      const result = parseRelaxed(message);

      const wantFieldNames: Record<string, string> = {
        '8': 'BeginString',
        '9': 'BodyLength',
        '35': 'MsgType',
        '11': 'ClOrdID',
        '55': 'Symbol',
        '54': 'Side',
        '38': 'OrderQty',
        '44': 'Price',
        '60': 'TransactTime',
      };

      const gotFieldNames: Record<string, string> = {};
      result.fields.forEach((f) => {
        if (wantFieldNames[f.tag]) {
          gotFieldNames[f.tag] = f.name;
        }
      });

      expect(gotFieldNames).toEqual(wantFieldNames);
    });
  });

  describe('error recovery workflow', () => {
    it('should detect multiple issues and provide comprehensive repair suggestions', () => {
      const malformed = ' ABC=invalid|8=FIX.4.4|35=D|';

      const result = parseStrict(malformed);
      expect(result.success).toBe(false);

      if (!result.success) {
        const wantIssueTypes = {
          whitespace_issue: true,
          invalid_delimiter: true,
          invalid_tag: true,
          invalid_field_order: true,
        };

        const gotIssueTypes: Record<string, boolean> = {};
        result.issues.forEach((issue) => {
          gotIssueTypes[issue.type] = true;
        });

        expect(gotIssueTypes.whitespace_issue).toBe(wantIssueTypes.whitespace_issue);
        expect(gotIssueTypes.invalid_delimiter).toBe(wantIssueTypes.invalid_delimiter);
        expect(gotIssueTypes.invalid_tag).toBe(wantIssueTypes.invalid_tag);
        expect(gotIssueTypes.invalid_field_order).toBe(wantIssueTypes.invalid_field_order);

        const suggestions = generateRepairSuggestions(malformed, result.issues);
        expect(suggestions.length).toBeGreaterThan(0);

        // Verify we get actionable suggestions
        const suggestionTypes = new Set(suggestions.map((s) => s.type));
        expect(suggestionTypes.has('normalize_delimiters') || suggestionTypes.has('trim_whitespace')).toBe(true);
      }
    });
  });

  describe('TransType field priority', () => {
    it('should prefer tag 60 over 150 and 39', () => {
      const message = `8=FIX.4.4${SOH}35=D${SOH}60=TIME1${SOH}150=EXEC1${SOH}39=STATUS1${SOH}`;
      const result = parseRelaxed(message);

      expect(result.summary.transType).toBe('TIME1');
    });

    it('should use tag 150 when 60 is missing', () => {
      const message = `8=FIX.4.4${SOH}35=D${SOH}150=EXEC1${SOH}39=STATUS1${SOH}`;
      const result = parseRelaxed(message);

      expect(result.summary.transType).toBe('EXEC1');
    });

    it('should use tag 39 when both 60 and 150 are missing', () => {
      const message = `8=FIX.4.4${SOH}35=D${SOH}39=STATUS1${SOH}`;
      const result = parseRelaxed(message);

      expect(result.summary.transType).toBe('STATUS1');
    });
  });
});
