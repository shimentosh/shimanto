import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';

/** argon2id with the library's OWASP-aligned defaults. */
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

let dummy: Promise<string> | undefined;
/**
 * A real argon2 hash of a random password, verified when the email doesn't exist, so "unknown user"
 * and "wrong password" take the same time and can't be told apart.
 */
export function dummyPasswordHash(): Promise<string> {
  dummy ??= hash(randomBytes(16).toString('hex'));
  return dummy;
}

/** High-entropy opaque token (refresh tokens, API keys, confirm tokens). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** SHA-256 is right for high-entropy secrets: no need for a slow KDF, and lookups stay indexable. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
