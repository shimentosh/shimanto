'use client';

import { errorMessage, fieldErrors } from '@shimanto/sdk';
import type { CustomerMe } from '@shimanto/types';
import {
  ActionButton,
  DescriptionList,
  Field,
  Input,
  Notice,
  PageHeader,
  Section,
  Select,
  StatusBadge,
  Tabs,
  formatDate,
} from '@shimanto/ui';
import { type FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

export function AccountTabs({ active }: { active: 'profile' | 'security' | 'github' }) {
  return (
    <Tabs
      items={[
        { label: 'Profile', href: '/account', active: active === 'profile' },
        { label: 'Security', href: '/account/security', active: active === 'security' },
        { label: 'GitHub', href: '/account/github', active: active === 'github' },
      ]}
    />
  );
}

export function ProfileView() {
  const { me } = useSession();
  if (!me) return null;
  return <ProfileForm key={me.id} me={me} />;
}

function ProfileForm({ me }: { me: CustomerMe }) {
  const { setMe } = useSession();
  const [name, setName] = useState(me.name ?? '');
  const [locale, setLocale] = useState<'en' | 'bn'>(me.locale);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [verify, setVerify] = useState<'idle' | 'sending' | 'sent'>('idle');

  const onSave = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setSaved(false);
    setError(null);
    setFields({});
    try {
      setMe(await api.patch<CustomerMe>('/v1/account/profile', { name, locale }));
      setSaved(true);
    } catch (e) {
      setFields(fieldErrors(e));
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Account" description="Your details and how we contact you." />
      <AccountTabs active="profile" />

      <Section title="Profile">
        <form onSubmit={onSave} className="grid max-w-lg gap-5" noValidate>
          {saved && <Notice tone="success">Saved.</Notice>}
          {error && !Object.keys(fields).length && <Notice tone="danger">{error}</Notice>}
          <Field label="Name" error={fields.name}>
            {(f) => (
              <Input
                {...f}
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </Field>
          <Field label="Email language" hint="Language for emails about your orders.">
            {(f) => (
              <Select
                {...f}
                value={locale}
                onChange={(e) => setLocale(e.target.value as 'en' | 'bn')}
              >
                <option value="en">English</option>
                <option value="bn">বাংলা</option>
              </Select>
            )}
          </Field>
          <div>
            <ActionButton type="submit" loading={busy}>
              Save changes
            </ActionButton>
          </div>
        </form>
      </Section>

      <Section title="Email">
        <DescriptionList
          items={[
            { label: 'Email address', value: me.email },
            {
              label: 'Status',
              value: me.emailVerified ? (
                <StatusBadge status="ACTIVE" label="Verified" />
              ) : (
                <StatusBadge status="PENDING" label="Not verified" />
              ),
            },
            { label: 'Member since', value: formatDate(me.createdAt) },
          ]}
        />
        {!me.emailVerified && (
          <div className="mt-5">
            {verify === 'sent' ? (
              <Notice tone="success">A new verification link is on its way to {me.email}.</Notice>
            ) : (
              <ActionButton
                size="sm"
                variant="secondary"
                icon="mail"
                loading={verify === 'sending'}
                onClick={async () => {
                  setVerify('sending');
                  try {
                    await api.post('/v1/customer/auth/resend-verification');
                    setVerify('sent');
                  } catch (e) {
                    setError(errorMessage(e));
                    setVerify('idle');
                  }
                }}
              >
                Send verification email
              </ActionButton>
            )}
          </div>
        )}
        <p className="text-ink-soft mt-5 text-sm">To change your email address, contact support.</p>
      </Section>
    </>
  );
}
