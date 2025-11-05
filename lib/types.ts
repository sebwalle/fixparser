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
  clOrdId?: string;
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
  orderKey: string;
  orderId?: string;
  symbol?: string;
  side?: string;
  originalQty?: string;
  latestStatus?: string;
  count: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

/**
 * Stored message with ID and timestamp
 */
export interface StoredMessage {
  id: string;
  receivedAt: Date;
  parsed: ParsedMessage;
}
