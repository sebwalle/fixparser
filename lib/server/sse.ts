/**
 * Server-Sent Events (SSE) utilities
 */

/**
 * Format data for SSE transmission
 * Each message must end with \n\n
 */
export function formatSSEMessage(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/**
 * Create SSE response headers
 */
export function getSSEHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering
  };
}

/**
 * Send SSE message through a controller
 */
export function sendSSEMessage(
  controller: ReadableStreamDefaultController,
  data: unknown
): void {
  const message = formatSSEMessage(data);
  controller.enqueue(new TextEncoder().encode(message));
}

/**
 * Send SSE comment (keepalive ping)
 */
export function sendSSEComment(
  controller: ReadableStreamDefaultController,
  comment = 'keepalive'
): void {
  const message = `: ${comment}\n\n`;
  controller.enqueue(new TextEncoder().encode(message));
}
