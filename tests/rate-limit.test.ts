import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { rateLimit, rateLimitReset, _clearAllRateLimits, clientIpFrom } from "@/lib/rate-limit";

beforeEach(() => {
  _clearAllRateLimits();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("rateLimit", () => {
  it("allows up to the limit, then blocks", () => {
    for (let i = 0; i < 5; i++) expect(rateLimit("k", 5, 60_000).ok).toBe(true);
    const blocked = rateLimit("k", 5, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("keeps buckets independent", () => {
    for (let i = 0; i < 5; i++) rateLimit("a", 5, 60_000);
    expect(rateLimit("a", 5, 60_000).ok).toBe(false);
    expect(rateLimit("b", 5, 60_000).ok).toBe(true);
  });

  it("resets after the window elapses", () => {
    for (let i = 0; i < 6; i++) rateLimit("k", 5, 60_000);
    expect(rateLimit("k", 5, 60_000).ok).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(rateLimit("k", 5, 60_000).ok).toBe(true);
  });

  it("rateLimitReset clears a bucket immediately", () => {
    for (let i = 0; i < 6; i++) rateLimit("k", 5, 60_000);
    rateLimitReset("k");
    expect(rateLimit("k", 5, 60_000).ok).toBe(true);
  });
});

describe("clientIpFrom", () => {
  const h = (map: Record<string, string>) => ({
    get: (n: string) => map[n.toLowerCase()] ?? null,
  });

  it("takes the first x-forwarded-for hop", () => {
    expect(clientIpFrom(h({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe("203.0.113.9");
  });
  it("falls back to x-real-ip, then unknown", () => {
    expect(clientIpFrom(h({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIpFrom(h({}))).toBe("unknown");
  });
});
