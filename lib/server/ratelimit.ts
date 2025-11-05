/**
 * Rate limiting for API endpoints
 * Simple in-memory implementation using Map
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  // Write endpoints: 100 requests per 5 minutes per IP
  write: {
    maxRequests: 100,
    windowMs: 5 * 60 * 1000,
  },
  // Read endpoints: 300 requests per 5 minutes per IP
  read: {
    maxRequests: 300,
    windowMs: 5 * 60 * 1000,
  },
} as const;

/**
 * Extract IP address from request
 */
function getIpAddress(request: Request): string {
  // Try to get real IP from headers (for proxies/CDNs)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a generic identifier
  return 'unknown';
}

/**
 * Check if request is rate limited
 * Returns null if allowed, or Response object if rate limited
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig
): Response | null {
  const ip = getIpAddress(request);
  const key = `${ip}`;
  const now = Date.now();

  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    // No record or window expired - create new record
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return null;
  }

  if (record.count >= config.maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
        },
      }
    );
  }

  // Increment count
  record.count++;
  rateLimitStore.set(key, record);

  return null;
}

/**
 * Clean up expired rate limit records periodically
 */
export function cleanupExpiredRecords(): void {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Clear all rate limit records (useful for testing)
 */
export function clearRateLimits(): void {
  rateLimitStore.clear();
}

// Clean up every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredRecords, 10 * 60 * 1000);
}
