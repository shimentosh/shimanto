import { HealthCheckSchema } from '@shimanto/types';
import { type Harness, createHarness } from './harness.js';

describe('Health & HTTP baseline (e2e)', () => {
  let h: Harness;
  beforeAll(async () => {
    h = await createHarness();
  });
  afterAll(() => h.close());

  it('GET /health returns a payload matching the shared schema', async () => {
    const res = await h.http.get('/health').expect(200);
    expect(HealthCheckSchema.parse(res.body).status).toBe('ok');
  });

  it('GET /health/ready checks the database', async () => {
    const res = await h.http.get('/health/ready').expect(200);
    expect(res.body.checks).toEqual({ database: 'up', jobs: 'inline' });
  });

  it('sets security headers and a request id', async () => {
    const res = await h.http.get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-request-id']).toMatch(/[0-9a-f-]{36}/);
  });

  it('allows CORS only for allow-listed origins', async () => {
    const allowed = await h.http.get('/health').set('Origin', 'http://localhost:3000');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    const blocked = await h.http.get('/health').set('Origin', 'https://evil.example');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('returns one consistent error shape', async () => {
    const res = await h.http.get('/v1/products/NOT_A_SLUG').expect(400);
    expect(res.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Validation failed',
    });
    expect(res.body.issues).toBeInstanceOf(Array);
    expect(res.body.requestId).toBeTruthy();
  });

  it('serves the OpenAPI document outside production', async () => {
    const res = await h.http.get('/docs-json').expect(200);
    expect(res.body.paths['/v1/checkout']).toBeDefined();
  });
});
