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
} from './harness.js';

describe('Support tickets (e2e)', () => {
  let h: Harness;
  let admin: string;
  let customer: string;
  let other: string;
  let ticketId: string;
  let ticketNumber: number;

  beforeAll(async () => {
    h = await createHarness({}, { distinctClients: true });
    await resetDb(h.prisma);
    await createAdmin(h.prisma);
    admin = cookieHeader(await loginCookies(h));
    customer = (await registerCustomer(h, 'help@buyer.test', 'Help Me')).cookie;
    other = (await registerCustomer(h, 'other@buyer.test')).cookie;
  });
  afterAll(() => h.close());

  it('opens a ticket and emails the customer and the team', async () => {
    const res = await h.http
      .post('/v1/account/tickets')
      .set('Cookie', customer)
      .send({ subject: 'Download fails', message: 'The ZIP link gives me an error every time.' })
      .expect(201);
    expect(res.body).toMatchObject({
      subject: 'Download fails',
      status: 'OPEN',
      messages: [{ authorType: 'CUSTOMER', authorName: 'Help Me', attachment: null }],
    });
    ticketId = res.body.id;
    ticketNumber = res.body.number;
    expect(lastMailTo(h, 'help@buyer.test')?.subject).toBe(
      `[#${ticketNumber}] We got your message: Download fails`,
    );
    expect(lastMailTo(h, 'owner@shimanto.test')?.subject).toContain('New ticket');
  });

  it('accepts a screenshot as a private attachment, and refuses unsafe files', async () => {
    const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#fff' } })
      .png()
      .toBuffer();
    const res = await h.http
      .post(`/v1/account/tickets/${ticketNumber}/messages`)
      .set('Cookie', customer)
      .field('message', 'Here is a screenshot')
      .attach('file', png, 'screen.png')
      .expect(201);
    const message = res.body.messages.at(-1);
    expect(message.attachment).toMatchObject({ filename: 'screen.png' });
    const key = [...h.storage.objects.keys()].find((k) => k.includes('/support/'));
    expect(key).toMatch(/^private\/support\//);

    const url = await h.http
      .post(`/v1/account/tickets/${ticketNumber}/messages/${message.id}/attachment`)
      .set('Cookie', customer)
      .expect(200);
    expect(url.body.url).toContain('signed=1');

    await h.http
      .post(`/v1/account/tickets/${ticketNumber}/messages`)
      .set('Cookie', customer)
      .field('message', 'script')
      .attach('file', Buffer.from('<svg><script>x</script></svg>'), 'x.png')
      .expect(422);
  });

  it('only references products and orders the customer owns', async () => {
    const product = await h.prisma.product.create({ data: { slug: 'x', name: 'X', price: 0 } });
    await h.http
      .post('/v1/account/tickets')
      .set('Cookie', customer)
      .send({ subject: 'About X', message: 'I did not buy this but…', productId: product.id })
      .expect(422);
  });

  it('keeps tickets private to their customer', async () => {
    await h.http.get(`/v1/account/tickets/${ticketNumber}`).set('Cookie', other).expect(404);
    await h.http
      .post(`/v1/account/tickets/${ticketNumber}/messages`)
      .set('Cookie', other)
      .send({ message: 'hijack' })
      .expect(404);
    const mine = await h.http.get('/v1/account/tickets').set('Cookie', other).expect(200);
    expect(mine.body).toEqual([]);
    await h.http.get('/v1/admin/tickets').set('Cookie', customer).expect(401);
  });

  it('lets admins reply (ticket → pending) and emails the customer', async () => {
    const list = await h.http.get('/v1/admin/tickets?status=OPEN').set('Cookie', admin).expect(200);
    expect(list.body.items.map((t: { id: string }) => t.id)).toContain(ticketId);
    const res = await h.http
      .post(`/v1/admin/tickets/${ticketId}/messages`)
      .set('Cookie', admin)
      .send({ message: 'Fixed the link, please try again.' })
      .expect(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.messages.at(-1)).toMatchObject({
      authorType: 'ADMIN',
      authorName: 'Test Admin',
    });
    expect(lastMailTo(h, 'help@buyer.test')?.subject).toBe(
      `[#${ticketNumber}] New reply: Download fails`,
    );
  });

  it('reopens on a customer reply and notifies the team', async () => {
    const before = mailsTo(h, 'owner@shimanto.test').length;
    const res = await h.http
      .post(`/v1/account/tickets/${ticketNumber}/messages`)
      .set('Cookie', customer)
      .send({ message: 'Still broken on my side.' })
      .expect(201);
    expect(res.body.status).toBe('OPEN');
    expect(mailsTo(h, 'owner@shimanto.test').length).toBe(before + 1);
    expect(lastMailTo(h, 'owner@shimanto.test')?.subject).toContain('Customer replied');
  });

  it('resolves with an email, and closed tickets take no more replies', async () => {
    const resolved = await h.http
      .patch(`/v1/admin/tickets/${ticketId}`)
      .set('Cookie', admin)
      .send({ status: 'RESOLVED' })
      .expect(200);
    expect(resolved.body.status).toBe('RESOLVED');
    expect(lastMailTo(h, 'help@buyer.test')?.subject).toBe(
      `[#${ticketNumber}] Resolved: Download fails`,
    );

    await h.http
      .patch(`/v1/admin/tickets/${ticketId}`)
      .set('Cookie', admin)
      .send({ status: 'CLOSED' })
      .expect(200);
    await h.http
      .post(`/v1/account/tickets/${ticketNumber}/messages`)
      .set('Cookie', customer)
      .send({ message: 'One more thing' })
      .expect(422);
    const audit = await h.prisma.auditLog.count({
      where: { entity: 'SupportTicket', entityId: ticketId },
    });
    expect(audit).toBeGreaterThanOrEqual(3);
  });
});
