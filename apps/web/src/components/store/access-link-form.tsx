'use client';

import { Button } from '@shimanto/ui';
import { useId, useState, useTransition } from 'react';
import { sendAccessLink } from '@/app/products/actions';

/** "Didn't get the email?" form: asks the API to email a one-time sign-in link to the portal. */
export function AccessLinkForm() {
  const id = useId();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await sendAccessLink({ email, locale: 'en' });
          setMessage(
            result.ok
              ? { ok: true, text: 'If that email has an account, a sign-in link is on its way.' }
              : { ok: false, text: result.error ?? 'Something went wrong.' },
          );
        });
      }}
    >
      <label htmlFor={`${id}-email`} className="mb-2 block font-medium">
        Email used at checkout
      </label>
      <div className="flex flex-wrap gap-3">
        <input
          id={`${id}-email`}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-ink/15 placeholder:text-ink-soft/70 rounded-button min-w-0 flex-1 border bg-transparent px-4 py-3 text-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)]"
        />
        <Button type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send link'}
        </Button>
      </div>
      <p
        aria-live="polite"
        className={
          message?.ok === false ? 'mt-3 font-medium text-[var(--create)]' : 'text-ink-soft mt-3'
        }
      >
        {message?.text}
      </p>
    </form>
  );
}
