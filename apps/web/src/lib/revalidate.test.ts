import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { MAX_AGE_MS, verifyRevalidation } from './revalidate';

const secret = 'test-secret';
const now = 1_800_000_000_000;
const sign = (ts: string, body: string) =>
  createHmac('sha256', secret).update(`${ts}.${body}`).digest('hex');
const body = JSON.stringify({ tags: ['products', 'products:content-os'] });

describe('verifyRevalidation', () => {
  it('accepts a fresh, correctly signed request and returns its tags', () => {
    const ts = String(now);
    expect(verifyRevalidation(secret, ts, sign(ts, body), body, now)).toEqual({
      ok: true,
      tags: ['products', 'products:content-os'],
    });
  });

  it('rejects wrong secrets, tampered bodies and replays', () => {
    const ts = String(now);
    const sig = sign(ts, body);
    expect(verifyRevalidation('other', ts, sig, body, now)).toMatchObject({
      ok: false,
      reason: 'bad signature',
    });
    expect(verifyRevalidation(secret, ts, sig, body.replace('products', 'x'), now).ok).toBe(false);
    const old = String(now - MAX_AGE_MS - 1);
    expect(verifyRevalidation(secret, old, sign(old, body), body, now)).toMatchObject({
      reason: 'stale',
    });
  });

  it('refuses when unconfigured or unsigned', () => {
    expect(verifyRevalidation(undefined, '1', 'aa', body, now)).toMatchObject({
      reason: 'not configured',
    });
    expect(verifyRevalidation(secret, null, null, body, now)).toMatchObject({
      reason: 'missing signature',
    });
  });

  it('validates the body shape', () => {
    const ts = String(now);
    const bad = JSON.stringify({ tags: 'products' });
    expect(verifyRevalidation(secret, ts, sign(ts, bad), bad, now)).toMatchObject({
      reason: 'bad body',
    });
  });
});
