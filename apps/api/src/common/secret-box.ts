import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const VERSION = 'v1';

/**
 * Encrypts secrets kept in the database (payment provider keys entered in the admin) with
 * AES-256-GCM. The key comes from SETTINGS_ENCRYPTION_KEY, or is derived from the JWT secret
 * when that isn't set. Ciphertexts look like `v1.<iv>.<tag>.<data>` (base64url).
 */
export class SecretBox {
  private readonly key: Buffer;

  constructor(secret: string) {
    this.key = createHash('sha256').update(`shimanto-settings:${secret}`).digest();
  }

  seal(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return [VERSION, iv, cipher.getAuthTag(), data]
      .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
      .join('.');
  }

  /** Null when the value can't be opened (wrong key, tampered): treated as "not set". */
  open(sealed: string): string | null {
    const [version, iv, tag, data] = sealed.split('.');
    if (version !== VERSION || !iv || !tag || !data) return null;
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64url'));
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(data, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      return null;
    }
  }
}

/** The store's box: SETTINGS_ENCRYPTION_KEY, else derived from the JWT secret. */
export function settingsBox(env: { SETTINGS_ENCRYPTION_KEY?: string; JWT_ACCESS_SECRET: string }) {
  return new SecretBox(env.SETTINGS_ENCRYPTION_KEY ?? env.JWT_ACCESS_SECRET);
}

/** "sk_test_…4242": enough to recognise a key, never enough to use it. */
export function secretHint(secret: string): string {
  const prefix = secret.match(/^[a-z]+_(test|live)_/)?.[0] ?? '';
  return `${prefix}…${secret.slice(-4)}`;
}
