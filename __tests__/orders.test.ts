/**
 * Tests for order aggregation logic
 * Verifies that messages are correctly grouped and aggregated into OrderRow objects
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStore } from '../lib/store/memory';
import type { FixMessage } from '../lib/types';

const SOH = '\x01';

describe('Order Aggregation', () => {
  let store: MemoryStore;

  beforeEach(() => {
    store = new MemoryStore();
    store.clear();
  });

  describe('Order Lifecycle', () => {
    it('should aggregate complete order lifecycle: New -> PartialFill -> Fill', async () => {
      // New Order Single (35=D, 39=0)
      await store.add({
        id: 'msg1',
        rawMessage: `8=FIX.4.4${SOH}35=D${SOH}11=ORD001${SOH}55=AAPL${SOH}54=1${SOH}38=1000${SOH}`,
        fields: [
          { tag: '8', name: 'BeginString', value: 'FIX.4.4' },
          { tag: '35', name: 'MsgType', value: 'D' },
          { tag: '11', name: 'ClOrdID', value: 'ORD001' },
          { tag: '55', name: 'Symbol', value: 'AAPL' },
          { tag: '54', name: 'Side', value: '1' },
          { tag: '38', name: 'OrderQty', value: '1000' },
        ],
        summary: {
          msgType: 'D',
          orderKey: 'ORD001',
          symbol: 'AAPL',
          side: '1',
        },
        receivedAt: '2024-01-15T10:00:00.000Z',
      });

      // Execution Report - Partial Fill (35=8, 39=1)
      await store.add({
        id: 'msg2',
        rawMessage: `8=FIX.4.4${SOH}35=8${SOH}11=ORD001${SOH}37=SRV123${SOH}39=1${SOH}`,
        fields: [
          { tag: '8', name: 'BeginString', value: 'FIX.4.4' },
          { tag: '35', name: 'MsgType', value: '8' },
          { tag: '11', name: 'ClOrdID', value: 'ORD001' },
          { tag: '37', name: 'OrderID', value: 'SRV123' },
          { tag: '39', name: 'OrdStatus', value: '1' },
          { tag: '32', name: 'LastQty', value: '500' },
        ],
        summary: {
          msgType: '8',
          orderKey: 'ORD001',
          ordStatus: '1',
        },
        receivedAt: '2024-01-15T10:00:05.000Z',
      });

      // Execution Report - Filled (35=8, 39=2)
      await store.add({
        id: 'msg3',
        rawMessage: `8=FIX.4.4${SOH}35=8${SOH}11=ORD001${SOH}37=SRV123${SOH}39=2${SOH}`,
        fields: [
          { tag: '8', name: 'BeginString', value: 'FIX.4.4' },
          { tag: '35', name: 'MsgType', value: '8' },
          { tag: '11', name: 'ClOrdID', value: 'ORD001' },
          { tag: '37', name: 'OrderID', value: 'SRV123' },
          { tag: '39', name: 'OrdStatus', value: '2' },
          { tag: '14', name: 'CumQty', value: '1000' },
        ],
        summary: {
          msgType: '8',
          orderKey: 'ORD001',
          ordStatus: '2',
        },
        receivedAt: '2024-01-15T10:00:10.000Z',
      });

      const orders = await store.listOrders();

      expect(orders.length).toBe(1);

      const order = orders[0];
      expect(order.orderKey).toBe('ORD001');
      expect(order.orderId).toBe('SRV123');
      expect(order.symbol).toBe('AAPL');
      expect(order.side).toBe('1');
      expect(order.originalQty).toBe('1000');
      expect(order.latestStatus).toBe('2'); // Filled
      expect(order.messageCount).toBe(3);
      expect(order.firstSeenAt).toBe('2024-01-15T10:00:00.000Z');
      expect(order.lastSeenAt).toBe('2024-01-15T10:00:10.000Z');
    });

    it('should aggregate order with cancel request and reject', async () => {
      // New Order Single
      await store.add({
        id: 'msg1',
        rawMessage: `8=FIX.4.4${SOH}35=D${SOH}11=ORD002${SOH}`,
        fields: [
          { tag: '11', name: 'ClOrdID', value: 'ORD002' },
          { tag: '55', name: 'Symbol', value: 'GOOGL' },
          { tag: '54', name: 'Side', value: '2' },
          { tag: '38', name: 'OrderQty', value: '50' },
        ],
        summary: { orderKey: 'ORD002', msgType: 'D', symbol: 'GOOGL', side: '2' },
        receivedAt: '2024-01-15T11:00:00.000Z',
      });

      // Order Cancel Request (35=F)
      await store.add({
        id: 'msg2',
        rawMessage: `8=FIX.4.4${SOH}35=F${SOH}11=ORD002${SOH}`,
        fields: [
          { tag: '11', name: 'ClOrdID', value: 'ORD002' },
          { tag: '37', name: 'OrderID', value: 'SRV456' },
        ],
        summary: { orderKey: 'ORD002', msgType: 'F' },
        receivedAt: '2024-01-15T11:00:05.000Z',
      });

      // Order Cancel Reject (35=9)
      await store.add({
        id: 'msg3',
        rawMessage: `8=FIX.4.4${SOH}35=9${SOH}11=ORD002${SOH}`,
        fields: [
          { tag: '11', name: 'ClOrdID', value: 'ORD002' },
          { tag: '37', name: 'OrderID', value: 'SRV456' },
          { tag: '39', name: 'OrdStatus', value: '0' }, // Still New
        ],
        summary: { orderKey: 'ORD002', msgType: '9', ordStatus: '0' },
        receivedAt: '2024-01-15T11:00:10.000Z',
      });

      const orders = await store.listOrders();

      expect(orders.length).toBe(1);
      expect(orders[0].messageCount).toBe(3);
      expect(orders[0].latestStatus).toBe('0'); // Still New (cancel rejected)
    });
  });

  describe('Field Extraction Priority', () => {
    it('should prefer summary fields over field array', async () => {
      await store.add({
        id: 'msg1',
        rawMessage: `8=FIX.4.4${SOH}35=D${SOH}`,
        fields: [
          { tag: '11', name: 'ClOrdID', value: 'ORD003' },
          { tag: '55', name: 'Symbol', value: 'MSFT' }, // In fields
          { tag: '54', name: 'Side', value: '1' }, // In fields
          { tag: '38', name: 'OrderQty', value: '200' },
        ],
        summary: {
          orderKey: 'ORD003',
          msgType: 'D',
          symbol: 'AAPL', // Different in summary
          side: '2', // Different in summary
        },
        receivedAt: '2024-01-15T12:00:00.000Z',
      });

      const orders = await store.listOrders();

      // Should use summary values
      expect(orders[0].symbol).toBe('AAPL');
      expect(orders[0].side).toBe('2');
    });

    it('should fall back to field array when summary is empty', async () => {
      await store.add({
        id: 'msg1',
        rawMessage: `8=FIX.4.4${SOH}35=D${SOH}`,
        fields: [
          { tag: '11', name: 'ClOrdID', value: 'ORD004' },
          { tag: '55', name: 'Symbol', value: 'TSLA' },
          { tag: '54', name: 'Side', value: '1' },
          { tag: '38', name: 'OrderQty', value: '75' },
          { tag: '39', name: 'OrdStatus', value: '0' },
        ],
        summary: { orderKey: 'ORD004', msgType: 'D' }, // No symbol, side, ordStatus
        receivedAt: '2024-01-15T12:00:00.000Z',
      });

      const orders = await store.listOrders();

      expect(orders[0].symbol).toBe('TSLA');
      expect(orders[0].side).toBe('1');
      expect(orders[0].latestStatus).toBe('0');
    });
  });

  describe('OrderID Handling', () => {
    it('should extract OrderID from later messages when not in first', async () => {
      // New Order Single (no OrderID yet - assigned by server)
      await store.add({
        id: 'msg1',
        rawMessage: `8=FIX.4.4${SOH}35=D${SOH}11=ORD005${SOH}`,
        fields: [
          { tag: '11', name: 'ClOrdID', value: 'ORD005' },
          { tag: '38', name: 'OrderQty', value: '100' },
        ],
        summary: { orderKey: 'ORD005', msgType: 'D' },
        receivedAt: '2024-01-15T13:00:00.000Z',
      });

      // Execution Report (has OrderID from server)
      await store.add({
        id: 'msg2',
        rawMessage: `8=FIX.4.4${SOH}35=8${SOH}11=ORD005${SOH}37=SRV789${SOH}`,
        fields: [
          { tag: '11', name: 'ClOrdID', value: 'ORD005' },
          { tag: '37', name: 'OrderID', value: 'SRV789' },
          { tag: '39', name: 'OrdStatus', value: '0' },
        ],
        summary: { orderKey: 'ORD005', msgType: '8', ordStatus: '0' },
        receivedAt: '2024-01-15T13:00:01.000Z',
      });

      const orders = await store.listOrders();

      expect(orders[0].orderId).toBe('SRV789');
    });
  });

  describe('Multiple Concurrent Orders', () => {
    it('should track multiple orders independently', async () => {
      const orderConfigs = [
        { orderKey: 'ORD-A', symbol: 'AAPL', side: '1', qty: '100' },
        { orderKey: 'ORD-B', symbol: 'GOOGL', side: '2', qty: '50' },
        { orderKey: 'ORD-C', symbol: 'MSFT', side: '1', qty: '200' },
      ];

      for (const config of orderConfigs) {
        await store.add({
          id: `${config.orderKey}-msg1`,
          rawMessage: `8=FIX.4.4${SOH}35=D${SOH}`,
          fields: [
            { tag: '11', name: 'ClOrdID', value: config.orderKey },
            { tag: '55', name: 'Symbol', value: config.symbol },
            { tag: '54', name: 'Side', value: config.side },
            { tag: '38', name: 'OrderQty', value: config.qty },
          ],
          summary: {
            orderKey: config.orderKey,
            msgType: 'D',
            symbol: config.symbol,
            side: config.side,
          },
          receivedAt: new Date().toISOString(),
        });
      }

      const orders = await store.listOrders();
      const orderMap: Record<string, any> = {};
      orders.forEach((o) => {
        orderMap[o.orderKey] = {
          symbol: o.symbol,
          side: o.side,
          originalQty: o.originalQty,
        };
      });

      const wantOrders = {
        'ORD-A': { symbol: 'AAPL', side: '1', originalQty: '100' },
        'ORD-B': { symbol: 'GOOGL', side: '2', originalQty: '50' },
        'ORD-C': { symbol: 'MSFT', side: '1', originalQty: '200' },
      };

      expect(orderMap).toEqual(wantOrders);
    });
  });

  describe('Empty and Edge Cases', () => {
    it('should return empty array when no messages', async () => {
      const orders = await store.listOrders();
      expect(orders).toEqual([]);
    });

    it('should handle messages with missing fields gracefully', async () => {
      await store.add({
        id: 'msg1',
        rawMessage: `8=FIX.4.4${SOH}35=D${SOH}11=ORD006${SOH}`,
        fields: [{ tag: '11', name: 'ClOrdID', value: 'ORD006' }],
        summary: { orderKey: 'ORD006', msgType: 'D' },
        receivedAt: '2024-01-15T14:00:00.000Z',
      });

      const orders = await store.listOrders();

      expect(orders.length).toBe(1);
      expect(orders[0].orderKey).toBe('ORD006');
      expect(orders[0].symbol).toBe('');
      expect(orders[0].side).toBe('');
      expect(orders[0].originalQty).toBe('');
      expect(orders[0].latestStatus).toBe('');
    });
  });

  describe('Sorting', () => {
    it('should sort orders by lastSeenAt (newest first)', async () => {
      await store.add({
        id: 'msg1',
        rawMessage: '',
        fields: [{ tag: '11', name: 'ClOrdID', value: 'ORD-OLD' }],
        summary: { orderKey: 'ORD-OLD' },
        receivedAt: '2024-01-15T09:00:00.000Z',
      });

      await store.add({
        id: 'msg2',
        rawMessage: '',
        fields: [{ tag: '11', name: 'ClOrdID', value: 'ORD-NEW' }],
        summary: { orderKey: 'ORD-NEW' },
        receivedAt: '2024-01-15T15:00:00.000Z',
      });

      await store.add({
        id: 'msg3',
        rawMessage: '',
        fields: [{ tag: '11', name: 'ClOrdID', value: 'ORD-MID' }],
        summary: { orderKey: 'ORD-MID' },
        receivedAt: '2024-01-15T12:00:00.000Z',
      });

      const orders = await store.listOrders();
      const orderKeys = orders.map((o) => o.orderKey);

      expect(orderKeys).toEqual(['ORD-NEW', 'ORD-MID', 'ORD-OLD']);
    });

    it('should update lastSeenAt when new message arrives for order', async () => {
      await store.add({
        id: 'msg1',
        rawMessage: '',
        fields: [{ tag: '11', name: 'ClOrdID', value: 'ORD007' }],
        summary: { orderKey: 'ORD007' },
        receivedAt: '2024-01-15T10:00:00.000Z',
      });

      await store.add({
        id: 'msg2',
        rawMessage: '',
        fields: [{ tag: '11', name: 'ClOrdID', value: 'ORD008' }],
        summary: { orderKey: 'ORD008' },
        receivedAt: '2024-01-15T11:00:00.000Z',
      });

      // Update ORD007 with new message
      await store.add({
        id: 'msg3',
        rawMessage: '',
        fields: [{ tag: '11', name: 'ClOrdID', value: 'ORD007' }],
        summary: { orderKey: 'ORD007' },
        receivedAt: '2024-01-15T12:00:00.000Z',
      });

      const orders = await store.listOrders();
      const orderKeys = orders.map((o) => o.orderKey);

      // ORD007 should now be first (most recent)
      expect(orderKeys).toEqual(['ORD007', 'ORD008']);
      expect(orders[0].lastSeenAt).toBe('2024-01-15T12:00:00.000Z');
      expect(orders[0].firstSeenAt).toBe('2024-01-15T10:00:00.000Z');
    });
  });
});
