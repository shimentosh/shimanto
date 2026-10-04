'use client';

import type { CustomerMe } from '@shimanto/types';
import { Field, Input, Notice } from '@shimanto/ui';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AuthHeading, FormError, SubmitButton, useFormSubmit } from '@/components/auth-form';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

export function ResetForm() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const router = useRouter();
  const { setMe } = useSession();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const { busy, error, fields, submit } = useFormSubmit();

  const onSubmit = submit(async () => {
    const me = await api.post<CustomerMe>('/v1/customer/auth/reset-password', { token, ...form });
    setMe(me);
    router.replace('/?welcome=reset');
  });

  if (!token) {
    return (
      <>
        <AuthHeading title="This link is incomplete" />
        <Notice tone="warning">
          Open the link from your email again, or{' '}
          <Link href="/forgot-password" className="font-medium underline underline-offset-4">
            request a new one
          </Link>
          .
        </Notice>
      </>
    );
  }

  return (
    <>
      <AuthHeading
        title="Choose a new password"
        description="Other devices will be signed out for your security."
      />
      <form onSubmit={onSubmit} className="grid gap-5" noValidate>
        <FormError error={error} />
        {error?.includes('expired') && (
          <p className="-mt-2 text-[15px]">
            <Link href="/forgot-password" className="font-medium underline underline-offset-4">
              Request a new link
            </Link>
          </p>
        )}
        <Field label="New password" error={fields.password} hint="At least 8 characters.">
          {(f) => (
            <Input
              {...f}
              type="password"
              autoComplete="new-password"
              required
              value={form.password}
              onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))}
            />
          )}
        </Field>
        <Field label="Confirm new password" error={fields.confirmPassword}>
          {(f) => (
            <Input
              {...f}
              type="password"
              autoComplete="new-password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm((v) => ({ ...v, confirmPassword: e.target.value }))}
            />
          )}
        </Field>
        <SubmitButton busy={busy}>Save and sign in</SubmitButton>
      </form>
    </>
  );
}
