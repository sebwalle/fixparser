import type { FixMessage, OrderRow } from '../types';

/**
 * Pagination options for listing messages
 */
export interface ListOptions {
  /** Number of items to return (default: 50) */
  limit?: number;
  /** Cursor for pagination (implementation-specific) */
  cursor?: string;
  /** Filter messages by orderKey (ClOrdID) */
  orderKey?: string;
}

/**
 * Paginated response for message lists
 */
export interface ListResponse {
  messages: FixMessage[];
  /** Next cursor for pagination, undefined if no more items */
  nextCursor?: string;
  /** Total count of messages (may be approximate for large datasets) */
  total?: number;
}

/**
 * MessageStore interface for persisting and querying FIX messages
 *
 * Implementations:
 * - memory.ts: In-memory store (default)
 * - kv.ts: Vercel KV store (optional, feature-flagged)
 */
export interface MessageStore {
  /**
   * Add a new message to the store
   * @param message - Parsed FIX message to store
   * @returns The stored message with any generated fields (e.g., receivedAt)
   */
  add(message: FixMessage): Promise<FixMessage>;

  /**
   * List messages with optional filtering and pagination
   * @param options - Pagination and filter options
   * @returns Paginated list of messages
   */
  list(options?: ListOptions): Promise<ListResponse>;

  /**
   * Get a specific message by ID
   * @param id - Message ID
   * @returns The message, or null if not found
   */
  getById(id: string): Promise<FixMessage | null>;

  /**
   * List all orders (aggregated view by orderKey/ClOrdID)
   * Orders are derived from messages, grouped by ClOrdID (tag 11)
   * @returns Array of aggregated order rows
   */
  listOrders(): Promise<OrderRow[]>;

  /**
   * Stream new messages to an SSE client
   * Broadcasts new messages as they are added via add()
   * @param controller - ReadableStreamDefaultController to write SSE events
   */
  stream(controller: ReadableStreamDefaultController): void;
}
