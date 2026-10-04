'use client';

import { createHttpClient } from '@shimanto/sdk';
import type { CheckoutConfirmation } from '@shimanto/types';
import { useEffect } from 'react';
import { analytics } from '@/components/analytics/analytics';
import { PUBLIC_API_URL } from '@/lib/public-env';

const api = createHttpClient({ baseUrl: PUBLIC_API_URL });

/**
 * On the Stripe success page: asks the API whether the payment webhook confirmed the order, and
 * only then lets browser pixels count the purchase (same event id as the server, fired once).
 */
export function ConfirmPurchase({ session }: { session: string }) {
  useEffect(() => {
    let stopped = false;
    let tries = 0;
    const check = async () => {
      if (stopped) return;
      tries++;
      try {
        const res = await api.get<CheckoutConfirmation>('/v1/checkout/confirmation', { session });
        if (res.status === 'confirmed' && res.purchase) {
          analytics.trackPurchase(res.purchase);
          return;
        }
        if (res.status === 'failed') return;
      } catch {
        // Try again below.
      }
      if (tries < 20) setTimeout(check, 3000);
    };
    // Give analytics.init() a moment on a fresh page load.
    const t = setTimeout(check, 500);
    return () => {
      stopped = true;
      clearTimeout(t);
    };
  }, [session]);
  return null;
}
