/**
 * Core TypeScript interfaces for FIX Analyzer
 */

/**
 * Represents a single parsed FIX field
 */
export interface ParsedField {
  tag: string;
  name: string;
  value: string;
}

/**
 * Summary fields extracted from a FIX message
 */
export interface MessageSummary {
  msgType?: string;
  orderKey?: string; // ClOrdID (tag 11) - primary key for grouping messages
  clOrdId?: string; // Alias for orderKey
  orderId?: string;
  symbol?: string;
  side?: string;
  qty?: string;
  price?: string;
  transType?: string;
  ordStatus?: string;
}

/**
 * Issue found during strict parsing
 */
export interface ParseIssue {
  type: string;
  message: string;
  position?: number;
}

/**
 * Suggestion for repairing a malformed FIX message
 */
export interface RepairSuggestion {
  type: string;
  description: string;
  preview?: string;
}

/**
 * Complete parsed FIX message with metadata
 */
export interface ParsedMessage {
  fields: ParsedField[];
  summary: MessageSummary;
  warnings: string[];
  orderKey?: string;
  raw: string;
}

/**
 * Aggregated order row for display
 */
export interface OrderRow {
  orderKey: string; // ClOrdID (tag 11)
  orderId: string; // OrderID (tag 37)
  symbol: string; // Symbol (tag 55)
  side: string; // Side (tag 54)
  originalQty: string; // OrderQty (tag 38)
  latestStatus: string; // OrdStatus (tag 39)
  messageCount: number; // Number of messages for this order
  firstSeenAt: string; // ISO 8601 timestamp
  lastSeenAt: string; // ISO 8601 timestamp
}

/**
 * Stored message with ID and timestamp
 */
export interface StoredMessage {
  id: string;
  receivedAt: Date;
  parsed: ParsedMessage;
}

/**
 * Complete FIX message for storage and API responses
 * Combines parsed data with storage metadata
 */
export interface FixMessage {
  id: string;
  rawMessage: string;
  fields: ParsedField[];
  summary: MessageSummary;
  receivedAt?: string; // ISO 8601 string for JSON serialization
  warnings?: string[];
}
