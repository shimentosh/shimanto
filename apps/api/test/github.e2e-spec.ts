import { createHmac } from 'node:crypto';
import {
  type Harness,
  cookieHeader,
  createAdmin,
  createHarness,
  loginCookies,
  mailsTo,
  registerCustomer,
  resetDb,
  setCookies,
} from './harness.js';

const WEBHOOK_SECRET = 'test-github-webhook-secret';

describe('GitHub repository delivery (e2e)', () => {
  let h: Harness;
  let admin: string;
  let productId: string;
  let devCookie: string;

  const checkout = (cookie: string, slug = 'saas-kit') =>
    h.http
      .post('/v1/checkout')
      .set('Cookie', cookie)
      .send({ turnstileToken: 'pass', items: [{ slug }] });
  const delivery = (email: string, productSlug = 'saas-kit') =>
    h.prisma.delivery.findFirstOrThrow({
      where: { customer: { email }, type: 'GITHUB', product: { slug: productSlug } },
      include: { order: true },
    });

  /** Runs the OAuth dance: connect → GitHub → callback with the state cookie. */
  async function connect(cookie: string, code: string, identity: { id: string; login: string }) {
    h.github.identities.set(code, identity);
    const start = await h.http.get('/v1/account/github/connect').set('Cookie', cookie).expect(302);
    const location = new URL(start.headers.location as string);
    expect(location.host).toBe('github.test');
    const state = location.searchParams.get('state')!;
    const stateCookie = cookieHeader(setCookies(start), ['sx_gh']);
    return h.http
      .get(`/v1/github/callback?code=${code}&state=${state}`)
      .set('Cookie', `${cookie}; ${stateCookie}`)
      .expect(302);
  }

  const signed = (body: object) => {
    const raw = JSON.stringify(body);
    return {
      raw,
      signature: `sha256=${createHmac('sha256', WEBHOOK_SECRET).update(raw).digest('hex')}`,
    };
  };

  beforeAll(async () => {
    h = await createHarness({ GITHUB_WEBHOOK_SECRET: WEBHOOK_SECRET }, { distinctClients: true });
    await resetDb(h.prisma);
    await createAdmin(h.prisma);
    admin = cookieHeader(await loginCookies(h));
    const res = await h.http
      .post('/v1/admin/products')
      .set('Cookie', admin)
      .send({
        slug: 'saas-kit',
        name: 'SaaS Kit',
        type: 'SOURCE_CODE',
        price: 0,
        deliverGithub: true,
        githubOwner: 'acme',
        githubRepo: 'saas-kit',
      })
      .expect(201);
    productId = res.body.id;
    await h.http.post(`/v1/admin/products/${productId}/publish`).set('Cookie', admin).expect(200);
  });
  afterAll(() => h.close());

  it('never exposes the repository on the public product', async () => {
    const res = await h.http.get('/v1/products/saas-kit').expect(200);
    expect(res.body).toMatchObject({
      requiresGithub: true,
      deliveryMethods: ['GITHUB'],
      fileCount: 0,
    });
    expect(JSON.stringify(res.body)).not.toContain('acme');
  });

  it('waits for the customer to connect GitHub (action required), then continues automatically', async () => {
    const { cookie } = await registerCustomer(h, 'dev@buyer.test', 'Dev');
    devCookie = cookie;
    await checkout(cookie).expect(200);

    let d = await delivery('dev@buyer.test');
    expect(d.status).toBe('ACTION_REQUIRED');
    expect(d.order).toMatchObject({ status: 'PROCESSING', fulfillmentStatus: 'PROCESSING' });
    expect(
      mailsTo(h, 'dev@buyer.test').some((m) => m.subject === 'Connect GitHub to get SaaS Kit'),
    ).toBe(true);

    // The customer never sees the repository before access is initiated.
    const products = await h.http.get('/v1/account/products').set('Cookie', cookie).expect(200);
    expect(products.body[0].deliveries[0].github).toEqual({
      login: null,
      repository: null,
      url: null,
      canRetry: false,
    });

    const done = await connect(cookie, 'code-dev', { id: '101', login: 'dev-login' });
    expect(done.headers.location).toContain('/account/github?github=connected');

    d = await delivery('dev@buyer.test');
    expect(d).toMatchObject({
      status: 'INVITATION_SENT',
      githubLogin: 'dev-login',
      githubUserId: '101',
      githubOwner: 'acme',
      githubRepo: 'saas-kit',
    });
    expect(d.order.fulfillmentStatus).toBe('DELIVERED');
    expect(h.github.calls).toEqual(['invite acme/saas-kit dev-login']);
    expect(
      mailsTo(h, 'dev@buyer.test').some((m) => m.subject === 'GitHub invitation sent: SaaS Kit'),
    ).toBe(true);

    const me = await h.http.get('/v1/account/me').set('Cookie', cookie).expect(200);
    expect(me.body.github).toMatchObject({ connected: true, login: 'dev-login' });
  });

  it('never sends a duplicate invitation', async () => {
    const d = await delivery('dev@buyer.test');
    await h.http.post(`/v1/admin/orders/${d.orderId}/fulfill`).set('Cookie', admin).expect(200);
    await h.http.post(`/v1/admin/orders/${d.orderId}/fulfill`).set('Cookie', admin).expect(200);
    expect(h.github.calls.filter((c) => c.startsWith('invite'))).toHaveLength(1);
    expect(
      mailsTo(h, 'dev@buyer.test').filter((m) => m.subject === 'GitHub invitation sent: SaaS Kit'),
    ).toHaveLength(1);
  });

  it('marks access accepted after a status refresh and completes the order', async () => {
    h.github.accept('dev-login');
    const d = await delivery('dev@buyer.test');
    const res = await h.http
      .post(`/v1/account/deliveries/${d.id}/refresh`)
      .set('Cookie', devCookie)
      .expect(200);
    expect(res.body).toMatchObject({
      status: 'ACCEPTED',
      github: {
        login: 'dev-login',
        repository: 'acme/saas-kit',
        url: 'https://github.com/acme/saas-kit',
      },
    });
    const after = await delivery('dev@buyer.test');
    expect(after.order).toMatchObject({ status: 'COMPLETED', fulfillmentStatus: 'COMPLETED' });
    expect(
      mailsTo(h, 'dev@buyer.test').some((m) => m.subject === 'Repository access ready: SaaS Kit'),
    ).toBe(true);
  });

  it('accepts via a signed GitHub webhook, once per delivery id', async () => {
    const { cookie } = await registerCustomer(h, 'hook@buyer.test');
    await connect(cookie, 'code-hook', { id: '202', login: 'hook-login' });
    await checkout(cookie).expect(200);
    expect((await delivery('hook@buyer.test')).status).toBe('INVITATION_SENT');

    const payload = {
      action: 'added',
      member: { id: 202, login: 'hook-login' },
      repository: { name: 'saas-kit', owner: { login: 'acme' } },
    };
    const { raw, signature } = signed(payload);
    await h.http
      .post('/v1/webhooks/github')
      .set('content-type', 'application/json')
      .set('x-github-event', 'member')
      .set('x-github-delivery', 'gh-1')
      .set('x-hub-signature-256', 'sha256=forged')
      .send(raw)
      .expect(400);
    for (let i = 0; i < 2; i++) {
      await h.http
        .post('/v1/webhooks/github')
        .set('content-type', 'application/json')
        .set('x-github-event', 'member')
        .set('x-github-delivery', 'gh-1')
        .set('x-hub-signature-256', signature)
        .send(raw)
        .expect(200);
    }
    const d = await delivery('hook@buyer.test');
    expect(d.status).toBe('ACCEPTED');
    expect(
      mailsTo(h, 'hook@buyer.test').filter((m) => m.subject.startsWith('Repository access ready')),
    ).toHaveLength(1);
  });

  it('treats a customer who already has access as delivered', async () => {
    h.github.collaborators.add('acme/saas-kit:owner-login');
    const { cookie } = await registerCustomer(h, 'owner@buyer.test');
    await connect(cookie, 'code-owner', { id: '303', login: 'owner-login' });
    await checkout(cookie).expect(200);
    expect((await delivery('owner@buyer.test')).status).toBe('ACCEPTED');
  });

  it('reports failures, lets the customer retry, and handles expired invitations', async () => {
    const { cookie } = await registerCustomer(h, 'flaky@buyer.test');
    await connect(cookie, 'code-flaky', { id: '404', login: 'flaky-login' });
    h.github.failNext = 'Could not invite (422: user is blocked)';
    await checkout(cookie).expect(200);

    let d = await delivery('flaky@buyer.test');
    expect(d).toMatchObject({ status: 'FAILED', lastError: expect.stringContaining('422') });
    expect(
      mailsTo(h, 'flaky@buyer.test').some((m) => m.subject === 'Action needed: SaaS Kit delivery'),
    ).toBe(true);

    // Customers see a friendly status and a retry button, never the internal error.
    const order = await h.http
      .get(`/v1/account/orders/${d.order.number}`)
      .set('Cookie', cookie)
      .expect(200);
    expect(order.body.deliveries[0]).toMatchObject({
      status: 'FAILED',
      github: { canRetry: true },
    });
    expect(JSON.stringify(order.body)).not.toContain('blocked');

    const retried = await h.http
      .post(`/v1/account/deliveries/${d.id}/retry`)
      .set('Cookie', cookie)
      .expect(200);
    expect(retried.body.status).toBe('INVITATION_SENT');

    // The invitation expires on GitHub: a refresh notices, and a retry sends a fresh one.
    d = await delivery('flaky@buyer.test');
    h.github.invitations.get(d.githubInvitationId!)!.expired = true;
    const expired = await h.http
      .post(`/v1/account/deliveries/${d.id}/refresh`)
      .set('Cookie', cookie)
      .expect(200);
    expect(expired.body.status).toBe('EXPIRED');
    const fresh = await h.http
      .post(`/v1/account/deliveries/${d.id}/retry`)
      .set('Cookie', cookie)
      .expect(200);
    expect(fresh.body.status).toBe('INVITATION_SENT');
    expect((await delivery('flaky@buyer.test')).githubInvitationId).not.toBe(d.githubInvitationId);

    await h.http.post(`/v1/account/deliveries/${d.id}/retry`).set('Cookie', cookie).expect(422);
  });

  it('lets admins revoke access (and cancels the order’s repository access)', async () => {
    const d = await delivery('owner@buyer.test');
    const res = await h.http
      .post(`/v1/admin/deliveries/${d.id}/revoke`)
      .set('Cookie', admin)
      .send({ reason: 'Chargeback' })
      .expect(200);
    expect(res.body.status).toBe('REVOKED');
    expect(h.github.calls).toContain('remove acme/saas-kit owner-login');
    // Re-granting sends a fresh invitation (the collaborator was removed).
    const again = await h.http
      .post(`/v1/admin/deliveries/${d.id}/retry`)
      .set('Cookie', admin)
      .expect(200);
    expect(again.body.status).toBe('INVITATION_SENT');
  });

  it('refuses a GitHub account already linked to another customer', async () => {
    const { cookie } = await registerCustomer(h, 'copycat@buyer.test');
    const res = await connect(cookie, 'code-copy', { id: '101', login: 'dev-login' });
    expect(res.headers.location).toContain('github=taken');
  });

  it('rejects a callback with a forged state', async () => {
    const { cookie } = await registerCustomer(h, 'csrf@buyer.test');
    h.github.identities.set('code-csrf', { id: '505', login: 'csrf-login' });
    const res = await h.http
      .get('/v1/github/callback?code=code-csrf&state=forged')
      .set('Cookie', `${cookie}; sx_gh=real-state`)
      .expect(302);
    expect(res.headers.location).toContain('github=invalid');
    const me = await h.http.get('/v1/account/me').set('Cookie', cookie).expect(200);
    expect(me.body.github.connected).toBe(false);
  });

  it('fails clearly (for admins) when GitHub delivery is not configured', async () => {
    h.github.mode = null;
    try {
      const { cookie } = await registerCustomer(h, 'noconf@buyer.test');
      await connect(cookie, 'code-noconf', { id: '606', login: 'noconf-login' });
      await checkout(cookie).expect(200);
      const d = await delivery('noconf@buyer.test');
      expect(d).toMatchObject({
        status: 'FAILED',
        lastError: expect.stringContaining('not configured'),
      });
      const detail = await h.http
        .get(`/v1/admin/orders/${d.orderId}`)
        .set('Cookie', admin)
        .expect(200);
      expect(detail.body.deliveries[0].lastError).toContain('not configured');
    } finally {
      h.github.mode = 'app';
    }
  });
});
