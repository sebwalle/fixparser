/**
 * GET /api/messages/stream
 * SSE endpoint for real-time message updates
 * Node runtime (needs storage and streaming)
 */

import { NextRequest } from 'next/server';
import { getStore } from '@/lib/store';
import { getSSEHeaders } from '@/lib/server/sse';
import { getCorsHeaders } from '@/lib/server/cors';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const store = getStore();

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        const encoder = new TextEncoder();
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
        );

        // Set up the store to stream messages to this controller
        store.stream(controller);

        // Keep-alive ping every 30 seconds
        const keepAliveInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': keepalive\n\n'));
          } catch (error) {
            // Controller is closed, clean up
            clearInterval(keepAliveInterval);
          }
        }, 30000);

        // Clean up on close
        request.signal.addEventListener('abort', () => {
          clearInterval(keepAliveInterval);
          try {
            controller.close();
          } catch (error) {
            // Controller already closed
          }
        });
      },
    });

    // Merge SSE headers with CORS headers
    const sseHeaders = getSSEHeaders();
    const corsHeaders = getCorsHeaders(request);

    return new Response(stream, {
      headers: {
        ...sseHeaders,
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('SSE stream endpoint error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(request),
        },
      }
    );
  }
}
