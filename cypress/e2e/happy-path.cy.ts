/// <reference types="cypress" />

/**
 * Happy Path E2E Test
 * Tests the complete user journey through the FIX Analyzer application
 */

// Real FIX message from production (USD/SEK FX trade)
const REAL_FIX_MESSAGE = '8=FIX.4.49=157335=849=MAP_BLP_PROD56=MAP_CAR1_PROD34=951144=FX52=20240809-14:47:20.24138730=XOFF60=20240809-14:47:19.914120=SEK150=F31=10.5036125151=032=5000063=264=2024081222894=10.50312405=16=10.50361251056=525180.6337=2799553338=5000039=240=1460=41300=XOFF11=3-2-898800662T-0-0133=10.503612514=50000194=10.5031854=015=USD75=20240809195=0.000512517=3-2-898800662T-0-0167=FOR377=N797=Y22277=022280=1442=154=155=USD/SEK119=525180.6378=179=Test fund467=180=500001908=21909=BBG0000000000B66B03AA8483000431910=5493001KJTIIGC8Y1R121911=11912=01909=BBG0000000000B66B03AA8483000431911=11912=610009=310010=MidRate10011=10.49975622162=0.00050622276=022485=10.499322486=022545=010010=RefRate10011=10.50123422162=0.00053422276=022485=10.500722486=022545=010010=BMTB10011=10.496972922162=0.000482922276=122485=10.4964922486=122545=022078=122079=10.5036125022080=2022081=12453=6448=XOFF447=G452=16448=CAR1447=D452=13802=3523=CARNEGIE INVESTMENT BANK AB, Stockholm803=1523=LiminaTrader803=2523=NIKLAS LINDEKE803=9448=LiminaTrader447=P452=122376=24802=1523=Y803=4047448=BMTB447=D452=1802=3523=CACEIS INVESTOR SERVICES BANK SA803=1523=31734351803=2523=INSB INV SERV BANK SA803=9448=PRODUCT TYPE447=D452=16802=1523=Dealing Outsourced803=4448=LiminaTrader447=D452=111907=21903=BBG0000000000B66B03AA8483000441905=5493001KJTIIGC8Y1R121904=01906=02411=11903=BBG0000000000B66B03AA8483000441904=01906=62411=1768=2769=20240809-14:47:19.914770=1769=20240809-14:47:13.000770=1010=168';

// Convert to pipe-delimited for better readability in textarea
const READABLE_FIX_MESSAGE = REAL_FIX_MESSAGE.replace(/\x01/g, '|');

// Mock stored message that would be returned after ingestion
const STORED_MESSAGE = {
  id: 'msg_test_1',
  receivedAt: '2024-08-09T14:47:20.241Z',
  rawMessage: REAL_FIX_MESSAGE,
  fields: [
    { tag: '8', name: 'BeginString', value: 'FIX.4.4' },
    { tag: '9', name: 'BodyLength', value: '1573' },
    { tag: '35', name: 'MsgType', value: '8' },
    { tag: '11', name: 'ClOrdID', value: '3-2-898800662T-0-01' },
    { tag: '37', name: 'OrderID', value: '279955333' },
    { tag: '38', name: 'OrderQty', value: '50000' },
    { tag: '39', name: 'OrdStatus', value: '2' },
    { tag: '54', name: 'Side', value: '1' },
    { tag: '55', name: 'Symbol', value: 'USD/SEK' },
    { tag: '60', name: 'TransactTime', value: '20240809-14:47:19.914' },
    { tag: '150', name: 'ExecType', value: 'F' },
  ],
  summary: {
    msgType: '8',
    orderKey: '3-2-898800662T-0-01',
    clOrdId: '3-2-898800662T-0-01',
    orderId: '279955333',
    symbol: 'USD/SEK',
    side: '1',
    qty: '50000',
    price: undefined,
    transType: '20240809-14:47:19.914',
    ordStatus: '2',
  },
  warnings: [],
};

// Mock order row derived from the message
const ORDER_ROW = {
  orderKey: '3-2-898800662T-0-01',
  orderId: '279955333',
  symbol: 'USD/SEK',
  side: '1',
  originalQty: '50000',
  latestStatus: '2',
  messageCount: 1,
  firstSeenAt: '2024-08-09T14:47:20.241Z',
  lastSeenAt: '2024-08-09T14:47:20.241Z',
};

describe('Happy Path: Complete User Journey', () => {
  beforeEach(() => {
    // Start with empty state
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

    cy.visit('/');
    cy.wait('@getOrdersEmpty');
    cy.wait('@getMessagesEmpty');
  });

  it('completes the full workflow: ingest → orders → messages → details', () => {
    //
    // STEP 1: Verify initial empty state
    //
    cy.log('Step 1: Verify empty state');

    cy.contains('1. Ingest Messages').should('be.visible');
    cy.contains('2. Orders').should('be.visible');
    cy.contains('3. Messages').should('be.visible');
    cy.contains('4. Details').should('be.visible');

    // Orders section should show no orders
    cy.get('[data-section="orders"]').within(() => {
      cy.contains('No orders yet').should('be.visible');
    });

    // Messages section should show no messages
    cy.get('[data-section="messages"]').within(() => {
      cy.contains('No messages yet').should('be.visible');
    });

    // Details section should show empty state
    cy.get('[data-section="details"]').within(() => {
      cy.contains('No message selected').should('be.visible');
    });

    //
    // STEP 2: Load sample message
    //
    cy.log('Step 2: Load sample message');

    cy.get('textarea[placeholder*="Paste FIX message"]')
      .should('be.visible')
      .clear()
      .type(READABLE_FIX_MESSAGE, { delay: 0 });

    // Verify the text was entered
    cy.get('textarea[placeholder*="Paste FIX message"]')
      .should('have.value', READABLE_FIX_MESSAGE);

    //
    // STEP 3: Ingest the message
    //
    cy.log('Step 3: Ingest message via strict parse');

    // Mock the ingest endpoint
    cy.intercept('POST', '/api/messages/ingest', {
      statusCode: 201,
      body: {
        data: STORED_MESSAGE,
      },
    }).as('ingestMessage');

    // Mock SSE stream (messages will appear via polling fallback)
    cy.intercept('GET', '/api/messages/stream', {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
      },
      body: '', // Empty SSE stream - messages will appear via polling
    });

    // Click the strict parse button
    cy.contains('button', 'Strict Parse & Store').click();

    // Wait for the ingest request
    cy.wait('@ingestMessage');

    // Verify success toast appears
    cy.contains('Message parsed successfully').should('be.visible');

    // Verify textarea is cleared after successful strict parse
    cy.get('textarea[placeholder*="Paste FIX message"]')
      .should('have.value', '');

    //
    // STEP 4: Verify message appears in orders section
    //
    cy.log('Step 4: Verify order appears');

    // Mock orders API to return the new order
    cy.intercept('GET', '/api/orders', {
      statusCode: 200,
      body: { data: [ORDER_ROW] },
    }).as('getOrdersWithData');

    // Trigger a refresh (reload or wait for polling)
    cy.reload();
    cy.wait('@getOrdersWithData');

    // Verify order appears in orders table
    cy.get('[data-section="orders"]').within(() => {
      cy.contains('3-2-898800662T-0-01').should('be.visible'); // ClOrdID
      cy.contains('279955333').should('be.visible'); // OrderID
      cy.contains('USD/SEK').should('be.visible'); // Symbol
      cy.contains('BUY').should('be.visible'); // Side (1 = BUY)
      cy.contains('50000').should('be.visible'); // Qty
      cy.contains('Filled').should('be.visible'); // Status (2 = Filled)
    });

    //
    // STEP 5: Verify message appears in messages section
    //
    cy.log('Step 5: Verify message appears in messages list');

    // Mock messages API to return the new message
    cy.intercept('GET', '/api/messages?limit=50', {
      statusCode: 200,
      body: {
        data: [STORED_MESSAGE],
        meta: { nextCursor: null, total: 1 },
      },
    }).as('getMessagesWithData');

    cy.wait('@getMessagesWithData');

    // Verify message appears in messages table
    cy.get('[data-section="messages"]').within(() => {
      cy.get('tbody tr').should('have.length', 1);
      cy.contains('ExecReport').should('be.visible'); // MsgType 8
      cy.contains('USD/SEK').should('be.visible');
      cy.contains('BUY').should('be.visible');
      cy.contains('50000').should('be.visible');
      cy.contains('Filled').should('be.visible');
    });

    //
    // STEP 6: Click on order to filter messages
    //
    cy.log('Step 6: Filter messages by order');

    // Mock filtered messages API
    cy.intercept('GET', '/api/messages?limit=50&orderKey=3-2-898800662T-0-01', {
      statusCode: 200,
      body: {
        data: [STORED_MESSAGE],
        meta: { nextCursor: null, total: 1 },
      },
    }).as('getMessagesFiltered');

    // Click on the order row
    cy.get('[data-section="orders"]').within(() => {
      cy.contains('3-2-898800662T-0-01').click();
    });

    cy.wait('@getMessagesFiltered');

    // Verify filter is active
    cy.get('[data-section="messages"]').within(() => {
      cy.contains('Filtered by: 3-2-898800662T-0-01').should('be.visible');
      cy.get('tbody tr').should('have.length', 1);
    });

    //
    // STEP 7: Click on message to view details
    //
    cy.log('Step 7: View message details');

    cy.get('[data-section="messages"]').within(() => {
      cy.get('tbody tr').first().click();
    });

    // Verify details section shows message details
    cy.get('[data-section="details"]').within(() => {
      // Check summary header
      cy.contains('ExecReport').should('be.visible');
      cy.contains('Filled').should('be.visible');
      cy.contains('USD/SEK').should('be.visible');
      cy.contains('ClOrdID: 3-2-898800662T-0-01').should('be.visible');
      cy.contains('OrderID: 279955333').should('be.visible');

      // Check action buttons
      cy.contains('button', 'Copy JSON').should('be.visible');
      cy.contains('button', 'Export JSON').should('be.visible');
      cy.contains('button', 'Copy Raw').should('be.visible');

      // Check table has fields
      cy.get('table').should('be.visible');
      cy.contains('th', 'Tag').should('be.visible');
      cy.contains('th', 'Name').should('be.visible');
      cy.contains('th', 'Value').should('be.visible');

      // Verify some key fields are present
      cy.contains('td', '8').should('be.visible'); // BeginString tag
      cy.contains('td', 'FIX.4.4').should('be.visible'); // BeginString value
      cy.contains('td', '35').should('be.visible'); // MsgType tag
      cy.contains('td', '8').should('be.visible'); // MsgType value
      cy.contains('td', '55').should('be.visible'); // Symbol tag
      cy.contains('td', 'USD/SEK').should('be.visible'); // Symbol value

      // Verify field count
      cy.contains('11 fields').should('be.visible');
    });

    //
    // STEP 8: Test sorting in details table
    //
    cy.log('Step 8: Test field sorting');

    cy.get('[data-section="details"]').within(() => {
      // Click on Tag header to sort by tag
      cy.contains('th', 'Tag').click();

      // Verify first row has lowest tag number (8)
      cy.get('tbody tr').first().within(() => {
        cy.contains('td', '8').should('be.visible');
      });

      // Click again to reverse sort
      cy.contains('th', 'Tag').click();

      // Verify first row now has highest tag number (150)
      cy.get('tbody tr').first().within(() => {
        cy.contains('td', '150').should('be.visible');
      });

      // Sort by name
      cy.contains('th', 'Name').click();

      // Click to sort descending
      cy.contains('th', 'Name').click();
    });

    //
    // STEP 9: Test Copy Raw functionality
    //
    cy.log('Step 9: Test copy raw message');

    cy.get('[data-section="details"]').within(() => {
      cy.contains('button', 'Copy Raw').click();
    });

    // Verify success toast
    cy.contains('Raw message copied to clipboard').should('be.visible');

    //
    // STEP 10: Clear filter and verify all messages shown
    //
    cy.log('Step 10: Clear filter');

    // Mock unfiltered messages
    cy.intercept('GET', '/api/messages?limit=50', {
      statusCode: 200,
      body: {
        data: [STORED_MESSAGE],
        meta: { nextCursor: null, total: 1 },
      },
    }).as('getMessagesUnfiltered');

    cy.get('[data-section="messages"]').within(() => {
      cy.get('button[aria-label="Clear filter"]').click();
    });

    cy.wait('@getMessagesUnfiltered');

    // Verify filter badge is gone
    cy.get('[data-section="messages"]').within(() => {
      cy.contains('Filtered by:').should('not.exist');
    });
  });

  it('supports relaxed parsing for testing', () => {
    cy.log('Test relaxed parse mode');

    // Enter the FIX message
    cy.get('textarea[placeholder*="Paste FIX message"]')
      .clear()
      .type(READABLE_FIX_MESSAGE, { delay: 0 });

    // Mock the parse endpoint (relaxed mode)
    cy.intercept('POST', '/api/fix/parse', {
      statusCode: 200,
      body: {
        data: {
          fields: STORED_MESSAGE.fields,
          summary: STORED_MESSAGE.summary,
          warnings: [],
          raw: REAL_FIX_MESSAGE,
        },
      },
    }).as('relaxedParse');

    // Click relaxed parse button
    cy.contains('button', 'Relaxed Parse (Test Only)').click();

    cy.wait('@relaxedParse');

    // Verify success toast
    cy.contains('Message parsed successfully (relaxed mode)').should('be.visible');

    // Note: In relaxed mode, message is NOT stored, so textarea should NOT be cleared
    cy.get('textarea[placeholder*="Paste FIX message"]')
      .should('have.value', READABLE_FIX_MESSAGE);
  });

  it('supports loading sample messages', () => {
    cy.log('Test sample message loading');

    // Click on select dropdown
    cy.get('button[role="combobox"]').contains('Select a sample message').click();

    // Select a sample (assuming there are samples configured)
    cy.get('[role="option"]').first().click();

    // Click use sample button
    cy.contains('button', 'Use Sample').click();

    // Verify sample loaded toast
    cy.contains('Loaded:').should('be.visible');

    // Verify textarea has content
    cy.get('textarea[placeholder*="Paste FIX message"]')
      .should('not.have.value', '');
  });

  it('supports file upload', () => {
    cy.log('Test file upload');

    // Create a blob with FIX message
    const fileName = 'test-fix-message.txt';
    const fileContent = READABLE_FIX_MESSAGE;

    // Upload file
    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from(fileContent),
        fileName,
        mimeType: 'text/plain',
      },
      { force: true }
    );

    // Verify file loaded toast
    cy.contains('File loaded').should('be.visible');

    // Verify textarea has file content
    cy.get('textarea[placeholder*="Paste FIX message"]')
      .should('have.value', READABLE_FIX_MESSAGE);
  });

  it('supports clearing input', () => {
    cy.log('Test clear functionality');

    // Enter some text
    cy.get('textarea[placeholder*="Paste FIX message"]')
      .type('8=FIX.4.4|35=D|11=TEST|');

    // Click clear button
    cy.contains('button', 'Clear').click();

    // Verify cleared toast
    cy.contains('Input cleared').should('be.visible');

    // Verify textarea is empty
    cy.get('textarea[placeholder*="Paste FIX message"]')
      .should('have.value', '');
  });
});
