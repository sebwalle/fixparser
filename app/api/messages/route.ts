/**
 * GET /api/messages
 * List messages with pagination and filtering
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
    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const cursor = searchParams.get('cursor') || undefined;
    const orderKey = searchParams.get('orderKey') || undefined;

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 200) {
      return NextResponse.json(
        {
          error: 'Invalid limit parameter. Must be between 1 and 200.',
        },
        {
          status: 400,
          headers: getCorsHeaders(request),
        }
      );
    }

    // Fetch messages from store
    const store = getStore();
    const result = await store.list({
      limit,
      cursor,
      orderKey,
    });

    return NextResponse.json(
      {
        data: result.messages,
        meta: {
          nextCursor: result.nextCursor,
          total: result.total,
        },
      },
      {
        status: 200,
        headers: getCorsHeaders(request),
      }
    );
  } catch (error) {
    console.error('Messages list endpoint error:', error);
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
