'use server';

import { LeadCreateInputSchema } from '@shimanto/types';

export type SubmitLeadResult =
  { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Validates the collaborate form with the shared schema and forwards it to the API
 * (`POST /v1/leads`), which verifies Turnstile, rate-limits, stores the Lead and sends the emails.
 */
export async function submitLead(input: unknown): Promise<SubmitLeadResult> {
  const parsed = LeadCreateInputSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: 'Please check the highlighted fields.', fieldErrors };
  }
  // Honeypot filled: pretend it worked so bots learn nothing.
  if (parsed.data.website) return { ok: true };

  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    return { ok: false, error: 'The form is not connected yet. Please try again later.' };
  }
  try {
    const res = await fetch(`${apiUrl.replace(/\/+$/, '')}/v1/leads`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(parsed.data),
      cache: 'no-store',
    });
    if (res.ok) return { ok: true };
    if (res.status === 429) {
      return { ok: false, error: 'Too many messages in a short time. Please try again in a bit.' };
    }
    return { ok: false, error: 'That did not go through. Please check the form and try again.' };
  } catch {
    return { ok: false, error: 'Could not reach the server. Please try again in a minute.' };
  }
}
