import { kv } from '@vercel/kv';
import type { FixMessage, OrderRow } from '../types';
import type { MessageStore, ListOptions, ListResponse } from './interface';

/**
 * Vercel KV implementation of MessageStore
 * Requires KV_* environment variables to be set
 * Messages are persisted to Redis-compatible KV store
 *
 * Data structure:
 * - messages:list - Sorted set of message IDs (score = timestamp)
 * - message:{id} - Individual message data
 * - orders:list - Sorted set of order keys (score = lastSeenAt timestamp)
 * - order:{orderKey} - Cached order aggregation
 */
export class KVStore implements MessageStore {
  private sseControllers: Set<ReadableStreamDefaultController> = new Set();

  async add(message: FixMessage): Promise<FixMessage> {
    const receivedAt = message.receivedAt || new Date().toISOString();
    const storedMessage: FixMessage = {
      ...message,
      receivedAt,
    };

    const timestamp = new Date(receivedAt).getTime();

    // Store message data
    await kv.set(`message:${storedMessage.id}`, storedMessage);

    // Add to sorted set (score = timestamp, newest first)
    await kv.zadd('messages:list', { score: timestamp, member: storedMessage.id });

    // Update order aggregation if message has orderKey
    if (storedMessage.summary.orderKey) {
      await this.updateOrderAggregation(storedMessage);
    }

    // Broadcast to SSE clients
    this.broadcast(storedMessage);

    return storedMessage;
  }

  async list(options: ListOptions = {}): Promise<ListResponse> {
    const limit = options.limit || 50;
    const cursor = options.cursor ? parseInt(options.cursor, 10) : 0;

    let messageIds: string[];

    if (options.orderKey) {
      // Filter by orderKey: get messages from order-specific set
      messageIds = (await kv.zrange(
        `order:${options.orderKey}:messages`,
        cursor,
        cursor + limit - 1,
        { rev: true }
      )) as string[];
    } else {
      // Get all messages (newest first)
      messageIds = (await kv.zrange('messages:list', cursor, cursor + limit - 1, {
        rev: true,
      })) as string[];
    }

    // Fetch message data in parallel
    const messages = await Promise.all(
      messageIds.map((id) => kv.get<FixMessage>(`message:${id}`))
    );

    // Filter out nulls (should not happen unless data is corrupted)
    const validMessages = messages.filter((msg): msg is FixMessage => msg !== null);

    // Check if there are more messages
    const totalKey = options.orderKey
      ? `order:${options.orderKey}:messages`
      : 'messages:list';
    const total = await kv.zcard(totalKey);
    const hasMore = cursor + limit < (total || 0);
    const nextCursor = hasMore ? (cursor + limit).toString() : undefined;

    return {
      messages: validMessages,
      nextCursor,
      total: total || 0,
    };
  }

  async getById(id: string): Promise<FixMessage | null> {
    const message = await kv.get<FixMessage>(`message:${id}`);
    return message || null;
  }

  async listOrders(): Promise<OrderRow[]> {
    // Get all order keys from sorted set (newest first)
    const orderKeys = (await kv.zrange('orders:list', 0, -1, {
      rev: true,
    })) as string[];

    // Fetch cached order data in parallel
    const orders = await Promise.all(
      orderKeys.map((key) => kv.get<OrderRow>(`order:${key}`))
    );

    // Filter out nulls and return
    return orders.filter((order): order is OrderRow => order !== null);
  }

  stream(controller: ReadableStreamDefaultController): void {
    this.sseControllers.add(controller);
  }

  removeController(controller: ReadableStreamDefaultController): void {
    this.sseControllers.delete(controller);
  }

  /**
   * Update or create order aggregation when a new message arrives
   */
  private async updateOrderAggregation(message: FixMessage): Promise<void> {
    const orderKey = message.summary.orderKey!;
    const timestamp = new Date(message.receivedAt || new Date().toISOString()).getTime();

    // Add message to order-specific message list
    await kv.zadd(`order:${orderKey}:messages`, {
      score: timestamp,
      member: message.id,
    });

    // Get existing order or create new
    const existingOrder = await kv.get<OrderRow>(`order:${orderKey}`);

    if (existingOrder) {
      // Update existing order
      const updatedOrder = this.updateOrderWithMessage(existingOrder, message);
      await kv.set(`order:${orderKey}`, updatedOrder);

      // Update score in orders:list (for sorting)
      await kv.zadd('orders:list', {
        score: new Date(updatedOrder.lastSeenAt).getTime(),
        member: orderKey,
      });
    } else {
      // Create new order
      const newOrder = this.createOrderFromMessage(message);
      await kv.set(`order:${orderKey}`, newOrder);

      // Add to orders:list
      await kv.zadd('orders:list', {
        score: timestamp,
        member: orderKey,
      });
    }
  }

  /**
   * Create a new OrderRow from the first message
   */
  private createOrderFromMessage(message: FixMessage): OrderRow {
    const getField = (tag: string): string | undefined => {
      const field = message.fields.find((f) => f.tag === tag);
      return field?.value;
    };

    return {
      orderKey: message.summary.orderKey!,
      orderId: getField('37') || '',
      symbol: message.summary.symbol || getField('55') || '',
      side: message.summary.side || getField('54') || '',
      originalQty: getField('38') || '',
      latestStatus: message.summary.ordStatus || getField('39') || '',
      messageCount: 1,
      firstSeenAt: message.receivedAt || '',
      lastSeenAt: message.receivedAt || '',
    };
  }

  /**
   * Update an existing OrderRow with a new message
   */
  private updateOrderWithMessage(order: OrderRow, message: FixMessage): OrderRow {
    const getField = (tag: string): string | undefined => {
      const field = message.fields.find((f) => f.tag === tag);
      return field?.value;
    };

    return {
      ...order,
      // Update fields that may change
      orderId: getField('37') || order.orderId,
      latestStatus: message.summary.ordStatus || getField('39') || order.latestStatus,
      messageCount: order.messageCount + 1,
      lastSeenAt: message.receivedAt || order.lastSeenAt,
    };
  }

  /**
   * Broadcast a new message to all connected SSE clients
   */
  private broadcast(message: FixMessage): void {
    const data = JSON.stringify(message);
    const event = `data: ${data}\n\n`;

    for (const controller of this.sseControllers) {
      try {
        controller.enqueue(new TextEncoder().encode(event));
      } catch (error) {
        this.sseControllers.delete(controller);
      }
    }
  }

  /**
   * Clear all data (useful for testing - BE CAREFUL!)
   */
  async clear(): Promise<void> {
    // Get all message IDs
    const messageIds = (await kv.zrange('messages:list', 0, -1)) as string[];

    // Get all order keys
    const orderKeys = (await kv.zrange('orders:list', 0, -1)) as string[];

    // Delete all messages
    await Promise.all([
      ...messageIds.map((id) => kv.del(`message:${id}`)),
      kv.del('messages:list'),
    ]);

    // Delete all orders
    await Promise.all([
      ...orderKeys.flatMap((key) => [
        kv.del(`order:${key}`),
        kv.del(`order:${key}:messages`),
      ]),
      kv.del('orders:list'),
    ]);

    this.sseControllers.clear();
  }
}

// Export singleton instance
export const kvStore = new KVStore();
