'use client';

import { errorMessage, fieldErrors } from '@shimanto/sdk';
import { ActionButton, Notice } from '@shimanto/ui';
import { type FormEvent, type ReactNode, useState } from 'react';

export function AuthHeading({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-[34px] leading-[1.05] font-medium tracking-[-0.03em]">{title}</h1>
      {description && <p className="text-ink-soft mt-2 text-[15px]">{description}</p>}
    </div>
  );
}

/**
 * Form wrapper for the auth pages: submit state, a top-level error and per-field errors from
 * the API's validation response.
 */
export function useFormSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const submit = (action: () => Promise<void>) => async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    try {
      await action();
    } catch (e) {
      const byField = fieldErrors(e);
      setFields(byField);
      setError(Object.keys(byField).length ? null : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, fields, setError, submit };
}

export function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return <Notice tone="danger">{error}</Notice>;
}

export function SubmitButton({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <ActionButton type="submit" loading={busy} className="w-full">
      {children}
    </ActionButton>
  );
}
