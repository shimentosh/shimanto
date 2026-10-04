import {
  type Harness,
  TEST_CUSTOMER,
  cookieHeader,
  createHarness,
  lastMailTo,
  mailsTo,
  registerCustomer,
  resetDb,
  setCookies,
  tokenFrom,
} from './harness.js';
import { hashPassword } from '../src/auth/crypto.js';

describe('Customer accounts (e2e)', () => {
  let h: Harness;
  const email = 'rina@buyer.test';

  beforeAll(async () => {
    h = await createHarness({}, { distinctClients: true });
    await resetDb(h.prisma);
  });
  afterAll(() => h.close());

  it('registers with a hashed password, a session cookie and a welcome + verify email', async () => {
    const { cookie, me } = await registerCustomer(h, email, 'Rina Das');
    expect(me).toMatchObject({ email, name: 'Rina Das', emailVerified: false, hasPassword: true });
    expect(cookie).toMatch(/^sx_cs=/);

    const row = await h.prisma.customer.findUniqueOrThrow({ where: { email } });
    expect(row.passwordHash).toMatch(/^\$argon2id\$/);
    expect(row.passwordHash).not.toContain(TEST_CUSTOMER.password);

    const welcome = lastMailTo(h, email);
    expect(welcome?.subject).toContain('Welcome');
    const event = await h.prisma.emailEvent.findFirstOrThrow({
      where: { type: 'welcome', recipient: email },
    });
    expect(event.status).toBe('SENT');
    expect(event.provider).toBe('log');

    const res = await h.http.get('/v1/account/me').set('Cookie', cookie).expect(200);
    expect(res.body.email).toBe(email);
  });

  it('prevents duplicate accounts for the same email (any case)', async () => {
    const res = await h.http
      .post('/v1/customer/auth/register')
      .send({
        name: 'X',
        email: 'RINA@buyer.test',
        password: 'another-pass-1',
        confirmPassword: 'another-pass-1',
      })
      .expect(409);
    expect(res.body.message).toContain('already exists');
    expect(await h.prisma.customer.count({ where: { email } })).toBe(1);
  });

  it('validates registration input', async () => {
    const res = await h.http
      .post('/v1/customer/auth/register')
      .send({ name: 'Y', email: 'y@buyer.test', password: 'short', confirmPassword: 'nope' })
      .expect(400);
    const paths = res.body.issues.map((i: { path: string }) => i.path);
    expect(paths).toEqual(expect.arrayContaining(['password']));
  });

  it('verifies the email with a single-use token', async () => {
    const token = tokenFrom(lastMailTo(h, email), '/verify-email');
    await h.http.post('/v1/customer/auth/verify-email').send({ token }).expect(200);
    await h.http.post('/v1/customer/auth/verify-email').send({ token }).expect(422);
    const row = await h.prisma.customer.findUniqueOrThrow({ where: { email } });
    expect(row.emailVerifiedAt).not.toBeNull();
  });

  it('logs in, rejects bad credentials with one message, and logs out', async () => {
    const wrong = await h.http
      .post('/v1/customer/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
    const unknown = await h.http
      .post('/v1/customer/auth/login')
      .send({ email: 'nobody@buyer.test', password: 'wrong-password' })
      .expect(401);
    expect(wrong.body.message).toBe(unknown.body.message);

    const ok = await h.http
      .post('/v1/customer/auth/login')
      .send({ email, password: TEST_CUSTOMER.password })
      .expect(200);
    const cookies = setCookies(ok);
    expect(cookies.some((c) => c.startsWith('sx_cs=') && /HttpOnly/i.test(c))).toBe(true);

    const out = await h.http.post('/v1/customer/auth/logout').expect(204);
    expect(setCookies(out).some((c) => c.startsWith('sx_cs=;'))).toBe(true);
  });

  it('sends a new-sign-in alert only for a new device', async () => {
    const before = mailsTo(h, email).filter((m) => m.subject.includes('New sign-in')).length;
    const first = await h.http
      .post('/v1/customer/auth/login')
      .set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0')
      .send({ email, password: TEST_CUSTOMER.password })
      .expect(200);
    const device = cookieHeader(setCookies(first), ['sx_dv']);
    const afterFirst = mailsTo(h, email).filter((m) => m.subject.includes('New sign-in'));
    expect(afterFirst.length).toBe(before + 1);
    expect(afterFirst.at(-1)?.text).toContain('Chrome on Windows');

    await h.http
      .post('/v1/customer/auth/login')
      .set('Cookie', device)
      .send({ email, password: TEST_CUSTOMER.password })
      .expect(200);
    expect(mailsTo(h, email).filter((m) => m.subject.includes('New sign-in')).length).toBe(
      before + 1,
    );
  });

  it('resets a forgotten password once, ends old sessions, and never reveals unknown emails', async () => {
    const old = await h.http
      .post('/v1/customer/auth/login')
      .send({ email, password: TEST_CUSTOMER.password })
      .expect(200);
    const oldCookie = cookieHeader(setCookies(old), ['sx_cs']);

    await h.http
      .post('/v1/customer/auth/forgot-password')
      .send({ email: 'ghost@buyer.test' })
      .expect(202);
    expect(lastMailTo(h, 'ghost@buyer.test')).toBeUndefined();

    await h.http.post('/v1/customer/auth/forgot-password').send({ email }).expect(202);
    const token = tokenFrom(lastMailTo(h, email), '/reset-password');
    const reset = await h.http
      .post('/v1/customer/auth/reset-password')
      .send({ token, password: 'brand-new-pass-1', confirmPassword: 'brand-new-pass-1' })
      .expect(200);
    await h.http
      .post('/v1/customer/auth/reset-password')
      .send({ token, password: 'brand-new-pass-2', confirmPassword: 'brand-new-pass-2' })
      .expect(422);

    // The session from before the reset no longer works; the new one does.
    await h.http.get('/v1/account/me').set('Cookie', oldCookie).expect(401);
    await h.http
      .get('/v1/account/me')
      .set('Cookie', cookieHeader(setCookies(reset), ['sx_cs']))
      .expect(200);
    expect(lastMailTo(h, email)?.subject).toBe('Your password was changed');
    await h.http
      .post('/v1/customer/auth/login')
      .send({ email, password: 'brand-new-pass-1' })
      .expect(200);
  });

  it('changes the password with the current one and keeps this device signed in', async () => {
    const login = await h.http
      .post('/v1/customer/auth/login')
      .send({ email, password: 'brand-new-pass-1' })
      .expect(200);
    const cookie = cookieHeader(setCookies(login), ['sx_cs']);
    await h.http
      .post('/v1/account/password')
      .set('Cookie', cookie)
      .send({
        currentPassword: 'nope-nope',
        password: 'third-pass-123',
        confirmPassword: 'third-pass-123',
      })
      .expect(422);
    const changed = await h.http
      .post('/v1/account/password')
      .set('Cookie', cookie)
      .send({
        currentPassword: 'brand-new-pass-1',
        password: 'third-pass-123',
        confirmPassword: 'third-pass-123',
      })
      .expect(200);
    await h.http.get('/v1/account/me').set('Cookie', cookie).expect(401);
    await h.http
      .get('/v1/account/me')
      .set('Cookie', cookieHeader(setCookies(changed), ['sx_cs']))
      .expect(200);
  });

  it('updates the profile', async () => {
    const login = await h.http
      .post('/v1/customer/auth/login')
      .send({ email, password: 'third-pass-123' })
      .expect(200);
    const cookie = cookieHeader(setCookies(login), ['sx_cs']);
    const res = await h.http
      .patch('/v1/account/profile')
      .set('Cookie', cookie)
      .send({ name: 'Rina D.' })
      .expect(200);
    expect(res.body.name).toBe('Rina D.');
  });

  it('signs in with an emailed link (no password needed) and verifies the email', async () => {
    const guest = await h.prisma.customer.create({ data: { email: 'guest@buyer.test' } });
    await h.http.post('/v1/customer/auth/login-link').send({ email: guest.email }).expect(202);
    const token = tokenFrom(lastMailTo(h, guest.email), '/auth/link');
    const res = await h.http.post('/v1/customer/auth/link').send({ token }).expect(200);
    expect(res.body).toMatchObject({ email: guest.email, emailVerified: true, hasPassword: false });
    await h.http.post('/v1/customer/auth/link').send({ token }).expect(422);

    // Passwordless accounts can set a first password without a current one.
    await h.http
      .post('/v1/account/password')
      .set('Cookie', cookieHeader(setCookies(res), ['sx_cs']))
      .send({ password: 'first-pass-123', confirmPassword: 'first-pass-123' })
      .expect(200);
  });

  it('rejects disabled accounts and their existing sessions', async () => {
    const { cookie } = await registerCustomer(h, 'bad@buyer.test');
    await h.prisma.customer.update({
      where: { email: 'bad@buyer.test' },
      data: { status: 'DISABLED' },
    });
    await h.http.get('/v1/account/me').set('Cookie', cookie).expect(401);
    await h.http
      .post('/v1/customer/auth/login')
      .send({ email: 'bad@buyer.test', password: TEST_CUSTOMER.password })
      .expect(403);
  });

  it('lets team members open the portal with their admin login (as a customer)', async () => {
    await h.prisma.user.create({
      data: {
        email: 'team@shimanto.test',
        name: 'Team',
        role: 'EDITOR',
        passwordHash: await hashPassword('team-pass-123'),
      },
    });
    const res = await h.http
      .post('/v1/customer/auth/login')
      .send({ email: 'team@shimanto.test', password: 'team-pass-123' })
      .expect(200);
    expect(res.body).toMatchObject({ email: 'team@shimanto.test', emailVerified: true });
    const cookie = cookieHeader(setCookies(res), ['sx_cs']);
    await h.http.get('/v1/account/orders').set('Cookie', cookie).expect(200);
    // A customer session never opens the admin API.
    await h.http.get('/v1/admin/orders').set('Cookie', cookie).expect(401);
    await h.http
      .post('/v1/customer/auth/login')
      .send({ email: 'team@shimanto.test', password: 'wrong-password' })
      .expect(401);
  });

  it('opens the portal straight from an admin session, and only from one', async () => {
    await h.http.post('/v1/customer/auth/from-admin').expect(401);
    const login = await h.http
      .post('/v1/auth/login')
      .send({ email: 'team@shimanto.test', password: 'team-pass-123' })
      .expect(200);
    const res = await h.http
      .post('/v1/customer/auth/from-admin')
      .set('Cookie', cookieHeader(setCookies(login), ['sx_at']))
      .expect(200);
    expect(res.body.email).toBe('team@shimanto.test');
    await h.http
      .get('/v1/account/me')
      .set('Cookie', cookieHeader(setCookies(res), ['sx_cs']))
      .expect(200);
  });

  it('keeps admin and customer sessions apart', async () => {
    await h.http.get('/v1/account/me').expect(401);
    const { cookie } = await registerCustomer(h, 'split@buyer.test');
    await h.http.get('/v1/admin/orders').set('Cookie', cookie).expect(401);
  });
});
