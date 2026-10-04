// @vitest-environment happy-dom
import type { PublicTrackingConfig } from '@shimanto/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gaClientId, nextAttribution, touchFromLocation } from './attribution.js';
import { AnalyticsClient } from './client.js';

const own = ['shimanto.xyz'];

describe('touchFromLocation', () => {
  it('reads UTM parameters', () => {
    const t = touchFromLocation(
      'https://shimanto.xyz/products/kit?utm_source=Facebook&utm_medium=paid_social&utm_campaign=launch&utm_content=video',
      'https://l.facebook.com/',
      own,
    );
    expect(t).toMatchObject({
      source: 'facebook',
      medium: 'paid_social',
      campaign: 'launch',
      content: 'video',
    });
    expect(t?.landingPage).toContain('/products/kit');
  });

  it('recognises ad clicks, organic search and referrals, and ignores internal navigation', () => {
    expect(touchFromLocation('https://shimanto.xyz/?gclid=abc', '', own)).toMatchObject({
      source: 'google',
      medium: 'cpc',
    });
    expect(
      touchFromLocation('https://shimanto.xyz/', 'https://www.google.com/', own),
    ).toMatchObject({ source: 'google', medium: 'organic' });
    expect(
      touchFromLocation('https://shimanto.xyz/', 'https://news.ycombinator.com/item', own),
    ).toMatchObject({
      source: 'news.ycombinator.com',
      medium: 'referral',
    });
    expect(
      touchFromLocation('https://shimanto.xyz/a', 'https://my.shimanto.xyz/orders', own),
    ).toBeNull();
    expect(touchFromLocation('https://shimanto.xyz/a', '', own)).toBeNull();
  });
});

describe('nextAttribution', () => {
  const opts = { firstTouch: true, lastTouch: true };
  const facebook = { source: 'facebook', medium: 'paid_social', campaign: 'launch' };
  const google = { source: 'google', medium: 'cpc', campaign: 'software_launch' };
  const landing = { href: 'https://shimanto.xyz/', referrer: '' };

  it('keeps first touch and updates last touch', () => {
    const one = nextAttribution({ first: null, last: null }, facebook, landing, opts);
    expect(one).toEqual({ first: facebook, last: facebook });
    const two = nextAttribution(one, google, landing, opts);
    expect(two).toEqual({ first: facebook, last: google });
    // A later direct visit changes nothing.
    expect(nextAttribution(two, null, landing, opts)).toEqual(two);
  });

  it('treats a direct first visit as provisional until a real source arrives', () => {
    const direct = nextAttribution({ first: null, last: null }, null, landing, opts);
    expect(direct.first).toMatchObject({ source: '(direct)', medium: '(none)' });
    expect(nextAttribution(direct, facebook, landing, opts).first).toEqual(facebook);
  });

  it('honours disabled first/last touch settings', () => {
    expect(
      nextAttribution({ first: null, last: null }, facebook, landing, {
        firstTouch: false,
        lastTouch: true,
      }),
    ).toEqual({
      first: null,
      last: facebook,
    });
  });

  it('reads the GA client id', () => {
    expect(gaClientId('GA1.1.987.654')).toBe('987.654');
  });
});

const config = (extra: Partial<PublicTrackingConfig> = {}): PublicTrackingConfig => ({
  ga4MeasurementId: null,
  gtmContainerId: 'GTM-TEST123',
  metaPixelId: '1234567890',
  googleAds: null,
  utmTracking: true,
  firstTouch: true,
  lastTouch: true,
  requireConsent: true,
  ...extra,
});

describe('AnalyticsClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  type W = Window & { dataLayer?: Array<Record<string, unknown>>; fbq?: unknown };
  const w = () => window as W;
  const events = () =>
    (w().dataLayer ?? []).filter(
      (e) => typeof e === 'object' && 'event' in e && !String(e.event).startsWith('gtm'),
    );

  beforeEach(() => {
    for (const c of document.cookie.split('; '))
      document.cookie = `${c.split('=')[0]}=; max-age=0; path=/`;
    localStorage.clear();
    document.head.querySelectorAll('script').forEach((el) => el.remove());
    delete w().dataLayer;
    delete w().fbq;
    delete (window as { gtag?: unknown }).gtag;
    fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    history.replaceState(
      null,
      '',
      '/products/kit?utm_source=facebook&utm_medium=paid_social&utm_campaign=launch',
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('waits for consent, then sends to GTM, Meta Pixel and the internal collector', () => {
    const client = new AnalyticsClient({ apiUrl: 'http://api.test' });
    client.init(config());
    expect(client.needsConsent()).toBe(true);
    client.trackViewItem({ item_id: 'kit', item_name: 'Kit', price: 4900, quantity: 1 }, 'USD');
    expect(events()).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();

    client.setConsent({ analytics: true, marketing: true });
    expect(client.needsConsent()).toBe(false);
    const fbq = vi.fn();
    w().fbq = Object.assign(fbq, { callMethod: fbq });
    client.trackViewItem({ item_id: 'kit', item_name: 'Kit', price: 4900, quantity: 1 }, 'USD');

    const view = events().find((e) => e.event === 'view_item')!;
    expect(view).toMatchObject({
      ecommerce: { value: 49, currency: 'USD', items: [{ item_id: 'kit', price: 49 }] },
    });
    expect(fbq).toHaveBeenCalledWith(
      'track',
      'ViewContent',
      expect.objectContaining({ value: 49, content_ids: ['kit'] }),
      {
        eventID: view.event_id,
      },
    );
    const collected = fetchMock.mock.calls.map((c) =>
      JSON.parse(String((c[1] as RequestInit).body)),
    );
    expect(collected.map((b) => b.event_name)).toEqual(['page_view', 'view_item']);
    expect(collected[1].attribution).toMatchObject({ source: 'facebook', medium: 'paid_social' });
  });

  it('keeps marketing tags off when only analytics is allowed', () => {
    const client = new AnalyticsClient({ apiUrl: 'http://api.test' });
    client.init(config({ gtmContainerId: null, ga4MeasurementId: 'G-TEST12345' }));
    client.setConsent({ analytics: true, marketing: false });
    expect(w().fbq).toBeUndefined();
    expect(document.querySelector('script[src*="fbevents"]')).toBeNull();
    expect(document.querySelector('script[src*="gtag/js?id=G-TEST12345"]')).not.toBeNull();
  });

  it('sends one page view per URL', () => {
    const client = new AnalyticsClient({ apiUrl: 'http://api.test' });
    client.init(config({ requireConsent: false }));
    client.trackPageView();
    client.trackPageView();
    history.pushState(null, '', '/about');
    client.trackPageView();
    expect(events().filter((e) => e.event === 'page_view')).toHaveLength(2);
  });

  it('fires a confirmed purchase once, with the server event id, flagged as server-tracked', () => {
    const client = new AnalyticsClient({ apiUrl: 'http://api.test' });
    client.init(config({ requireConsent: false }));
    const purchase = {
      event_id: 'purchase_ord_1',
      ecommerce: {
        transaction_id: '1024',
        value: 0,
        currency: 'USD',
        items: [{ item_id: 'kit', item_name: 'Kit', price: 0, quantity: 1 }],
      },
    };
    client.trackPurchase(purchase);
    client.trackPurchase(purchase); // refresh of the success page
    const purchases = events().filter((e) => e.event === 'purchase');
    expect(purchases).toHaveLength(1);
    expect(purchases[0]).toMatchObject({
      event_id: 'purchase_ord_1',
      server_tracked: true,
      ecommerce: { value: 0 },
    });
    // Purchases are never sent to the internal collector (the server records them).
    expect(
      fetchMock.mock.calls.some((c) => String((c[1] as RequestInit).body).includes('"purchase"')),
    ).toBe(false);
  });

  it('gives checkout its attribution, ids and consent (no personal data)', () => {
    document.cookie = '_ga=GA1.1.111.222; path=/';
    document.cookie = '_fbp=fb.1.2.3; path=/';
    const client = new AnalyticsClient({ apiUrl: 'http://api.test' });
    client.init(config());
    client.setConsent({ analytics: true, marketing: false });
    const payload = client.attributionPayload();
    expect(payload).toMatchObject({
      first: { source: 'facebook', campaign: 'launch' },
      last: { source: 'facebook' },
      gaClientId: '111.222',
      fbp: 'fb.1.2.3',
      consent: { analytics: true, marketing: false },
    });
    expect(payload.anonymousId).toBeTruthy();
    expect(payload.sessionId).toMatch(/^\d+$/);
  });
});
