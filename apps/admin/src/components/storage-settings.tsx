'use client';

import type {
  IntegrationCheck,
  StorageConfigInput,
  StorageProvider,
  StorageSettingsView,
} from '@shimanto/types';
import {
  ActionButton,
  ConfirmDialog,
  DescriptionList,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Notice,
  Section,
  Select,
  StatusBadge,
} from '@shimanto/ui';
import { type FormEvent, useState } from 'react';
import { CheckButton, Env, type SecretChange, SecretField } from '@/components/settings-controls';
import { api } from '@/lib/api';
import { useAdmin } from '@/lib/session';
import { useAction } from '@/lib/use-action';
import { useApi } from '@/lib/use-api';

const providerNames: Record<StorageSettingsView['provider'], string> = {
  r2: 'Cloudflare R2',
  s3: 'Amazon S3',
  local: 'Local S3-compatible (dev)',
};

type Form = {
  provider: StorageProvider;
  accountId: string;
  endpoint: string;
  region: string;
  bucket: string;
  publicUrl: string;
  accessKeyId: string;
  secret: SecretChange;
};

function formFrom(view: StorageSettingsView): Form {
  const saved = view.saved;
  return {
    provider: saved?.provider ?? 'r2',
    accountId: saved?.accountId ?? '',
    endpoint: saved?.endpoint ?? '',
    region: saved?.region ?? '',
    bucket: saved?.bucket ?? '',
    publicUrl: saved?.publicUrl ?? '',
    accessKeyId: saved?.accessKeyId ?? '',
    secret: undefined,
  };
}

function inputFrom(form: Form): StorageConfigInput {
  const secret = form.secret?.trim();
  return {
    provider: form.provider,
    accountId: form.provider === 'r2' ? form.accountId.trim() : null,
    endpoint: form.provider === 'r2' ? null : form.endpoint.trim() || null,
    region: form.provider === 'r2' ? null : form.region.trim() || null,
    bucket: form.bucket.trim(),
    publicUrl: form.publicUrl.trim(),
    accessKeyId: form.accessKeyId.trim(),
    ...(secret ? { secretAccessKey: secret } : {}),
  };
}

/**
 * Admin → Settings → Storage: what's live, and a form to connect Cloudflare R2 (or S3 /
 * any S3-compatible storage). Saving tests the connection first; the secret is write-only.
 */
export function StorageSettings() {
  const { data, error, loading, reload, setData } = useApi<StorageSettingsView>(
    '/v1/admin/settings/storage',
  );
  if (loading && !data) return <LoadingState rows={5} />;
  if (error || !data) return <ErrorState message={error ?? undefined} onRetry={reload} />;
  return <StorageForm view={data} onSaved={setData} />;
}

function StorageForm({
  view,
  onSaved,
}: {
  view: StorageSettingsView;
  onSaved: (view: StorageSettingsView) => void;
}) {
  const { user } = useAdmin();
  const canEdit = user?.role === 'SUPER_ADMIN';
  const [form, setForm] = useState<Form>(() => formFrom(view));
  const [test, setTest] = useState<IntegrationCheck | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const action = useAction();
  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setTest(null);
  };
  const r2 = form.provider === 'r2';

  const onTest = async () => {
    setTest(null);
    const res = await action.run(
      () => api.post<IntegrationCheck>('/v1/admin/settings/storage/test', inputFrom(form)),
      { key: 'test' },
    );
    if (res) setTest(res);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const res = await action.run(
      () => api.put<StorageSettingsView>('/v1/admin/settings/storage', inputFrom(form)),
      { key: 'save', success: 'Connected. New uploads go to this bucket.' },
    );
    if (res) {
      onSaved(res);
      setForm(formFrom(res));
    }
  };

  return (
    <>
      <Section
        title="File storage"
        description="Cover images, product files and support attachments. Product files stay private: buyers get 5-minute signed links."
      >
        <DescriptionList
          items={[
            {
              label: 'In use',
              value: (
                <span className="flex flex-wrap items-center gap-2">
                  {providerNames[view.provider]}
                  <StatusBadge
                    status={view.source === 'admin' ? 'ACTIVE' : 'PENDING'}
                    label={view.source === 'admin' ? 'Connected here' : 'From the environment'}
                  />
                </span>
              ),
            },
            { label: 'Bucket', value: view.bucket },
            { label: 'Public images from', value: <Env>{view.publicUrl}</Env> },
            { label: 'Max upload', value: `${view.maxUploadMb} MB` },
          ]}
        />
        <div className="mt-5">
          <CheckButton
            label="Test the storage in use"
            run={() =>
              api.post<IntegrationCheck>('/v1/admin/settings/check/storage').catch(() => undefined)
            }
          />
        </div>
      </Section>

      <Section
        title={view.saved ? 'Connection' : 'Connect Cloudflare R2'}
        description="Saved here, it's used instead of the S3_* environment variables. The secret key is stored encrypted and never shown again."
      >
        <div className="grid max-w-2xl gap-5">
          {!canEdit && <Notice tone="info">Only super admins can change storage.</Notice>}
          {!view.encryptionKeySet && (
            <Notice tone="warning" title="Set SETTINGS_ENCRYPTION_KEY in production">
              The secret is encrypted with a key derived from the JWT secret. Set your own key once
              and keep it, so rotating the JWT secret never drops the storage key.
            </Notice>
          )}
          {r2 && !view.saved && (
            <ol className="text-ink-soft grid list-decimal gap-1.5 pl-5 text-[15px]">
              <li>
                Cloudflare dashboard → <strong className="text-ink">R2</strong> → Create bucket.
                Keep it private.
              </li>
              <li>
                Bucket → Settings → <strong className="text-ink">Public access</strong>: connect a
                custom domain (e.g. media.yourdomain.com) or allow the r2.dev URL. That URL is the
                public URL below.
              </li>
              <li>
                R2 → <strong className="text-ink">Manage API tokens</strong> → Create token with
                Object Read &amp; Write on this bucket. Copy the Access Key ID and Secret.
              </li>
              <li>The Account ID is on the R2 overview page.</li>
            </ol>
          )}

          <form onSubmit={onSubmit} className="grid gap-5" noValidate>
            {action.error && <Notice tone="danger">{action.error}</Notice>}
            {action.success && <Notice tone="success">{action.success}</Notice>}
            <Field label="Provider">
              {(f) => (
                <Select
                  {...f}
                  disabled={!canEdit}
                  value={form.provider}
                  onChange={(e) => set('provider', e.target.value as StorageProvider)}
                >
                  <option value="r2">Cloudflare R2</option>
                  <option value="s3">Amazon S3</option>
                  <option value="custom">Other S3-compatible</option>
                </Select>
              )}
            </Field>
            {r2 ? (
              <Field
                label="Account ID"
                error={action.fields.accountId}
                hint="32 characters, from the R2 overview page."
              >
                {(f) => (
                  <Input
                    {...f}
                    disabled={!canEdit}
                    spellCheck={false}
                    value={form.accountId}
                    onChange={(e) => set('accountId', e.target.value)}
                  />
                )}
              </Field>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Endpoint"
                  optional={form.provider === 's3'}
                  error={action.fields.endpoint}
                  hint={form.provider === 's3' ? 'Leave empty for AWS.' : 'https://…'}
                >
                  {(f) => (
                    <Input
                      {...f}
                      type="url"
                      disabled={!canEdit}
                      value={form.endpoint}
                      onChange={(e) => set('endpoint', e.target.value)}
                    />
                  )}
                </Field>
                <Field label="Region" optional error={action.fields.region} hint="e.g. us-east-1">
                  {(f) => (
                    <Input
                      {...f}
                      disabled={!canEdit}
                      value={form.region}
                      onChange={(e) => set('region', e.target.value)}
                    />
                  )}
                </Field>
              </div>
            )}
            <Field label="Bucket" error={action.fields.bucket}>
              {(f) => (
                <Input
                  {...f}
                  disabled={!canEdit}
                  spellCheck={false}
                  value={form.bucket}
                  onChange={(e) => set('bucket', e.target.value)}
                />
              )}
            </Field>
            <Field
              label="Public URL"
              error={action.fields.publicUrl}
              hint={
                r2
                  ? 'Your custom domain or the bucket’s r2.dev URL. Cover images are served from here.'
                  : 'Where public images are served from (bucket URL or CDN).'
              }
            >
              {(f) => (
                <Input
                  {...f}
                  type="url"
                  disabled={!canEdit}
                  placeholder="https://media.yourdomain.com"
                  value={form.publicUrl}
                  onChange={(e) => set('publicUrl', e.target.value)}
                />
              )}
            </Field>
            <Field label="Access Key ID" error={action.fields.accessKeyId}>
              {(f) => (
                <Input
                  {...f}
                  disabled={!canEdit}
                  autoComplete="off"
                  spellCheck={false}
                  value={form.accessKeyId}
                  onChange={(e) => set('accessKeyId', e.target.value)}
                />
              )}
            </Field>
            <SecretField
              label="Secret Access Key"
              hint={view.saved?.secretKeyHint ?? null}
              isSet={Boolean(view.saved)}
              value={form.secret}
              onChange={(value) => set('secret', value === null ? undefined : value)}
              disabled={!canEdit}
              error={action.fields.secretAccessKey}
            />

            {view.saved && (
              <Notice tone="info">
                Switching storage doesn’t move files. Files uploaded before stay where they are;
                copy them to the new bucket first (e.g. with rclone) if the store already has some.
              </Notice>
            )}

            {test && (
              <p
                role="status"
                className={test.ok ? 'text-sm font-medium' : 'text-create text-sm font-medium'}
              >
                {test.ok ? '✓ ' : '✕ '}
                {test.message}
              </p>
            )}

            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <ActionButton type="submit" loading={action.isBusy('save')}>
                  {view.saved ? 'Save connection' : 'Test & connect'}
                </ActionButton>
                <ActionButton
                  variant="secondary"
                  icon="shield"
                  loading={action.isBusy('test')}
                  onClick={() => void onTest()}
                >
                  Test only
                </ActionButton>
                {view.saved && (
                  <ActionButton variant="ghost" onClick={() => setConfirmClear(true)}>
                    Use environment settings
                  </ActionButton>
                )}
              </div>
            )}
          </form>
        </div>
      </Section>

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title="Go back to the environment storage?"
        description="The connection saved here is removed and storage uses the S3_* environment variables again. Files uploaded to this bucket stay there."
        confirmLabel="Use environment settings"
        tone="danger"
        onConfirm={async () => {
          const res = await action.run(
            () => api.delete<StorageSettingsView>('/v1/admin/settings/storage'),
            { key: 'clear', success: 'Storage uses the environment settings again.' },
          );
          if (res) {
            onSaved(res);
            setForm(formFrom(res));
          }
        }}
      />
    </>
  );
}
