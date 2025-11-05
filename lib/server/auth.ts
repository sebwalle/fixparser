/**
 * Authentication utilities for API routes
 */

/**
 * Check Bearer token if FIX_API_TOKEN is set
 * Returns null if authorized, or Response object if unauthorized
 */
export function checkAuth(request: Request): Response | null {
  const expectedToken = process.env.FIX_API_TOKEN;

  // If no token is configured, allow all requests
  if (!expectedToken) {
    return null;
  }

  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return new Response(
      JSON.stringify({
        error: 'Missing Authorization header',
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return new Response(
      JSON.stringify({
        error: 'Invalid Authorization header format. Expected: Bearer <token>',
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  if (token !== expectedToken) {
    return new Response(
      JSON.stringify({
        error: 'Invalid token',
      }),
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  return null;
}
