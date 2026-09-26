/**
 * A small TTL cache for upstream fetches.
 *
 * The immediate problem it solves is duplication inside one request: the
 * destination and food agents each fetch the same Wikivoyage guide, so a single
 * brief made two to four identical calls. Across requests it also cuts load on
 * keyless, rate-limited APIs — and rate limiting has been the root cause of
 * several silent-data-loss bugs here, so fewer calls is a correctness measure
 * as much as a speed one.
 *
 * Scope and honesty about it: this lives in the isolate's memory. Cloudflare
 * reuses isolates, so hits are common, but there is no guarantee — a cold
 * isolate simply misses, and nothing may depend on a value surviving. Anything
 * that must genuinely persist belongs in a Durable Object or KV.
 *
 * Failures are never cached. Caching a rate-limited empty result would turn a
 * transient fault into a sticky one.
 */

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

/** Stop a long-lived isolate from growing without bound. */
const MAX_ENTRIES = 200;

function evictIfNeeded(): void {
  if (store.size < MAX_ENTRIES) return;
  // Drop whatever expired first; the Map preserves insertion order, so the
  // oldest key is a good enough fallback when nothing has expired.
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt <= now) store.delete(key);
  }
  while (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next();
    if (oldest.done) break;
    store.delete(oldest.value);
  }
}

/**
 * Run `fetcher` unless a live value is already cached under `key`.
 *
 * Concurrent callers share one in-flight promise, so the destination and food
 * agents starting together still make a single upstream call.
 */
export async function cached<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const pending = fetcher();

  // Park the promise itself so parallel callers deduplicate rather than race.
  evictIfNeeded();
  store.set(key, { value: pending as unknown as T, expiresAt: Date.now() + ttlMs });

  try {
    const value = await pending;
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  } catch (err) {
    // Never cache a failure — a rate-limited miss would otherwise stick around.
    store.delete(key);
    throw err;
  }
}

/** Reference data that does not meaningfully change. */
export const TTL = {
  /** Climate normals are averages over five years. */
  climate: 24 * 60 * 60 * 1000,
  /** Wikivoyage guides change slowly. */
  guide: 6 * 60 * 60 * 1000,
  /** Pageview rankings drift over weeks, not hours. */
  places: 6 * 60 * 60 * 1000,
  /** Coordinates are permanent. */
  geocode: 24 * 60 * 60 * 1000,
} as const;
