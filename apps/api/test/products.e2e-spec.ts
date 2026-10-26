import sharp from 'sharp';
import {
  type Harness,
  cookieHeader,
  createAdmin,
  createHarness,
  loginCookies,
  resetDb,
} from './harness.js';

const PDF = Buffer.from('%PDF-1.7\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');

describe('Products: visibility and sales page (e2e)', () => {
  let h: Harness;
  let admin: string;
  let shots: string[];
  let fileId: string;

  const product = (body: Record<string, unknown>) =>
    h.http.post('/v1/admin/products').set('Cookie', admin).send(body);
  const patch = (id: string, body: Record<string, unknown>) =>
    h.http.patch(`/v1/admin/products/${id}`).set('Cookie', admin).send(body);
  const image = async (name: string, alt: string) => {
    const png = await sharp({
      create: { width: 1600, height: 1000, channels: 3, background: '#2C2E2A' },
    })
      .png()
      .toBuffer();
    const res = await h.http
      .post('/v1/admin/media')
      .set('Cookie', admin)
      .attach('file', png, name)
      .field('alt', alt)
      .expect(201);
    return res.body.id as string;
  };
  /** A published product with one attached file, built from `body`. */
  const published = async (body: Record<string, unknown>) => {
    const res = await product({ price: 1900, deliverFiles: true, ...body }).expect(201);
    await h.http
      .post(`/v1/admin/files/${fileId}/attach`)
      .set('Cookie', admin)
      .send({ productId: res.body.id })
      .expect(200);
    await h.http.post(`/v1/admin/products/${res.body.id}/publish`).set('Cookie', admin).expect(200);
    return res.body.id as string;
  };

  beforeAll(async () => {
    h = await createHarness();
    await resetDb(h.prisma);
    await createAdmin(h.prisma);
    admin = cookieHeader(await loginCookies(h));
    shots = [await image('one.png', 'Dashboard'), await image('two.png', 'Settings')];
    const file = await h.http
      .post('/v1/admin/files')
      .set('Cookie', admin)
      .attach('file', PDF, 'guide.pdf')
      .expect(201);
    fileId = file.body.id;
  });
  afterAll(() => h.close());

  it('saves and serves the sales page: tagline, badge, highlights, blocks, FAQ, gallery, video', async () => {
    await published({
      slug: 'launch-kit',
      name: 'Launch Kit',
      type: 'TEMPLATE',
      tagline: 'Everything to launch in a weekend.',
      badge: 'New',
      featured: true,
      highlights: ['40 templates', 'Notion and Figma'],
      benefits: [{ title: 'Plan', body: 'A launch plan you can follow.' }],
      faq: [{ q: 'Does it work in Notion?', a: 'Yes, duplicate it in one click.' }],
      demoUrl: 'https://example.com/demo',
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
      galleryIds: [shots[1], shots[0]],
    });

    const res = await h.http.get('/v1/products/launch-kit').expect(200);
    expect(res.body).toMatchObject({
      type: 'TEMPLATE',
      listed: true,
      featured: true,
      tagline: 'Everything to launch in a weekend.',
      badge: 'New',
      highlights: ['40 templates', 'Notion and Figma'],
      benefits: [{ title: 'Plan', body: 'A launch plan you can follow.' }],
      faq: [{ q: 'Does it work in Notion?', a: 'Yes, duplicate it in one click.' }],
      demoUrl: 'https://example.com/demo',
      videoUrl: 'https://youtu.be/dQw4w9WgXcQ',
    });
    // Gallery keeps the admin's order.
    expect(res.body.gallery.map((m: { alt: string }) => m.alt)).toEqual(['Settings', 'Dashboard']);
  });

  it('keeps unlisted products out of the store list but reachable by link', async () => {
    const id = await published({ slug: 'private-offer', name: 'Private offer' });
    await patch(id, { visibility: 'UNLISTED' }).expect(200);

    const list = await h.http.get('/v1/products').expect(200);
    expect(list.body.map((p: { slug: string }) => p.slug)).not.toContain('private-offer');
    const direct = await h.http.get('/v1/products/private-offer').expect(200);
    expect(direct.body.listed).toBe(false);

    // Unlisted products can still be bought.
    await h.http
      .post('/v1/checkout/quote')
      .send({ items: [{ slug: 'private-offer' }] })
      .expect(200);
  });

  it('lists featured products first', async () => {
    const list = await h.http.get('/v1/products').expect(200);
    expect(list.body[0].slug).toBe('launch-kit');
  });

  it('replaces the gallery and refuses private files or bad links', async () => {
    const created = await product({ slug: 'gallery-test', name: 'Gallery test', price: 0 });
    const id = created.body.id as string;
    const one = await patch(id, { galleryIds: [shots[0]] }).expect(200);
    expect(one.body.gallery).toHaveLength(1);
    await patch(id, { galleryIds: [fileId] }).expect(422);
    await patch(id, { galleryIds: [shots[0], shots[0]] }).expect(422);
    await patch(id, { demoUrl: 'javascript:alert(1)' }).expect(400);
    await patch(id, { videoUrl: 'https://vimeo.com/123' }).expect(400);
    const cleared = await patch(id, { galleryIds: [] }).expect(200);
    expect(cleared.body.gallery).toEqual([]);
  });

  it('won’t delete an image a gallery uses', async () => {
    await h.http.delete(`/v1/admin/media/${shots[0]}`).set('Cookie', admin).expect(422);
  });
});
