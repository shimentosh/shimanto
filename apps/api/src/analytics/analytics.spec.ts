import type { TrackingSettings } from '@shimanto/types';
import { cleanTouch, customerTouch, orderAttribution, touchFromUtm } from './attribution.js';
import {
  type DispatchEvent,
  eventIds,
  gaClientIdFromCookie,
  hashForMeta,
  toMajor,
} from './events.js';
import { buildGa4Payload, buildMetaPayload, ga4Provider, metaCapiProvider } from './providers.js';

const purchase = (extra: Partial<DispatchEvent> = {}): DispatchEvent => ({
  name: 'purchase',
  eventId: eventIds.purchase('ord_1'),
  occurredAt: new Date('2026-09-26T10:00:00Z'),
  customerId: 'cus_1',
  email: 'Rina@Example.com',
  ecommerce: {
    transaction_id: '1024',
    value: 3900,
    currency: 'USD',
    discount: 1000,
    coupon: 'SAVE10',
    items: [
      { item_id: 'content-os', item_name: 'Content OS', price: 4900, quantity: 1, discount: 1000 },
    ],
  },
  tracking: {
    anonymousId: 'anon-1',
    gaClientId: '123.456',
    fbp: 'fb.1.1.1',
    ip: '203.0.113.9',
    userAgent: 'Mozilla/5.0',
    consent: { analytics: true, marketing: true },
  },
  attribution: null,
  internalOnly: false,
  ...extra,
});

const settings: TrackingSettings = {
  ga4Enabled: true,
  ga4MeasurementId: 'G-TEST1234',
  gtmEnabled: false,
  gtmContainerId: null,
  metaPixelEnabled: true,
  metaPixelId: '1234567890',
  metaCapiEnabled: true,
  googleAdsEnabled: false,
  googleAdsConversionId: null,
  googleAdsConversionLabel: null,
  utmTracking: true,
  firstTouch: true,
  lastTouch: true,
  requireConsent: true,
};

describe('event ids', () => {
  it('are deterministic for business events', () => {
    expect(eventIds.purchase('ord_1')).toBe('purchase_ord_1');
    expect(eventIds.refund('ord_1')).toBe('refund_ord_1');
    expect(eventIds.signup('cus_1')).toBe('signup_cus_1');
    expect(eventIds.githubAccess('del_1')).toBe('github_access_del_1');
  });
});

describe('helpers', () => {
  it('converts minor units, respecting zero-decimal currencies', () => {
    expect(toMajor(3900, 'USD')).toBe(39);
    expect(toMajor(0, 'USD')).toBe(0);
    expect(toMajor(500, 'JPY')).toBe(500);
  });

  it('hashes like Meta requires (trimmed, lower-case SHA-256)', () => {
    expect(hashForMeta(' Rina@Example.com ')).toBe(hashForMeta('rina@example.com'));
    expect(hashForMeta('x')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('reads the GA client id from the _ga cookie', () => {
    expect(gaClientIdFromCookie('GA1.1.123.456')).toBe('123.456');
    expect(gaClientIdFromCookie(undefined)).toBeNull();
  });
});

describe('attribution', () => {
  const facebook = {
    source: 'Facebook',
    medium: 'paid_social',
    campaign: 'launch',
    landingPage: '/products/content-os',
  };
  const google = { source: 'google', medium: 'cpc', campaign: 'software_launch' };

  it('cleans touches and drops empty ones', () => {
    expect(cleanTouch(facebook)?.source).toBe('facebook');
    expect(cleanTouch({ source: '  ' })).toBeNull();
    expect(touchFromUtm({ utm_source: 'news', utm_medium: 'email' })).toMatchObject({
      source: 'news',
      medium: 'email',
    });
  });

  it('keeps first touch and records the latest last touch on the order', () => {
    const cols = orderAttribution({ first: facebook, last: google }, undefined, null);
    expect(cols).toMatchObject({
      firstSource: 'facebook',
      firstMedium: 'paid_social',
      firstCampaign: 'launch',
      lastSource: 'google',
      lastMedium: 'cpc',
      lastCampaign: 'software_launch',
      landingPage: '/products/content-os',
    });
  });

  it("never replaces a customer's stored first touch", () => {
    const stored = customerTouch({
      firstSource: 'facebook',
      firstMedium: 'paid_social',
      firstCampaign: 'launch',
      firstContent: null,
      firstTerm: null,
    });
    const cols = orderAttribution({ first: google, last: google }, undefined, stored);
    expect(cols.firstSource).toBe('facebook');
    expect(cols.lastSource).toBe('google');
  });

  it('falls back to legacy utm params for last touch', () => {
    expect(orderAttribution(undefined, { utm_source: 'x', utm_medium: 'y' }, null)).toMatchObject({
      firstSource: 'x',
      lastSource: 'x',
    });
  });
});

describe('GA4 Measurement Protocol payload', () => {
  it('builds an ecommerce purchase in major units', () => {
    const payload = buildGa4Payload(purchase());
    expect(payload).toMatchObject({ client_id: '123.456', user_id: 'cus_1' });
    expect(payload.events[0]).toMatchObject({
      name: 'purchase',
      params: {
        transaction_id: '1024',
        value: 39,
        currency: 'USD',
        coupon: 'SAVE10',
        discount: 10,
        items: [
          { item_id: 'content-os', item_name: 'Content OS', price: 49, quantity: 1, discount: 10 },
        ],
      },
    });
    expect(JSON.stringify(payload)).not.toContain('Rina');
  });

  it('keeps $0 purchases as purchases with value 0', () => {
    const free = purchase({
      ecommerce: {
        transaction_id: '1',
        value: 0,
        currency: 'USD',
        items: [{ item_id: 'kit', item_name: 'Kit', price: 0, quantity: 1 }],
      },
    });
    expect(buildGa4Payload(free).events[0]!.params).toMatchObject({
      value: 0,
      transaction_id: '1',
    });
  });

  it('falls back to the anonymous id when there is no GA client id', () => {
    expect(buildGa4Payload(purchase({ tracking: { anonymousId: 'anon-9' } })).client_id).toBe(
      'anon-9',
    );
  });
});

describe('Meta Conversions API payload', () => {
  it('uses the shared event id and hashes identifiers', () => {
    const payload = buildMetaPayload(purchase(), 'TEST123');
    const data = payload.data[0]!;
    expect(data).toMatchObject({
      event_name: 'Purchase',
      event_id: 'purchase_ord_1',
      action_source: 'website',
    });
    expect(data.user_data).toMatchObject({
      em: [hashForMeta('rina@example.com')],
      external_id: [hashForMeta('cus_1')],
      fbp: 'fb.1.1.1',
      client_ip_address: '203.0.113.9',
    });
    expect(data.custom_data).toMatchObject({
      value: 39,
      currency: 'USD',
      content_ids: ['content-os'],
      order_id: '1024',
    });
    expect(payload.test_event_code).toBe('TEST123');
    expect(JSON.stringify(payload)).not.toMatch(/rina@example\.com/i);
  });
});

describe('provider rules', () => {
  it('respects consent and never sends admin orders', () => {
    expect(ga4Provider.skipReason(purchase(), settings)).toBeNull();
    expect(
      metaCapiProvider.skipReason(
        purchase({ tracking: { consent: { analytics: true, marketing: false } } }),
        settings,
      ),
    ).toContain('declined marketing');
    expect(ga4Provider.skipReason(purchase({ tracking: {} }), settings)).toContain('No consent');
    expect(
      ga4Provider.skipReason(purchase({ tracking: {} }), { ...settings, requireConsent: false }),
    ).toBeNull();
    expect(ga4Provider.skipReason(purchase({ internalOnly: true }), settings)).toContain('admin');
  });

  it('sends refunds to GA4 but not to Meta (no refund event there)', () => {
    const refund = purchase({ name: 'refund', eventId: 'refund_ord_1' });
    expect(ga4Provider.skipReason(refund, settings)).toBeNull();
    expect(metaCapiProvider.skipReason(refund, settings)).toContain('no refund event');
  });

  it('needs its secret to be configured server-side', () => {
    const env = { META_ACCESS_TOKEN: undefined, GA4_API_SECRET: undefined } as never;
    expect(ga4Provider.configured(settings, env)).toBe(false);
    expect(metaCapiProvider.configured(settings, env)).toBe(false);
  });
});
