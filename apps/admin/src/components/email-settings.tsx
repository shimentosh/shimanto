'use client';

import type { EmailSettingsUpdate, EmailSettingsView, IntegrationCheck } from '@shimanto/types';
import {
  ActionButton,
  DescriptionList,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Notice,
  Section,
  StatusBadge,
} from '@shimanto/ui';
import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import {
  CheckButton,
  Env,
  type SecretChange,
  SecretField,
  secretUpdate,
} from '@/components/settings-controls';
import { api } from '@/lib/api';
import { useAdmin } from '@/lib/session';
import { useAction } from '@/lib/use-action';
import { useApi } from '@/lib/use-api';

const providerNames: Record<EmailSettingsView['provider'], string> = {
  resend: 'Resend',
  smtp: 'SMTP',
  log: 'Log only (not delivered)',
};

type Form = { key: SecretChange; from: string };

const formFrom = (view: EmailSettingsView): Form => ({
  key: undefined,
  from: view.fromSource === 'admin' ? view.from : '',
});

/**
 * Admin → Settings → Emails: what delivers email now, and a form to connect Resend. The API key
 * is write-only; saving checks it with Resend first.
 */
export function EmailDeliverySettings({ onSaved }: { onSaved?: () => void }) {
  const { data, error, loading, reload, setData } = useApi<EmailSettingsView>(
    '/v1/admin/settings/email',
  );
  if (loading && !data) return <LoadingState rows={4} />;
  if (error || !data) return <ErrorState message={error ?? undefined} onRetry={reload} />;
  return (
    <EmailForm
      view={data}
      onSaved={(view) => {
        setData(view);
        onSaved?.();
      }}
    />
  );
}

function EmailForm({
  view,
  onSaved,
}: {
  view: EmailSettingsView;
  onSaved: (view: EmailSettingsView) => void;
}) {
  const { user } = useAdmin();
  const canEdit = user?.role === 'SUPER_ADMIN';
  const [form, setForm] = useState<Form>(() => formFrom(view));
  const action = useAction();
  const adminKey = view.resend.source === 'admin';

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const body: EmailSettingsUpdate = {
      resendApiKey: secretUpdate(form.key),
      from: form.from.trim() || null,
    };
    const res = await action.run(
      () => api.put<EmailSettingsView>('/v1/admin/settings/email', body),
      { success: 'Saved. New emails use these settings within 30 seconds.' },
    );
    if (res) {
      onSaved(res);
      setForm(formFrom(res));
    }
  };

  return (
    <>
      <Section
        title="Email provider"
        description="Receipts, delivery, account and support emails all go out through one provider."
      >
        <DescriptionList
          items={[
            {
              label: 'In use',
              value: (
                <span className="flex flex-wrap items-center gap-2">
                  {providerNames[view.provider]}
                  {view.provider === 'resend' && (
                    <StatusBadge
                      status={adminKey ? 'ACTIVE' : 'PENDING'}
                      label={adminKey ? 'Key saved here' : 'Key from the environment'}
                    />
                  )}
                </span>
              ),
            },
            { label: 'Sender', value: view.from },
            {
              label: 'Templates',
              value: (
                <Link href="/emails" className="font-medium underline underline-offset-4">
                  See and test every email →
                </Link>
              ),
            },
          ]}
        />
        {view.provider === 'resend' && (
          <div className="mt-5">
            <CheckButton
              label="Check Resend"
              run={() =>
                api.post<IntegrationCheck>('/v1/admin/settings/email/check').catch(() => undefined)
              }
            />
          </div>
        )}
      </Section>

      <Section
        title={adminKey ? 'Resend' : 'Connect Resend'}
        description="Saved here, the key and sender are used instead of RESEND_API_KEY and MAIL_FROM. The key is stored encrypted and never shown again."
      >
        <form className="grid max-w-2xl gap-5" onSubmit={onSubmit} noValidate>
          {!canEdit && <Notice tone="info">Only super admins can change email delivery.</Notice>}
          {!view.encryptionKeySet && (
            <Notice tone="warning" title="Set SETTINGS_ENCRYPTION_KEY in production">
              The key is encrypted with a key derived from the JWT secret. Set your own key once and
              keep it, so rotating the JWT secret never drops the Resend key.
            </Notice>
          )}
          {!adminKey && (
            <ol className="text-ink-soft grid list-decimal gap-1.5 pl-5 text-[15px]">
              <li>
                In Resend, add your domain under <strong>Domains</strong> and finish its DNS
                records.
              </li>
              <li>
                Create a key under <strong>API Keys</strong>. Sending access is enough.
              </li>
              <li>Paste it below with a sender on that domain, then save.</li>
            </ol>
          )}
          <SecretField
            label="Resend API key"
            hint={view.resend.hint}
            isSet={adminKey}
            value={form.key}
            onChange={(key) => setForm((f) => ({ ...f, key }))}
            disabled={!canEdit}
            placeholder="re_…"
            error={action.fields.resendApiKey}
            help={
              view.envKeySet && !adminKey ? (
                <>
                  Using <Env>RESEND_API_KEY</Env> from the server ({view.resend.hint}). A key saved
                  here takes over.
                </>
              ) : (
                'Checked with Resend before it’s saved.'
              )
            }
          />
          <Field
            label="Sender"
            error={action.fields.from}
            hint={
              <>
                On a domain verified in Resend. Leave empty to use <Env>MAIL_FROM</Env>
                {view.fromSource === 'env' ? ` (${view.from})` : ''}.
              </>
            }
          >
            {(f) => (
              <Input
                {...f}
                value={form.from}
                disabled={!canEdit}
                placeholder="Shimanto <hello@shimanto.xyz>"
                onChange={(e) => setForm((prev) => ({ ...prev, from: e.target.value }))}
              />
            )}
          </Field>
          {canEdit && (
            <div className="flex flex-wrap items-center gap-3">
              <ActionButton type="submit" loading={action.isBusy()}>
                Save
              </ActionButton>
              {action.success && (
                <span role="status" className="text-sm font-medium">
                  {action.success}
                </span>
              )}
            </div>
          )}
          {action.error && <Notice tone="danger">{action.error}</Notice>}
        </form>
      </Section>
    </>
  );
}
