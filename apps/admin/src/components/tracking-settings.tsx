'use client';

import type { AdminTracking, IntegrationCheck, TrackingSettings } from '@shimanto/types';
import {
  ActionButton,
  Checkbox,
  DescriptionList,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Notice,
  Section,
  StatusBadge,
} from '@shimanto/ui';
import { type FormEvent, type ReactNode, useState } from 'react';
import { api } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { useAdmin } from '@/lib/session';
import { useAction } from '@/lib/use-action';
import { useApi } from '@/lib/use-api';

function Status({
  ok,
  yes = 'Connected',
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

function Test({ provider, label }: { provider: 'ga4' | 'meta'; label: string }) {
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
          setResult(
            await api
              .post<IntegrationCheck>(`/v1/admin/tracking/test/${provider}`)
              .catch(() => null),
          );
          setBusy(false);
        }}
      >
        {label}
      </ActionButton>
      {result && (
        <span
          role="status"
          className={result.ok ? 'text-sm font-medium' : 'text-create text-sm font-medium'}
        >
          {result.ok ? '✓ ' : '✕ '}
          {result.message}
        </span>
      )}
    </div>
  );
}

function Form({
  initial,
  onSaved,
}: {
  initial: AdminTracking;
  onSaved: (t: AdminTracking) => void;
}) {
  const { user } = useAdmin();
  const canEdit = user?.role === 'SUPER_ADMIN';
  const [s, setS] = useState<TrackingSettings>(initial.settings);
  const action = useAction();
  const h = initial.health;
  const f = action.fields;
  const set = <K extends keyof TrackingSettings>(key: K, value: TrackingSettings[K]) =>
    setS((prev) => ({ ...prev, [key]: value }));
  const text = (
    key:
      | 'ga4MeasurementId'
      | 'gtmContainerId'
      | 'metaPixelId'
      | 'googleAdsConversionId'
      | 'googleAdsConversionLabel',
  ) => ({
    value: s[key] ?? '',
    disabled: !canEdit,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value.trim() || null),
  });

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const res = await action.run(() => api.put<AdminTracking>('/v1/admin/tracking', s), {
      success: 'Tracking settings saved. The site picks them up within a minute.',
    });
    if (res) onSaved(res);
  };

  return (
    <form onSubmit={onSubmit} noValidate>
      {!canEdit && (
        <Notice tone="info" className="mb-6">
          Only super admins can change tracking settings.
        </Notice>
      )}
      {action.error && (
        <Notice tone="danger" className="mb-6">
          {action.error}
        </Notice>
      )}
      {action.success && (
        <Notice tone="success" className="mb-6">
          {action.success}
        </Notice>
      )}

      <Section
        title="Connection status"
        description="Secrets (the GA4 API secret and the Meta access token) live in the server environment and are never shown here."
      >
        <DescriptionList
          columns={3}
          items={[
            { label: 'GA4 (browser)', value: <Status ok={h.ga4.configured} /> },
            {
              label: 'GA4 server-side purchases',
              value: (
                <Status
                  ok={h.ga4.serverSide}
                  no={h.ga4.configured ? 'Needs GA4_API_SECRET' : 'Not configured'}
                />
              ),
            },
            { label: 'Google Tag Manager', value: <Status ok={h.gtm.configured} /> },
            { label: 'Meta Pixel', value: <Status ok={h.metaPixel.configured} /> },
            {
              label: 'Meta Conversions API',
              value: (
                <Status
                  ok={h.metaCapi.configured}
                  no={h.metaCapi.tokenSet ? 'Disabled' : 'Needs META_ACCESS_TOKEN'}
                />
              ),
            },
            { label: 'Google Ads', value: <Status ok={h.googleAds.configured} /> },
          ]}
        />
        <div className="mt-5 flex flex-wrap gap-4">
          <Test provider="ga4" label="Test GA4" />
          <Test provider="meta" label="Test Meta CAPI" />
        </div>
      </Section>

      <Section
        title="Google Analytics 4"
        description="Page views and shopping events from the browser; purchases, refunds and sign-ups from the server (Measurement Protocol)."
      >
        <div className="grid gap-4">
          <Checkbox
            label="Enabled"
            checked={s.ga4Enabled}
            disabled={!canEdit}
            onChange={(e) => set('ga4Enabled', e.target.checked)}
          />
          <Field
            label="Measurement ID"
            error={f.ga4MeasurementId}
            hint="G-XXXXXXX. Server-side events also need GA4_API_SECRET in the API environment."
          >
            {(p) => (
              <Input
                {...p}
                className="max-w-xs"
                placeholder="G-ABC123XYZ"
                {...text('ga4MeasurementId')}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section
        title="Google Tag Manager"
        description="When set, GTM loads instead of GA4/Ads tags and receives every event through the dataLayer (purchase events carry server_tracked: true)."
      >
        <div className="grid gap-4">
          <Checkbox
            label="Enabled"
            checked={s.gtmEnabled}
            disabled={!canEdit}
            onChange={(e) => set('gtmEnabled', e.target.checked)}
          />
          <Field label="Container ID" error={f.gtmContainerId}>
            {(p) => (
              <Input
                {...p}
                className="max-w-xs"
                placeholder="GTM-ABCD123"
                {...text('gtmContainerId')}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section
        title="Meta"
        description="Browser Pixel and server-side Conversions API share event ids (purchase_<order id>), so Meta counts each conversion once."
      >
        <div className="grid gap-4">
          <Checkbox
            label="Meta Pixel enabled"
            checked={s.metaPixelEnabled}
            disabled={!canEdit}
            onChange={(e) => set('metaPixelEnabled', e.target.checked)}
          />
          <Checkbox
            label="Conversions API enabled"
            description={
              <>
                Needs <Env>META_ACCESS_TOKEN</Env> on the server (optionally{' '}
                <Env>META_TEST_EVENT_CODE</Env> while testing).
              </>
            }
            checked={s.metaCapiEnabled}
            disabled={!canEdit}
            onChange={(e) => set('metaCapiEnabled', e.target.checked)}
          />
          <Field label="Pixel ID" error={f.metaPixelId}>
            {(p) => (
              <Input
                {...p}
                className="max-w-xs"
                inputMode="numeric"
                placeholder="1234567890123456"
                {...text('metaPixelId')}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section
        title="Google Ads"
        description="Optional. Purchase conversions are sent from the browser when GTM isn't used (with GTM, set this up there)."
      >
        <div className="grid gap-4">
          <Checkbox
            label="Enabled"
            checked={s.googleAdsEnabled}
            disabled={!canEdit}
            onChange={(e) => set('googleAdsEnabled', e.target.checked)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Conversion ID" error={f.googleAdsConversionId}>
              {(p) => (
                <Input {...p} placeholder="AW-123456789" {...text('googleAdsConversionId')} />
              )}
            </Field>
            <Field label="Conversion label" optional error={f.googleAdsConversionLabel}>
              {(p) => <Input {...p} {...text('googleAdsConversionLabel')} />}
            </Field>
          </div>
        </div>
      </Section>

      <Section
        title="Attribution"
        description="Stored on each visitor (first-party cookies), then on their account and orders."
      >
        <div className="grid gap-4">
          <Checkbox
            label="Capture UTM parameters and referrers"
            checked={s.utmTracking}
            disabled={!canEdit}
            onChange={(e) => set('utmTracking', e.target.checked)}
          />
          <Checkbox
            label="First touch"
            description="The first marketing source a visitor came from. Never overwritten."
            checked={s.firstTouch}
            disabled={!canEdit}
            onChange={(e) => set('firstTouch', e.target.checked)}
          />
          <Checkbox
            label="Last touch"
            description="The most recent campaign or referral before buying."
            checked={s.lastTouch}
            disabled={!canEdit}
            onChange={(e) => set('lastTouch', e.target.checked)}
          />
        </div>
      </Section>

      <Section title="Consent" description="Checkout and orders never depend on consent.">
        <Checkbox
          label="Ask visitors before analytics and marketing tags run"
          description="Shows a cookie banner (Accept all / Essential only / Choose). GA4 needs Analytics consent; Meta Pixel, Conversions API and Google Ads need Marketing consent. Turn off only where the law allows it."
          checked={s.requireConsent}
          disabled={!canEdit}
          onChange={(e) => set('requireConsent', e.target.checked)}
        />
      </Section>

      <p className="text-ink-soft mb-6 text-sm">
        Public config endpoint: <Env>{`${API_URL}/v1/tracking/config`}</Env>
      </p>
      {canEdit && (
        <ActionButton type="submit" loading={action.isBusy()}>
          Save tracking settings
        </ActionButton>
      )}
    </form>
  );
}

/** Admin → Settings → Analytics & Tracking. */
export function TrackingSettingsPanel() {
  const { data, error, loading, reload, setData } = useApi<AdminTracking>('/v1/admin/tracking');
  if (loading && !data) return <LoadingState rows={5} />;
  if (error || !data) return <ErrorState message={error ?? undefined} onRetry={reload} />;
  return <Form key={JSON.stringify(data.settings)} initial={data} onSaved={setData} />;
}
