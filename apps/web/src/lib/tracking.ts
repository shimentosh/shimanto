import { type PublicTrackingConfig, PublicTrackingConfigSchema } from '@shimanto/types';

/** Env fallback when the API can't be reached (e.g. a build without the API). */
function envConfig(): PublicTrackingConfig {
  const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_ID;
  return {
    ga4MeasurementId: process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID || null,
    gtmContainerId: process.env.NEXT_PUBLIC_GTM_CONTAINER_ID || null,
    metaPixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || null,
    googleAds: adsId
      ? {
          conversionId: adsId,
          conversionLabel: process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL || null,
        }
      : null,
    utmTracking: true,
    firstTouch: true,
    lastTouch: true,
    requireConsent: true,
  };
}

/**
 * Which tags to load, from Admin → Settings → Analytics & Tracking (via the API, cached and
 * refreshed when an admin saves). Falls back to NEXT_PUBLIC_* env vars.
 */
export async function getTrackingConfig(): Promise<PublicTrackingConfig> {
  const api = process.env.API_URL?.replace(/\/+$/, '');
  if (!api) return envConfig();
  try {
    const res = await fetch(`${api}/v1/tracking/config`, {
      next: { tags: ['tracking'], revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return envConfig();
    const parsed = PublicTrackingConfigSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : envConfig();
  } catch {
    return envConfig();
  }
}
