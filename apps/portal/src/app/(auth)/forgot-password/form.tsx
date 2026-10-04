'use client';

import { Field, Input, Notice } from '@shimanto/ui';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AuthHeading, FormError, SubmitButton, useFormSubmit } from '@/components/auth-form';
import { api } from '@/lib/api';

export function ForgotForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [sent, setSent] = useState(false);
  const { busy, error, fields, submit } = useFormSubmit();

  const onSubmit = submit(async () => {
    await api.post('/v1/customer/auth/forgot-password', { email });
    setSent(true);
  });

  return (
    <>
      <AuthHeading
        title="Forgot your password?"
        description="Enter your email and we’ll send a link to choose a new one. This also works if you bought as a guest and never set a password."
      />
      {sent ? (
        <Notice tone="success" title="Check your inbox">
          If <strong>{email}</strong> has an account, a reset link is on its way. It expires in 60
          minutes.
        </Notice>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-5" noValidate>
          <FormError error={error} />
          <Field label="Email" error={fields.email}>
            {(f) => (
              <Input
                {...f}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            )}
          </Field>
          <SubmitButton busy={busy}>Send reset link</SubmitButton>
        </form>
      )}
      <p className="text-ink-soft border-ink/10 mt-8 border-t pt-6 text-[15px]">
        Remembered it?{' '}
        <Link
          href="/login"
          className="text-ink font-medium underline decoration-1 underline-offset-4"
        >
          Back to sign in
        </Link>
      </p>
    </>
  );
}
