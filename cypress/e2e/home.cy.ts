/// <reference types="cypress" />

const ordersResponse = {
  data: [
    {
      orderKey: 'ORDER-123',
      orderId: 'OID-1001',
      symbol: 'AAPL',
      side: '1',
      originalQty: '100',
      latestStatus: '0',
      messageCount: 2,
      firstSeenAt: '2024-03-01T12:00:00.000Z',
      lastSeenAt: '2024-03-01T12:05:00.000Z',
    },
  ],
};

const messagesResponse = {
  data: [
    {
      id: 'msg-1',
      receivedAt: '2024-03-01T12:00:00.000Z',
      rawMessage: '8=FIX.4.4|35=D|...',
      fields: [],
      summary: {
        msgType: 'D',
        orderKey: 'ORDER-123',
        clOrdId: 'ORDER-123',
        orderId: 'OID-1001',
        symbol: 'AAPL',
        side: '1',
        qty: '100',
        price: '150.25',
        transType: 'NEW',
        ordStatus: '0',
      },
      warnings: [],
    },
    {
      id: 'msg-2',
      receivedAt: '2024-03-01T12:02:00.000Z',
      rawMessage: '8=FIX.4.4|35=8|...',
      fields: [],
      summary: {
        msgType: '8',
        orderKey: 'ORDER-999',
        clOrdId: 'ORDER-999',
        orderId: 'OID-2002',
        symbol: 'MSFT',
        side: '2',
        qty: '50',
        price: '305.10',
        transType: 'FILL',
        ordStatus: '2',
      },
      warnings: [],
    },
  ],
  meta: {
    nextCursor: null,
    total: 2,
  },
};

const filteredMessagesResponse = {
  data: [messagesResponse.data[0]],
  meta: {
    nextCursor: null,
    total: 1,
  },
};

describe('Home dashboard', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/orders', {
      statusCode: 200,
      body: ordersResponse,
    }).as('getOrders');

    cy.intercept('GET', '/api/messages?limit=50', {
      statusCode: 200,
      body: messagesResponse,
    }).as('getMessages');

    cy.intercept('GET', '/api/messages?limit=50&orderKey=ORDER-123', {
      statusCode: 200,
      body: filteredMessagesResponse,
    }).as('getMessagesFiltered');

    cy.visit('/');

    cy.wait('@getOrders');
    cy.wait('@getMessages');
  });

  it('displays the main dashboard sections and actions', () => {
    cy.contains('1. Ingest Messages').should('be.visible');
    cy.contains('Strict Parse & Store').should('be.enabled');
    cy.contains('2. Orders').should('be.visible');
    cy.contains('3. Messages').should('be.visible');

    cy.get('[data-section="messages"]').within(() => {
      cy.get('tbody tr').should('have.length', 2);
      cy.contains('AAPL').should('be.visible');
      cy.contains('MSFT').should('be.visible');
    });
  });

  it('filters messages when an order is selected and allows clearing the filter', () => {
    cy.contains('ORDER-123').click();
    cy.wait('@getMessagesFiltered');

    cy.get('[data-section="messages"]').within(() => {
      cy.contains('Filtered by: ORDER-123').should('be.visible');
      cy.get('tbody tr').should('have.length', 1);
      cy.contains('AAPL').should('be.visible');
      cy.contains('MSFT').should('not.exist');
    });

    cy.get('[data-section="messages"]').find('button[aria-label="Clear filter"]').click();
    cy.wait('@getMessages');

    cy.get('[data-section="messages"]').within(() => {
      cy.contains('Filtered by: ORDER-123').should('not.exist');
      cy.get('tbody tr').should('have.length', 2);
      cy.contains('MSFT').should('be.visible');
    });
  });
});

