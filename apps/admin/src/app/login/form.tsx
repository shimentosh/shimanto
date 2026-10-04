'use client';

import type { AuthUser } from '@shimanto/types';
import { ActionButton, Field, Input, Notice } from '@shimanto/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAdmin } from '@/lib/session';
import { useAction } from '@/lib/use-action';

function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login')
    ? next
    : '/';
}

export function AdminLogin() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const { user, checking, setUser } = useAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { run, isBusy, error } = useAction();

  useEffect(() => {
    if (!checking && user) router.replace(next);
  }, [checking, user, next, router]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const res = await run(() =>
      api.post<{ user: AuthUser }>('/v1/auth/login', { email, password }),
    );
    if (res) {
      setUser(res.user);
      router.replace(next);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="bg-ink text-canvas grid size-9 place-items-center rounded-[10px] font-semibold"
          >
            S
          </span>
          <span className="leading-tight">
            <span className="block font-semibold tracking-tight">Shimanto</span>
            <span className="text-ink-soft block text-xs">Store admin</span>
          </span>
        </div>
        <div className="bg-paper rounded-[24px] p-7">
          <h1 className="text-[28px] leading-tight font-medium tracking-[-0.03em]">Sign in</h1>
          <p className="text-ink-soft mt-1 text-[15px]">Team members only.</p>
          <form onSubmit={onSubmit} className="mt-6 grid gap-5" noValidate>
            {error && <Notice tone="danger">{error}</Notice>}
            <Field label="Email">
              {(f) => (
                <Input
                  {...f}
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              )}
            </Field>
            <Field label="Password">
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
            <ActionButton type="submit" loading={isBusy()} className="w-full">
              Sign in
            </ActionButton>
          </form>
        </div>
      </div>
    </main>
  );
}
