/**
 * CORS middleware for API routes
 * Configurable via ALLOWED_ORIGINS environment variable
 */

/**
 * Get CORS headers based on request origin
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const allowedOrigins = process.env.ALLOWED_ORIGINS || '*';
  const origin = request.headers.get('origin') || '';

  let allowOrigin = '*';

  if (allowedOrigins !== '*') {
    const origins = allowedOrigins.split(',').map(o => o.trim());
    if (origins.includes(origin)) {
      allowOrigin = origin;
    }
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/**
 * Handle OPTIONS preflight requests
 */
export function handleCorsPreFlight(request: Request): Response {
  const headers = getCorsHeaders(request);
  return new Response(null, {
    status: 204,
    headers,
  });
}
