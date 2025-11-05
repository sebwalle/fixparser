/**
 * FIX tag dictionary - maps tag numbers to human-readable names
 *
 * This includes the minimal set of tags needed for the FIX Analyzer,
 * covering standard header, order, and execution report fields.
 */

export const TAG_DICTIONARY: Record<string, string> = {
  // Standard Header
  '8': 'BeginString',
  '9': 'BodyLength',
  '35': 'MsgType',
  '49': 'SenderCompID',
  '56': 'TargetCompID',
  '34': 'MsgSeqNum',
  '52': 'SendingTime',
  '10': 'CheckSum',

  // Order Identification
  '11': 'ClOrdID',
  '37': 'OrderID',
  '41': 'OrigClOrdID',

  // Instrument
  '55': 'Symbol',
  '107': 'SecurityDesc',
  '22': 'SecurityIDSource',
  '48': 'SecurityID',

  // Order Details
  '54': 'Side',
  '38': 'OrderQty',
  '40': 'OrdType',
  '44': 'Price',
  '59': 'TimeInForce',
  '99': 'StopPx',

  // Execution Details
  '150': 'ExecType',
  '39': 'OrdStatus',
  '60': 'TransactTime',
  '32': 'LastQty',
  '31': 'LastPx',
  '151': 'LeavesQty',
  '14': 'CumQty',
  '6': 'AvgPx',

  // Trade Identification
  '17': 'ExecID',
  '19': 'ExecRefID',
  '20': 'ExecTransType',

  // Party Identification
  '1': 'Account',
  '76': 'ExecBroker',
  '109': 'ClientID',

  // Misc
  '58': 'Text',
  '47': 'OrderCapacity',
  '21': 'HandlInst',
  '18': 'ExecInst',
  '100': 'ExDestination',
  '15': 'Currency',
  '64': 'SettlDate',
  '63': 'SettlType',
};

/**
 * Gets the human-readable name for a FIX tag
 * Returns the tag number itself if not found in dictionary
 */
export function getTagName(tag: string): string {
  return TAG_DICTIONARY[tag] || tag;
}

/**
 * Common message type codes
 */
export const MSG_TYPES: Record<string, string> = {
  '0': 'Heartbeat',
  '1': 'TestRequest',
  '2': 'ResendRequest',
  '3': 'Reject',
  '4': 'SequenceReset',
  '5': 'Logout',
  '8': 'ExecutionReport',
  '9': 'OrderCancelReject',
  'A': 'Logon',
  'D': 'NewOrderSingle',
  'F': 'OrderCancelRequest',
  'G': 'OrderCancelReplaceRequest',
};

/**
 * Side codes
 */
export const SIDE_CODES: Record<string, string> = {
  '1': 'Buy',
  '2': 'Sell',
  '3': 'Buy Minus',
  '4': 'Sell Plus',
  '5': 'Sell Short',
  '6': 'Sell Short Exempt',
  '7': 'Undisclosed',
  '8': 'Cross',
  '9': 'Cross Short',
};

/**
 * Order status codes
 */
export const ORD_STATUS_CODES: Record<string, string> = {
  '0': 'New',
  '1': 'Partially Filled',
  '2': 'Filled',
  '3': 'Done For Day',
  '4': 'Canceled',
  '5': 'Replaced',
  '6': 'Pending Cancel',
  '7': 'Stopped',
  '8': 'Rejected',
  '9': 'Suspended',
  'A': 'Pending New',
  'B': 'Calculated',
  'C': 'Expired',
  'D': 'Accepted For Bidding',
  'E': 'Pending Replace',
};

/**
 * Execution type codes
 */
export const EXEC_TYPE_CODES: Record<string, string> = {
  '0': 'New',
  '1': 'Partial Fill',
  '2': 'Fill',
  '3': 'Done For Day',
  '4': 'Canceled',
  '5': 'Replace',
  '6': 'Pending Cancel',
  '7': 'Stopped',
  '8': 'Rejected',
  '9': 'Suspended',
  'A': 'Pending New',
  'B': 'Calculated',
  'C': 'Expired',
  'D': 'Restated',
  'E': 'Pending Replace',
};
