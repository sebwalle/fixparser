/**
 * Tests for relaxed FIX parser
 */

import { describe, it, expect } from 'vitest';
import { parseRelaxed } from '../lib/fix/parser';

const SOH = '\x01';

describe('parseRelaxed', () => {
  describe('delimiter handling', () => {
    it('should parse message with SOH delimiters', () => {
      const input = `8=FIX.4.4${SOH}35=D${SOH}11=ORDER123${SOH}55=AAPL${SOH}54=1${SOH}38=100${SOH}`;
      const result = parseRelaxed(input);

      const wantFields = {
        '8': 'FIX.4.4',
        '35': 'D',
        '11': 'ORDER123',
        '55': 'AAPL',
        '54': '1',
        '38': '100',
      };

      const gotFields: Record<string, string> = {};
      result.fields.forEach((f) => {
        gotFields[f.tag] = f.value;
      });

      expect(gotFields).toEqual(wantFields);
      expect(result.warnings.length).toBe(0);
    });

    it('should parse message with pipe delimiters', () => {
      const input = '8=FIX.4.4|35=D|11=ORDER123|55=AAPL|54=1|38=100|';
      const result = parseRelaxed(input);

      const wantFields = {
        '8': 'FIX.4.4',
        '35': 'D',
        '11': 'ORDER123',
        '55': 'AAPL',
        '54': '1',
        '38': '100',
      };

      const gotFields: Record<string, string> = {};
      result.fields.forEach((f) => {
        gotFields[f.tag] = f.value;
      });

      expect(gotFields).toEqual(wantFields);
      expect(result.warnings.some((w) => w.includes('pipe'))).toBe(true);
    });

    it('should parse message with caret delimiters', () => {
      const input = '8=FIX.4.4^35=D^11=ORDER123^55=AAPL^54=1^38=100^';
      const result = parseRelaxed(input);

      const wantFields = {
        '8': 'FIX.4.4',
        '35': 'D',
        '11': 'ORDER123',
        '55': 'AAPL',
        '54': '1',
        '38': '100',
      };

      const gotFields: Record<string, string> = {};
      result.fields.forEach((f) => {
        gotFields[f.tag] = f.value;
      });

      expect(gotFields).toEqual(wantFields);
      expect(result.warnings.some((w) => w.includes('caret'))).toBe(true);
    });
  });

  describe('field extraction', () => {
    it('should extract tag, name, and value for all fields', () => {
      const input = `8=FIX.4.4${SOH}35=D${SOH}55=AAPL${SOH}`;
      const result = parseRelaxed(input);

      expect(result.fields).toHaveLength(3);

      const wantFields = [
        { tag: '8', name: 'BeginString', value: 'FIX.4.4' },
        { tag: '35', name: 'MsgType', value: 'D' },
        { tag: '55', name: 'Symbol', value: 'AAPL' },
      ];

      expect(result.fields).toEqual(wantFields);
    });

    it('should handle unknown tags', () => {
      const input = `8=FIX.4.4${SOH}9999=CustomValue${SOH}`;
      const result = parseRelaxed(input);

      expect(result.fields).toHaveLength(2);
      expect(result.fields[1]).toEqual({
        tag: '9999',
        name: 'Tag9999',
        value: 'CustomValue',
      });
    });

    it('should handle empty values', () => {
      const input = `8=FIX.4.4${SOH}35=${SOH}55=AAPL${SOH}`;
      const result = parseRelaxed(input);

      const wantFields = {
        '8': 'FIX.4.4',
        '35': '',
        '55': 'AAPL',
      };

      const gotFields: Record<string, string> = {};
      result.fields.forEach((f) => {
        gotFields[f.tag] = f.value;
      });

      expect(gotFields).toEqual(wantFields);
      expect(result.warnings.some((w) => w.includes('Empty values'))).toBe(true);
    });

    it('should handle fields without equals sign', () => {
      const input = `8=FIX.4.4${SOH}InvalidField${SOH}35=D${SOH}`;
      const result = parseRelaxed(input);

      expect(result.fields).toHaveLength(3);
      expect(result.fields[1]).toEqual({
        tag: '?',
        name: 'Unknown',
        value: 'InvalidField',
      });
    });
  });

  describe('summary extraction', () => {
    it('should extract all summary fields', () => {
      const input = [
        '8=FIX.4.4',
        '35=D',
        '11=ORDER123',
        '37=BROKER001',
        '55=AAPL',
        '54=1',
        '38=1000',
        '44=150.50',
        '60=20250105-10:30:00',
        '39=0',
      ].join(SOH);

      const result = parseRelaxed(input);

      const wantSummary = {
        msgType: 'D',
        clOrdId: 'ORDER123',
        orderId: 'BROKER001',
        symbol: 'AAPL',
        side: '1',
        qty: '1000',
        price: '150.50',
        transType: '20250105-10:30:00',
        ordStatus: '0',
        orderKey: 'ORDER123',
      };

      expect(result.summary).toEqual(wantSummary);
    });

    it('should handle missing summary fields', () => {
      const input = `8=FIX.4.4${SOH}35=D${SOH}`;
      const result = parseRelaxed(input);

      expect(result.summary.msgType).toBe('D');
      expect(result.summary.clOrdId).toBeUndefined();
      expect(result.summary.symbol).toBeUndefined();
    });

    it('should prefer tag 60 for transType', () => {
      const input = `8=FIX.4.4${SOH}60=TIME1${SOH}150=EXEC1${SOH}39=STATUS1${SOH}`;
      const result = parseRelaxed(input);

      expect(result.summary.transType).toBe('TIME1');
    });

    it('should fallback to tag 150 for transType when 60 is missing', () => {
      const input = `8=FIX.4.4${SOH}150=EXEC1${SOH}39=STATUS1${SOH}`;
      const result = parseRelaxed(input);

      expect(result.summary.transType).toBe('EXEC1');
    });

    it('should fallback to tag 39 for transType when 60 and 150 are missing', () => {
      const input = `8=FIX.4.4${SOH}39=STATUS1${SOH}`;
      const result = parseRelaxed(input);

      expect(result.summary.transType).toBe('STATUS1');
    });
  });

  describe('orderKey calculation', () => {
    it('should use ClOrdID (tag 11) as orderKey', () => {
      const input = `8=FIX.4.4${SOH}11=ORDER123${SOH}35=D${SOH}`;
      const result = parseRelaxed(input);

      expect(result.orderKey).toBe('ORDER123');
    });

    it('should return undefined when ClOrdID is missing', () => {
      const input = `8=FIX.4.4${SOH}35=D${SOH}55=AAPL${SOH}`;
      const result = parseRelaxed(input);

      expect(result.orderKey).toBeUndefined();
    });
  });

  describe('warnings generation', () => {
    it('should warn about missing BeginString', () => {
      const input = `35=D${SOH}11=ORDER123${SOH}`;
      const result = parseRelaxed(input);

      expect(result.warnings.some((w) => w.includes('Missing BeginString'))).toBe(true);
    });

    it('should warn about missing MsgType', () => {
      const input = `8=FIX.4.4${SOH}11=ORDER123${SOH}`;
      const result = parseRelaxed(input);

      expect(result.warnings.some((w) => w.includes('Missing MsgType'))).toBe(true);
    });

    it('should warn about duplicate tags', () => {
      const input = `8=FIX.4.4${SOH}35=D${SOH}35=F${SOH}`;
      const result = parseRelaxed(input);

      expect(result.warnings.some((w) => w.includes('Duplicate tag 35'))).toBe(true);
    });

    it('should warn about empty values', () => {
      const input = `8=FIX.4.4${SOH}35=${SOH}11=${SOH}`;
      const result = parseRelaxed(input);

      expect(result.warnings.some((w) => w.includes('Empty values'))).toBe(true);
    });

    it('should not generate warnings for valid message', () => {
      const input = [
        '8=FIX.4.4',
        '9=100',
        '35=D',
        '11=ORDER123',
        '55=AAPL',
        '54=1',
        '38=100',
      ].join(SOH);

      const result = parseRelaxed(input);

      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('raw message storage', () => {
    it('should store normalized raw message', () => {
      const input = '8=FIX.4.4|35=D|11=ORDER123|';
      const result = parseRelaxed(input);

      expect(result.raw).toBe(`8=FIX.4.4${SOH}35=D${SOH}11=ORDER123${SOH}`);
    });
  });

  describe('complete order message', () => {
    it('should parse complete new order single message', () => {
      const input = [
        '8=FIX.4.4',
        '9=200',
        '35=D',
        '49=CLIENT1',
        '56=BROKER1',
        '34=1',
        '52=20250105-10:30:00',
        '11=ORDER001',
        '21=1',
        '55=AAPL',
        '54=1',
        '38=1000',
        '40=2',
        '44=150.50',
        '59=0',
        '60=20250105-10:30:00',
        '10=123',
      ].join(SOH);

      const result = parseRelaxed(input);

      expect(result.fields.length).toBeGreaterThan(0);
      expect(result.summary.msgType).toBe('D');
      expect(result.summary.clOrdId).toBe('ORDER001');
      expect(result.summary.symbol).toBe('AAPL');
      expect(result.summary.side).toBe('1');
      expect(result.summary.qty).toBe('1000');
      expect(result.summary.price).toBe('150.50');
      expect(result.orderKey).toBe('ORDER001');
      expect(result.warnings).toHaveLength(0);
    });
  });
});
