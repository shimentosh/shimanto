'use client';

import type { AdminSettings, IntegrationCheck } from '@shimanto/types';
import {
  ActionButton,
  DescriptionList,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Notice,
  PageHeader,
  Section,
  Select,
  StatusBadge,
  Tabs,
} from '@shimanto/ui';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { PaymentsSettings } from '@/components/payments/payments-settings';
import { CheckButton, Env } from '@/components/settings-controls';
import { EmailDeliverySettings } from '@/components/email-settings';
import { StorageSettings } from '@/components/storage-settings';
import { TrackingSettingsPanel } from '@/components/tracking-settings';
import { api } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { useAdmin } from '@/lib/session';
import { useAction } from '@/lib/use-action';
import { useApi } from '@/lib/use-api';

type Tab = 'general' | 'payments' | 'emails' | 'storage' | 'github' | 'tracking';

function Configured({
  ok,
  yes = 'Configured',
  no = 'Not configured',
}: {
  ok: boolean;
  yes?: string;
  no?: string;
}) {
  return <StatusBadge status={ok ? 'ACTIVE' : 'PENDING'} label={ok ? yes : no} />;
}

function General({
  settings,
  onSaved,
}: {
  settings: AdminSettings;
  onSaved: (s: AdminSettings) => void;
}) {
  const { user } = useAdmin();
  const [form, setForm] = useState({
    storeName: settings.general.storeName,
    supportEmail: settings.general.supportEmail ?? '',
    defaultCurrency: settings.general.defaultCurrency,
  });
  const action = useAction();
  const canEdit = user?.role === 'SUPER_ADMIN';

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const res = await action.run(
      () =>
        api.put<AdminSettings>('/v1/admin/settings/general', {
          ...form,
          supportEmail: form.supportEmail.trim() || null,
        }),
      { success: 'Settings saved.' },
    );
    if (res) onSaved(res);
  };

  return (
    <Section title="Store" description="Used in emails and on receipts.">
      <form onSubmit={onSubmit} className="grid max-w-lg gap-5" noValidate>
        {!canEdit && <Notice tone="info">Only super admins can change store settings.</Notice>}
        {action.error && <Notice tone="danger">{action.error}</Notice>}
        {action.success && <Notice tone="success">{action.success}</Notice>}
        <Field label="Store name" error={action.fields.storeName}>
          {(f) => (
            <Input
              {...f}
              disabled={!canEdit}
              value={form.storeName}
              onChange={(e) => setForm({ ...form, storeName: e.target.value })}
            />
          )}
        </Field>
        <Field
          label="Support email"
          optional
          error={action.fields.supportEmail}
          hint="Customers’ replies to store emails go here. New-ticket alerts too, unless NOTIFY_EMAIL is set."
        >
          {(f) => (
            <Input
              {...f}
              type="email"
              disabled={!canEdit}
              value={form.supportEmail}
              onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
            />
          )}
        </Field>
        <Field
          label="Default currency"
          error={action.fields.defaultCurrency}
          hint="Pre-selected for new products."
        >
          {(f) => (
            <Select
              {...f}
              disabled={!canEdit}
              value={form.defaultCurrency}
              onChange={(e) => setForm({ ...form, defaultCurrency: e.target.value })}
            >
              {['USD', 'EUR', 'GBP', 'BDT', 'INR'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          )}
        </Field>
        {canEdit && (
          <div>
            <ActionButton type="submit" loading={action.isBusy()}>
              Save settings
            </ActionButton>
          </div>
        )}
      </form>
    </Section>
  );
}

function Emails() {
  const { user } = useAdmin();
  const [to, setTo] = useState(user?.email ?? '');
  const action = useAction();
  const [testResult, setTestResult] = useState<string | null>(null);

  return (
    <>
      <EmailDeliverySettings />
      <Section
        title="Test email"
        description={
          <>
            Sends a short test through the provider in use. Every template and every sent email is
            on the{' '}
            <Link href="/emails" className="text-ink font-medium underline underline-offset-4">
              Emails page
            </Link>
            .
          </>
        }
      >
        <form
          className="flex max-w-lg flex-wrap items-end gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setTestResult(null);
            const res = await action.run(() =>
              api.post<IntegrationCheck>('/v1/admin/settings/test-email', { to }),
            );
            if (res) setTestResult(res.message);
          }}
          noValidate
        >
          <Field label="Send a test email to" className="min-w-60 flex-1" error={action.fields.to}>
            {(f) => (
              <Input {...f} type="email" value={to} onChange={(ev) => setTo(ev.target.value)} />
            )}
          </Field>
          <ActionButton
            type="submit"
            variant="secondary"
            icon="send"
            loading={action.isBusy()}
            disabled={!to}
          >
            Send test
          </ActionButton>
        </form>
        {testResult && <p className="mt-3 text-sm font-medium">{testResult}</p>}
        {action.error && (
          <Notice tone="danger" className="mt-3">
            {action.error}
          </Notice>
        )}
      </Section>
    </>
  );
}

export function SettingsView() {
  const params = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'general';
  const { data, error, loading, reload, setData } = useApi<AdminSettings>('/v1/admin/settings');

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'general', label: 'General' },
    { id: 'payments', label: 'Payments' },
    { id: 'emails', label: 'Emails' },
    { id: 'storage', label: 'Storage' },
    { id: 'github', label: 'GitHub' },
    { id: 'tracking', label: 'Analytics & Tracking' },
  ];

  return (
    <>
      <PageHeader
        title="Settings"
        description="Store details and integrations. Payment keys entered here are encrypted and never shown again; other secrets live in the server environment."
      />
      <Tabs
        items={tabs.map((t) => ({
          label: t.label,
          href: `/settings?tab=${t.id}`,
          active: tab === t.id,
        }))}
      />
      {loading && !data ? (
        <LoadingState rows={5} />
      ) : error || !data ? (
        <ErrorState message={error ?? undefined} onRetry={reload} />
      ) : tab === 'general' ? (
        <General settings={data} onSaved={setData} />
      ) : tab === 'payments' ? (
        <PaymentsSettings />
      ) : tab === 'emails' ? (
        <Emails />
      ) : tab === 'storage' ? (
        <StorageSettings />
      ) : tab === 'tracking' ? (
        <TrackingSettingsPanel />
      ) : (
        <GithubSettings settings={data} />
      )}
    </>
  );
}

function GithubSettings({ settings }: { settings: AdminSettings }) {
  const g = settings.integrations.github;
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  return (
    <Section
      title="GitHub repository delivery"
      description="Buyers connect their GitHub account (identity only) and are invited to the product’s private repository."
    >
      <DescriptionList
        items={[
          { label: 'GitHub App', value: <Configured ok={g.app} yes="Configured (preferred)" /> },
          { label: 'OAuth (customer connect)', value: <Configured ok={g.oauth} /> },
          {
            label: 'Webhook',
            value: <Configured ok={g.webhook} no="Not configured (manual sync)" />,
          },
          { label: 'Token fallback', value: <Configured ok={g.token} no="Not set" /> },
          { label: 'Callback URL', value: <Env>{`${API_URL}/v1/github/callback`}</Env> },
          { label: 'Webhook URL', value: <Env>{`${API_URL}/v1/webhooks/github`}</Env> },
        ]}
      />
      <p className="text-ink-soft mt-4 text-sm">
        Set <Env>GITHUB_APP_ID</Env>, <Env>GITHUB_APP_PRIVATE_KEY</Env>, <Env>GITHUB_CLIENT_ID</Env>
        , <Env>GITHUB_CLIENT_SECRET</Env> and <Env>GITHUB_WEBHOOK_SECRET</Env>. The App needs
        repository permission <strong>Administration: read &amp; write</strong>, the{' '}
        <strong>Member</strong> event, and must be installed on the repositories you sell.
      </p>
      <div className="mt-6 grid max-w-xl gap-3">
        <p className="text-[15px] font-medium">Check a repository</p>
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Owner" className="w-40">
            {(f) => (
              <Input {...f} value={owner} onChange={(e) => setOwner(e.target.value.trim())} />
            )}
          </Field>
          <Field label="Repository" className="w-48">
            {(f) => <Input {...f} value={repo} onChange={(e) => setRepo(e.target.value.trim())} />}
          </Field>
        </div>
        <CheckButton
          label="Check access"
          run={() =>
            owner && repo
              ? api
                  .post<IntegrationCheck>('/v1/admin/settings/check/github', { owner, repo })
                  .catch(() => undefined)
              : Promise.resolve({ ok: false, message: 'Enter an owner and repository' })
          }
        />
      </div>
    </Section>
  );
}
