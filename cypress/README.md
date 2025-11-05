# Cypress E2E Tests

This directory contains end-to-end tests for the FIX Analyzer application using Cypress.

## Test Files

### 1. `home.cy.ts`
Basic smoke tests for the home dashboard:
- Verifies all sections are visible
- Tests order filtering
- Tests clearing filters
- Quick validation that the app loads correctly

### 2. `happy-path.cy.ts`
Comprehensive happy path test using a **real production FIX message** (USD/SEK FX trade):
- Tests the complete user journey from ingestion to details view
- Covers all four main sections (Ingest, Orders, Messages, Details)
- Tests strict vs relaxed parsing modes
- Tests sample message loading
- Tests file upload
- Tests input clearing
- Tests field sorting in details view
- Tests copy functionality

**This is the main test that validates the entire application workflow.**

### 3. `message-lifecycle.cy.ts`
Tests the complete lifecycle of an order through multiple messages:
- New Order Single → Partial Fill → Full Fill
- Order status updates at each stage
- Message filtering by order
- Message count tracking
- Error handling and validation
- Repair suggestions
- Pagination with large datasets
- Real-time updates (SSE)

## Test Helpers

The `support/test-helpers.ts` file provides reusable utilities:

### Mock Data Creators
- `createMockFixMessage()` - Creates realistic FixMessage objects
- `createMockOrderRow()` - Creates OrderRow objects

### Common Actions
- `setupEmptyState()` - Sets up API intercepts for empty state
- `visitHome()` - Navigates to home and waits for initial load
- `enterFixMessage()` - Types a message into the textarea
- `strictParse()` - Clicks strict parse button
- `relaxedParse()` - Clicks relaxed parse button
- `verifyToast()` - Waits for and verifies toast messages

### Verification Helpers
- `verifyAllSectionsVisible()` - Checks all 4 sections are present
- `verifyMessageInTable()` - Verifies a message appears in table
- `verifyOrderInTable()` - Verifies an order appears in table
- `verifyDetailContains()` - Checks details section for text

### Sample Messages
- `SAMPLE_FIX_MESSAGES.USDSSEK_EXEC_FILLED` - Real production FX trade
- `SAMPLE_FIX_MESSAGES.NEW_ORDER_AAPL` - Simple new order
- `SAMPLE_FIX_MESSAGES.EXEC_PARTIAL` - Partial fill
- `SAMPLE_FIX_MESSAGES.EXEC_FILLED` - Full fill

## Running Tests

### Interactive Mode (Recommended for Development)
```bash
npm run cy:open
```
This opens the Cypress Test Runner where you can:
- Select which tests to run
- See tests execute in a real browser
- Use time-travel debugging
- Auto-reload on file changes

### Headless Mode (CI/CD)
```bash
npm run cy:run
```
Runs all tests in headless mode, suitable for CI pipelines.

### Before Running Tests
1. Start the development server:
   ```bash
   npm run dev
   ```
2. In another terminal, run Cypress:
   ```bash
   npm run cy:open
   ```

## Test Structure

Each test follows this pattern:

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup API mocks
    cy.intercept('GET', '/api/endpoint', { ... }).as('alias');

    // Visit page
    cy.visit('/');
    cy.wait('@alias');
  });

  it('should do something specific', () => {
    // Arrange
    cy.log('Step 1: Setup');

    // Act
    cy.get('button').click();

    // Assert
    cy.contains('Expected Result').should('be.visible');
  });
});
```

## Key Testing Patterns

### 1. API Mocking
We mock all API calls to ensure tests are fast and reliable:
```typescript
cy.intercept('GET', '/api/messages?limit=50', {
  statusCode: 200,
  body: { data: [...], meta: { ... } },
}).as('getMessages');
```

### 2. Data Sections
We use `data-section` attributes for reliable selectors:
```typescript
cy.get('[data-section="messages"]').within(() => {
  cy.contains('AAPL').should('be.visible');
});
```

### 3. Progressive Enhancement
Tests verify functionality at each step:
1. Empty state
2. Data loads
3. User interaction
4. State updates
5. Detail view

### 4. Toast Verification
All user actions show feedback via toasts:
```typescript
cy.contains('Message parsed successfully').should('be.visible');
```

## Real FIX Message

The main test uses a **real production FIX message** from a USD/SEK FX trade:

```
Message Type: Execution Report (35=8)
Order ID: 279955333
ClOrdID: 3-2-898800662T-0-01
Symbol: USD/SEK
Side: Buy (1)
Quantity: 50,000
Status: Filled (2)
TransactTime: 2024-08-09 14:47:19.914
```

This ensures our tests validate real-world scenarios.

## Test Coverage

The E2E tests cover:

✅ **Ingestion**
- Strict parsing (with storage)
- Relaxed parsing (test only)
- File upload
- Sample messages
- Input clearing
- Error handling

✅ **Orders**
- Empty state
- Order display
- Order filtering
- Order lifecycle tracking
- Status updates

✅ **Messages**
- Empty state
- Message display
- Message filtering by order
- Pagination (previous/next)
- Clear filter
- Message formatting

✅ **Details**
- Empty state (no selection)
- Message details display
- Field table
- Field sorting (by tag, by name)
- Copy JSON
- Copy Raw
- Export JSON

✅ **Integration**
- Full workflow: Ingest → Orders → Messages → Details
- Order lifecycle: New → Partial → Filled
- Multi-message tracking
- Real-time updates
- Error scenarios

## Debugging Tips

### 1. Use cy.log() for Step Markers
```typescript
cy.log('Step 1: Submit order');
// ... actions
cy.log('Step 2: Verify order appears');
// ... assertions
```

### 2. Use Screenshots
Cypress automatically takes screenshots on failure.

### 3. Use Time Travel
In interactive mode, hover over commands to see the app state at that moment.

### 4. Check Network Tab
All API calls are logged in the Cypress command log.

### 5. Use .debug()
```typescript
cy.get('[data-section="messages"]').debug();
```

## CI/CD Integration

For GitHub Actions:

```yaml
- name: Run Cypress tests
  run: |
    npm run dev &
    npx wait-on http://localhost:3000
    npm run cy:run
```

## Common Issues

### Tests Fail with "Cannot read property..."
- Check that API mocks return correct FixMessage structure (not StoredMessage)
- Verify all required fields are present in mock data

### Timeouts
- Increase timeout for slow operations:
  ```typescript
  cy.wait('@slowEndpoint', { timeout: 10000 });
  ```

### Flaky Tests
- Add explicit waits: `cy.wait('@apiCall')`
- Use `should('be.visible')` instead of `should('exist')`
- Avoid hardcoded delays: use `cy.wait('@alias')` instead

### SSE Testing
- SSE is challenging to test in Cypress
- We use polling fallback for test reliability
- For SSE-specific tests, use integration/unit tests instead

## Best Practices

1. **One assertion per test name** - Test names should clearly state what they verify
2. **Use data attributes** - Prefer `[data-section]` over class names
3. **Mock all APIs** - Never hit real backends in E2E tests
4. **Clean state** - Each test starts fresh with `beforeEach`
5. **Descriptive aliases** - Use `.as('getMessagesFiltered')` not `.as('api1')`
6. **Step logging** - Use `cy.log()` to mark test phases
7. **Helper functions** - Extract common patterns to test-helpers.ts

## Future Improvements

- [ ] Add visual regression testing with Percy
- [ ] Add accessibility testing with axe-core
- [ ] Add performance testing (load time metrics)
- [ ] Add cross-browser testing (Firefox, Safari)
- [ ] Add mobile viewport testing
- [ ] Add WebSocket/SSE testing with better mocking
- [ ] Add authentication/authorization tests (if implemented)
- [ ] Add data persistence tests (if KV storage is enabled)

## Resources

- [Cypress Documentation](https://docs.cypress.io/)
- [Cypress Best Practices](https://docs.cypress.io/guides/references/best-practices)
- [FIX Protocol Specification](http://www.fixprotocol.org/)
