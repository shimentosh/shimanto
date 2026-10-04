import { TURNSTILE_TEST_SECRET, loadEnv } from './env.js';

const required = {
  DATABASE_URL: 'postgresql://x@localhost/x',
  JWT_ACCESS_SECRET: 'dev-secret-at-least-16',
  REVALIDATE_SECRET: 'dev-secret',
};

describe('loadEnv', () => {
  it('applies defaults', () => {
    const env = loadEnv(required);
    expect(env.PORT).toBe(4000);
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3100']);
    expect(env.JOBS_DRIVER).toBe('bullmq');
    expect(env.TURNSTILE_SECRET_KEY).toBe(TURNSTILE_TEST_SECRET);
  });

  it('prefers API_PORT over PORT so web and api never share a port', () => {
    expect(loadEnv({ ...required, PORT: '3100' }).PORT).toBe(3100);
    expect(loadEnv({ ...required, PORT: '3100', API_PORT: '4100' }).PORT).toBe(4100);
  });

  it('splits and trims CORS origins', () => {
    const env = loadEnv({
      ...required,
      CORS_ORIGINS: 'https://shimanto.xyz, https://admin.shimanto.xyz,',
    });
    expect(env.CORS_ORIGINS).toEqual(['https://shimanto.xyz', 'https://admin.shimanto.xyz']);
  });

  it('treats empty values (`KEY=`) as unset', () => {
    const env = loadEnv({
      ...required,
      WEB_REVALIDATE_URL: '',
      NOTIFY_EMAIL: '',
      COOKIE_DOMAIN: '',
    });
    expect(env.WEB_REVALIDATE_URL).toBeUndefined();
    expect(env.NOTIFY_EMAIL).toBeUndefined();
    expect(env.COOKIE_DOMAIN).toBeUndefined();
  });

  it('fails fast on missing or invalid values', () => {
    expect(() => loadEnv({ ...required, PORT: 'abc' })).toThrow(/Invalid API environment/);
    expect(() => loadEnv({})).toThrow(/DATABASE_URL/);
  });

  it('refuses placeholder secrets and the Turnstile test key in production', () => {
    expect(() => loadEnv({ ...required, NODE_ENV: 'production' })).toThrow(
      /JWT_ACCESS_SECRET[\s\S]*REVALIDATE_SECRET[\s\S]*TURNSTILE_SECRET_KEY/,
    );
    const strong = 'x'.repeat(40);
    expect(() =>
      loadEnv({
        ...required,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: strong,
        REVALIDATE_SECRET: strong,
        TURNSTILE_SECRET_KEY: 'real-key',
      }),
    ).not.toThrow();
  });
});
