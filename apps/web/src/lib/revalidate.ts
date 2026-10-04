import { createHmac, timingSafeEqual } from 'node:crypto';

/** Requests older than this are rejected, so a captured webhook can't be replayed later. */
export const MAX_AGE_MS = 5 * 60 * 1000;

export type VerifyResult = { ok: true; tags: string[] } | { ok: false; reason: string };

/**
 * Verifies a revalidation webhook from the API: HMAC-SHA256 over `${timestamp}.${body}`
 * (mirrors apps/api/src/revalidate/revalidate.service.ts).
 */
export function verifyRevalidation(
  secret: string | undefined,
  timestamp: string | null,
  signature: string | null,
  body: string,
  now = Date.now(),
): VerifyResult {
  if (!secret) return { ok: false, reason: 'not configured' };
  if (!timestamp || !signature) return { ok: false, reason: 'missing signature' };

  const age = now - Number(timestamp);
  if (!Number.isFinite(age) || Math.abs(age) > MAX_AGE_MS) return { ok: false, reason: 'stale' };

  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest();
  const given = Buffer.from(signature, 'hex');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: 'bad signature' };
  }

  let tags: unknown;
  try {
    tags = (JSON.parse(body) as { tags?: unknown }).tags;
  } catch {
    return { ok: false, reason: 'bad body' };
  }
  if (
    !Array.isArray(tags) ||
    !tags.every((t) => typeof t === 'string' && t.length <= 256) ||
    tags.length > 64
  ) {
    return { ok: false, reason: 'bad body' };
  }
  return { ok: true, tags };
}
