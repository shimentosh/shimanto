import { AnalyticsService } from '../src/analytics/analytics.service.js';
import {
  type Harness,
  cookieHeader,
  createAdmin,
  createHarness,
  loginCookies,
  registerCustomer,
  resetDb,
  setCookies,
} from './harness.js';

const PDF = Buffer.from('%PDF-1.4\n% deliverable\n');
const consent = { analytics: true, marketing: true };
const facebook = {
  source: 'facebook',
  medium: 'paid_social',
  campaign: 'launch',
  landingPage: 'http://localhost:3000/products/pro-kit?utm_source=facebook',
  referrer: 'https://l.facebook.com/',
};
const google = { source: 'google', medium: 'cpc', campaign: 'software_launch' };

describe('Analytics & attribution (e2e)', () => {
  let h: Harness;
  let admin: string;
  let proKitId: string;

  const collect = (body: Record<string, unknown>) =>
    h.http.post('/v1/analytics/collect').send({
      event_id: `evt-${Math.random().toString(36).slice(2)}`,
      anonymous_id: 'anon-visitor-1',
      session_id: 'sess-000000001',
      ...body,
    });
  const checkout = (body: Record<string, unknown>, cookie?: string) => {
    const req = h.http.post('/v1/checkout');
    if (cookie) req.set('Cookie', cookie);
    return req.send({ turnstileToken: 'pass', ...body });
  };
  const paidWebhook = (orderId: string, amount: number, id = `evt_${orderId}`) =>
    h.http
      .post('/v1/webhooks/stripe')
      .set('stripe-signature', 'valid')
      .send({
        id,
        type: 'checkout.paid',
        orderId,
        sessionId: `cs_test_${orderId}`,
        paymentRef: `pi_${orderId}`,
        amount,
        currency: 'USD',
      });
  const deliveries = (eventId: string) =>
    h.prisma.analyticsDelivery.findMany({
      where: { event: { eventId } },
      orderBy: { provider: 'asc' },
    });

  beforeAll(async () => {
    h = await createHarness(
      {
        GA4_MEASUREMENT_ID: 'G-TEST12345',
        GA4_API_SECRET: 'ga4-test-secret',
        META_PIXEL_ID: '1234567890',
        META_ACCESS_TOKEN: 'EAAB-test-meta-access-token-0123456789',
      },
      { distinctClients: true },
    );
    await resetDb(h.prisma);
    await createAdmin(h.prisma);
    admin = cookieHeader(await loginCookies(h));
    const file = await h.http
      .post('/v1/admin/files')
      .set('Cookie', admin)
      .attach('file', PDF, 'kit.pdf')
      .expect(201);
    for (const [slug, price] of [
      ['pro-kit', 4900],
      ['free-kit', 0],
      ['gift-kit', 2900],
    ] as const) {
      const p = await h.http
        .post('/v1/admin/products')
        .set('Cookie', admin)
        .send({ slug, name: slug, price, deliverFiles: true, files: [{ mediaId: file.body.id }] })
        .expect(201);
      await h.http.post(`/v1/admin/products/${p.body.id}/publish`).set('Cookie', admin).expect(200);
      if (slug === 'pro-kit') proKitId = p.body.id;
    }
  });
  afterAll(() => h.close());

  it('serves public tag config without any secret', async () => {
    const res = await h.http.get('/v1/tracking/config').expect(200);
    expect(res.body).toMatchObject({
      ga4MeasurementId: 'G-TEST12345',
      metaPixelId: '1234567890',
      gtmContainerId: null,
      requireConsent: true,
    });
    expect(JSON.stringify(res.body)).not.toMatch(/secret|EAAB|token/i);
  });

  it('collects browser events for internal reports, but never commerce events', async () => {
    await collect({
      event_name: 'page_view',
      page_url: facebook.landingPage,
      attribution: facebook,
    }).expect(202);
    await collect({
      event_name: 'view_item',
      attribution: facebook,
      ecommerce: {
        value: 4900,
        currency: 'USD',
        items: [{ item_id: 'pro-kit', item_name: 'Pro Kit', price: 4900, quantity: 1 }],
      },
    }).expect(202);
    await collect({
      event_name: 'add_to_cart',
      ecommerce: {
        value: 4900,
        currency: 'USD',
        items: [{ item_id: 'pro-kit', item_name: 'Pro Kit', price: 4900, quantity: 1 }],
      },
    }).expect(202);
    await collect({
      event_name: 'purchase',
      ecommerce: { value: 1, currency: 'USD', items: [] },
    }).expect(400);

    const events = await h.prisma.analyticsEvent.findMany({
      where: { anonymousId: 'anon-visitor-1' },
    });
    expect(events.map((e) => e.name).sort()).toEqual(['add_to_cart', 'page_view', 'view_item']);
    expect(events.find((e) => e.name === 'page_view')).toMatchObject({
      source: 'facebook',
      medium: 'paid_social',
      origin: 'browser',
    });
    // Browser events already went to GA4/Meta from the browser: no server deliveries.
    expect(await h.prisma.analyticsDelivery.count()).toBe(0);
  });

  let buyer: string;
  let buyerId: string;

  it('tracks sign-up (internal + GA4 + Meta, shared event id) and keeps first touch on the customer', async () => {
    const res = await h.http
      .post('/v1/customer/auth/register')
      .send({
        name: 'Rina',
        email: 'rina@buyer.test',
        password: 'rina-pass-123',
        confirmPassword: 'rina-pass-123',
        attribution: {
          first: facebook,
          last: facebook,
          anonymousId: 'anon-visitor-1',
          sessionId: 'sess-000000001',
          consent,
        },
      })
      .expect(201);
    buyer = cookieHeader(setCookies(res), ['sx_cs']);
    buyerId = res.body.id;

    const customer = await h.prisma.customer.findUniqueOrThrow({ where: { id: buyerId } });
    expect(customer).toMatchObject({
      firstSource: 'facebook',
      firstMedium: 'paid_social',
      firstCampaign: 'launch',
    });
    // The anonymous history now belongs to the customer.
    expect(
      await h.prisma.analyticsEvent.count({
        where: { anonymousId: 'anon-visitor-1', customerId: buyerId },
      }),
    ).toBe(4);

    const eventId = `signup_${buyerId}`;
    expect(
      h.analytics
        .sentFor(eventId)
        .map((s) => s.provider)
        .sort(),
    ).toEqual(['ga4', 'meta_capi']);
    const meta = h.analytics.sentFor(eventId).find((s) => s.provider === 'meta_capi')!.payload as {
      data: Array<{ event_name: string; event_id: string }>;
    };
    expect(meta.data[0]).toMatchObject({ event_name: 'CompleteRegistration', event_id: eventId });
  });

  let orderId: string;

  it('records a paid purchase only after the webhook confirms it, with first/last touch on the order', async () => {
    const res = await checkout(
      {
        items: [{ slug: 'pro-kit' }],
        attribution: {
          first: google,
          last: google,
          anonymousId: 'anon-visitor-1',
          sessionId: 'sess-000000002',
          gaClientId: '111.222',
          fbp: 'fb.1.2.3',
          consent,
        },
      },
      buyer,
    ).expect(200);
    expect(res.body.kind).toBe('redirect');
    orderId = h.payments.sessions.at(-1)!.orderId;
    expect(h.payments.sessions.at(-1)!.successUrl).toContain('session={CHECKOUT_SESSION_ID}');

    const order = await h.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    // First touch stays facebook (from the customer's first visit); last touch is google.
    expect(order).toMatchObject({
      firstSource: 'facebook',
      firstMedium: 'paid_social',
      firstCampaign: 'launch',
      lastSource: 'google',
      lastMedium: 'cpc',
      lastCampaign: 'software_launch',
    });
    expect(order.tracking).toMatchObject({ gaClientId: '111.222', fbp: 'fb.1.2.3', consent });

    // Reaching the success page proves nothing: no purchase yet.
    const pending = await h.http
      .get(`/v1/checkout/confirmation?session=cs_test_${orderId}`)
      .expect(200);
    expect(pending.body).toMatchObject({ status: 'pending', purchase: null });
    expect(await h.prisma.analyticsEvent.count({ where: { name: 'purchase' } })).toBe(0);

    await paidWebhook(orderId, 4900).expect(200);

    const eventId = `purchase_${orderId}`;
    const event = await h.prisma.analyticsEvent.findUniqueOrThrow({ where: { eventId } });
    expect(event).toMatchObject({
      name: 'purchase',
      value: 4900,
      currency: 'USD',
      customerId: buyerId,
      orderId,
      source: 'google',
    });
    expect((await deliveries(eventId)).map((d) => [d.provider, d.status])).toEqual([
      ['ga4', 'SENT'],
      ['meta_capi', 'SENT'],
    ]);
    const ga4 = h.analytics.sentFor(eventId).find((s) => s.provider === 'ga4')!.payload as {
      client_id: string;
      events: Array<{ params: { transaction_id: string; value: number; items: unknown[] } }>;
    };
    expect(ga4.client_id).toBe('111.222');
    expect(ga4.events[0]!.params).toMatchObject({
      value: 49,
      items: [{ item_id: 'pro-kit', price: 49, quantity: 1 }],
    });
    const meta = h.analytics.sentFor(eventId).find((s) => s.provider === 'meta_capi')!.payload as {
      data: Array<{
        event_id: string;
        user_data: Record<string, unknown>;
        custom_data: { value: number };
      }>;
    };
    expect(meta.data[0]).toMatchObject({ event_id: eventId, custom_data: { value: 49 } });
    expect(JSON.stringify(meta)).not.toContain('rina@buyer.test');

    // The browser gets the same event id to echo to its Pixel (Meta deduplicates).
    const confirmed = await h.http
      .get(`/v1/checkout/confirmation?session=cs_test_${orderId}`)
      .expect(200);
    expect(confirmed.body).toMatchObject({
      status: 'confirmed',
      purchase: { event_id: eventId, ecommerce: { value: 4900 } },
    });

    // IP / user agent are dropped once everything was sent.
    expect((event.metadata as { tracking?: { ip?: string } }).tracking?.ip).toBeUndefined();
    const delivered = await h.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(delivered.status).toBe('COMPLETED');
  });

  it('never records or sends the same purchase twice', async () => {
    const before = h.analytics.sent.length;
    await paidWebhook(orderId, 4900, 'evt_replay').expect(200);
    await h.app.get(AnalyticsService).trackPurchase(orderId);
    expect(await h.prisma.analyticsEvent.count({ where: { eventId: `purchase_${orderId}` } })).toBe(
      1,
    );
    expect(h.analytics.sent.length).toBe(before);
  });

  it('tracks a 100%-coupon $0 order as a purchase with value 0', async () => {
    await h.http
      .post('/v1/admin/coupons')
      .set('Cookie', admin)
      .send({ code: 'FREE100', type: 'PERCENT', value: 100 })
      .expect(201);
    const res = await checkout({
      items: [{ slug: 'gift-kit' }],
      email: 'lucky@buyer.test',
      couponCode: 'FREE100',
      attribution: { first: facebook, last: facebook, anonymousId: 'anon-2', consent },
    }).expect(200);
    const order = await h.prisma.order.findUniqueOrThrow({
      where: { number: res.body.orderNumber },
    });
    expect(order).toMatchObject({ total: 0, paymentStatus: 'NOT_REQUIRED', status: 'COMPLETED' });
    const eventId = `purchase_${order.id}`;
    expect(res.body.purchase).toMatchObject({
      event_id: eventId,
      ecommerce: {
        value: 0,
        currency: 'USD',
        transaction_id: String(order.number),
        items: [{ item_id: 'gift-kit', quantity: 1 }],
      },
    });
    const event = await h.prisma.analyticsEvent.findUniqueOrThrow({ where: { eventId } });
    expect(event).toMatchObject({ value: 0, metadata: expect.objectContaining({ free: true }) });
    expect(
      h.analytics
        .sentFor(eventId)
        .map((s) => s.provider)
        .sort(),
    ).toEqual(['ga4', 'meta_capi']);
    // A guest checkout that created the account is also a sign-up.
    expect(
      await h.prisma.analyticsEvent.count({
        where: { name: 'sign_up', customerId: order.customerId },
      }),
    ).toBe(1);
  });

  it('never lets GA4 or Meta failures break the order, and retries them later', async () => {
    h.analytics.fail.add('ga4');
    h.analytics.fail.add('meta_capi');
    const res = await checkout({
      items: [{ slug: 'free-kit' }],
      email: 'outage@buyer.test',
      attribution: { consent },
    }).expect(200);
    expect(res.body.kind).toBe('complete');
    const order = await h.prisma.order.findUniqueOrThrow({
      where: { number: res.body.orderNumber },
      include: { deliveries: true },
    });
    expect(order.status).toBe('COMPLETED');
    expect(order.deliveries[0]!.status).toBe('READY');

    const eventId = `purchase_${order.id}`;
    const failed = await deliveries(eventId);
    expect(failed.map((d) => [d.provider, d.status])).toEqual([
      ['ga4', 'FAILED'],
      ['meta_capi', 'FAILED'],
    ]);
    expect(failed[0]!.lastError).toContain('down');

    h.analytics.fail.clear();
    for (const d of failed) {
      await h.http
        .post(`/v1/admin/analytics/deliveries/${d.id}/retry`)
        .set('Cookie', admin)
        .expect(200);
    }
    expect((await deliveries(eventId)).every((d) => d.status === 'SENT')).toBe(true);
  });

  it('respects declined consent: internal record only, no identifiers kept', async () => {
    const res = await checkout({
      items: [{ slug: 'free-kit' }],
      email: 'private@buyer.test',
      attribution: {
        anonymousId: 'anon-3',
        fbp: 'fb.1.9.9',
        consent: { analytics: false, marketing: false },
      },
    }).expect(200);
    const order = await h.prisma.order.findUniqueOrThrow({
      where: { number: res.body.orderNumber },
    });
    expect((order.tracking as { ip?: string; fbp?: string }).ip ?? null).toBeNull();
    expect((order.tracking as { fbp?: string }).fbp ?? null).toBeNull();
    const d = await deliveries(`purchase_${order.id}`);
    expect(d.every((x) => x.status === 'SKIPPED')).toBe(true);
    expect(
      await h.prisma.analyticsEvent.count({ where: { eventId: `purchase_${order.id}` } }),
    ).toBe(1);
  });

  it('keeps admin-created orders out of marketing platforms', async () => {
    const res = await h.http
      .post('/v1/admin/orders')
      .set('Cookie', admin)
      .send({ customerEmail: 'gift@buyer.test', items: [{ productId: proKitId, unitPrice: 0 }] })
      .expect(201);
    const d = await deliveries(`purchase_${res.body.id}`);
    expect(d.length).toBeGreaterThan(0);
    expect(d.every((x) => x.status === 'SKIPPED' && x.lastError?.includes('admin'))).toBe(true);
  });

  it('tracks a refund once (GA4 refund; Meta has no refund event)', async () => {
    await h.http.post(`/v1/admin/orders/${orderId}/refund`).set('Cookie', admin).expect(200);
    await h.http
      .post('/v1/webhooks/stripe')
      .set('stripe-signature', 'valid')
      .send({ id: 'evt_refund_x', type: 'charge.refunded', paymentRef: `pi_${orderId}` })
      .expect(200);
    const eventId = `refund_${orderId}`;
    expect(await h.prisma.analyticsEvent.count({ where: { eventId } })).toBe(1);
    expect((await deliveries(eventId)).map((d) => [d.provider, d.status])).toEqual([
      ['ga4', 'SENT'],
      ['meta_capi', 'SKIPPED'],
    ]);
    const ga4 = h.analytics.sentFor(eventId)[0]!.payload as {
      events: Array<{ name: string; params: { value: number } }>;
    };
    expect(ga4.events[0]).toMatchObject({ name: 'refund', params: { value: 49 } });
  });

  it('records downloads and support tickets internally', async () => {
    const downloads = await h.http.get('/v1/account/downloads').set('Cookie', buyer).expect(200);
    expect(downloads.body).toEqual([]); // refunded: nothing to download
    const { cookie } = await registerCustomer(h, 'dl@buyer.test');
    const claim = await checkout({ items: [{ slug: 'free-kit' }] }, cookie).expect(200);
    expect(claim.body.kind).toBe('complete');
    const list = await h.http.get('/v1/account/downloads').set('Cookie', cookie).expect(200);
    await h.http
      .post(`/v1/account/downloads/${list.body[0].deliveryId}/${list.body[0].id}`)
      .set('Cookie', cookie)
      .expect(200);
    await h.http
      .post('/v1/account/tickets')
      .set('Cookie', cookie)
      .send({ subject: 'Question', message: 'How do I install this kit?' })
      .expect(201);
    expect(await h.prisma.analyticsEvent.count({ where: { name: 'download' } })).toBe(1);
    expect(await h.prisma.analyticsEvent.count({ where: { name: 'support_ticket_created' } })).toBe(
      1,
    );
  });

  it('reports sales from orders, and funnels and sources from internal events', async () => {
    const sales = await h.http.get('/v1/admin/analytics/sales').set('Cookie', admin).expect(200);
    expect(sales.body).toMatchObject({
      revenue: { USD: 4900 },
      refunds: { USD: 4900 },
      netRevenue: { USD: 0 },
      averageOrderValue: { USD: 4900 },
      paidOrders: 1,
      refundedOrders: 1,
      visitors: 1,
      sessions: 1,
    });
    expect(sales.body.freeOrders).toBeGreaterThanOrEqual(4);

    const products = await h.http
      .get('/v1/admin/analytics/products')
      .set('Cookie', admin)
      .expect(200);
    const pro = products.body.find((p: { productId: string }) => p.productId === proKitId);
    expect(pro).toMatchObject({ views: 1, addToCart: 1, revenue: { USD: 4900 } });

    const last = await h.http
      .get('/v1/admin/analytics/sources?model=last')
      .set('Cookie', admin)
      .expect(200);
    expect(last.body.find((r: { source: string }) => r.source === 'google')).toMatchObject({
      medium: 'cpc',
      orders: 1,
      revenue: { USD: 4900 },
    });
    const first = await h.http
      .get('/v1/admin/analytics/sources?model=first')
      .set('Cookie', admin)
      .expect(200);
    const fb = first.body.find(
      (r: { source: string; campaign: string }) =>
        r.source === 'facebook' && r.campaign === 'launch',
    );
    expect(fb.orders).toBeGreaterThanOrEqual(2);
    expect(fb.visitors).toBe(1);

    const events = await h.http
      .get('/v1/admin/analytics/events?name=purchase')
      .set('Cookie', admin)
      .expect(200);
    expect(events.body.items[0]).toMatchObject({ name: 'purchase', deliveries: expect.any(Array) });

    const order = await h.http.get(`/v1/admin/orders/${orderId}`).set('Cookie', admin).expect(200);
    expect(order.body.attribution).toMatchObject({
      first: { source: 'facebook' },
      last: { source: 'google' },
    });
  });

  it('keeps analytics admin-only and tracking settings super-admin-only, with no secrets', async () => {
    await h.http.get('/v1/admin/analytics/sales').set('Cookie', buyer).expect(401);
    await h.http.get('/v1/admin/tracking').expect(401);
    const tracking = await h.http.get('/v1/admin/tracking').set('Cookie', admin).expect(200);
    expect(tracking.body.health).toMatchObject({
      ga4: { serverSide: true },
      metaCapi: { configured: true, tokenSet: true },
    });
    expect(JSON.stringify(tracking.body)).not.toMatch(/ga4-test-secret|EAAB/);

    await createAdmin(h.prisma, 'EDITOR', 'editor@shimanto.test');
    const editor = cookieHeader(await loginCookies(h, 'editor@shimanto.test'));
    const next = { ...tracking.body.settings, gtmEnabled: true, gtmContainerId: 'GTM-ABC1234' };
    await h.http.put('/v1/admin/tracking').set('Cookie', editor).send(next).expect(403);
    await h.http
      .put('/v1/admin/tracking')
      .set('Cookie', admin)
      .send({ ...next, gtmContainerId: 'nope' })
      .expect(400);
    await h.http.put('/v1/admin/tracking').set('Cookie', admin).send(next).expect(200);
    const config = await h.http.get('/v1/tracking/config').expect(200);
    expect(config.body.gtmContainerId).toBe('GTM-ABC1234');
  });
});
