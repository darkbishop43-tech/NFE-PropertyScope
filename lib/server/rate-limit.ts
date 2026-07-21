interface RateEntry {
  count: number;
  resetAt: number;
}

const memory = new Map<string, RateEntry>();

/**
 * Small controlled-beta guard. This is intentionally conservative and server-side.
 * A distributed limiter should replace it before a broad public beta.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const existing = memory.get(key);
  if (!existing || existing.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (existing.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }
  existing.count += 1;
  memory.set(key, existing);
  return { allowed: true, retryAfterSeconds: 0 };
}
