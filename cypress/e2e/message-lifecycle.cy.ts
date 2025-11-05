/// <reference types="cypress" />

/**
 * Message Lifecycle E2E Tests
 * Tests the complete lifecycle of a FIX message through the system
 * using helper functions for cleaner test code
 */

import {
  setupEmptyState,
  visitHome,
  verifyAllSectionsVisible,
  enterFixMessage,
  strictParse,
  relaxedParse,
  verifyToast,
  makeReadable,
  createMockFixMessage,
  createMockOrderRow,
  SAMPLE_FIX_MESSAGES,
  verifyMessageInTable,
  verifyOrderInTable,
  clickMessage,
  clickOrder,
  verifyDetailContains,
} from '../support/test-helpers';

describe('Message Lifecycle', () => {
  beforeEach(() => {
    setupEmptyState();
    visitHome();
  });

  describe('New Order → Partial Fill → Full Fill', () => {
    it('tracks order lifecycle through multiple messages', () => {
      //
      // Step 1: Submit New Order Single
      //
      cy.log('Step 1: Submit New Order Single');

      const newOrderMsg = createMockFixMessage({
        summary: {
          msgType: 'D',
          orderKey: 'ORDER-LIFECYCLE-001',
          clOrdId: 'ORDER-LIFECYCLE-001',
          orderId: undefined, // No OrderID yet
          symbol: 'TSLA',
          side: '1',
          qty: '200',
          price: '250.00',
          ordStatus: undefined, // No status for new orders
        },
      });

      cy.intercept('POST', '/api/messages/ingest', {
        statusCode: 201,
        body: { data: newOrderMsg },
      }).as('ingestMessage');

      enterFixMessage(makeReadable(SAMPLE_FIX_MESSAGES.NEW_ORDER_AAPL));
      strictParse();

      verifyToast('Message parsed successfully');

      //
      // Step 2: Order appears in orders section
      //
      cy.log('Step 2: Verify order appears with New status');

      const orderRow = createMockOrderRow({
        orderKey: 'ORDER-LIFECYCLE-001',
        orderId: '', // Still empty
        symbol: 'TSLA',
        side: '1',
        originalQty: '200',
        latestStatus: '0', // New
        messageCount: 1,
      });

      cy.intercept('GET', '/api/orders', {
        statusCode: 200,
        body: { data: [orderRow] },
      }).as('getOrders');

      cy.reload();
      cy.wait('@getOrders');

      verifyOrderInTable('ORDER-LIFECYCLE-001');
      cy.get('[data-section="orders"]').contains('New').should('be.visible');

      //
      // Step 3: Submit Partial Fill Execution Report
      //
      cy.log('Step 3: Submit Partial Fill');

      const partialFillMsg = createMockFixMessage({
        summary: {
          msgType: '8',
          orderKey: 'ORDER-LIFECYCLE-001',
          clOrdId: 'ORDER-LIFECYCLE-001',
          orderId: 'ORD-123456',
          symbol: 'TSLA',
          side: '1',
          qty: '100', // Partial: 100 of 200
          price: '250.00',
          ordStatus: '1', // Partial
        },
      });

      cy.intercept('POST', '/api/messages/ingest', {
        statusCode: 201,
        body: { data: partialFillMsg },
      }).as('ingestMessage2');

      enterFixMessage(makeReadable(SAMPLE_FIX_MESSAGES.EXEC_PARTIAL));
      strictParse();

      verifyToast('Message parsed successfully');

      //
      // Step 4: Order status updates to Partial
      //
      cy.log('Step 4: Verify order status updates to Partial');

      const updatedOrderRow = {
        ...orderRow,
        orderId: 'ORD-123456',
        latestStatus: '1', // Partial
        messageCount: 2,
      };

      cy.intercept('GET', '/api/orders', {
        statusCode: 200,
        body: { data: [updatedOrderRow] },
      }).as('getOrdersPartial');

      cy.reload();
      cy.wait('@getOrdersPartial');

      verifyOrderInTable('ORDER-LIFECYCLE-001');
      cy.get('[data-section="orders"]').contains('Partial').should('be.visible');
      cy.get('[data-section="orders"]').contains('2 messages').should('be.visible');

      //
      // Step 5: Click order to filter messages
      //
      cy.log('Step 5: Filter messages by order');

      cy.intercept('GET', '/api/messages?limit=50&orderKey=ORDER-LIFECYCLE-001', {
        statusCode: 200,
        body: {
          data: [newOrderMsg, partialFillMsg],
          meta: { nextCursor: null, total: 2 },
        },
      }).as('getMessagesFiltered');

      clickOrder(0);
      cy.wait('@getMessagesFiltered');

      cy.get('[data-section="messages"]').within(() => {
        cy.contains('Filtered by: ORDER-LIFECYCLE-001').should('be.visible');
        cy.get('tbody tr').should('have.length', 2);
      });

      //
      // Step 6: Submit Full Fill Execution Report
      //
      cy.log('Step 6: Submit Full Fill');

      const fullFillMsg = createMockFixMessage({
        summary: {
          msgType: '8',
          orderKey: 'ORDER-LIFECYCLE-001',
          clOrdId: 'ORDER-LIFECYCLE-001',
          orderId: 'ORD-123456',
          symbol: 'TSLA',
          side: '1',
          qty: '200', // Full: 200 of 200
          price: '250.00',
          ordStatus: '2', // Filled
        },
      });

      cy.intercept('POST', '/api/messages/ingest', {
        statusCode: 201,
        body: { data: fullFillMsg },
      }).as('ingestMessage3');

      // Clear filter first
      cy.get('[data-section="messages"]')
        .find('button[aria-label="Clear filter"]')
        .click();

      cy.intercept('GET', '/api/messages?limit=50', {
        statusCode: 200,
        body: {
          data: [newOrderMsg, partialFillMsg, fullFillMsg],
          meta: { nextCursor: null, total: 3 },
        },
      }).as('getMessagesAll');

      cy.wait('@getMessagesAll');

      enterFixMessage(makeReadable(SAMPLE_FIX_MESSAGES.EXEC_FILLED));
      strictParse();

      verifyToast('Message parsed successfully');

      //
      // Step 7: Order status updates to Filled
      //
      cy.log('Step 7: Verify order status updates to Filled');

      const filledOrderRow = {
        ...updatedOrderRow,
        latestStatus: '2', // Filled
        messageCount: 3,
      };

      cy.intercept('GET', '/api/orders', {
        statusCode: 200,
        body: { data: [filledOrderRow] },
      }).as('getOrdersFilled');

      cy.reload();
      cy.wait('@getOrdersFilled');

      verifyOrderInTable('ORDER-LIFECYCLE-001');
      cy.get('[data-section="orders"]').contains('Filled').should('be.visible');
      cy.get('[data-section="orders"]').contains('3 messages').should('be.visible');

      //
      // Step 8: View message details
      //
      cy.log('Step 8: View details of filled message');

      cy.intercept('GET', '/api/messages?limit=50', {
        statusCode: 200,
        body: {
          data: [fullFillMsg, partialFillMsg, newOrderMsg],
          meta: { nextCursor: null, total: 3 },
        },
      }).as('getMessagesAll2');

      cy.wait('@getMessagesAll2');

      clickMessage(0); // Click first (most recent) message

      verifyDetailContains('ExecReport');
      verifyDetailContains('Filled');
      verifyDetailContains('TSLA');
      verifyDetailContains('ORD-123456');
    });
  });

  describe('Error Handling', () => {
    it('shows error for malformed FIX message', () => {
      cy.log('Test error handling for invalid message');

      cy.intercept('POST', '/api/messages/ingest', {
        statusCode: 400,
        body: {
          error: 'Parse failed',
          issues: [
            { type: 'MISSING_REQUIRED_FIELD', message: 'Missing required field: MsgType (35)' },
          ],
          suggestions: [],
        },
      }).as('ingestError');

      enterFixMessage('8=FIX.4.4|9=50|'); // Incomplete message
      strictParse();

      // Verify error toast
      cy.contains('Parse failed').should('be.visible');
      cy.contains('Missing required field: MsgType').should('be.visible');
    });

    it('shows suggestions for repairable messages', () => {
      cy.log('Test repair suggestions');

      cy.intercept('POST', '/api/messages/ingest', {
        statusCode: 400,
        body: {
          error: 'Parse failed',
          issues: [{ type: 'INVALID_CHECKSUM', message: 'Invalid checksum' }],
          suggestions: [
            {
              type: 'FIX_CHECKSUM',
              description: 'Calculate and append correct checksum',
              preview: '8=FIX.4.4|9=100|35=D|...|10=123|',
            },
          ],
        },
      }).as('ingestErrorWithSuggestions');

      enterFixMessage('8=FIX.4.4|9=100|35=D|11=TEST|10=000|'); // Invalid checksum
      strictParse();

      // Verify error and suggestions
      cy.contains('Parse failed').should('be.visible');
      cy.contains('repair suggestion(s) available').should('be.visible');
    });
  });

  describe('Pagination', () => {
    it('handles pagination for large message lists', () => {
      cy.log('Test message pagination');

      // Create 51 messages (more than default limit of 50)
      const messages = Array.from({ length: 51 }, (_, i) =>
        createMockFixMessage({
          id: `msg-${i}`,
          summary: {
            msgType: 'D',
            orderKey: `ORDER-${i}`,
            clOrdId: `ORDER-${i}`,
            symbol: `SYM${i}`,
            side: i % 2 === 0 ? '1' : '2',
            qty: '100',
          },
        })
      );

      // First page
      cy.intercept('GET', '/api/messages?limit=50', {
        statusCode: 200,
        body: {
          data: messages.slice(0, 50),
          meta: { nextCursor: '50', total: 51 },
        },
      }).as('getMessagesPage1');

      cy.wait('@getMessagesPage1');

      // Verify 50 messages shown
      cy.get('[data-section="messages"]').within(() => {
        cy.get('tbody tr').should('have.length', 50);
        cy.contains('50 messages').should('be.visible');
      });

      // Click next
      cy.intercept('GET', '/api/messages?limit=50&cursor=50', {
        statusCode: 200,
        body: {
          data: messages.slice(50, 51),
          meta: { nextCursor: undefined, total: 51 },
        },
      }).as('getMessagesPage2');

      cy.contains('button', 'Next').click();
      cy.wait('@getMessagesPage2');

      // Verify 1 message shown
      cy.get('[data-section="messages"]').within(() => {
        cy.get('tbody tr').should('have.length', 1);
      });

      // Click previous
      cy.contains('button', 'Previous').click();
      cy.wait('@getMessagesPage1');

      // Verify back to 50 messages
      cy.get('[data-section="messages"]').within(() => {
        cy.get('tbody tr').should('have.length', 50);
      });
    });
  });

  describe('Real-time Updates', () => {
    it('receives new messages via SSE', () => {
      cy.log('Test SSE real-time updates');

      // Mock SSE with actual message push
      // Note: This is simplified - real SSE testing requires more complex setup
      cy.window().then((win) => {
        // Simulate SSE message event
        const newMsg = createMockFixMessage({
          summary: {
            msgType: 'D',
            orderKey: 'SSE-ORDER-001',
            symbol: 'NVDA',
            side: '1',
          },
        });

        cy.intercept('GET', '/api/messages?limit=50', {
          statusCode: 200,
          body: {
            data: [newMsg],
            meta: { nextCursor: null, total: 1 },
          },
        }).as('getMessagesWithSSE');
      });

      // In a real scenario, the SSE would push this automatically
      // For testing, we can simulate by reloading or waiting for polling
      cy.wait(6000); // Wait for polling interval

      // Verify message appears
      verifyMessageInTable('NVDA');
    });
  });
});
