import {
  type Harness,
  cookieHeader,
  createAdmin,
  createHarness,
  lastMailTo,
  loginCookies,
  resetDb,
} from './harness.js';

describe('Admin emails (e2e)', () => {
  let h: Harness;
  let admin: string;

  beforeAll(async () => {
    h = await createHarness();
    await resetDb(h.prisma);
    await createAdmin(h.prisma);
    admin = cookieHeader(await loginCookies(h));
  });
  afterAll(() => h.close());

  describe('templates', () => {
    it('lists every template, grouped, with a sample subject', async () => {
      const res = await h.http.get('/v1/admin/email-templates').set('Cookie', admin).expect(200);
      expect(res.body.length).toBeGreaterThan(20);
      expect(res.body).toContainEqual(
        expect.objectContaining({
          key: 'orderConfirmation',
          group: 'orders',
          audience: 'customer',
          subject: 'Order #1042 confirmed',
          sent: 0,
          failed: 0,
          lastSentAt: null,
        }),
      );
    });

    it('renders a preview, and 404s an unknown key', async () => {
      const res = await h.http
        .get('/v1/admin/email-templates/passwordReset')
        .set('Cookie', admin)
        .expect(200);
      expect(res.body.subject).toBe('Reset your password');
      expect(res.body.html).toContain('Choose a new password');
      expect(res.body.text).toContain('Choose a new password');
      await h.http.get('/v1/admin/email-templates/nope').set('Cookie', admin).expect(404);
    });

    it('sends a template with sample data and counts it', async () => {
      await h.http
        .post('/v1/admin/email-templates/downloadAvailable/test')
        .set('Cookie', admin)
        .send({ to: 'me@shop.test' })
        .expect(200);
      expect(lastMailTo(h, 'me@shop.test')?.subject).toBe('Your download is ready: Content OS');
      const list = await h.http.get('/v1/admin/email-templates').set('Cookie', admin).expect(200);
      expect(list.body.find((t: { key: string }) => t.key === 'downloadAvailable')).toMatchObject({
        sent: 1,
      });
    });

    it('is admin only', async () => {
      await h.http.get('/v1/admin/email-templates').expect(401);
    });
  });

  describe('delivery settings', () => {
    const view = () => h.http.get('/v1/admin/settings/email').set('Cookie', admin).expect(200);

    it('starts from the environment', async () => {
      const res = await view();
      expect(res.body).toMatchObject({
        provider: 'log',
        resend: { source: null, hint: null },
        fromSource: 'env',
        envKeySet: false,
      });
    });

    it('saves a sender that wins over MAIL_FROM, and clears back to it', async () => {
      const saved = await h.http
        .put('/v1/admin/settings/email')
        .set('Cookie', admin)
        .send({ from: 'Shop <hello@shop.test>' })
        .expect(200);
      expect(saved.body).toMatchObject({ from: 'Shop <hello@shop.test>', fromSource: 'admin' });

      const cleared = await h.http
        .put('/v1/admin/settings/email')
        .set('Cookie', admin)
        .send({ from: null })
        .expect(200);
      expect(cleared.body.fromSource).toBe('env');
    });

    it('refuses a malformed key or sender', async () => {
      const res = await h.http
        .put('/v1/admin/settings/email')
        .set('Cookie', admin)
        .send({ resendApiKey: 'sk_live_nope', from: 'not an address' })
        .expect(400);
      expect(JSON.stringify(res.body)).toContain('resendApiKey');
      expect(JSON.stringify(res.body)).toContain('from');
    });

    it('needs a super admin to change it', async () => {
      await createAdmin(h.prisma, 'EDITOR', 'editor@shimanto.test');
      const editor = cookieHeader(await loginCookies(h, 'editor@shimanto.test'));
      await h.http
        .put('/v1/admin/settings/email')
        .set('Cookie', editor)
        .send({ from: null })
        .expect(403);
    });
  });
});
