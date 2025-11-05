/**
 * Tests for in-memory MessageStore implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStore } from '../lib/store/memory';
import type { FixMessage } from '../lib/types';

const SOH = '\x01';

// Helper to create a test message
function createTestMessage(overrides: Partial<FixMessage> = {}): FixMessage {
  return {
    id: `msg-${Date.now()}-${Math.random()}`,
    rawMessage: `8=FIX.4.4${SOH}35=D${SOH}11=ORDER123${SOH}`,
    fields: [
      { tag: '8', name: 'BeginString', value: 'FIX.4.4' },
      { tag: '35', name: 'MsgType', value: 'D' },
      { tag: '11', name: 'ClOrdID', value: 'ORDER123' },
    ],
    summary: {
      msgType: 'D',
      orderKey: 'ORDER123',
    },
    receivedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('MemoryStore', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
    store.clear(); // Ensure clean state
  });

  describe('add', () => {
    it('should add a message and return it with receivedAt', async () => {
      const message = createTestMessage({ receivedAt: undefined });
      const result = await store.add(message);

      expect(result.id).toBe(message.id);
      expect(result.receivedAt).toBeDefined();
      expect(result.receivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO date format
    });

    it('should preserve receivedAt if already set', async () => {
      const fixedDate = '2024-01-01T12:00:00.000Z';
      const message = createTestMessage({ receivedAt: fixedDate });
      const result = await store.add(message);

      expect(result.receivedAt).toBe(fixedDate);
    });

    it('should add multiple messages in newest-first order', async () => {
      const msg1 = createTestMessage({ id: 'msg1', receivedAt: '2024-01-01T10:00:00.000Z' });
      const msg2 = createTestMessage({ id: 'msg2', receivedAt: '2024-01-01T11:00:00.000Z' });
      const msg3 = createTestMessage({ id: 'msg3', receivedAt: '2024-01-01T12:00:00.000Z' });

      await store.add(msg1);
      await store.add(msg2);
      await store.add(msg3);

      const { messages } = await store.list();
      const gotIds = messages.map((m) => m.id);

      expect(gotIds).toEqual(['msg3', 'msg2', 'msg1']);
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      // Add test data
      for (let i = 1; i <= 100; i++) {
        await store.add(
          createTestMessage({
            id: `msg${i}`,
            receivedAt: new Date(2024, 0, 1, 0, i).toISOString(),
          })
        );
      }
    });

    it('should return default 50 messages when no limit specified', async () => {
      const result = await store.list();

      expect(result.messages.length).toBe(50);
      expect(result.total).toBe(100);
      expect(result.nextCursor).toBe('50');
    });

    it('should respect custom limit', async () => {
      const result = await store.list({ limit: 10 });

      expect(result.messages.length).toBe(10);
      expect(result.nextCursor).toBe('10');
    });

    it('should support pagination with cursor', async () => {
      const page1 = await store.list({ limit: 30 });
      expect(page1.messages.length).toBe(30);
      expect(page1.nextCursor).toBe('30');

      const page2 = await store.list({ limit: 30, cursor: page1.nextCursor });
      expect(page2.messages.length).toBe(30);
      expect(page2.nextCursor).toBe('60');

      const page3 = await store.list({ limit: 30, cursor: page2.nextCursor });
      expect(page3.messages.length).toBe(30);
      expect(page3.nextCursor).toBe('90');

      const page4 = await store.list({ limit: 30, cursor: page3.nextCursor });
      expect(page4.messages.length).toBe(10);
      expect(page4.nextCursor).toBeUndefined();
    });

    it('should return no nextCursor when no more messages', async () => {
      const result = await store.list({ limit: 200 });

      expect(result.messages.length).toBe(100);
      expect(result.nextCursor).toBeUndefined();
    });

    it('should filter by orderKey', async () => {
      store.clear();

      await store.add(createTestMessage({ id: 'msg1', summary: { orderKey: 'ORDER1' } }));
      await store.add(createTestMessage({ id: 'msg2', summary: { orderKey: 'ORDER1' } }));
      await store.add(createTestMessage({ id: 'msg3', summary: { orderKey: 'ORDER2' } }));
      await store.add(createTestMessage({ id: 'msg4', summary: { orderKey: 'ORDER1' } }));

      const result = await store.list({ orderKey: 'ORDER1' });
      const gotIds = result.messages.map((m) => m.id);

      expect(result.messages.length).toBe(3);
      expect(gotIds).toEqual(['msg4', 'msg2', 'msg1']); // Newest first
      expect(result.total).toBe(3);
    });
  });

  describe('getById', () => {
    it('should return message by ID', async () => {
      const message = createTestMessage({ id: 'test-id-123' });
      await store.add(message);

      const result = await store.getById('test-id-123');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-id-123');
    });

    it('should return null for non-existent ID', async () => {
      const result = await store.getById('does-not-exist');

      expect(result).toBeNull();
    });
  });

  describe('listOrders', () => {
    it('should aggregate orders from messages', async () => {
      store.clear();

      // Order 1: New Order + Partial Fill + Fill
      await store.add(
        createTestMessage({
          id: 'msg1',
          receivedAt: '2024-01-01T10:00:00.000Z',
          summary: { orderKey: 'ORDER1', msgType: 'D', symbol: 'AAPL', side: '1', ordStatus: '0' },
          fields: [
            { tag: '11', name: 'ClOrdID', value: 'ORDER1' },
            { tag: '55', name: 'Symbol', value: 'AAPL' },
            { tag: '54', name: 'Side', value: '1' },
            { tag: '38', name: 'OrderQty', value: '100' },
            { tag: '39', name: 'OrdStatus', value: '0' },
          ],
        })
      );

      await store.add(
        createTestMessage({
          id: 'msg2',
          receivedAt: '2024-01-01T10:01:00.000Z',
          summary: { orderKey: 'ORDER1', msgType: '8', ordStatus: '1' },
          fields: [
            { tag: '11', name: 'ClOrdID', value: 'ORDER1' },
            { tag: '37', name: 'OrderID', value: 'SRV-001' },
            { tag: '39', name: 'OrdStatus', value: '1' },
          ],
        })
      );

      await store.add(
        createTestMessage({
          id: 'msg3',
          receivedAt: '2024-01-01T10:02:00.000Z',
          summary: { orderKey: 'ORDER1', msgType: '8', ordStatus: '2' },
          fields: [
            { tag: '11', name: 'ClOrdID', value: 'ORDER1' },
            { tag: '37', name: 'OrderID', value: 'SRV-001' },
            { tag: '39', name: 'OrdStatus', value: '2' },
          ],
        })
      );

      const orders = await store.listOrders();

      expect(orders.length).toBe(1);

      const wantOrder = {
        orderKey: 'ORDER1',
        orderId: 'SRV-001',
        symbol: 'AAPL',
        side: '1',
        originalQty: '100',
        latestStatus: '2',
        messageCount: 3,
        firstSeenAt: '2024-01-01T10:00:00.000Z',
        lastSeenAt: '2024-01-01T10:02:00.000Z',
      };

      expect(orders[0]).toEqual(wantOrder);
    });

    it('should handle multiple orders', async () => {
      store.clear();

      await store.add(
        createTestMessage({
          id: 'msg1',
          receivedAt: '2024-01-01T10:00:00.000Z',
          summary: { orderKey: 'ORDER1', symbol: 'AAPL' },
          fields: [{ tag: '11', name: 'ClOrdID', value: 'ORDER1' }],
        })
      );

      await store.add(
        createTestMessage({
          id: 'msg2',
          receivedAt: '2024-01-01T11:00:00.000Z',
          summary: { orderKey: 'ORDER2', symbol: 'GOOGL' },
          fields: [{ tag: '11', name: 'ClOrdID', value: 'ORDER2' }],
        })
      );

      await store.add(
        createTestMessage({
          id: 'msg3',
          receivedAt: '2024-01-01T09:00:00.000Z',
          summary: { orderKey: 'ORDER3', symbol: 'MSFT' },
          fields: [{ tag: '11', name: 'ClOrdID', value: 'ORDER3' }],
        })
      );

      const orders = await store.listOrders();
      const gotOrderKeys = orders.map((o) => o.orderKey);

      // Should be sorted by lastSeenAt (newest first)
      expect(gotOrderKeys).toEqual(['ORDER2', 'ORDER1', 'ORDER3']);
    });

    it('should skip messages without orderKey', async () => {
      store.clear();

      await store.add(createTestMessage({ summary: { orderKey: 'ORDER1' } }));
      await store.add(createTestMessage({ summary: {} })); // No orderKey
      await store.add(createTestMessage({ summary: { orderKey: 'ORDER2' } }));

      const orders = await store.listOrders();

      expect(orders.length).toBe(2);
    });

    it('should extract fields from summary when available', async () => {
      store.clear();

      await store.add(
        createTestMessage({
          summary: {
            orderKey: 'ORDER1',
            msgType: 'D',
            symbol: 'AAPL',
            side: '1',
            ordStatus: '0',
          },
          fields: [
            { tag: '11', name: 'ClOrdID', value: 'ORDER1' },
            { tag: '38', name: 'OrderQty', value: '100' },
          ],
        })
      );

      const orders = await store.listOrders();

      expect(orders[0].symbol).toBe('AAPL');
      expect(orders[0].side).toBe('1');
      expect(orders[0].latestStatus).toBe('0');
    });
  });

  describe('clear and count', () => {
    it('should clear all messages', async () => {
      await store.add(createTestMessage());
      await store.add(createTestMessage());

      expect(store.count()).toBe(2);

      store.clear();

      expect(store.count()).toBe(0);
    });
  });
});
