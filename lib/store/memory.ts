import type { FixMessage, OrderRow } from '../types';
import type { MessageStore, ListOptions, ListResponse } from './interface';

/**
 * In-memory implementation of MessageStore
 * Suitable for development and low-traffic production use
 * Messages are stored in memory and lost on restart
 */
export class MemoryStore implements MessageStore {
  private messages: FixMessage[] = [];
  private sseControllers: Set<ReadableStreamDefaultController> = new Set();

  async add(message: FixMessage): Promise<FixMessage> {
    // Ensure receivedAt is set
    const storedMessage: FixMessage = {
      ...message,
      receivedAt: message.receivedAt || new Date().toISOString(),
    };

    // Add to beginning of array (newest first)
    this.messages.unshift(storedMessage);

    // Broadcast to SSE clients
    this.broadcast(storedMessage);

    return storedMessage;
  }

  async list(options: ListOptions = {}): Promise<ListResponse> {
    const limit = options.limit || 50;
    const cursor = options.cursor ? parseInt(options.cursor, 10) : 0;

    // Filter by orderKey if provided
    let filtered = this.messages;
    if (options.orderKey) {
      filtered = this.messages.filter(
        (msg) => msg.summary.orderKey === options.orderKey
      );
    }

    // Slice for pagination
    const start = cursor;
    const end = start + limit;
    const messages = filtered.slice(start, end);

    // Calculate next cursor
    const hasMore = end < filtered.length;
    const nextCursor = hasMore ? end.toString() : undefined;

    return {
      messages,
      nextCursor,
      total: filtered.length,
    };
  }

  async getById(id: string): Promise<FixMessage | null> {
    const message = this.messages.find((msg) => msg.id === id);
    return message || null;
  }

  async listOrders(): Promise<OrderRow[]> {
    // Group messages by orderKey
    const orderMap = new Map<string, FixMessage[]>();

    for (const msg of this.messages) {
      const orderKey = msg.summary.orderKey;
      if (!orderKey) continue; // Skip messages without ClOrdID

      if (!orderMap.has(orderKey)) {
        orderMap.set(orderKey, []);
      }
      orderMap.get(orderKey)!.push(msg);
    }

    // Aggregate each order
    const orders: OrderRow[] = [];
    for (const [orderKey, msgs] of orderMap.entries()) {
      const order = this.aggregateOrder(orderKey, msgs);
      orders.push(order);
    }

    // Sort by lastSeenAt (newest first)
    orders.sort(
      (a, b) =>
        new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
    );

    return orders;
  }

  stream(controller: ReadableStreamDefaultController): void {
    this.sseControllers.add(controller);

    // Clean up on close
    // Note: There's no direct "onClose" event for ReadableStreamDefaultController
    // We rely on the caller to call controller.close() and remove the controller
  }

  /**
   * Remove a controller from the SSE broadcast list
   * Call this when a client disconnects
   */
  removeController(controller: ReadableStreamDefaultController): void {
    this.sseControllers.delete(controller);
  }

  /**
   * Broadcast a new message to all connected SSE clients
   */
  private broadcast(message: FixMessage): void {
    const data = JSON.stringify(message);
    const event = `data: ${data}\n\n`;

    // Send to all connected clients
    for (const controller of this.sseControllers) {
      try {
        controller.enqueue(new TextEncoder().encode(event));
      } catch (error) {
        // Controller may be closed, remove it
        this.sseControllers.delete(controller);
      }
    }
  }

  /**
   * Aggregate a single order from its messages
   * Extracts key fields and calculates derived values
   */
  private aggregateOrder(orderKey: string, msgs: FixMessage[]): OrderRow {
    // Sort messages by receivedAt (oldest first) for processing
    const sorted = [...msgs].sort(
      (a, b) =>
        new Date(a.receivedAt || 0).getTime() -
        new Date(b.receivedAt || 0).getTime()
    );

    const firstMsg = sorted[0];
    const lastMsg = sorted[sorted.length - 1];

    // Extract fields from summary or fields array
    const getField = (msg: FixMessage, tag: string): string | undefined => {
      const field = msg.fields.find((f) => f.tag === tag);
      return field?.value;
    };

    // Helper to find a field across all messages (prefer earlier messages for static fields)
    const findField = (tag: string): string | undefined => {
      for (const msg of sorted) {
        const value = getField(msg, tag);
        if (value) return value;
      }
      return undefined;
    };

    // Helper to find a summary field across all messages
    const findSummaryField = (
      key: keyof FixMessage['summary']
    ): string | undefined => {
      for (const msg of sorted) {
        const value = msg.summary[key];
        if (value) return value as string;
      }
      return undefined;
    };

    // Get latest values for key fields
    const orderId = getField(lastMsg, '37') || findField('37'); // OrderID - may not exist in first message
    const symbol = findSummaryField('symbol') || findField('55');
    const side = findSummaryField('side') || findField('54');
    const latestStatus =
      lastMsg.summary.ordStatus || getField(lastMsg, '39') || '';

    // Get original quantity from first message (New Order Single)
    const originalQty = getField(firstMsg, '38'); // OrderQty

    return {
      orderKey, // ClOrdID (tag 11)
      orderId: orderId || '', // OrderID (tag 37)
      symbol: symbol || '',
      side: side || '',
      originalQty: originalQty || '',
      latestStatus: latestStatus,
      messageCount: msgs.length,
      firstSeenAt: firstMsg.receivedAt || '',
      lastSeenAt: lastMsg.receivedAt || '',
    };
  }

  /**
   * Clear all messages (useful for testing)
   */
  clear(): void {
    this.messages = [];
    this.sseControllers.clear();
  }

  /**
   * Get message count (useful for testing)
   */
  count(): number {
    return this.messages.length;
  }
}

// Export singleton instance
export const memoryStore = new MemoryStore();
