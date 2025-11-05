/**
 * POST /api/fix/parse
 * Parse-only endpoint (no storage)
 * Edge runtime for optimal performance
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseRelaxed } from '@/lib/fix/parser';
import { parseStrict } from '@/lib/fix/strict';
import { generateRepairSuggestions } from '@/lib/fix/repair';
import { checkAuth } from '@/lib/server/auth';
import { getCorsHeaders, handleCorsPreFlight } from '@/lib/server/cors';

export const runtime = 'edge';

export async function OPTIONS(request: NextRequest) {
  return handleCorsPreFlight(request);
}

export async function POST(request: NextRequest) {
  // Check authentication
  const authError = checkAuth(request);
  if (authError) {
    return authError;
  }

  try {
    // Get raw message from request body
    const contentType = request.headers.get('content-type') || '';
    let rawMessage: string;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      rawMessage = body.message || body.rawMessage || '';
    } else {
      // Default to text/plain
      rawMessage = await request.text();
    }

    if (!rawMessage || rawMessage.trim() === '') {
      return NextResponse.json(
        {
          error: 'Missing message body',
        },
        {
          status: 400,
          headers: getCorsHeaders(request),
        }
      );
    }

    // Determine parse mode (strict or relaxed)
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('mode') || 'relaxed';

    if (mode === 'strict') {
      // Strict parsing
      const result = parseStrict(rawMessage);

      if (!result.success) {
        // Parse failed - return issues and suggestions
        const suggestions = generateRepairSuggestions(
          rawMessage,
          result.issues
        );

        return NextResponse.json(
          {
            error: result.error,
            issues: result.issues,
            suggestions,
          },
          {
            status: 400,
            headers: getCorsHeaders(request),
          }
        );
      }

      return NextResponse.json(
        {
          data: result.message,
        },
        {
          status: 200,
          headers: getCorsHeaders(request),
        }
      );
    } else {
      // Relaxed parsing (default)
      const result = parseRelaxed(rawMessage);
      return NextResponse.json(
        {
          data: result,
        },
        {
          status: 200,
          headers: getCorsHeaders(request),
        }
      );
    }
  } catch (error) {
    console.error('Parse endpoint error:', error);
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
