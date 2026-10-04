import type { TrackingSettings } from '@shimanto/types';
import type { Env } from '../config/env.js';
import { type DispatchEvent, hashForMeta, toMajor } from './events.js';

/**
 * An external analytics destination. Business code never calls a provider directly: it calls
 * AnalyticsService, which stores the event and queues one delivery per enabled provider.
 * Adding TikTok, LinkedIn… means adding a provider here, nothing else.
 */
export interface AnalyticsProvider {
  readonly name: string;
  /** Enabled in settings and has what it needs to send. */
  configured(settings: TrackingSettings, env: Env): boolean;
  /** Why this event should not go to this provider (consent, unsupported event), or null. */
  skipReason(event: DispatchEvent, settings: TrackingSettings): string | null;
  send(event: DispatchEvent, settings: TrackingSettings, env: Env): Promise<void>;
}

/** Thrown for provider failures; the message never contains tokens or secrets. */
export class ProviderError extends Error {}

const TIMEOUT_MS = 10_000;

function consentReason(
  event: DispatchEvent,
  settings: TrackingSettings,
  kind: 'analytics' | 'marketing',
) {
  if (event.internalOnly) return 'Not a marketing conversion (created by an admin)';
  if (!settings.requireConsent) return null;
  if (!event.tracking.consent) return 'No consent recorded for this visitor';
  return event.tracking.consent[kind] ? null : `Visitor declined ${kind} tracking`;
}

// ───────────── GA4 (Measurement Protocol) ─────────────

const GA4_EVENTS = new Set(['purchase', 'refund', 'sign_up']);

export function buildGa4Payload(event: DispatchEvent) {
  const e = event.ecommerce;
  const params: Record<string, unknown> = { engagement_time_msec: 1 };
  if (event.tracking.sessionId && /^\d+$/.test(event.tracking.sessionId)) {
    params.session_id = event.tracking.sessionId;
  }
  if (e) {
    params.transaction_id = e.transaction_id;
    params.value = toMajor(e.value, e.currency);
    params.currency = e.currency;
    if (e.coupon) params.coupon = e.coupon;
    if (e.discount) params.discount = toMajor(e.discount, e.currency);
    params.items = e.items.map((i) => ({
      item_id: i.item_id,
      item_name: i.item_name,
      price: toMajor(i.price, e.currency),
      quantity: i.quantity,
      ...(i.discount ? { discount: toMajor(i.discount, e.currency) } : {}),
      ...(i.item_category ? { item_category: i.item_category } : {}),
    }));
  }
  if (event.name === 'sign_up') params.method = 'email';
  return {
    // GA needs a client id: the browser's `_ga` id when we have it, else our anonymous id.
    client_id:
      event.tracking.gaClientId ||
      event.tracking.anonymousId ||
      `srv.${event.customerId ?? event.eventId}`,
    ...(event.customerId ? { user_id: event.customerId } : {}),
    timestamp_micros: event.occurredAt.getTime() * 1000,
    ...(event.tracking.consent && !event.tracking.consent.marketing
      ? { non_personalized_ads: true }
      : {}),
    events: [{ name: event.name, params }],
  };
}

export const ga4Provider: AnalyticsProvider = {
  name: 'ga4',
  configured: (s, env) => s.ga4Enabled && Boolean(s.ga4MeasurementId && env.GA4_API_SECRET),
  skipReason: (event, settings) =>
    GA4_EVENTS.has(event.name)
      ? consentReason(event, settings, 'analytics')
      : 'Sent from the browser only',
  async send(event, settings, env) {
    const url = new URL('https://www.google-analytics.com/mp/collect');
    url.searchParams.set('measurement_id', settings.ga4MeasurementId!);
    url.searchParams.set('api_secret', env.GA4_API_SECRET!);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(buildGa4Payload(event)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new ProviderError(`GA4 responded ${res.status}`);
  },
};

// ───────────── Meta Conversions API ─────────────

const META_EVENTS: Record<string, string> = {
  purchase: 'Purchase',
  sign_up: 'CompleteRegistration',
};

export function buildMetaPayload(event: DispatchEvent, testEventCode?: string) {
  const e = event.ecommerce;
  const t = event.tracking;
  const userData: Record<string, unknown> = {};
  if (event.email) userData.em = [hashForMeta(event.email)];
  if (event.customerId) userData.external_id = [hashForMeta(event.customerId)];
  if (t.ip) userData.client_ip_address = t.ip;
  if (t.userAgent) userData.client_user_agent = t.userAgent;
  if (t.fbp) userData.fbp = t.fbp;
  if (t.fbc) userData.fbc = t.fbc;
  const customData: Record<string, unknown> = {};
  if (e) {
    customData.currency = e.currency;
    customData.value = toMajor(e.value, e.currency);
    customData.content_type = 'product';
    customData.content_ids = e.items.map((i) => i.item_id);
    customData.contents = e.items.map((i) => ({
      id: i.item_id,
      quantity: i.quantity,
      item_price: toMajor(i.price, e.currency),
    }));
    customData.num_items = e.items.reduce((n, i) => n + i.quantity, 0);
    if (e.transaction_id) customData.order_id = e.transaction_id;
  }
  if (event.name === 'sign_up') customData.status = 'registered';
  return {
    data: [
      {
        event_name: META_EVENTS[event.name],
        event_time: Math.floor(event.occurredAt.getTime() / 1000),
        // Same id as the browser Pixel event, so Meta counts it once.
        event_id: event.eventId,
        action_source: 'website',
        ...(t.pageUrl ? { event_source_url: t.pageUrl } : {}),
        user_data: userData,
        custom_data: customData,
      },
    ],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };
}

export const metaCapiProvider: AnalyticsProvider = {
  name: 'meta_capi',
  configured: (s, env) => s.metaCapiEnabled && Boolean(s.metaPixelId && env.META_ACCESS_TOKEN),
  skipReason: (event, settings) =>
    META_EVENTS[event.name]
      ? consentReason(event, settings, 'marketing')
      : event.name === 'refund'
        ? 'Meta has no refund event; refunds are tracked internally and in GA4'
        : 'Not a Meta conversion event',
  async send(event, settings, env) {
    const url = `https://graph.facebook.com/${env.META_API_VERSION}/${settings.metaPixelId}/events`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.META_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(buildMetaPayload(event, env.META_TEST_EVENT_CODE)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new ProviderError(
        `Meta CAPI ${res.status}: ${body.error?.message ?? 'request failed'}`,
      );
    }
  },
};

/** Registered external providers (internal storage is not a provider: it always happens). */
export const ANALYTICS_PROVIDERS = Symbol('ANALYTICS_PROVIDERS');
export const defaultProviders: AnalyticsProvider[] = [ga4Provider, metaCapiProvider];
