import {
  type Harness,
  cookieHeader,
  createAdmin,
  createHarness,
  lastMailTo,
  loginCookies,
  resetDb,
} from './harness.js';

const lead = {
  intent: 'BUILD_SOMETHING',
  name: 'Ayesha Rahman',
  email: 'Ayesha@Example.com',
  company: 'Acme',
  budgetRange: '$5k–$15k',
  timeline: '1–3 months',
  message: 'We want to automate our content pipeline end to end.',
  locale: 'bn',
  source: '/collaborate',
  utm: { utm_source: 'linkedin' },
  turnstileToken: 'pass',
};

describe('Leads (e2e)', () => {
  let h: Harness;
  let admin: string;
  beforeAll(async () => {
    // The limit is read from process.env per request (see LEADS_THROTTLE).
    process.env.LEADS_RATE_LIMIT_PER_MINUTE = '50';
    h = await createHarness();
    await resetDb(h.prisma);
    await createAdmin(h.prisma);
    admin = cookieHeader(await loginCookies(h));
  });
  afterAll(async () => {
    delete process.env.LEADS_RATE_LIMIT_PER_MINUTE;
    await h.close();
  });

  it('stores a lead, notifies the owner and auto-replies in the lead language', async () => {
    await h.http.post('/v1/leads').send(lead).expect(201, { ok: true });
    const stored = await h.prisma.lead.findFirstOrThrow({ where: { email: 'ayesha@example.com' } });
    expect(stored).toMatchObject({ status: 'NEW', intent: 'BUILD_SOMETHING', locale: 'bn' });

    expect(lastMailTo(h, 'owner@shimanto.test')?.subject).toContain('Ayesha Rahman');
    expect(lastMailTo(h, 'ayesha@example.com')?.subject).toBe('আপনার বার্তা পেয়েছি');
  });

  it('silently drops honeypot submissions', async () => {
    const before = await h.prisma.lead.count();
    await h.http
      .post('/v1/leads')
      .send({ ...lead, website: 'http://spam' })
      .expect(201, { ok: true });
    expect(await h.prisma.lead.count()).toBe(before);
  });

  it('rejects failed human verification and invalid input', async () => {
    await h.http
      .post('/v1/leads')
      .send({ ...lead, turnstileToken: 'bot' })
      .expect(400);
    const res = await h.http
      .post('/v1/leads')
      .send({ ...lead, email: 'nope', message: 'short' })
      .expect(400);
    expect(res.body.issues.map((i: { path: string }) => i.path)).toEqual(
      expect.arrayContaining(['email', 'message']),
    );
    // Support requests come from the portal, not the public form.
    await h.http
      .post('/v1/leads')
      .send({ ...lead, intent: 'SUPPORT' })
      .expect(400);
  });

  it('gives admins a kanban board, updates, notes and a CSV export', async () => {
    const board = await h.http.get('/v1/admin/leads/board').set('Cookie', admin).expect(200);
    expect(board.body.map((c: { status: string }) => c.status)).toEqual([
      'NEW',
      'CONTACTED',
      'QUALIFIED',
      'WON',
      'LOST',
    ]);
    const id = board.body[0].leads[0].id;

    await h.http
      .patch(`/v1/admin/leads/${id}`)
      .set('Cookie', admin)
      .send({ status: 'CONTACTED', position: 0 })
      .expect(200);
    await h.http
      .post(`/v1/admin/leads/${id}/notes`)
      .set('Cookie', admin)
      .send({ body: 'Called, promising.' })
      .expect(201);
    const detail = await h.http.get(`/v1/admin/leads/${id}`).set('Cookie', admin).expect(200);
    expect(detail.body.status).toBe('CONTACTED');
    expect(detail.body.notes[0].body).toBe('Called, promising.');

    const csv = await h.http.get('/v1/admin/leads/export.csv').set('Cookie', admin).expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.text.split('\r\n')[0]).toContain('email');

    const audit = await h.prisma.auditLog.findMany({ where: { entity: 'Lead', entityId: id } });
    expect(audit.map((a) => a.action)).toEqual(
      expect.arrayContaining(['lead.update', 'lead.note']),
    );
  });

  it('neutralises spreadsheet formulas in CSV exports', async () => {
    await h.http
      .post('/v1/leads')
      .send({ ...lead, email: 'x@example.com', name: '=HYPERLINK("http://evil")' })
      .expect(201);
    const csv = await h.http.get('/v1/admin/leads/export.csv').set('Cookie', admin).expect(200);
    expect(csv.text).toContain(`"'=HYPERLINK(""http://evil"")"`);
  });
});

describe('Leads rate limit (e2e)', () => {
  let h: Harness;
  beforeAll(async () => {
    process.env.LEADS_RATE_LIMIT_PER_MINUTE = '2';
    h = await createHarness();
  });
  afterAll(async () => {
    delete process.env.LEADS_RATE_LIMIT_PER_MINUTE;
    await h.close();
  });

  it('throttles repeated submissions from one client', async () => {
    await h.http.post('/v1/leads').send(lead).expect(201);
    await h.http.post('/v1/leads').send(lead).expect(201);
    await h.http.post('/v1/leads').send(lead).expect(429);
  });
});
