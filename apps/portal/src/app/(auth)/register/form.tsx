'use client';

import { ApiError } from '@shimanto/sdk';
import type { CustomerMe } from '@shimanto/types';
import { Field, Input } from '@shimanto/ui';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { AuthHeading, FormError, SubmitButton, useFormSubmit } from '@/components/auth-form';
import { analytics } from '@/lib/analytics';
import { api } from '@/lib/api';
import { safeNext } from '@/lib/config';
import { useRedirectIfSignedIn, useSession } from '@/lib/session';

export function RegisterForm() {
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const router = useRouter();
  const { setMe } = useSession();
  useRedirectIfSignedIn(next);

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [exists, setExists] = useState(false);
  const { busy, error, fields, submit } = useFormSubmit();
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = submit(async () => {
    setExists(false);
    try {
      const me = await api.post<CustomerMe>('/v1/customer/auth/register', {
        ...form,
        attribution: analytics.attributionPayload(),
      });
      // Same event id as the server's sign_up, so Meta counts one registration.
      analytics.trackSignUp(me.id);
      setMe(me);
      router.replace(next);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setExists(true);
      throw e;
    }
  });

  return (
    <>
      <AuthHeading
        title="Create your account"
        description="One place for everything you buy: downloads, GitHub access and support."
      />
      <form onSubmit={onSubmit} className="grid gap-5" noValidate>
        {exists ? (
          <FormError error="An account with this email already exists." />
        ) : (
          <FormError error={error} />
        )}
        {exists && (
          <p className="-mt-2 text-[15px]">
            <Link
              href={`/login?email=${encodeURIComponent(form.email)}`}
              className="font-medium underline underline-offset-4"
            >
              Sign in
            </Link>{' '}
            or{' '}
            <Link
              href={`/forgot-password?email=${encodeURIComponent(form.email)}`}
              className="font-medium underline underline-offset-4"
            >
              reset your password
            </Link>
            .
          </p>
        )}
        <Field label="Name" error={fields.name}>
          {(f) => (
            <Input {...f} autoComplete="name" required value={form.name} onChange={set('name')} />
          )}
        </Field>
        <Field label="Email" error={fields.email}>
          {(f) => (
            <Input
              {...f}
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={set('email')}
            />
          )}
        </Field>
        <Field label="Password" error={fields.password} hint="At least 8 characters.">
          {(f) => (
            <Input
              {...f}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={set('password')}
            />
          )}
        </Field>
        <Field label="Confirm password" error={fields.confirmPassword}>
          {(f) => (
            <Input
              {...f}
              type="password"
              autoComplete="new-password"
              required
              value={form.confirmPassword}
              onChange={set('confirmPassword')}
            />
          )}
        </Field>
        <SubmitButton busy={busy}>Create account</SubmitButton>
      </form>
      <p className="text-ink-soft border-ink/10 mt-8 border-t pt-6 text-[15px]">
        Already have an account?{' '}
        <Link
          href="/login"
          className="text-ink font-medium underline decoration-1 underline-offset-4"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
