'use client';

import { errorMessage } from '@shimanto/sdk';
import type { CustomerMe } from '@shimanto/types';
import { ActionButton, LoadingState, Notice } from '@shimanto/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AuthHeading } from '@/components/auth-form';
import { api } from '@/lib/api';
import { safeNext } from '@/lib/config';
import { useSession } from '@/lib/session';

/** Landing page of emailed sign-in links (guest checkout, "email me a link"). */
export function LinkSignIn() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const next = safeNext(params.get('next'));
  const router = useRouter();
  const { setMe } = useSession();
  const [error, setError] = useState<string | null>(token ? null : 'This link is incomplete.');
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    api
      .post<CustomerMe>('/v1/customer/auth/link', { token })
      .then((me) => {
        setMe(me);
        router.replace(
          !me.hasPassword && next === '/account/security' ? '/account/security?setup=1' : next,
        );
      })
      .catch((e: unknown) => setError(errorMessage(e)));
  }, [token, next, router, setMe]);

  if (!error) {
    return (
      <>
        <AuthHeading title="Signing you in…" />
        <LoadingState rows={2} />
      </>
    );
  }
  return (
    <>
      <AuthHeading title="This link didn’t work" />
      <Notice tone="warning">{error}</Notice>
      <div className="mt-6 flex flex-wrap gap-2">
        <ActionButton href="/login">Get a new link</ActionButton>
      </div>
    </>
  );
}
