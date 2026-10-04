'use client';

import type { AdminEmailEvent, AdminSettings, IntegrationCheck } from '@shimanto/types';
import {
  ActionButton,
  DataTable,
  DescriptionList,
  ErrorState,
  Field,
  FilterChips,
  Input,
  LoadMore,
  LoadingState,
  Notice,
  PageHeader,
  Section,
  Select,
  StatusBadge,
  Tabs,
  formatDateTime,
} from '@shimanto/ui';
import { useSearchParams } from 'next/navigation';
import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import { TrackingSettingsPanel } from '@/components/tracking-settings';
import { api } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { useAdmin } from '@/lib/session';
import { useAction } from '@/lib/use-action';
import { useApi } from '@/lib/use-api';
import { usePaged } from '@/lib/use-paged';

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

function Env({ children }: { children: ReactNode }) {
  return (
    <code className="bg-ink/[0.06] rounded px-1.5 py-0.5 font-mono text-[13px]">{children}</code>
  );
}

function CheckButton({
  label,
  run,
}: {
  label: string;
  run: () => Promise<IntegrationCheck | undefined>;
}) {
  const [result, setResult] = useState<IntegrationCheck | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ActionButton
        size="sm"
        variant="secondary"
        icon="shield"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          setResult((await run()) ?? null);
          setBusy(false);
        }}
      >
        {label}
      </ActionButton>
      {result && (
        <span
          className={result.ok ? 'text-sm font-medium' : 'text-create text-sm font-medium'}
          role="status"
        >
          {result.ok ? '✓ ' : '✕ '}
          {result.message}
        </span>
      )}
    </div>
  );
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

function Emails({ settings }: { settings: AdminSettings }) {
  const [to, setTo] = useState('');
  const [status, setStatus] = useState<'' | 'QUEUED' | 'SENT' | 'FAILED'>('');
  const filter = useMemo(() => ({ status }), [status]);
  const log = usePaged<AdminEmailEvent>('/v1/admin/emails', filter);
  const action = useAction();
  const [testResult, setTestResult] = useState<string | null>(null);
  const e = settings.integrations.email;

  return (
    <>
      <Section
        title="Email provider"
        description="Transactional email (receipts, delivery, account and support) is sent through one provider."
      >
        <DescriptionList
          items={[
            {
              label: 'Provider',
              value:
                e.provider === 'resend'
                  ? 'Resend (HTTP API)'
                  : e.provider === 'smtp'
                    ? 'SMTP'
                    : 'Log only (not delivered)',
            },
            { label: 'Status', value: <Configured ok={e.configured} /> },
            { label: 'From address', value: e.from },
          ]}
        />
        {e.provider !== 'resend' && (
          <p className="text-ink-soft mt-4 text-sm">
            For production, set <Env>RESEND_API_KEY</Env> and a <Env>MAIL_FROM</Env> on a domain
            verified in Resend.
          </p>
        )}
        <form
          className="mt-6 flex max-w-lg flex-wrap items-end gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setTestResult(null);
            const res = await action.run(() =>
              api.post<IntegrationCheck>('/v1/admin/settings/test-email', { to }),
            );
            if (res) {
              setTestResult(res.message);
              log.reload();
            }
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
      <Section
        title="Email log"
        description="Every email the store sent, with delivery status. Duplicate events never send twice."
        actions={
          <FilterChips
            label="Email status"
            value={status}
            onChange={setStatus}
            options={[
              { value: '', label: 'All' },
              { value: 'SENT', label: 'Sent' },
              { value: 'QUEUED', label: 'Queued' },
              { value: 'FAILED', label: 'Failed' },
            ]}
          />
        }
      >
        {log.loading ? (
          <LoadingState rows={5} />
        ) : (
          <>
            <DataTable
              caption="Email log"
              rows={log.items}
              rowKey={(m) => m.id}
              empty={<p className="text-ink-soft text-[15px]">No emails yet.</p>}
              columns={[
                {
                  key: 'subject',
                  header: 'Email',
                  cell: (m) => (
                    <div className="min-w-0">
                      <p className="break-words">{m.subject}</p>
                      <p className="text-ink-soft text-sm">{m.type}</p>
                    </div>
                  ),
                },
                {
                  key: 'to',
                  header: 'To',
                  hideOnMobile: true,
                  cell: (m) => <span className="break-all">{m.recipient}</span>,
                },
                {
                  key: 'status',
                  header: 'Status',
                  cell: (m) => (
                    <div>
                      <StatusBadge status={m.status} />
                      {m.failureReason && (
                        <p className="text-ink-soft mt-1 max-w-56 text-xs">{m.failureReason}</p>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'date',
                  header: 'When',
                  hideOnMobile: true,
                  cell: (m) => formatDateTime(m.sentAt ?? m.createdAt),
                },
              ]}
            />
            <LoadMore
              hasMore={log.hasMore}
              loading={log.loadingMore}
              onClick={() => void log.loadMore()}
            />
          </>
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
        description="Store details, and the status of each integration. Secrets live in the server environment and are never shown here."
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
        <Section
          title="Stripe"
          description="Only configured providers are offered at checkout. $0 orders never need a provider."
        >
          <DescriptionList
            items={[
              {
                label: 'API key',
                value: <Configured ok={data.integrations.payments.stripe.configured} />,
              },
              {
                label: 'Mode',
                value:
                  data.integrations.payments.stripe.mode === 'live'
                    ? 'Live'
                    : data.integrations.payments.stripe.mode === 'test'
                      ? 'Test'
                      : '—',
              },
              {
                label: 'Webhook secret',
                value: <Configured ok={data.integrations.payments.stripe.webhookConfigured} />,
              },
              { label: 'Webhook URL', value: <Env>{`${API_URL}/v1/webhooks/stripe`}</Env> },
            ]}
          />
          <p className="text-ink-soft mt-4 text-sm">
            Set <Env>STRIPE_SECRET_KEY</Env> and <Env>STRIPE_WEBHOOK_SECRET</Env>. Subscribe the
            webhook to <Env>checkout.session.completed</Env>,{' '}
            <Env>checkout.session.async_payment_succeeded</Env>,{' '}
            <Env>checkout.session.async_payment_failed</Env>, <Env>checkout.session.expired</Env>{' '}
            and <Env>charge.refunded</Env>.
          </p>
          <div className="mt-5">
            <CheckButton
              label="Test Stripe connection"
              run={() =>
                api
                  .post<IntegrationCheck>('/v1/admin/settings/check/payments')
                  .catch(() => undefined)
              }
            />
          </div>
        </Section>
      ) : tab === 'emails' ? (
        <Emails settings={data} />
      ) : tab === 'storage' ? (
        <Section
          title="Private file storage"
          description="Product files live in a private bucket (Cloudflare R2 in production). Uploads stream through the API; downloads use 5-minute signed links."
        >
          <DescriptionList
            items={[
              {
                label: 'Provider',
                value:
                  data.integrations.storage.provider === 'r2'
                    ? 'Cloudflare R2'
                    : data.integrations.storage.provider === 's3'
                      ? 'Amazon S3'
                      : 'Local S3-compatible (dev)',
              },
              {
                label: 'Credentials',
                value: <Configured ok={data.integrations.storage.configured} />,
              },
              { label: 'Bucket', value: data.integrations.storage.bucket },
              { label: 'Max upload', value: `${data.integrations.storage.maxUploadMb} MB` },
            ]}
          />
          <p className="text-ink-soft mt-4 text-sm">
            Configure <Env>S3_ENDPOINT</Env>, <Env>S3_BUCKET</Env>, <Env>S3_ACCESS_KEY</Env>,{' '}
            <Env>S3_SECRET_KEY</Env> (and <Env>FILE_UPLOAD_MAX_MB</Env>).
          </p>
          <div className="mt-5">
            <CheckButton
              label="Test storage connection"
              run={() =>
                api
                  .post<IntegrationCheck>('/v1/admin/settings/check/storage')
                  .catch(() => undefined)
              }
            />
          </div>
        </Section>
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
