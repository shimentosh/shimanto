'use client';

import { errorMessage } from '@shimanto/sdk';
import { ActionButton, LoadingState, Notice } from '@shimanto/ui';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AuthHeading } from '@/components/auth-form';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

export function VerifyEmail() {
  const token = useSearchParams().get('token') ?? '';
  const { me, refresh } = useSession();
  const [state, setState] = useState<'working' | 'done' | 'failed'>(token ? 'working' : 'failed');
  const [message, setMessage] = useState<string>('This link is incomplete.');
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    api
      .post('/v1/customer/auth/verify-email', { token })
      .then(async () => {
        setState('done');
        await refresh();
      })
      .catch((e: unknown) => {
        setMessage(errorMessage(e));
        setState('failed');
      });
  }, [token, refresh]);

  if (state === 'working') {
    return (
      <>
        <AuthHeading title="Verifying your email…" />
        <LoadingState rows={2} />
      </>
    );
  }
  if (state === 'done') {
    return (
      <>
        <AuthHeading
          title="Email verified"
          description="Thanks! Your email address is confirmed."
        />
        <ActionButton href={me ? '/' : '/login'}>
          {me ? 'Go to your account' : 'Sign in'}
        </ActionButton>
      </>
    );
  }
  return (
    <>
      <AuthHeading title="We couldn’t verify your email" />
      <Notice tone="warning">{message}</Notice>
      <p className="text-ink-soft mt-6 text-[15px]">
        Signed in? You can send a fresh link from{' '}
        <a href="/account" className="text-ink font-medium underline underline-offset-4">
          your account
        </a>
        .
      </p>
    </>
  );
}
