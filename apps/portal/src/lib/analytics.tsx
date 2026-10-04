'use client';

import { createAnalyticsClient } from '@shimanto/sdk';
import type { PublicTrackingConfig } from '@shimanto/types';
import { ConsentBanner } from '@shimanto/ui';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import { API_URL, SITE_URL } from './config';

/**
 * The portal's analytics client (same implementation and cookies as the store, so a visitor's
 * attribution follows them from the store into sign-up).
 */
export const analytics = createAnalyticsClient({
  apiUrl: API_URL,
  cookieDomain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN || undefined,
  ownHosts: (process.env.NEXT_PUBLIC_OWN_HOSTS || '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean),
});

/** Loads the tag config from the API once, then one page view per route; asks for consent. */
export function PortalAnalytics() {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [askConsent, setAskConsent] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api.get<PublicTrackingConfig>('/v1/tracking/config').then(
      (config) => {
        analytics.init(config);
        setReady(true);
        setAskConsent(analytics.needsConsent());
      },
      () => undefined,
    );
  }, []);

  useEffect(() => {
    if (ready) analytics.trackPageView();
  }, [ready, pathname]);

  return askConsent ? (
    <ConsentBanner
      privacyHref={`${SITE_URL}/legal/privacy`}
      onSave={(choice) => {
        analytics.setConsent(choice);
        setAskConsent(false);
      }}
    />
  ) : null;
}
