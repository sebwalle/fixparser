/// <reference types="cypress" />

Cypress.on('window:before:load', (win) => {
  class MockEventSource {
    url: string;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: MessageEvent) => void) | null = null;

    constructor(url: string) {
      this.url = url;

      // Notify listeners that the connection succeeded
      setTimeout(() => {
        this.onmessage?.({ data: JSON.stringify({ type: 'connected' }) } as MessageEvent);
      }, 0);
    }

    close() {
      // no-op in tests
    }
  }

  Object.defineProperty(win, 'EventSource', {
    configurable: true,
    writable: true,
    value: MockEventSource,
  });
});

