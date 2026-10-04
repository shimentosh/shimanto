'use client';

import type { CustomerMe } from '@shimanto/types';
import { Field, Input, Notice } from '@shimanto/ui';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { AuthHeading, FormError, SubmitButton, useFormSubmit } from '@/components/auth-form';
import { analytics } from '@/lib/analytics';
import { api } from '@/lib/api';
import { SITE_URL, safeNext } from '@/lib/config';
import { useSession } from '@/lib/session';

export function LoginForm() {
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const router = useRouter();
  const { me, checking, setMe } = useSession();
  // Back to the store's checkout after signing in (only our own site is allowed).
  const ret = params.get('return');
  const returnTo = ret && (ret === SITE_URL || ret.startsWith(`${SITE_URL}/`)) ? ret : null;
  const go = useCallback(() => {
    if (returnTo) window.location.assign(returnTo);
    else router.replace(next);
  }, [returnTo, next, router]);
  useEffect(() => {
    if (!checking && me) go();
  }, [checking, me, go]);

  const [mode, setMode] = useState<'password' | 'link'>('password');
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [linkSent, setLinkSent] = useState(false);
  const { busy, error, fields, submit } = useFormSubmit();

  const onPassword = submit(async () => {
    const signedIn = await api.post<CustomerMe>('/v1/customer/auth/login', {
      email,
      password,
      anonymousId: analytics.anonymousId,
    });
    analytics.trackLogin();
    setMe(signedIn); // the effect above navigates on
  });
  const onLink = submit(async () => {
    await api.post('/v1/customer/auth/login-link', { email });
    setLinkSent(true);
  });

  return (
    <>
      <AuthHeading
        title="Welcome back"
        description="Sign in to see your orders, downloads and repository access."
      />
      {params.get('reset') === '1' && (
        <Notice tone="success" className="mb-6">
          Your password was changed. Sign in with the new one.
        </Notice>
      )}

      {mode === 'password' ? (
        <form onSubmit={onPassword} className="grid gap-5" noValidate>
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
          <Field label="Password" error={fields.password}>
            {(f) => (
              <Input
                {...f}
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
          <div className="-mt-2 flex justify-end">
            <Link
              href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ''}`}
              className="text-ink-soft hover:text-ink text-sm font-medium"
            >
              Forgot password?
            </Link>
          </div>
          <SubmitButton busy={busy}>Sign in</SubmitButton>
        </form>
      ) : linkSent ? (
        <Notice tone="success" title="Check your inbox">
          If <strong>{email}</strong> has an account, a sign-in link is on its way. It works once
          and expires in 7 days.
        </Notice>
      ) : (
        <form onSubmit={onLink} className="grid gap-5" noValidate>
          <FormError error={error} />
          <Field
            label="Email"
            error={fields.email}
            hint="We’ll email you a one-time link. No password needed."
          >
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
          <SubmitButton busy={busy}>Email me a sign-in link</SubmitButton>
        </form>
      )}

      <div className="border-ink/10 mt-8 grid gap-3 border-t pt-6 text-[15px]">
        <button
          type="button"
          onClick={() => {
            setMode(mode === 'password' ? 'link' : 'password');
            setLinkSent(false);
          }}
          className="text-left font-medium underline decoration-1 underline-offset-4 hover:decoration-2"
        >
          {mode === 'password'
            ? 'Bought as a guest? Get a sign-in link instead'
            : 'Sign in with a password'}
        </button>
        <p className="text-ink-soft">
          New here?{' '}
          <Link
            href={`/register${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
            className="text-ink font-medium underline decoration-1 underline-offset-4"
          >
            Create an account
          </Link>
        </p>
      </div>
    </>
  );
}
