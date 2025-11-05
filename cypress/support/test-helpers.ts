/**
 * Cypress Test Helpers
 * Common utilities and test data for E2E tests
 */

import type { FixMessage, OrderRow } from '../../lib/types';

/**
 * Creates a mock FixMessage with realistic data
 */
export function createMockFixMessage(overrides?: Partial<FixMessage>): FixMessage {
  return {
    id: 'msg_test_' + Math.random().toString(36).substring(7),
    receivedAt: new Date().toISOString(),
    rawMessage: '8=FIX.4.4|9=100|35=D|11=ORDER001|55=AAPL|54=1|38=100|',
    fields: [
      { tag: '8', name: 'BeginString', value: 'FIX.4.4' },
      { tag: '9', name: 'BodyLength', value: '100' },
      { tag: '35', name: 'MsgType', value: 'D' },
      { tag: '11', name: 'ClOrdID', value: 'ORDER001' },
      { tag: '55', name: 'Symbol', value: 'AAPL' },
      { tag: '54', name: 'Side', value: '1' },
      { tag: '38', name: 'OrderQty', value: '100' },
    ],
    summary: {
      msgType: 'D',
      orderKey: 'ORDER001',
      clOrdId: 'ORDER001',
      orderId: 'ORD123',
      symbol: 'AAPL',
      side: '1',
      qty: '100',
      price: '150.00',
      ordStatus: '0',
    },
    warnings: [],
    ...overrides,
  };
}

/**
 * Creates a mock OrderRow with realistic data
 */
export function createMockOrderRow(overrides?: Partial<OrderRow>): OrderRow {
  return {
    orderKey: 'ORDER001',
    orderId: 'ORD123',
    symbol: 'AAPL',
    side: '1',
    originalQty: '100',
    latestStatus: '0',
    messageCount: 1,
    firstSeenAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Waits for and verifies a toast message appears
 */
export function verifyToast(message: string) {
  cy.contains(message, { timeout: 5000 }).should('be.visible');
}

/**
 * Formats a FIX message for readability (SOH to pipe)
 */
export function makeReadable(fixMessage: string): string {
  return fixMessage.replace(/\x01/g, '|');
}

/**
 * Sets up common API intercepts with empty responses
 */
export function setupEmptyState() {
  cy.intercept('GET', '/api/orders', {
    statusCode: 200,
    body: { data: [] },
  }).as('getOrdersEmpty');

  cy.intercept('GET', '/api/messages?limit=50', {
    statusCode: 200,
    body: {
      data: [],
      meta: { nextCursor: null, total: 0 },
    },
  }).as('getMessagesEmpty');

  cy.intercept('GET', '/api/messages/stream', {
    statusCode: 200,
    headers: { 'Content-Type': 'text/event-stream' },
    body: '',
  }).as('sseStream');
}

/**
 * Navigates to the home page and waits for initial load
 */
export function visitHome() {
  cy.visit('/');
  cy.wait('@getOrdersEmpty', { timeout: 10000 });
  cy.wait('@getMessagesEmpty', { timeout: 10000 });
}

/**
 * Verifies all four main sections are visible
 */
export function verifyAllSectionsVisible() {
  cy.contains('1. Ingest Messages').should('be.visible');
  cy.contains('2. Orders').should('be.visible');
  cy.contains('3. Messages').should('be.visible');
  cy.contains('4. Details').should('be.visible');
}

/**
 * Types a FIX message into the textarea
 */
export function enterFixMessage(message: string) {
  cy.get('textarea[placeholder*="Paste FIX message"]')
    .should('be.visible')
    .clear()
    .type(message, { delay: 0 });
}

/**
 * Clicks the strict parse button and waits for response
 */
export function strictParse() {
  cy.contains('button', 'Strict Parse & Store').click();
  cy.wait('@ingestMessage', { timeout: 10000 });
}

/**
 * Clicks the relaxed parse button and waits for response
 */
export function relaxedParse() {
  cy.contains('button', 'Relaxed Parse (Test Only)').click();
  cy.wait('@relaxedParse', { timeout: 10000 });
}

/**
 * Verifies a message appears in the messages table
 */
export function verifyMessageInTable(symbol: string) {
  cy.get('[data-section="messages"]').within(() => {
    cy.contains(symbol).should('be.visible');
  });
}

/**
 * Verifies an order appears in the orders table
 */
export function verifyOrderInTable(orderKey: string) {
  cy.get('[data-section="orders"]').within(() => {
    cy.contains(orderKey).should('be.visible');
  });
}

/**
 * Clicks on a message in the messages table
 */
export function clickMessage(index: number = 0) {
  cy.get('[data-section="messages"]').within(() => {
    cy.get('tbody tr').eq(index).click();
  });
}

/**
 * Clicks on an order in the orders table
 */
export function clickOrder(index: number = 0) {
  cy.get('[data-section="orders"]').within(() => {
    cy.get('tbody tr').eq(index).click();
  });
}

/**
 * Verifies the details section shows a specific value
 */
export function verifyDetailContains(text: string) {
  cy.get('[data-section="details"]').within(() => {
    cy.contains(text).should('be.visible');
  });
}

/**
 * Real FIX messages for testing
 */
export const SAMPLE_FIX_MESSAGES = {
  // USD/SEK FX Trade (Execution Report - Filled)
  USDSSEK_EXEC_FILLED: '8=FIX.4.49=157335=849=MAP_BLP_PROD56=MAP_CAR1_PROD34=951144=FX52=20240809-14:47:20.24138730=XOFF60=20240809-14:47:19.914120=SEK150=F31=10.5036125151=032=5000063=264=2024081222894=10.50312405=16=10.50361251056=525180.6337=2799553338=5000039=240=1460=41300=XOFF11=3-2-898800662T-0-0133=10.503612514=50000194=10.5031854=015=USD75=20240809195=0.000512517=3-2-898800662T-0-0167=FOR377=N797=Y22277=022280=1442=154=155=USD/SEK119=525180.6378=179=Test fund467=180=500001908=21909=BBG0000000000B66B03AA8483000431910=5493001KJTIIGC8Y1R121911=11912=01909=BBG0000000000B66B03AA8483000431911=11912=610009=310010=MidRate10011=10.49975622162=0.00050622276=022485=10.499322486=022545=010010=RefRate10011=10.50123422162=0.00053422276=022485=10.500722486=022545=010010=BMTB10011=10.496972922162=0.000482922276=122485=10.4964922486=122545=022078=122079=10.5036125022080=2022081=12453=6448=XOFF447=G452=16448=CAR1447=D452=13802=3523=CARNEGIE INVESTMENT BANK AB, Stockholm803=1523=LiminaTrader803=2523=NIKLAS LINDEKE803=9448=LiminaTrader447=P452=122376=24802=1523=Y803=4047448=BMTB447=D452=1802=3523=CACEIS INVESTOR SERVICES BANK SA803=1523=31734351803=2523=INSB INV SERV BANK SA803=9448=PRODUCT TYPE447=D452=16802=1523=Dealing Outsourced803=4448=LiminaTrader447=D452=111907=21903=BBG0000000000B66B03AA8483000441905=5493001KJTIIGC8Y1R121904=01906=02411=11903=BBG0000000000B66B03AA8483000441904=01906=62411=1768=2769=20240809-14:47:19.914770=1769=20240809-14:47:13.000770=1010=168',

  // Simple New Order Single
  NEW_ORDER_AAPL: '8=FIX.4.4|9=150|35=D|11=ORDER-001|55=AAPL|54=1|38=100|40=2|44=150.50|',

  // Simple Execution Report - Partial Fill
  EXEC_PARTIAL: '8=FIX.4.4|9=150|35=8|11=ORDER-001|37=ORD-123|55=AAPL|54=1|38=100|39=1|32=50|31=150.50|',

  // Simple Execution Report - Filled
  EXEC_FILLED: '8=FIX.4.4|9=150|35=8|11=ORDER-001|37=ORD-123|55=AAPL|54=1|38=100|39=2|32=100|31=150.50|',
};
