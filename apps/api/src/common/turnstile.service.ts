import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Cloudflare Turnstile server-side verification. */
@Injectable()
export class TurnstileService {
  private readonly logger = new Logger('Turnstile');

  constructor(@Inject(ENV) private readonly env: Env) {}

  async verify(token: string, ip?: string): Promise<boolean> {
    const form = new URLSearchParams({ secret: this.env.TURNSTILE_SECRET_KEY, response: token });
    if (ip) form.set('remoteip', ip);
    try {
      const res = await fetch(VERIFY_URL, {
        method: 'POST',
        body: form,
        signal: AbortSignal.timeout(8_000),
      });
      const result = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
      if (!result.success) this.logger.warn(`Rejected: ${result['error-codes']?.join(', ')}`);
      return result.success;
    } catch (error) {
      // Fail closed: if Cloudflare is unreachable we can't tell humans from bots.
      this.logger.error(`Verification unavailable: ${(error as Error).message}`);
      return false;
    }
  }
}
