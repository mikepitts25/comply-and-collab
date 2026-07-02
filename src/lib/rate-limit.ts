// Fixed-window in-memory rate limiter. Suitable for this app's single-node,
// on-prem deployment model (no external store available in an enclave). For a
// multi-replica deployment, back this with Postgres or Redis instead.

interface Window {
  count: number;
  resetAt: number; // epoch ms
}

const windows = new Map<string, Window>();

// Opportunistic cleanup so the map can't grow unbounded under scanning noise.
const MAX_ENTRIES = 10_000;
function sweep(now: number) {
  if (windows.size < MAX_ENTRIES) return;
  for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets (ceil). */
  retryAfterSec: number;
}

/**
 * Consume one attempt from the bucket `key`. Allows `limit` attempts per
 * `windowMs` window; further attempts fail until the window resets.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  let w = windows.get(key);
  if (!w || w.resetAt <= now) {
    w = { count: 0, resetAt: now + windowMs };
    windows.set(key, w);
  }
  w.count++;

  const ok = w.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - w.count),
    retryAfterSec: Math.max(1, Math.ceil((w.resetAt - now) / 1000)),
  };
}

/** Clear a bucket (e.g. after a successful login, so users aren't punished). */
export function rateLimitReset(key: string): void {
  windows.delete(key);
}

/** Test hook: wipe all state. */
export function _clearAllRateLimits(): void {
  windows.clear();
}

/** First client IP from proxy headers; enclave deployments sit behind one proxy. */
export function clientIpFrom(headers: { get(name: string): string | null }): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
