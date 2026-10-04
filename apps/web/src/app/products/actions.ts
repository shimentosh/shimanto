'use server';

import { EmailInputSchema } from '@shimanto/types';

function apiBase(): string | undefined {
  return process.env.API_URL?.replace(/\/+$/, '');
}

/** Emails a one-time sign-in link to the customer portal. Always "succeeds" (no email probing). */
export async function sendAccessLink(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = EmailInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'That email doesn’t look right.' };
  const api = apiBase();
  if (!api) return { ok: false, error: 'Not connected yet. Please try again later.' };
  try {
    const res = await fetch(`${api}/v1/customer/auth/login-link`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
    });
    if (res.status === 429) return { ok: false, error: 'Too many requests. Try again shortly.' };
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not reach the server. Please try again.' };
  }
}
