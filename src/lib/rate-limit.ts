/**
 * Simple in-memory rate limiter for server actions.
 * Uses a sliding window per key (e.g., IP or email).
 * Suitable for demo/small-scale — for production at scale, use Upstash or Vercel KV.
 */

const store = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * Check if a key has exceeded the rate limit.
 * @returns true if rate limit exceeded (should block), false if allowed.
 */
export function isRateLimited(
  key: string,
  { maxRequests = 10, windowMs = 60_000 }: { maxRequests?: number; windowMs?: number } = {}
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    return true;
  }

  return false;
}
