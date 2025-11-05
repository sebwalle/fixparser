/**
 * GET /api/orders
 * Get aggregated orders list
 * Node runtime (needs storage)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStore } from '@/lib/store';
import { getCorsHeaders, handleCorsPreFlight } from '@/lib/server/cors';
import { checkRateLimit, RATE_LIMITS } from '@/lib/server/ratelimit';

export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

export async function GET(request: NextRequest) {
  // Check rate limit (read endpoint)
  const rateLimitError = checkRateLimit(request, RATE_LIMITS.read);
  if (rateLimitError) {
    return rateLimitError;
  }

  try {
    // Fetch orders from store
    const store = getStore();
    const orders = await store.listOrders();

    return NextResponse.json(
      {
        data: orders,
      },
      {
        status: 200,
        headers: getCorsHeaders(request),
      }
    );
  } catch (error) {
    console.error('Orders list endpoint error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      {
        status: 500,
        headers: getCorsHeaders(request),
      }
    );
  }
}
