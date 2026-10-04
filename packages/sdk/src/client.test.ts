import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient, createHttpClient, errorMessage, fieldErrors } from './index.js';

const healthy = {
  status: 'ok',
  service: 'api',
  version: '0.0.0',
  uptimeSeconds: 1,
  timestamp: new Date().toISOString(),
};

const product = {
  slug: 'content-os',
  name: 'Content OS',
  summary: null,
  description: null,
  type: 'SOFTWARE',
  price: 4900,
  compareAtPrice: null,
  currency: 'USD',
  free: false,
  cover: null,
  version: '1.0.0',
  features: [],
  requirements: [],
  deliveryMethods: ['R2'],
  fileCount: 2,
  requiresGithub: false,
};

type FetchArgs = [string, RequestInit & { next?: { tags?: string[] } }];

describe('createApiClient', () => {
  it('calls /health on the base URL (trailing slash tolerated) and validates the payload', async () => {
    const fetchMock = vi.fn(async (..._args: FetchArgs) => Response.json(healthy));
    const api = createApiClient({
      baseUrl: 'http://api.test/',
      fetch: fetchMock as unknown as typeof fetch,
    });
    await expect(api.health()).resolves.toEqual(healthy);
    expect(fetchMock.mock.calls[0]![0]).toBe('http://api.test/health');
  });

  it('tags product fetches so the API can revalidate the site', async () => {
    const fetchMock = vi.fn(async (..._args: FetchArgs) => Response.json(product));
    const api = createApiClient({
      baseUrl: 'http://api.test',
      fetch: fetchMock as unknown as typeof fetch,
    });
    await api.products.get('content-os', { next: { revalidate: 3600 } });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('http://api.test/v1/products/content-os');
    expect(init.next).toEqual({ tags: ['products', 'products:content-os'], revalidate: 3600 });
  });

  it('posts checkout as JSON and returns the discriminated result', async () => {
    const fetchMock = vi.fn(async (..._args: FetchArgs) =>
      Response.json({ kind: 'redirect', url: 'https://checkout.stripe.com/c/1', orderNumber: 7 }),
    );
    const api = createApiClient({
      baseUrl: 'http://api.test',
      fetch: fetchMock as unknown as typeof fetch,
    });
    const result = await api.checkout({
      items: [{ slug: 'content-os' }],
      email: 'a@b.co',
      locale: 'en',
      turnstileToken: 't',
    });
    expect(result).toEqual({
      kind: 'redirect',
      url: 'https://checkout.stripe.com/c/1',
      orderNumber: 7,
    });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json');
  });

  it('throws ApiError with the server message on non-2xx responses', async () => {
    const api = createApiClient({
      baseUrl: 'http://api.test',
      fetch: async () =>
        Response.json({ statusCode: 404, message: 'No product "x"' }, { status: 404 }),
    });
    const error = await api.products.get('x').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, message: 'No product "x"' });
  });

  it('rejects payloads that do not match the shared schema', async () => {
    const api = createApiClient({
      baseUrl: 'http://api.test',
      fetch: async () => Response.json({ status: 'weird' }),
    });
    await expect(api.health()).rejects.toThrow();
  });
});

describe('createHttpClient', () => {
  it('sends cookies, JSON bodies and query strings', async () => {
    const fetchMock = vi.fn(async (..._args: FetchArgs) => Response.json({ ok: true }));
    const http = createHttpClient({
      baseUrl: 'http://api.test/',
      fetch: fetchMock as unknown as typeof fetch,
    });
    await http.get('/v1/admin/orders', { q: 'a b', status: undefined, limit: 20 });
    await http.post('/v1/checkout', { a: 1 });
    expect(fetchMock.mock.calls[0]![0]).toBe('http://api.test/v1/admin/orders?q=a+b&limit=20');
    expect(fetchMock.mock.calls[0]![1].credentials).toBe('include');
    expect(fetchMock.mock.calls[1]![1].body).toBe('{"a":1}');
  });

  it('refreshes once on 401 and retries, sharing one refresh between requests', async () => {
    let authed = false;
    const fetchMock = vi.fn(async () =>
      authed ? Response.json({ ok: true }) : Response.json({ message: 'expired' }, { status: 401 }),
    );
    const refresh = vi.fn(async () => {
      authed = true;
      return true;
    });
    const http = createHttpClient({
      baseUrl: 'http://api.test',
      fetch: fetchMock as unknown as typeof fetch,
      refresh,
    });
    await Promise.all([http.get('/a'), http.get('/b')]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('reports field errors and friendly messages', async () => {
    const onUnauthorized = vi.fn();
    const http = createHttpClient({
      baseUrl: 'http://api.test',
      fetch: async () =>
        Response.json(
          { message: 'Validation failed', issues: [{ path: 'email', message: 'Invalid email' }] },
          { status: 400 },
        ),
      onUnauthorized,
    });
    const error = await http.post('/x', {}).catch((e: unknown) => e);
    expect(fieldErrors(error)).toEqual({ email: 'Invalid email' });
    expect(errorMessage(error)).toBe('Validation failed');
    expect(errorMessage(new ApiError(500, '/x', {}))).toContain('Something went wrong');
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
