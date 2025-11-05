import type { MessageStore } from './interface';
import { memoryStore } from './memory';

/**
 * Get the configured message store based on environment variables
 *
 * - If USE_KV=true, returns Vercel KV store
 * - Otherwise, returns in-memory store (default)
 *
 * This factory allows easy switching between storage backends
 * without changing application code.
 */
export function getStore(): MessageStore {
  const useKV = process.env.USE_KV === 'true';

  if (useKV) {
    // Lazy-load KV store to avoid importing @vercel/kv if not needed
    // This allows the app to run without KV dependencies
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { kvStore } = require('./kv');
      return kvStore;
    } catch (error) {
      console.warn(
        'USE_KV is true but @vercel/kv is not available. Falling back to memory store.',
        error
      );
      return memoryStore;
    }
  }

  return memoryStore;
}

// Re-export types and interfaces
export type { MessageStore, ListOptions, ListResponse } from './interface';
export { memoryStore } from './memory';
