/**
 * Per-IP rate limiting for the expensive routes.
 *
 * A full plan is seven model calls. Unauthenticated and unlimited, one script
 * exhausts the daily Workers AI allowance — measured at roughly 1,450 neurons
 * per plan against a 10,000/day free tier, so about seven plans is the whole
 * budget. This is the difference between a demo that survives being shared and
 * one that dies the first time it is posted anywhere.
 *
 * Scope and honesty about it: the counters live in the isolate, so each edge
 * location enforces its own budget and a cold isolate starts fresh. That makes
 * this a brake on casual abuse, not a security control. A real limit needs a
 * Durable Object or Cloudflare's own rate-limiting binding; this is the
 * proportionate version for a portfolio project, and it costs nothing.
 */

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();
const MAX_TRACKED = 5000;

export interface RateLimitConfig {
  /** Requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets — sent as Retry-After. */
  retryAfterSeconds: number;
}

/**
 * Identify the caller. `CF-Connecting-IP` is set by Cloudflare's edge and
 * cannot be spoofed by the client; the fallbacks only matter in local dev.
 */
export function clientKey(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "local"
  );
}

function sweep(now: number): void {
  if (windows.size < MAX_TRACKED) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
  // Still full of live windows: drop the oldest rather than grow without bound.
  while (windows.size >= MAX_TRACKED) {
    const oldest = windows.keys().next();
    if (oldest.done) break;
    windows.delete(oldest.value);
  }
}

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count++;
  return {
    allowed: true,
    remaining: config.limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/** Planning is the expensive path: seven model calls per request. */
export const PLAN_LIMIT: RateLimitConfig = { limit: 5, windowMs: 60_000 };

/** Exported for tests, which must not leak state between cases. */
export function resetRateLimits(): void {
  windows.clear();
}
