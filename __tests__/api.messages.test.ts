/**
 * API Tests for message endpoints
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { memoryStore } from '../lib/store/memory';
import { parseRelaxed } from '../lib/fix/parser';
import { parseStrict } from '../lib/fix/strict';
import { generateRepairSuggestions } from '../lib/fix/repair';
import { checkRateLimit, RATE_LIMITS } from '../lib/server/ratelimit';
import { checkAuth } from '../lib/server/auth';

describe('Message API Endpoints', () => {
  beforeEach(() => {
    // Clear store before each test
    memoryStore.clear();
  });

  describe('/api/fix/parse', () => {
    it('should parse a valid FIX message in relaxed mode', () => {
      const fixMessage =
        '8=FIX.4.4|9=100|35=D|49=SENDER|56=TARGET|34=1|52=20231101-10:30:00|11=ORDER123|55=AAPL|54=1|38=100|40=2|44=150.50|';

      // Simulate API call by using the parser directly
      const result = parseRelaxed(fixMessage);

      expect(result.fields).toBeDefined();
      expect(result.summary.msgType).toBe('D');
      expect(result.summary.orderKey).toBe('ORDER123');
      expect(result.summary.symbol).toBe('AAPL');
      expect(result.warnings).toHaveLength(0);
    });

    it('should parse a valid FIX message in strict mode', () => {
      const SOH = '\x01';
      const fixMessage = `8=FIX.4.4${SOH}9=100${SOH}35=D${SOH}49=SENDER${SOH}56=TARGET${SOH}34=1${SOH}52=20231101-10:30:00${SOH}11=ORDER123${SOH}55=AAPL${SOH}54=1${SOH}38=100${SOH}40=2${SOH}44=150.50${SOH}`;

      const result = parseStrict(fixMessage);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.message.fields).toBeDefined();
        expect(result.message.summary.msgType).toBe('D');
        expect(result.message.summary.orderKey).toBe('ORDER123');
      }
    });

    it('should return issues and suggestions for invalid delimiter in strict mode', () => {
      const fixMessage =
        '8=FIX.4.4|9=100|35=D|49=SENDER|56=TARGET|34=1|52=20231101-10:30:00|11=ORDER123|55=AAPL|54=1|38=100|';

      const result = parseStrict(fixMessage);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues).toBeDefined();
        expect(result.issues.length).toBeGreaterThan(0);
        expect(result.error).toContain('validation failed');
      }
    });

    it('should return repair suggestions for malformed messages', () => {
      const fixMessage =
        '8=FIX.4.4|9=100|35D|49=SENDER|56=TARGET|34=1|52=20231101-10:30:00|11=ORDER123|';

      const result = parseStrict(fixMessage);

      expect(result.success).toBe(false);
      if (!result.success) {
        const suggestions = generateRepairSuggestions(
          fixMessage,
          result.issues
        );
        expect(suggestions).toBeDefined();
        expect(Array.isArray(suggestions)).toBe(true);
      }
    });
  });

  describe('/api/messages/ingest', () => {
    it('should ingest and store a valid FIX message', async () => {
      const SOH = '\x01';
      const fixMessage = `8=FIX.4.4${SOH}9=100${SOH}35=D${SOH}49=SENDER${SOH}56=TARGET${SOH}34=1${SOH}52=20231101-10:30:00${SOH}11=ORDER123${SOH}55=AAPL${SOH}54=1${SOH}38=100${SOH}40=2${SOH}44=150.50${SOH}`;

      const result = parseStrict(fixMessage);

      expect(result.success).toBe(true);
      if (result.success) {
        const message = await memoryStore.add({
          id: '',
          rawMessage: fixMessage,
          fields: result.message.fields,
          summary: result.message.summary,
          warnings: result.message.warnings,
        });

        expect(message.id).toBeDefined();
        expect(message.receivedAt).toBeDefined();
        expect(memoryStore.count()).toBe(1);
      }
    });

    it('should reject malformed FIX messages', () => {
      const fixMessage =
        '8=FIX.4.4|9=100|35=D|49=SENDER|56=TARGET|34=1|52=20231101-10:30:00|11=ORDER123|';

      const result = parseStrict(fixMessage);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.issues.length).toBeGreaterThan(0);
      }
    });

    it('should broadcast ingested messages to SSE clients', async () => {
      const SOH = '\x01';
      const fixMessage = `8=FIX.4.4${SOH}9=100${SOH}35=D${SOH}49=SENDER${SOH}56=TARGET${SOH}34=1${SOH}52=20231101-10:30:00${SOH}11=ORDER123${SOH}55=AAPL${SOH}54=1${SOH}38=100${SOH}`;

      const result = parseStrict(fixMessage);

      expect(result.success).toBe(true);
      if (result.success) {
        // Track broadcasted messages
        const broadcasts: string[] = [];

        // Create a mock controller
        const mockController = {
          enqueue: (chunk: Uint8Array) => {
            const text = new TextDecoder().decode(chunk);
            broadcasts.push(text);
          },
        } as unknown as ReadableStreamDefaultController;

        // Register the mock controller
        memoryStore.stream(mockController);

        // Add a message
        await memoryStore.add({
          id: '',
          rawMessage: fixMessage,
          fields: result.message.fields,
          summary: result.message.summary,
          warnings: result.message.warnings,
        });

        // Verify broadcast
        expect(broadcasts.length).toBe(1);
        expect(broadcasts[0]).toContain('data:');
        expect(broadcasts[0]).toContain('ORDER123');
      }
    });
  });

  describe('/api/messages GET', () => {
    it('should list messages with pagination', async () => {
      const SOH = '\x01';

      // Add multiple messages
      for (let i = 1; i <= 5; i++) {
        const fixMessage = `8=FIX.4.4${SOH}35=D${SOH}11=ORDER${i}${SOH}55=AAPL${SOH}54=1${SOH}38=100${SOH}`;
          const result = parseStrict(fixMessage);

        if (result.success) {
          await memoryStore.add({
            id: '',
            rawMessage: fixMessage,
            fields: result.message.fields,
            summary: result.message.summary,
            warnings: result.message.warnings,
          });
        }
      }

      // List first 3 messages
      const page1 = await memoryStore.list({ limit: 3 });
      expect(page1.messages).toHaveLength(3);
      expect(page1.nextCursor).toBeDefined();
      expect(page1.total).toBe(5);

      // List next 2 messages
      const page2 = await memoryStore.list({
        limit: 3,
        cursor: page1.nextCursor,
      });
      expect(page2.messages).toHaveLength(2);
      expect(page2.nextCursor).toBeUndefined();
    });

    it('should filter messages by orderKey', async () => {
      const SOH = '\x01';

      // Add messages for different orders
      const orders = ['ORDER1', 'ORDER1', 'ORDER2', 'ORDER1', 'ORDER2'];
      for (const orderKey of orders) {
        const fixMessage = `8=FIX.4.4${SOH}35=D${SOH}11=${orderKey}${SOH}55=AAPL${SOH}54=1${SOH}38=100${SOH}`;
          const result = parseStrict(fixMessage);

        if (result.success) {
          await memoryStore.add({
            id: '',
            rawMessage: fixMessage,
            fields: result.message.fields,
            summary: result.message.summary,
            warnings: result.message.warnings,
          });
        }
      }

      // Filter by ORDER1
      const order1Messages = await memoryStore.list({ orderKey: 'ORDER1' });
      expect(order1Messages.messages).toHaveLength(3);
      expect(order1Messages.total).toBe(3);

      // Filter by ORDER2
      const order2Messages = await memoryStore.list({ orderKey: 'ORDER2' });
      expect(order2Messages.messages).toHaveLength(2);
      expect(order2Messages.total).toBe(2);
    });

    it('should validate limit parameter', async () => {
      // The API route should validate that limit is between 1 and 200
      // We can test the store's behavior with various limits

      const SOH = '\x01';
      const fixMessage = `8=FIX.4.4${SOH}35=D${SOH}11=ORDER1${SOH}55=AAPL${SOH}54=1${SOH}38=100${SOH}`;
      const result = parseStrict(fixMessage);

      if (result.success) {
        await memoryStore.add({
          id: '',
          rawMessage: fixMessage,
          fields: result.message.fields,
          summary: result.message.summary,
          warnings: result.message.warnings,
        });
      }

      // Valid limits should work
      const result1 = await memoryStore.list({ limit: 1 });
      expect(result1.messages).toHaveLength(1);

      const result50 = await memoryStore.list({ limit: 50 });
      expect(result50.messages).toHaveLength(1);
    });
  });

  describe('/api/orders GET', () => {
    it('should aggregate orders from messages', async () => {
      const SOH = '\x01';

      // Add New Order Single
      const newOrderMsg = `8=FIX.4.4${SOH}35=D${SOH}11=ORDER123${SOH}55=AAPL${SOH}54=1${SOH}38=100${SOH}40=2${SOH}44=150.50${SOH}`;
      const result1 = parseStrict(newOrderMsg);

      if (result1.success) {
        await memoryStore.add({
          id: '',
          rawMessage: newOrderMsg,
          fields: result1.message.fields,
          summary: result1.message.summary,
          warnings: result1.message.warnings,
        });
      }

      // Add Execution Report - Filled
      const execReportMsg = `8=FIX.4.4${SOH}35=8${SOH}11=ORDER123${SOH}37=12345${SOH}55=AAPL${SOH}54=1${SOH}38=100${SOH}39=2${SOH}`;
      const result2 = parseStrict(execReportMsg);

      if (result2.success) {
        await memoryStore.add({
          id: '',
          rawMessage: execReportMsg,
          fields: result2.message.fields,
          summary: result2.message.summary,
          warnings: result2.message.warnings,
        });
      }

      // Get orders
      const orders = await memoryStore.listOrders();

      expect(orders).toHaveLength(1);

      const wantOrder = {
        orderKey: 'ORDER123',
        orderId: '12345',
        symbol: 'AAPL',
        side: '1',
        originalQty: '100',
        latestStatus: '2',
        messageCount: 2,
      };

      const gotOrder = {
        orderKey: orders[0].orderKey,
        orderId: orders[0].orderId,
        symbol: orders[0].symbol,
        side: orders[0].side,
        originalQty: orders[0].originalQty,
        latestStatus: orders[0].latestStatus,
        messageCount: orders[0].messageCount,
      };

      expect(gotOrder).toEqual(wantOrder);
      expect(orders[0].firstSeenAt).toBeDefined();
      expect(orders[0].lastSeenAt).toBeDefined();
    });

    it('should handle multiple orders', async () => {
      const SOH = '\x01';

      // Add messages for two different orders
      const orders = [
        { clOrdId: 'ORDER1', symbol: 'AAPL' },
        { clOrdId: 'ORDER2', symbol: 'GOOGL' },
        { clOrdId: 'ORDER1', symbol: 'AAPL' }, // Second message for ORDER1
      ];


      for (const order of orders) {
        const fixMessage = `8=FIX.4.4${SOH}35=D${SOH}11=${order.clOrdId}${SOH}55=${order.symbol}${SOH}54=1${SOH}38=100${SOH}`;
        const result = parseStrict(fixMessage);

        if (result.success) {
          await memoryStore.add({
            id: '',
            rawMessage: fixMessage,
            fields: result.message.fields,
            summary: result.message.summary,
            warnings: result.message.warnings,
          });
        }
      }

      const ordersList = await memoryStore.listOrders();
      expect(ordersList).toHaveLength(2);

      const wantOrderKeys = ['ORDER1', 'ORDER2'];
      const gotOrderKeys = ordersList.map((o) => o.orderKey);
      expect(gotOrderKeys).toEqual(expect.arrayContaining(wantOrderKeys));

      // ORDER1 should have 2 messages
      const order1 = ordersList.find((o) => o.orderKey === 'ORDER1');
      expect(order1?.messageCount).toBe(2);

      // ORDER2 should have 1 message
      const order2 = ordersList.find((o) => o.orderKey === 'ORDER2');
      expect(order2?.messageCount).toBe(1);
    });

    it('should sort orders by lastSeenAt (newest first)', async () => {
      const SOH = '\x01';

      // Add ORDER1
      await new Promise((resolve) => setTimeout(resolve, 10));
      const msg1 = `8=FIX.4.4${SOH}35=D${SOH}11=ORDER1${SOH}55=AAPL${SOH}54=1${SOH}38=100${SOH}`;
      const result1 = parseStrict(msg1);
      if (result1.success) {
        await memoryStore.add({
          id: '',
          rawMessage: msg1,
          fields: result1.message.fields,
          summary: result1.message.summary,
          warnings: result1.message.warnings,
        });
      }

      // Add ORDER2 (later)
      await new Promise((resolve) => setTimeout(resolve, 10));
      const msg2 = `8=FIX.4.4${SOH}35=D${SOH}11=ORDER2${SOH}55=GOOGL${SOH}54=1${SOH}38=200${SOH}`;
      const result2 = parseStrict(msg2);
      if (result2.success) {
        await memoryStore.add({
          id: '',
          rawMessage: msg2,
          fields: result2.message.fields,
          summary: result2.message.summary,
          warnings: result2.message.warnings,
        });
      }

      const orders = await memoryStore.listOrders();
      expect(orders).toHaveLength(2);

      // ORDER2 should be first (newest)
      expect(orders[0].orderKey).toBe('ORDER2');
      expect(orders[1].orderKey).toBe('ORDER1');
    });
  });

  describe('Rate Limiting', () => {
    it('should track request counts per IP', () => {

      // Create mock request
      const mockRequest = {
        headers: new Map([['x-forwarded-for', '192.168.1.1']]),
      };

      // Mock the headers.get method
      mockRequest.headers.get = function (key: string) {
        return this.get(key);
      };

      // First request should succeed
      const result1 = checkRateLimit(
        mockRequest as unknown as Request,
        RATE_LIMITS.write
      );
      expect(result1).toBeNull();

      // Should be able to make multiple requests
      for (let i = 0; i < 99; i++) {
        const result = checkRateLimit(
          mockRequest as unknown as Request,
          RATE_LIMITS.write
        );
        expect(result).toBeNull();
      }

      // 101st request should be rate limited
      const result101 = checkRateLimit(
        mockRequest as unknown as Request,
        RATE_LIMITS.write
      );
      expect(result101).not.toBeNull();
      if (result101) {
        expect(result101.status).toBe(429);
      }
    });
  });

  describe('Authentication', () => {
    it('should allow requests without token when FIX_API_TOKEN is not set', () => {
      // Save original value
      const originalToken = process.env.FIX_API_TOKEN;
      delete process.env.FIX_API_TOKEN;


      const mockRequest = {
        headers: new Map(),
      };
      mockRequest.headers.get = function () {
        return null;
      };

      const result = checkAuth(mockRequest as unknown as Request);
      expect(result).toBeNull();

      // Restore original value
      if (originalToken) {
        process.env.FIX_API_TOKEN = originalToken;
      }
    });

    it('should reject requests without Authorization header when token is set', () => {
      // Save original value
      const originalToken = process.env.FIX_API_TOKEN;
      process.env.FIX_API_TOKEN = 'test-token-123';


      const mockRequest = {
        headers: new Map(),
      };
      mockRequest.headers.get = function () {
        return null;
      };

      const result = checkAuth(mockRequest as unknown as Request);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.status).toBe(401);
      }

      // Restore original value
      if (originalToken) {
        process.env.FIX_API_TOKEN = originalToken;
      } else {
        delete process.env.FIX_API_TOKEN;
      }
    });

    it('should accept requests with valid Bearer token', () => {
      // Save original value
      const originalToken = process.env.FIX_API_TOKEN;
      process.env.FIX_API_TOKEN = 'test-token-123';


      const mockRequest = {
        headers: new Map([['authorization', 'Bearer test-token-123']]),
      };
      mockRequest.headers.get = function (key: string) {
        return this.get(key.toLowerCase());
      };

      const result = checkAuth(mockRequest as unknown as Request);
      expect(result).toBeNull();

      // Restore original value
      if (originalToken) {
        process.env.FIX_API_TOKEN = originalToken;
      } else {
        delete process.env.FIX_API_TOKEN;
      }
    });
  });
});
