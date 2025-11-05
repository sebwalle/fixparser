/**
 * Sample FIX 4.4 protocol messages
 *
 * These samples demonstrate various message types and scenarios
 * commonly used in order lifecycle management.
 */

const SOH = '\x01';

export interface FixSample {
  name: string;
  description: string;
  message: string;
}

/**
 * Collection of sample FIX messages for testing and demonstration
 */
export const SAMPLE_MESSAGES: FixSample[] = [
  {
    name: 'New Order Single',
    description: 'Client submitting a new buy order for 1000 shares of AAPL',
    message: [
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
    ].join(SOH),
  },
  {
    name: 'Execution Report - New',
    description: 'Order acknowledgment from broker',
    message: [
      '8=FIX.4.4',
      '9=250',
      '35=8',
      '49=BROKER1',
      '56=CLIENT1',
      '34=2',
      '52=20250105-10:30:01',
      '11=ORDER001',
      '37=BROKER001',
      '17=EXEC001',
      '150=0',
      '39=0',
      '55=AAPL',
      '54=1',
      '38=1000',
      '40=2',
      '44=150.50',
      '151=1000',
      '14=0',
      '6=0',
      '60=20250105-10:30:01',
      '10=234',
    ].join(SOH),
  },
  {
    name: 'Execution Report - Partial Fill',
    description: '500 shares filled at $150.48',
    message: [
      '8=FIX.4.4',
      '9=280',
      '35=8',
      '49=BROKER1',
      '56=CLIENT1',
      '34=3',
      '52=20250105-10:35:00',
      '11=ORDER001',
      '37=BROKER001',
      '17=EXEC002',
      '150=1',
      '39=1',
      '55=AAPL',
      '54=1',
      '38=1000',
      '40=2',
      '44=150.50',
      '32=500',
      '31=150.48',
      '151=500',
      '14=500',
      '6=150.48',
      '60=20250105-10:35:00',
      '10=345',
    ].join(SOH),
  },
  {
    name: 'Execution Report - Filled',
    description: 'Remaining 500 shares filled at $150.52',
    message: [
      '8=FIX.4.4',
      '9=280',
      '35=8',
      '49=BROKER1',
      '56=CLIENT1',
      '34=4',
      '52=20250105-10:40:00',
      '11=ORDER001',
      '37=BROKER001',
      '17=EXEC003',
      '150=2',
      '39=2',
      '55=AAPL',
      '54=1',
      '38=1000',
      '40=2',
      '44=150.50',
      '32=500',
      '31=150.52',
      '151=0',
      '14=1000',
      '6=150.50',
      '60=20250105-10:40:00',
      '10=456',
    ].join(SOH),
  },
  {
    name: 'New Order Single - Sell',
    description: 'Client submitting a sell order for 500 shares of MSFT',
    message: [
      '8=FIX.4.4',
      '9=200',
      '35=D',
      '49=CLIENT1',
      '56=BROKER1',
      '34=5',
      '52=20250105-11:00:00',
      '11=ORDER002',
      '21=1',
      '55=MSFT',
      '54=2',
      '38=500',
      '40=2',
      '44=380.25',
      '59=0',
      '60=20250105-11:00:00',
      '10=567',
    ].join(SOH),
  },
  {
    name: 'Order Cancel Request',
    description: 'Client requesting to cancel an order',
    message: [
      '8=FIX.4.4',
      '9=180',
      '35=F',
      '49=CLIENT1',
      '56=BROKER1',
      '34=6',
      '52=20250105-11:05:00',
      '11=ORDER003',
      '41=ORDER002',
      '37=BROKER002',
      '55=MSFT',
      '54=2',
      '38=500',
      '60=20250105-11:05:00',
      '10=678',
    ].join(SOH),
  },
  {
    name: 'Order Cancel Reject',
    description: 'Broker rejecting cancel request - order already filled',
    message: [
      '8=FIX.4.4',
      '9=200',
      '35=9',
      '49=BROKER1',
      '56=CLIENT1',
      '34=7',
      '52=20250105-11:05:01',
      '11=ORDER003',
      '41=ORDER002',
      '37=BROKER002',
      '39=2',
      '434=1',
      '58=Order already filled',
      '60=20250105-11:05:01',
      '10=789',
    ].join(SOH),
  },
  {
    name: 'Execution Report - Rejected',
    description: 'Order rejected due to insufficient funds',
    message: [
      '8=FIX.4.4',
      '9=220',
      '35=8',
      '49=BROKER1',
      '56=CLIENT1',
      '34=8',
      '52=20250105-11:10:00',
      '11=ORDER004',
      '37=BROKER003',
      '17=EXEC004',
      '150=8',
      '39=8',
      '55=TSLA',
      '54=1',
      '38=100',
      '40=2',
      '44=250.00',
      '151=0',
      '14=0',
      '6=0',
      '58=Insufficient funds',
      '60=20250105-11:10:00',
      '10=890',
    ].join(SOH),
  },
];

/**
 * Gets a random sample message
 */
export function getRandomSample(): FixSample {
  return SAMPLE_MESSAGES[Math.floor(Math.random() * SAMPLE_MESSAGES.length)];
}

/**
 * Gets all sample messages
 */
export function getAllSamples(): FixSample[] {
  return SAMPLE_MESSAGES;
}

/**
 * Gets a sample message by name
 */
export function getSampleByName(name: string): FixSample | undefined {
  return SAMPLE_MESSAGES.find((s) => s.name === name);
}
