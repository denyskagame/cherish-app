/**
 * Per-IP-per-action rate limiting for the public, no-auth guest surface.
 *
 * Phase 0 uses the in-memory limiter below (single instance / dev is fine for one
 * wedding). Phase 1 swaps in Upstash Redis here without changing any caller — the
 * `limit()` signature stays the same. Limits live in docs/08 §14.
 */
const memory = new Map<string, { count: number; reset: number }>();

export async function limit(
  key: string,
  max: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now();
  const entry = memory.get(key);

  if (!entry || entry.reset < now) {
    memory.set(key, { count: 1, reset: now + windowSeconds * 1000 });
    return { allowed: true, remaining: max - 1 };
  }

  entry.count++;
  return { allowed: entry.count <= max, remaining: Math.max(0, max - entry.count) };
}
