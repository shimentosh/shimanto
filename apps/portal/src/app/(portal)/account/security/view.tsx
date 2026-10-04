'use client';

import { errorMessage, fieldErrors } from '@shimanto/sdk';
import type { CustomerMe } from '@shimanto/types';
import { ActionButton, Field, Input, Notice, PageHeader, Section } from '@shimanto/ui';
import { useSearchParams } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';
import { AccountTabs } from '../view';

export function SecurityView() {
  const { me, setMe, signOut } = useSession();
  const setup = useSearchParams().get('setup') === '1';
  const [form, setForm] = useState({ currentPassword: '', password: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  if (!me) return null;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setDone(false);
    setError(null);
    setFields({});
    try {
      const body = me.hasPassword
        ? form
        : { password: form.password, confirmPassword: form.confirmPassword };
      setMe(await api.post<CustomerMe>('/v1/account/password', body));
      setForm({ currentPassword: '', password: '', confirmPassword: '' });
      setDone(true);
    } catch (e) {
      const byField = fieldErrors(e);
      setFields(byField);
      setError(Object.keys(byField).length ? null : errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <>
      <PageHeader title="Account" description="Your details and how we contact you." />
      <AccountTabs active="security" />

      <Section
        title={me.hasPassword ? 'Change password' : 'Set a password'}
        description={
          me.hasPassword
            ? 'Changing your password signs you out on every other device.'
            : 'You signed in with an email link. Set a password to sign in any time without one.'
        }
      >
        {setup && !me.hasPassword && (
          <Notice tone="info" className="mb-5 max-w-lg">
            Welcome! Your purchase is in your account. Set a password now, or skip it and use email
            links.
          </Notice>
        )}
        <form onSubmit={onSubmit} className="grid max-w-lg gap-5" noValidate>
          {done && <Notice tone="success">Password saved. Other devices were signed out.</Notice>}
          {error && <Notice tone="danger">{error}</Notice>}
          {me.hasPassword && (
            <Field label="Current password" error={fields.currentPassword}>
              {(f) => (
                <Input
                  {...f}
                  type="password"
                  autoComplete="current-password"
                  required
                  value={form.currentPassword}
                  onChange={set('currentPassword')}
                />
              )}
            </Field>
          )}
          <Field label="New password" error={fields.password} hint="At least 8 characters.">
            {(f) => (
              <Input
                {...f}
                type="password"
                autoComplete="new-password"
                required
                value={form.password}
                onChange={set('password')}
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
                onChange={set('confirmPassword')}
              />
            )}
          </Field>
          <div>
            <ActionButton type="submit" loading={busy}>
              {me.hasPassword ? 'Change password' : 'Set password'}
            </ActionButton>
          </div>
        </form>
      </Section>

      <Section title="Sign out" description="Sign out of your account on this device.">
        <ActionButton variant="secondary" icon="logout" onClick={() => void signOut()}>
          Sign out
        </ActionButton>
      </Section>
    </>
  );
}
