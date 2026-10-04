import sharp from 'sharp';
import {
  type Harness,
  cookieHeader,
  createAdmin,
  createHarness,
  lastMailTo,
  loginCookies,
  mailsTo,
  registerCustomer,
  resetDb,
  setCookies,
  tokenFrom,
} from './harness.js';

const PDF = Buffer.from('%PDF-1.4\n% deliverable\n');
const ZIP = Buffer.concat([Buffer.from('PK\x03\x04', 'binary'), Buffer.alloc(64, 1)]);

describe('Store: files, products, checkout, orders (e2e)', () => {
  let h: Harness;
  let admin: string;
  let guideFileId: string;
  let starterId: string;
  let contentOsId: string;

  const media = (buffer: Buffer, name: string, fields: Record<string, string> = {}) => {
    let req = h.http.post('/v1/admin/media').set('Cookie', admin).attach('file', buffer, name);
    for (const [k, v] of Object.entries(fields)) req = req.field(k, v);
    return req;
  };
  const uploadFile = (buffer: Buffer, name: string, fields: Record<string, string> = {}) => {
    let req = h.http.post('/v1/admin/files').set('Cookie', admin).attach('file', buffer, name);
    for (const [k, v] of Object.entries(fields)) req = req.field(k, v);
    return req;
  };
  const product = (body: Record<string, unknown>) =>
    h.http.post('/v1/admin/products').set('Cookie', admin).send(body);
  const publish = (id: string) =>
    h.http.post(`/v1/admin/products/${id}/publish`).set('Cookie', admin);
  const checkout = (body: Record<string, unknown>, cookie?: string) => {
    const req = h.http.post('/v1/checkout');
    if (cookie) req.set('Cookie', cookie);
    return req.send({ turnstileToken: 'pass', ...body });
  };
  const webhook = (event: Record<string, unknown>, signature = 'valid') =>
    h.http.post('/v1/webhooks/stripe').set('stripe-signature', signature).send(event);
  const guestCookie = async (email: string) => {
    // The newest sign-in link (a newer one voids older ones).
    const token = tokenFrom(
      mailsTo(h, email)
        .filter((m) => m.text.includes('/auth/link?token='))
        .at(-1),
      '/auth/link',
    );
    const res = await h.http.post('/v1/customer/auth/link').send({ token }).expect(200);
    return cookieHeader(setCookies(res), ['sx_cs']);
  };

  beforeAll(async () => {
    h = await createHarness({}, { distinctClients: true });
    await resetDb(h.prisma);
    await createAdmin(h.prisma);
    admin = cookieHeader(await loginCookies(h));
  });
  afterAll(() => h.close());

  describe('media library', () => {
    it('rejects disguised files (e.g. SVG, which can carry scripts)', async () => {
      const svg = Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      );
      await media(svg, 'logo.png').expect(422);
    });

    it('requires alt text for public images and builds variants', async () => {
      const png = await sharp({
        create: { width: 1200, height: 800, channels: 3, background: '#8FD464' },
      })
        .png()
        .toBuffer();
      await media(png, 'cover.png').expect(422);
      const res = await media(png, 'cover.png', { alt: 'Green cover art' }).expect(201);
      expect(res.body.variants.map((v: { width: number }) => v.width)).toEqual([480, 960]);
    });
  });

  describe('private R2 files', () => {
    it('uploads deliverables privately with metadata, never a public URL', async () => {
      const res = await uploadFile(PDF, 'Founder Guide v2.PDF').expect(201);
      expect(res.body).toMatchObject({
        filename: 'Founder-Guide-v2.pdf',
        mimeType: 'application/pdf',
        size: PDF.length,
        uploadedBy: 'admin@shimanto.test',
        products: [],
      });
      expect(res.body.key).toMatch(/^private\/files\/\d{4}\/\d{2}\/[\w-]+\/Founder-Guide-v2\.pdf$/);
      expect(res.body.url).toBeUndefined();
      expect(h.storage.objects.get(res.body.key)?.body.equals(PDF)).toBe(true);
      guideFileId = res.body.id;
    });

    it('keeps any extension for software builds and archives', async () => {
      const res = await uploadFile(ZIP, 'app-1.2.0.tar.gz').expect(201);
      expect(res.body.filename).toBe('app-1.2.0.tar.gz');
      expect(res.body.mimeType).toBe('application/zip');
    });

    it('searches, renames and gives admins a short-lived preview link', async () => {
      const list = await h.http.get('/v1/admin/files?q=founder').set('Cookie', admin).expect(200);
      expect(list.body.items.map((f: { id: string }) => f.id)).toEqual([guideFileId]);
      const renamed = await h.http
        .patch(`/v1/admin/files/${guideFileId}`)
        .set('Cookie', admin)
        .send({ filename: 'founder-guide.pdf' })
        .expect(200);
      expect(renamed.body.filename).toBe('founder-guide.pdf');
      const url = await h.http
        .post(`/v1/admin/files/${guideFileId}/download`)
        .set('Cookie', admin)
        .expect(200);
      expect(url.body.url).toMatch(/^https:\/\/storage\.test\/private\/files\/.+signed=1/);
    });

    it('also manages private files uploaded before the Files page existed', async () => {
      const legacy = await media(PDF, 'old-guide.pdf', { visibility: 'private' }).expect(201);
      const list = await h.http.get('/v1/admin/files?q=old-guide').set('Cookie', admin).expect(200);
      expect(list.body.items.map((f: { id: string }) => f.id)).toEqual([legacy.body.id]);
      await h.http.delete(`/v1/admin/files/${legacy.body.id}`).set('Cookie', admin).expect(204);
    });

    it('is admin-only', async () => {
      await h.http.get('/v1/admin/files').expect(401);
      const { cookie } = await registerCustomer(h, 'nosy@buyer.test');
      await h.http.get('/v1/admin/files').set('Cookie', cookie).expect(401);
    });
  });

  describe('products', () => {
    it('validates delivery configuration and publish rules', async () => {
      await product({ slug: 'repo-kit', name: 'Repo', price: 0, deliverGithub: true }).expect(400);
      const empty = await product({ slug: 'empty', name: 'Empty', price: 0 }).expect(201);
      expect((await publish(empty.body.id).expect(422)).body.message).toContain(
        'Choose how buyers receive',
      );
      await h.http
        .patch(`/v1/admin/products/${empty.body.id}`)
        .set('Cookie', admin)
        .send({ deliverFiles: true })
        .expect(200);
      expect((await publish(empty.body.id).expect(422)).body.message).toContain(
        'Attach at least one file',
      );
      await product({ slug: 'cheap', name: 'Cheap', price: 1000, compareAtPrice: 900 }).expect(400);
    });

    it('publishes products with files and exposes only public fields', async () => {
      const starter = await product({
        slug: 'starter-kit',
        name: 'Starter Kit',
        summary: 'Free kit',
        type: 'DIGITAL_PRODUCT',
        price: 0,
        features: ['30 templates'],
        deliverFiles: true,
      }).expect(201);
      starterId = starter.body.id;
      await h.http
        .post(`/v1/admin/files/${guideFileId}/attach`)
        .set('Cookie', admin)
        .send({ productId: starterId, label: 'Founder guide', version: '2.0' })
        .expect(200);
      await publish(starterId).expect(200);
      expect(h.jobs.history).toContainEqual({
        name: 'web.revalidate',
        data: { tags: ['products', 'products:starter-kit'] },
      });

      const os = await product({
        slug: 'content-os',
        name: 'Content OS',
        type: 'SOFTWARE',
        price: 4900,
        compareAtPrice: 6900,
        version: '1.4.0',
        deliverFiles: true,
        files: [{ mediaId: guideFileId, label: 'Content OS guide' }],
      }).expect(201);
      contentOsId = os.body.id;
      expect(os.body.files[0]).toMatchObject({
        label: 'Content OS guide',
        filename: 'founder-guide.pdf',
      });
      await publish(contentOsId).expect(200);

      const pub = await h.http.get('/v1/products/content-os').expect(200);
      expect(pub.body).toMatchObject({
        name: 'Content OS',
        type: 'SOFTWARE',
        price: 4900,
        compareAtPrice: 6900,
        version: '1.4.0',
        deliveryMethods: ['R2'],
        fileCount: 1,
        requiresGithub: false,
      });
      expect(JSON.stringify(pub.body)).not.toMatch(/private\/|mediaId|githubOwner/);
      await h.http.get('/v1/products/empty').expect(404);
    });

    it('keeps attached files from being deleted', async () => {
      await h.http.delete(`/v1/admin/files/${guideFileId}`).set('Cookie', admin).expect(422);
    });
  });

  describe('$0 checkout', () => {
    it('quotes from the database, not the browser', async () => {
      const res = await h.http
        .post('/v1/checkout/quote')
        .send({ items: [{ slug: 'content-os', price: 1 }] })
        .expect(200);
      expect(res.body).toMatchObject({ total: 4900, paymentRequired: true, couponError: null });
    });

    it('confirms and fulfils a free order through the normal pipeline', async () => {
      const res = await checkout({
        items: [{ slug: 'starter-kit' }],
        email: 'Fan@Example.com',
        name: 'Fan',
      }).expect(200);
      expect(res.body).toMatchObject({ kind: 'complete', signedIn: false });

      const order = await h.prisma.order.findUniqueOrThrow({
        where: { number: res.body.orderNumber },
        include: { items: true, deliveries: true, payments: true, customer: true },
      });
      expect(order).toMatchObject({
        status: 'COMPLETED',
        paymentStatus: 'NOT_REQUIRED',
        fulfillmentStatus: 'COMPLETED',
        provider: 'FREE',
        source: 'CHECKOUT',
        total: 0,
      });
      expect(order.customer.email).toBe('fan@example.com');
      expect(order.items[0]).toMatchObject({
        productName: 'Starter Kit',
        productSlug: 'starter-kit',
        total: 0,
      });
      expect(order.deliveries).toMatchObject([{ type: 'R2', status: 'READY' }]);
      expect(order.payments).toEqual([]);

      const subjects = mailsTo(h, 'fan@example.com').map((m) => m.subject);
      expect(subjects).toEqual([
        'Welcome — your account is ready',
        expect.stringContaining(`#${order.number}`),
        'Your download is ready: Starter Kit',
      ]);
    });

    it('never duplicates a free claim', async () => {
      const first = await h.prisma.order.findFirstOrThrow({
        where: { customer: { email: 'fan@example.com' } },
      });
      const again = await checkout({
        items: [{ slug: 'starter-kit' }],
        email: 'fan@example.com',
      }).expect(200);
      expect(again.body.orderNumber).toBe(first.number);
      expect(
        await h.prisma.order.count({ where: { customer: { email: 'fan@example.com' } } }),
      ).toBe(1);
    });

    it('rejects bots, unknown products and invalid coupons', async () => {
      await checkout({
        items: [{ slug: 'starter-kit' }],
        email: 'a@b.co',
        turnstileToken: 'bot',
      }).expect(400);
      await checkout({ items: [{ slug: 'empty' }], email: 'a@b.co' }).expect(404);
      const bad = await checkout({
        items: [{ slug: 'content-os' }],
        email: 'a@b.co',
        couponCode: 'NOPE',
      }).expect(422);
      expect(bad.body.message).toContain('isn’t valid');
    });

    it('turns a 100% coupon into a $0 order with the same pipeline', async () => {
      await h.http
        .post('/v1/admin/coupons')
        .set('Cookie', admin)
        .send({
          code: 'free100',
          type: 'PERCENT',
          value: 100,
          usageLimit: 1,
          productIds: [contentOsId],
        })
        .expect(201);
      await h.http
        .post('/v1/admin/coupons')
        .set('Cookie', admin)
        .send({ code: 'FREE100', type: 'PERCENT', value: 50 })
        .expect(422);

      const quote = await h.http
        .post('/v1/checkout/quote')
        .send({ items: [{ slug: 'content-os' }], couponCode: 'free100' })
        .expect(200);
      expect(quote.body).toMatchObject({
        subtotal: 4900,
        discount: 4900,
        total: 0,
        paymentRequired: false,
      });

      const res = await checkout({
        items: [{ slug: 'content-os' }],
        email: 'lucky@example.com',
        couponCode: 'FREE100',
      }).expect(200);
      expect(res.body.kind).toBe('complete');
      const order = await h.prisma.order.findUniqueOrThrow({
        where: { number: res.body.orderNumber },
      });
      expect(order).toMatchObject({
        status: 'COMPLETED',
        paymentStatus: 'NOT_REQUIRED',
        couponCode: 'FREE100',
        discount: 4900,
        total: 0,
      });
      expect(
        (await h.prisma.coupon.findUniqueOrThrow({ where: { code: 'FREE100' } })).usedCount,
      ).toBe(1);

      // Usage limit reached.
      const used = await checkout({
        items: [{ slug: 'content-os' }],
        email: 'late@example.com',
        couponCode: 'FREE100',
      }).expect(422);
      expect(used.body.message).toContain('usage limit');
    });

    it('creates the account with a password when one is given, and signs it in', async () => {
      const res = await checkout({
        items: [{ slug: 'starter-kit' }],
        email: 'newbie@example.com',
        password: 'newbie-pass-1',
      }).expect(200);
      expect(res.body.signedIn).toBe(true);
      const cookie = cookieHeader(setCookies(res), ['sx_cs']);
      const orders = await h.http.get('/v1/account/orders').set('Cookie', cookie).expect(200);
      expect(orders.body).toHaveLength(1);
    });

    it('asks existing account holders to sign in instead of attaching orders to them', async () => {
      await registerCustomer(h, 'member@example.com');
      const res = await checkout({
        items: [{ slug: 'starter-kit' }],
        email: 'member@example.com',
      }).expect(409);
      expect(res.body.code).toBe('ACCOUNT_EXISTS');
    });
  });

  describe('paid checkout', () => {
    let orderId: string;
    let buyer: string;

    it('creates a pending order + payment and sends the buyer to the payment page', async () => {
      buyer = (await registerCustomer(h, 'buyer@example.com', 'Buyer One')).cookie;
      await h.http
        .post('/v1/admin/coupons')
        .set('Cookie', admin)
        .send({ code: 'SAVE10', type: 'FIXED', value: 1000, currency: 'USD' })
        .expect(201);
      const res = await checkout(
        { items: [{ slug: 'content-os' }], couponCode: 'save10', locale: 'bn' },
        buyer,
      ).expect(200);
      expect(res.body).toMatchObject({
        kind: 'redirect',
        url: expect.stringContaining('checkout.stripe.test'),
      });

      const session = h.payments.sessions.at(-1)!;
      expect(session).toMatchObject({
        currency: 'USD',
        customerEmail: 'buyer@example.com',
        lines: [{ name: 'Content OS', amount: 3900 }],
      });
      expect(session.successUrl).toContain('/bn/checkout/success');
      orderId = session.orderId;
      const order = await h.prisma.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { payments: true },
      });
      expect(order).toMatchObject({
        status: 'PENDING',
        paymentStatus: 'PENDING',
        provider: 'STRIPE',
        total: 3900,
      });
      expect(order.payments).toMatchObject([
        { provider: 'STRIPE', status: 'PENDING', amount: 3900, providerRef: `cs_test_${orderId}` },
      ]);
      // Nothing is delivered and no receipt is sent before the payment is verified.
      expect(await h.prisma.delivery.count({ where: { orderId } })).toBe(0);
      const portal = await h.http.get('/v1/account/downloads').set('Cookie', buyer).expect(200);
      expect(portal.body).toEqual([]);
    });

    it('rejects webhooks with a bad signature', async () => {
      await webhook(
        {
          id: 'evt_x',
          type: 'checkout.paid',
          orderId,
          sessionId: 'x',
          paymentRef: 'pi_1',
          amount: 3900,
          currency: 'USD',
        },
        'forged',
      ).expect(400);
    });

    it('does not fulfil when the charged amount differs from the order', async () => {
      await webhook({
        id: 'evt_mismatch',
        type: 'checkout.paid',
        orderId,
        sessionId: `cs_test_${orderId}`,
        paymentRef: 'pi_bad',
        amount: 100,
        currency: 'USD',
      }).expect(200);
      const order = await h.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
      expect(order.status).toBe('PENDING');
    });

    it('marks it paid once (idempotent webhooks), then fulfils and emails', async () => {
      const event = {
        id: 'evt_paid_1',
        type: 'checkout.paid',
        orderId,
        sessionId: `cs_test_${orderId}`,
        paymentRef: 'pi_123',
        amount: 3900,
        currency: 'USD',
      };
      await webhook(event).expect(200);
      await webhook(event).expect(200);

      const order = await h.prisma.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { payments: true, deliveries: true },
      });
      expect(order).toMatchObject({
        status: 'COMPLETED',
        paymentStatus: 'PAID',
        fulfillmentStatus: 'COMPLETED',
      });
      expect(order.paidAt).not.toBeNull();
      expect(order.payments[0]).toMatchObject({ status: 'PAID', providerPaymentId: 'pi_123' });
      expect(order.deliveries).toHaveLength(1);
      expect(
        (await h.prisma.coupon.findUniqueOrThrow({ where: { code: 'SAVE10' } })).usedCount,
      ).toBe(1);

      const receipts = mailsTo(h, 'buyer@example.com').filter((m) =>
        m.subject.includes('Payment received'),
      );
      expect(receipts).toHaveLength(1);
      expect(receipts[0]!.text).toContain('SAVE10');
      expect(
        await h.prisma.emailEvent.count({ where: { orderId, type: 'paymentSuccessful' } }),
      ).toBe(1);
    });

    it('lets the buyer see and download what they own, with fresh signed links', async () => {
      const products = await h.http.get('/v1/account/products').set('Cookie', buyer).expect(200);
      expect(products.body).toMatchObject([
        { name: 'Content OS', version: '1.4.0', deliveries: [{ type: 'R2', status: 'READY' }] },
      ]);
      const downloads = await h.http.get('/v1/account/downloads').set('Cookie', buyer).expect(200);
      expect(downloads.body).toMatchObject([
        { label: 'Content OS guide', filename: 'founder-guide.pdf', productName: 'Content OS' },
      ]);
      const { deliveryId, id } = downloads.body[0];
      const link = await h.http
        .post(`/v1/account/downloads/${deliveryId}/${id}`)
        .set('Cookie', buyer)
        .expect(200);
      expect(link.body.url).toMatch(/^https:\/\/storage\.test\/private\/files\/.+signed=1/);

      const number = (await h.prisma.order.findUniqueOrThrow({ where: { id: orderId } })).number;
      const detail = await h.http
        .get(`/v1/account/orders/${number}`)
        .set('Cookie', buyer)
        .expect(200);
      expect(detail.body).toMatchObject({
        number,
        total: 3900,
        discount: 1000,
        couponCode: 'SAVE10',
      });
      expect(JSON.stringify(detail.body)).not.toContain('lastError');

      const dashboard = await h.http.get('/v1/account/dashboard').set('Cookie', buyer).expect(200);
      expect(dashboard.body).toMatchObject({ downloadCount: 1, actionRequired: 0 });
    });

    it('blocks access to other customers’ orders, downloads and files (IDOR)', async () => {
      const fan = await guestCookie('fan@example.com');
      const theirs = await h.prisma.delivery.findFirstOrThrow({
        where: { customer: { email: 'fan@example.com' } },
      });
      const theirFile = await h.prisma.productFile.findFirstOrThrow({
        where: { productId: theirs.productId },
      });
      const mine = await h.prisma.delivery.findFirstOrThrow({ where: { orderId } });

      await h.http
        .post(`/v1/account/downloads/${theirs.id}/${theirFile.id}`)
        .set('Cookie', buyer)
        .expect(404);
      // A real delivery of mine + a file of another product: still refused.
      const otherFile = await h.prisma.productFile.findFirstOrThrow({
        where: { productId: starterId },
      });
      await h.http
        .post(`/v1/account/downloads/${mine.id}/${otherFile.id}`)
        .set('Cookie', buyer)
        .expect(404);
      const fanOrder = await h.prisma.order.findFirstOrThrow({
        where: { customer: { email: 'fan@example.com' } },
      });
      await h.http.get(`/v1/account/orders/${fanOrder.number}`).set('Cookie', buyer).expect(404);
      await h.http
        .post(`/v1/account/deliveries/${theirs.id}/refresh`)
        .set('Cookie', buyer)
        .expect(404);
      await h.http.get(`/v1/account/orders/${fanOrder.number}`).set('Cookie', fan).expect(200);
      await h.http.get('/v1/account/orders').expect(401);
    });

    it('refuses to sell a product the customer already owns', async () => {
      const res = await checkout({ items: [{ slug: 'content-os' }] }, buyer).expect(409);
      expect(res.body.code).toBe('ALREADY_OWNED');
    });

    it('refunds through the provider, revokes access and tells the buyer once', async () => {
      await h.http.post(`/v1/admin/orders/${orderId}/refund`).set('Cookie', admin).expect(200);
      expect(h.payments.refunds).toEqual(['pi_123']);
      // The provider's own refund webhook arrives afterwards: no second email.
      await webhook({ id: 'evt_refund_1', type: 'charge.refunded', paymentRef: 'pi_123' }).expect(
        200,
      );

      const order = await h.prisma.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { deliveries: true, payments: true },
      });
      expect(order).toMatchObject({ status: 'REFUNDED', paymentStatus: 'REFUNDED' });
      expect(order.deliveries[0]!.status).toBe('REVOKED');
      expect(order.payments[0]!.status).toBe('REFUNDED');
      expect(
        mailsTo(h, 'buyer@example.com').filter((m) => m.subject.includes('refunded')),
      ).toHaveLength(1);

      const downloads = await h.http.get('/v1/account/downloads').set('Cookie', buyer).expect(200);
      expect(downloads.body).toEqual([]);
      await h.http.post(`/v1/admin/orders/${orderId}/refund`).set('Cookie', admin).expect(422);
    });

    it('cancels abandoned checkouts quietly and emails real payment failures', async () => {
      await checkout({ items: [{ slug: 'content-os' }], email: 'late@example.com' }).expect(200);
      const late = h.payments.sessions.at(-1)!.orderId;
      await webhook({
        id: 'evt_exp',
        type: 'checkout.failed',
        orderId: late,
        sessionId: `cs_test_${late}`,
        reason: 'expired',
      }).expect(200);
      expect(await h.prisma.order.findUniqueOrThrow({ where: { id: late } })).toMatchObject({
        status: 'CANCELLED',
        paymentStatus: 'FAILED',
      });
      expect(
        mailsTo(h, 'late@example.com').some((m) => m.subject.includes('didn’t go through')),
      ).toBe(false);

      await checkout({ items: [{ slug: 'content-os' }], email: 'declined@example.com' }).expect(
        200,
      );
      const declined = h.payments.sessions.at(-1)!.orderId;
      await webhook({
        id: 'evt_fail',
        type: 'checkout.failed',
        orderId: declined,
        sessionId: `cs_test_${declined}`,
        reason: 'failed',
      }).expect(200);
      const mail = lastMailTo(h, 'declined@example.com');
      expect(mail?.text).toContain('/checkout?items=content-os');
    });
  });

  describe('admin orders', () => {
    it('creates a gift order through the same pipeline', async () => {
      const res = await h.http
        .post('/v1/admin/orders')
        .set('Cookie', admin)
        .send({
          customerEmail: 'gift@example.com',
          customerName: 'Gift',
          items: [{ productId: contentOsId, unitPrice: 0 }],
          note: 'Podcast guest',
        })
        .expect(201);
      expect(res.body).toMatchObject({
        source: 'ADMIN',
        provider: 'FREE',
        status: 'COMPLETED',
        paymentStatus: 'NOT_REQUIRED',
        total: 0,
        note: 'Podcast guest',
        createdBy: { email: 'admin@shimanto.test' },
        deliveries: [{ type: 'R2', status: 'READY' }],
      });
      expect(res.body.emails.map((e: { type: string }) => e.type)).toEqual(
        expect.arrayContaining(['orderConfirmation', 'downloadAvailable']),
      );
      const audit = await h.prisma.auditLog.findFirst({
        where: { action: 'order.create', entityId: res.body.id },
      });
      expect(audit).not.toBeNull();
    });

    it('requires paid orders to be marked as paid outside the store', async () => {
      await h.http
        .post('/v1/admin/orders')
        .set('Cookie', admin)
        .send({ customerEmail: 'offline@example.com', items: [{ productId: contentOsId }] })
        .expect(422);
      const res = await h.http
        .post('/v1/admin/orders')
        .set('Cookie', admin)
        .send({
          customerEmail: 'offline@example.com',
          items: [{ productId: contentOsId }],
          paidExternally: true,
          notifyCustomer: false,
        })
        .expect(201);
      expect(res.body).toMatchObject({ provider: 'MANUAL', paymentStatus: 'PAID', total: 4900 });
      expect(res.body.payments).toMatchObject([
        { provider: 'MANUAL', status: 'PAID', amount: 4900 },
      ]);
      expect(res.body.emails.map((e: { type: string }) => e.type)).not.toContain(
        'orderConfirmation',
      );
    });

    it('cancels an order and removes access', async () => {
      const gift = await h.prisma.order.findFirstOrThrow({
        where: { customer: { email: 'gift@example.com' } },
      });
      const res = await h.http
        .post(`/v1/admin/orders/${gift.id}/cancel`)
        .set('Cookie', admin)
        .expect(200);
      expect(res.body.status).toBe('CANCELLED');
      expect(res.body.deliveries[0].status).toBe('REVOKED');
      await h.http.post(`/v1/admin/orders/${gift.id}/cancel`).set('Cookie', admin).expect(422);
    });

    it('lists, filters and exports orders; lists customers with per-currency totals', async () => {
      const refunded = await h.http
        .get('/v1/admin/orders?status=REFUNDED')
        .set('Cookie', admin)
        .expect(200);
      expect(refunded.body.items).toHaveLength(1);
      const admins = await h.http
        .get('/v1/admin/orders?source=ADMIN')
        .set('Cookie', admin)
        .expect(200);
      expect(admins.body.items).toHaveLength(2);
      const byEmail = await h.http.get('/v1/admin/orders?q=fan@').set('Cookie', admin).expect(200);
      expect(byEmail.body.items[0].customer.email).toBe('fan@example.com');

      const customers = await h.http
        .get('/v1/admin/customers?q=offline')
        .set('Cookie', admin)
        .expect(200);
      expect(customers.body.items[0]).toMatchObject({
        email: 'offline@example.com',
        orders: 1,
        totals: { USD: 4900 },
      });
      const detail = await h.http
        .get(`/v1/admin/customers/${customers.body.items[0].id}`)
        .set('Cookie', admin)
        .expect(200);
      expect(detail.body.orderList).toHaveLength(1);

      const csv = await h.http.get('/v1/admin/orders/export.csv').set('Cookie', admin).expect(200);
      expect(csv.text.split('\r\n')[0]).toContain('paymentStatus');
      expect(csv.text.split('\r\n').length).toBeGreaterThan(5);
    });

    it('shows a dashboard summary', async () => {
      const res = await h.http.get('/v1/admin/dashboard').set('Cookie', admin).expect(200);
      expect(res.body.revenue).toEqual({ USD: 4900 });
      expect(res.body.products).toEqual({ published: 2, total: 3 });
      expect(res.body.recentOrders.length).toBeGreaterThan(0);
    });

    it('disabling a customer signs them out everywhere', async () => {
      const { cookie, me } = await registerCustomer(h, 'toblock@example.com');
      await h.http
        .patch(`/v1/admin/customers/${me.id}`)
        .set('Cookie', admin)
        .send({ status: 'DISABLED' })
        .expect(200);
      await h.http.get('/v1/account/me').set('Cookie', cookie).expect(401);
    });
  });

  describe('emails and settings', () => {
    it('records every email once, keyed by its business event', async () => {
      const keys = await h.prisma.emailEvent.groupBy({ by: ['idempotencyKey'], _count: true });
      expect(keys.every((k) => k._count === 1)).toBe(true);
      const log = await h.http
        .get('/v1/admin/emails?q=buyer@example.com')
        .set('Cookie', admin)
        .expect(200);
      expect(log.body.items.length).toBeGreaterThan(0);
      expect(log.body.items.every((e: { status: string }) => e.status === 'SENT')).toBe(true);
    });

    it('reports integrations without exposing any secret', async () => {
      const res = await h.http.get('/v1/admin/settings').set('Cookie', admin).expect(200);
      expect(res.body.general).toEqual({
        storeName: 'Shimanto',
        supportEmail: null,
        defaultCurrency: 'USD',
      });
      expect(res.body.integrations.email.provider).toBe('log');
      expect(JSON.stringify(res.body)).not.toMatch(/secret|sk_|whsec_|PRIVATE KEY|test-access/i);
    });

    it('lets super admins change store settings and send a test email', async () => {
      const res = await h.http
        .put('/v1/admin/settings/general')
        .set('Cookie', admin)
        .send({
          storeName: 'Shimanto Store',
          supportEmail: 'help@shimanto.test',
          defaultCurrency: 'USD',
        })
        .expect(200);
      expect(res.body.general.storeName).toBe('Shimanto Store');
      await h.http
        .post('/v1/admin/settings/test-email')
        .set('Cookie', admin)
        .send({ to: 'me@shimanto.test' })
        .expect(200);
      expect(lastMailTo(h, 'me@shimanto.test')?.text).toContain('Shimanto Store');

      await createAdmin(h.prisma, 'EDITOR', 'editor@shimanto.test');
      const editor = cookieHeader(await loginCookies(h, 'editor@shimanto.test'));
      await h.http.get('/v1/admin/settings').set('Cookie', editor).expect(200);
      await h.http
        .put('/v1/admin/settings/general')
        .set('Cookie', editor)
        .send({ storeName: 'Hacked', supportEmail: null, defaultCurrency: 'USD' })
        .expect(403);
    });
  });
});
