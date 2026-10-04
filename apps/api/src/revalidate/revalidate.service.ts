import { createHmac } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';

/**
 * Signs a revalidation payload: HMAC-SHA256 over `${timestamp}.${body}`.
 * The web app recomputes it and rejects stale timestamps (>5 min) to stop replays.
 */
export function signRevalidation(secret: string, timestamp: string, body: string): string {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
}

/** Calls Next.js on-demand revalidation (`revalidateTag`) through a signed webhook. */
@Injectable()
export class RevalidateService {
  private readonly logger = new Logger('Revalidate');

  constructor(@Inject(ENV) private readonly env: Env) {}

  async send({ tags }: { tags: string[] }): Promise<void> {
    const url = this.env.WEB_REVALIDATE_URL;
    if (!url) {
      this.logger.debug(`Skipped (no WEB_REVALIDATE_URL): ${tags.join(', ')}`);
      return;
    }
    const body = JSON.stringify({ tags });
    const timestamp = String(Date.now());
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-revalidate-timestamp': timestamp,
        'x-revalidate-signature': signRevalidation(this.env.REVALIDATE_SECRET, timestamp, body),
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    // Throwing lets the queue retry with backoff.
    if (!res.ok) throw new Error(`Revalidation failed: HTTP ${res.status}`);
  }
}
