import {
  ADMIN,
  type Harness,
  cookieHeader,
  setCookies,
  createAdmin,
  createHarness,
  loginCookies,
  resetDb,
} from './harness.js';

describe('Admin auth (e2e)', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await createHarness();
    await resetDb(h.prisma);
    await createAdmin(h.prisma);
  });
  afterAll(() => h.close());

  it('logs in with httpOnly cookies and exposes /auth/me', async () => {
    const cookies = await loginCookies(h);
    expect(cookies.some((c) => c.startsWith('sx_at=') && /HttpOnly/i.test(c))).toBe(true);
    expect(cookies.some((c) => c.startsWith('sx_rt=') && c.includes('Path=/v1/auth'))).toBe(true);
    const me = await h.http.get('/v1/auth/me').set('Cookie', cookieHeader(cookies)).expect(200);
    expect(me.body).toMatchObject({ email: ADMIN.email, role: 'SUPER_ADMIN' });
  });

  it('accepts a Bearer token too (tools, scripts)', async () => {
    const cookies = await loginCookies(h);
    const token = cookieHeader(cookies, ['sx_at']).split('=')[1]!;
    await h.http.get('/v1/auth/me').set('Authorization', `Bearer ${token}`).expect(200);
  });

  it('rejects wrong passwords and unknown emails with the same message', async () => {
    const wrong = await h.http
      .post('/v1/auth/login')
      .send({ email: ADMIN.email, password: 'nope' })
      .expect(401);
    const unknown = await h.http
      .post('/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'nope' })
      .expect(401);
    expect(wrong.body.message).toBe(unknown.body.message);
  });

  it('rotates refresh tokens and revokes the family when an old one is replayed', async () => {
    const first = await loginCookies(h);
    const rt1 = cookieHeader(first, ['sx_rt']);
    const refreshed = await h.http.post('/v1/auth/refresh').set('Cookie', rt1).expect(200);
    const rt2 = cookieHeader(setCookies(refreshed), ['sx_rt']);
    expect(rt2).not.toBe(rt1);

    // Replaying the rotated token = theft signal → whole family revoked, including rt2.
    await h.http.post('/v1/auth/refresh').set('Cookie', rt1).expect(401);
    await h.http.post('/v1/auth/refresh').set('Cookie', rt2).expect(401);
  });

  it('logout revokes the session', async () => {
    const cookies = await loginCookies(h);
    await h.http.post('/v1/auth/logout').set('Cookie', cookieHeader(cookies)).expect(204);
    await h.http
      .post('/v1/auth/refresh')
      .set('Cookie', cookieHeader(cookies, ['sx_rt']))
      .expect(401);
  });

  it('guards admin routes and enforces roles', async () => {
    await h.http.get('/v1/admin/orders').expect(401);
    await createAdmin(h.prisma, 'EDITOR', 'editor@shimanto.test');
    const editor = cookieHeader(await loginCookies(h, 'editor@shimanto.test'));
    await h.http.get('/v1/admin/orders').set('Cookie', editor).expect(200);
    await h.http.get('/v1/admin/users').set('Cookie', editor).expect(403);
    await h.http.get('/v1/admin/audit-log').set('Cookie', editor).expect(403);
  });

  it('disabling a user ends access immediately, and the last super admin is protected', async () => {
    const admin = cookieHeader(await loginCookies(h));
    const editor = await h.prisma.user.findUniqueOrThrow({
      where: { email: 'editor@shimanto.test' },
    });
    const editorCookies = cookieHeader(await loginCookies(h, 'editor@shimanto.test'));

    await h.http
      .patch(`/v1/admin/users/${editor.id}`)
      .set('Cookie', admin)
      .send({ disabled: true })
      .expect(200);
    await h.http.get('/v1/admin/orders').set('Cookie', editorCookies).expect(401);

    const self = await h.prisma.user.findUniqueOrThrow({ where: { email: ADMIN.email } });
    await h.http
      .patch(`/v1/admin/users/${self.id}`)
      .set('Cookie', admin)
      .send({ role: 'EDITOR' })
      .expect(422);
  });
});
