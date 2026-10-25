'use client';

import type { IntegrationCheck, PaymentSettingsUpdate, PaymentSettingsView } from '@shimanto/types';
import {
  ActionButton,
  Checkbox,
  Field,
  Input,
  Notice,
  Section,
  Select,
  StatusBadge,
} from '@shimanto/ui';
import { type FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/use-action';
import {
  CheckButton,
  Env,
  ProviderStatus,
  type SecretChange,
  SecretField,
  WebhookSetup,
  secretUpdate,
} from '@/components/settings-controls';

const STRIPE_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
  'charge.refunded',
];

const PAYPAL_EVENTS = [
  'CHECKOUT.ORDER.APPROVED',
  'PAYMENT.CAPTURE.COMPLETED',
  'PAYMENT.CAPTURE.DENIED',
  'PAYMENT.CAPTURE.REFUNDED',
];

interface CardProps {
  view: PaymentSettingsView;
  canEdit: boolean;
  onSaved: (view: PaymentSettingsView) => void;
}

const save = (body: PaymentSettingsUpdate) =>
  api.put<PaymentSettingsView>('/v1/admin/settings/payments', body);

const check = (path: string) => () =>
  api.post<IntegrationCheck>(`/v1/admin/settings/check/${path}`).catch(() => undefined);

function EnvNotice({ names }: { names: string[] }) {
  return (
    <Notice tone="info">
      The keys come from the server environment (
      {names.map((n, i) => (
        <span key={n}>
          {i > 0 && ', '}
          <Env>{n}</Env>
        </span>
      ))}
      ), which wins over keys entered here. Change them there; you can still switch it on or off.
    </Notice>
  );
}

export function StripeCard({ view, canEdit, onSaved }: CardProps) {
  const stripe = view.stripe;
  const locked = !canEdit || stripe.source === 'env';
  const [enabled, setEnabled] = useState(stripe.enabled);
  const [secretKey, setSecretKey] = useState<SecretChange>(undefined);
  const [webhookSecret, setWebhookSecret] = useState<SecretChange>(undefined);
  const action = useAction();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const res = await action.run(
      () =>
        save({
          stripe: {
            enabled,
            ...(locked
              ? {}
              : {
                  secretKey: secretUpdate(secretKey),
                  webhookSecret: secretUpdate(webhookSecret),
                }),
          },
        }),
      { success: 'Stripe settings saved.' },
    );
    if (res) {
      setSecretKey(undefined);
      setWebhookSecret(undefined);
      onSaved(res);
    }
  };

  return (
    <Section
      title={
        <span className="flex flex-wrap items-center gap-2">
          Stripe <ProviderStatus enabled={stripe.enabled} active={stripe.active} />
          {stripe.mode && (
            <StatusBadge
              status={stripe.mode === 'live' ? 'ACTIVE' : 'QUEUED'}
              label={stripe.mode === 'live' ? 'Live mode' : 'Test mode'}
            />
          )}
        </span>
      }
      description="Cards, Apple Pay and Google Pay on Stripe’s hosted checkout. Card details never touch this site."
    >
      <form onSubmit={onSubmit} className="grid max-w-2xl gap-5" noValidate>
        {action.error && <Notice tone="danger">{action.error}</Notice>}
        {action.success && <Notice tone="success">{action.success}</Notice>}
        {stripe.source === 'env' && (
          <EnvNotice names={['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET']} />
        )}
        <Checkbox
          label="Offer card payments at checkout"
          description="Needs a secret key. Turning it off hides it from new checkouts; refunds and late webhooks still work."
          disabled={!canEdit}
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <SecretField
          label="Secret key"
          hint={stripe.secretKeyHint}
          isSet={Boolean(stripe.secretKeyHint)}
          value={secretKey}
          onChange={setSecretKey}
          disabled={locked}
          placeholder="sk_live_… or sk_test_…"
          error={action.fields['stripe.secretKey']}
          help={
            <>
              Dashboard → Developers → API keys. A restricted key (<Env>rk_…</Env>) with Checkout
              Sessions and Refunds write access works too. Test keys take test cards only.
            </>
          }
        />
        <SecretField
          label="Webhook signing secret"
          hint={null}
          isSet={stripe.webhookSecretSet}
          value={webhookSecret}
          onChange={setWebhookSecret}
          disabled={locked}
          placeholder="whsec_…"
          error={action.fields['stripe.webhookSecret']}
          help="Without it, paid orders can’t be confirmed. Shown when you add the endpoint below."
        />
        <WebhookSetup url={stripe.webhookUrl} events={STRIPE_EVENTS} />
        <div className="flex flex-wrap items-center gap-4">
          {canEdit && (
            <ActionButton type="submit" loading={action.isBusy()}>
              Save Stripe
            </ActionButton>
          )}
          <CheckButton label="Test connection" run={check('payments')} />
        </div>
      </form>
    </Section>
  );
}

export function PaypalCard({ view, canEdit, onSaved }: CardProps) {
  const paypal = view.paypal;
  const locked = !canEdit || paypal.source === 'env';
  const [form, setForm] = useState({
    enabled: paypal.enabled,
    mode: paypal.mode,
    clientId: paypal.clientId ?? '',
    webhookId: paypal.webhookId ?? '',
  });
  const [clientSecret, setClientSecret] = useState<SecretChange>(undefined);
  const action = useAction();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const res = await action.run(
      () =>
        save({
          paypal: {
            enabled: form.enabled,
            ...(locked
              ? {}
              : {
                  mode: form.mode,
                  clientId: form.clientId.trim() || null,
                  webhookId: form.webhookId.trim() || null,
                  clientSecret: secretUpdate(clientSecret),
                }),
          },
        }),
      { success: 'PayPal settings saved.' },
    );
    if (res) {
      setClientSecret(undefined);
      setForm({
        enabled: res.paypal.enabled,
        mode: res.paypal.mode,
        clientId: res.paypal.clientId ?? '',
        webhookId: res.paypal.webhookId ?? '',
      });
      onSaved(res);
    }
  };

  return (
    <Section
      title={
        <span className="flex flex-wrap items-center gap-2">
          PayPal <ProviderStatus enabled={paypal.enabled} active={paypal.active} />
          {paypal.clientId && (
            <StatusBadge
              status={paypal.mode === 'live' ? 'ACTIVE' : 'QUEUED'}
              label={paypal.mode === 'live' ? 'Live' : 'Sandbox'}
            />
          )}
        </span>
      }
      description="PayPal balance, linked bank or card, approved on PayPal and captured by the store."
    >
      <form onSubmit={onSubmit} className="grid max-w-2xl gap-5" noValidate>
        {action.error && <Notice tone="danger">{action.error}</Notice>}
        {action.success && <Notice tone="success">{action.success}</Notice>}
        {paypal.source === 'env' && (
          <EnvNotice
            names={['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_MODE', 'PAYPAL_WEBHOOK_ID']}
          />
        )}
        <Checkbox
          label="Offer PayPal at checkout"
          description="Needs a client id and secret."
          disabled={!canEdit}
          checked={form.enabled}
          onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
        />
        <Field
          label="Environment"
          hint="Sandbox uses developer.paypal.com test accounts; nothing is charged."
          error={action.fields['paypal.mode']}
        >
          {(f) => (
            <Select
              {...f}
              disabled={locked}
              value={form.mode}
              onChange={(e) =>
                setForm({ ...form, mode: e.target.value === 'live' ? 'live' : 'sandbox' })
              }
            >
              <option value="sandbox">Sandbox (testing)</option>
              <option value="live">Live</option>
            </Select>
          )}
        </Field>
        <Field
          label="Client ID"
          hint="developer.paypal.com → Apps & Credentials → your REST app. Use the app for the environment above."
          error={action.fields['paypal.clientId']}
        >
          {(f) => (
            <Input
              {...f}
              autoComplete="off"
              spellCheck={false}
              disabled={locked}
              value={form.clientId}
              onChange={(e) => setForm({ ...form, clientId: e.target.value })}
            />
          )}
        </Field>
        <SecretField
          label="Client secret"
          hint={paypal.clientSecretHint}
          isSet={Boolean(paypal.clientSecretHint)}
          value={clientSecret}
          onChange={setClientSecret}
          disabled={locked}
          error={action.fields['paypal.clientSecret']}
        />
        <Field
          label="Webhook ID"
          optional
          hint="Shown after you add the webhook below in your PayPal app. Lets the store verify PayPal’s events, e.g. refunds made on PayPal."
          error={action.fields['paypal.webhookId']}
        >
          {(f) => (
            <Input
              {...f}
              autoComplete="off"
              spellCheck={false}
              disabled={locked}
              value={form.webhookId}
              onChange={(e) => setForm({ ...form, webhookId: e.target.value })}
            />
          )}
        </Field>
        <WebhookSetup url={paypal.webhookUrl} events={PAYPAL_EVENTS} />
        <p className="text-ink-soft text-sm">
          PayPal is offered only for carts in a currency it takes: {paypal.currencies.join(', ')}.
          Taka (BDT) isn’t one of them, so BDT products show your other ways to pay.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          {canEdit && (
            <ActionButton type="submit" loading={action.isBusy()}>
              Save PayPal
            </ActionButton>
          )}
          <CheckButton label="Test connection" run={check('paypal')} />
        </div>
      </form>
    </Section>
  );
}
