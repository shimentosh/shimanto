'use client';

import type { PaymentSettingsView } from '@shimanto/types';
import { ErrorState, LoadingState, Notice } from '@shimanto/ui';
import { useAdmin } from '@/lib/session';
import { useApi } from '@/lib/use-api';
import { ManualMethods } from './manual-methods';
import { PaypalCard, StripeCard } from './provider-cards';
import { Env } from '@/components/settings-controls';

/**
 * Settings → Payments: card (Stripe), PayPal and manual methods (bKash, bank transfer…). Keys
 * entered here are encrypted on the server and never shown again; only super admins can edit.
 */
export function PaymentsSettings() {
  const { user } = useAdmin();
  const canEdit = user?.role === 'SUPER_ADMIN';
  const { data, error, loading, reload, setData } = useApi<PaymentSettingsView>(
    '/v1/admin/settings/payments',
  );

  if (loading && !data) return <LoadingState rows={6} />;
  if (error || !data) return <ErrorState message={error ?? undefined} onRetry={reload} />;

  const offered = [
    data.stripe.active && 'Card (Stripe)',
    data.paypal.active && 'PayPal',
    ...data.manual.methods.filter((m) => m.enabled).map((m) => m.name),
  ].filter(Boolean);

  return (
    <>
      <div className="mb-2 grid gap-3">
        {!canEdit && <Notice tone="info">Only super admins can change payment settings.</Notice>}
        {offered.length === 0 ? (
          <Notice tone="warning" title="No way to pay yet">
            Paid products can’t be bought until you set up at least one method below. Free products
            work either way.
          </Notice>
        ) : (
          <Notice tone="success" title="At checkout">
            Buyers can pay with {offered.join(', ')}, depending on the cart’s currency.
          </Notice>
        )}
        {!data.encryptionKeySet && (
          <Notice tone="warning" title="Set an encryption key for production">
            Keys you enter here are encrypted with a key derived from <Env>JWT_ACCESS_SECRET</Env>,
            so rotating that secret would drop them. Set <Env>SETTINGS_ENCRYPTION_KEY</Env> (e.g.{' '}
            <Env>openssl rand -base64 48</Env>) on the API before entering live keys.
          </Notice>
        )}
      </div>
      <StripeCard view={data} canEdit={canEdit} onSaved={setData} />
      <PaypalCard view={data} canEdit={canEdit} onSaved={setData} />
      <ManualMethods view={data} canEdit={canEdit} onSaved={setData} />
    </>
  );
}
