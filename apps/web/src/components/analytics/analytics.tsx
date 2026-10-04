'use client';

import { createAnalyticsClient } from '@shimanto/sdk';
import type { AnalyticsItem, PublicTrackingConfig } from '@shimanto/types';
import { ConsentBanner } from '@shimanto/ui';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { PUBLIC_API_URL } from '@/lib/public-env';

/**
 * The site's single analytics client. Components call `analytics.trackX(…)`; nothing else in
 * the app talks to GTM, GA4 or the Meta Pixel.
 */
export const analytics = createAnalyticsClient({
  apiUrl: PUBLIC_API_URL,
  cookieDomain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
  ownHosts: (process.env.NEXT_PUBLIC_OWN_HOSTS || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean),
});

function PageViews() {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    analytics.trackPageView();
  }, [pathname, search]);
  return null;
}

/** Initialises tracking once, sends one page view per navigation, and asks for consent. */
export function AnalyticsProvider({ config }: { config: PublicTrackingConfig }) {
  const [askConsent, setAskConsent] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    analytics.init(config);
    // Child effects ran before init, so the first page view is sent here.
    analytics.trackPageView();
    // Shown after mount only (consent lives in a cookie the server doesn't read).
    const needs = analytics.needsConsent();
    if (needs) queueMicrotask(() => setAskConsent(true));
  }, [config]);

  return (
    <>
      <Suspense>
        <PageViews />
      </Suspense>
      {askConsent && (
        <ConsentBanner
          onSave={(choice) => {
            analytics.setConsent(choice);
            setAskConsent(false);
          }}
        />
      )}
    </>
  );
}

/** Drop into a product page: one view_item per product view. */
export function TrackViewItem({ item, currency }: { item: AnalyticsItem; currency: string }) {
  const { item_id: id, item_name: name, price, quantity, item_category: category } = item;
  useEffect(() => {
    // Deferred so init() runs first on a fresh page load. The cleanup cancels the duplicate run
    // React makes in development, so exactly one view_item is sent per product view.
    const t = setTimeout(
      () =>
        analytics.trackViewItem(
          { item_id: id, item_name: name, price, quantity, item_category: category },
          currency,
        ),
      0,
    );
    return () => clearTimeout(t);
  }, [id, name, price, quantity, category, currency]);
  return null;
}
