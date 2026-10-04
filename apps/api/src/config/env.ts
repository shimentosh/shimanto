import { z } from 'zod';

/** Cloudflare's documented always-pass test secret, so local dev works without a Turnstile account. */
export const TURNSTILE_TEST_SECRET = '1x0000000000000000000000000000000AA';

const bool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');

/**
 * Environment contract for the API. Validated once at boot so a misconfigured deploy fails fast.
 * Production refuses placeholder secrets and the Turnstile test key.
 */
export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    /** `API_PORT` wins so `PORT=… pnpm dev` (read by Next) never collides; `PORT` covers PaaS hosts. */
    API_PORT: z.coerce.number().int().positive().optional(),
    PORT: z.coerce.number().int().positive().default(4000),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:3100')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    /** Behind a reverse proxy / load balancer: trust X-Forwarded-For for client IPs (rate limits). */
    TRUST_PROXY: bool.default(false),

    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    /** `bullmq` = Redis-backed queue with retries. `inline` = run jobs in-process (tests, OpenAPI export). */
    JOBS_DRIVER: z.enum(['bullmq', 'inline']).default('bullmq'),

    JWT_ACCESS_SECRET: z.string().min(16),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
    /** e.g. `.shimanto.xyz` so admin/portal subdomains share the session. Unset = host-only. */
    COOKIE_DOMAIN: z.string().optional(),

    /**
     * Resend API key (re_…). When set, all email goes through Resend's HTTP API. Unset = SMTP_URL
     * (Mailpit in local dev) or `json` (tests, logs only).
     */
    RESEND_API_KEY: z.string().startsWith('re_').optional(),
    /** `smtp://…` / `smtps://…`, or `json` to log messages instead of sending (tests). */
    SMTP_URL: z.string().default('smtp://localhost:1025'),
    /** Sender. With Resend this must be on a verified domain. */
    MAIL_FROM: z.string().default('Shimanto <no-reply@shimanto.xyz>'),
    /** Where customer replies to transactional email go (e.g. support@…). */
    MAIL_REPLY_TO: z.email().optional(),
    /** Where new-lead notifications go. Unset = notifications skipped (with a warning). */
    NOTIFY_EMAIL: z.email().optional(),

    TURNSTILE_SECRET_KEY: z.string().default(TURNSTILE_TEST_SECRET),
    LEADS_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(5),

    /** S3-compatible storage. For Cloudflare R2: https://<account-id>.r2.cloudflarestorage.com, region `auto`. */
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().default('us-east-1'),
    S3_BUCKET: z.string().default('shimanto-media'),
    S3_ACCESS_KEY: z.string().default(''),
    S3_SECRET_KEY: z.string().default(''),
    S3_FORCE_PATH_STYLE: bool.default(true),
    /** Public base URL objects are served from (CDN / bucket URL), without trailing slash. */
    MEDIA_PUBLIC_URL: z.string().default('http://localhost:9000/shimanto-media'),
    /** Largest private file an admin can upload (software builds, ZIPs). */
    FILE_UPLOAD_MAX_MB: z.coerce.number().int().positive().max(2048).default(250),

    /** Stripe secret key (sk_test_… / sk_live_…). Unset = paid checkout disabled; free products still work. */
    STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
    /** Signing secret of the Stripe webhook endpoint (whsec_…). */
    STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),

    /**
     * Analytics & tracking. Public IDs can also be set (and override these) in Admin → Settings →
     * Analytics & Tracking. Secrets (Measurement Protocol secret, Meta token) only live here.
     */
    GA4_MEASUREMENT_ID: z
      .string()
      .regex(/^G-[A-Z0-9]{4,20}$/)
      .optional(),
    /** GA4 → Admin → Data streams → Measurement Protocol API secrets. Enables server-side events. */
    GA4_API_SECRET: z.string().min(8).optional(),
    GTM_CONTAINER_ID: z
      .string()
      .regex(/^GTM-[A-Z0-9]{4,12}$/)
      .optional(),
    META_PIXEL_ID: z
      .string()
      .regex(/^\d{8,20}$/)
      .optional(),
    /** Conversions API access token (Events Manager → Settings). Server-side only. */
    META_ACCESS_TOKEN: z.string().min(20).optional(),
    META_API_VERSION: z
      .string()
      .regex(/^v\d+\.\d+$/)
      .default('v21.0'),
    /** Events Manager "Test events" code: sends CAPI events to the test tab instead of live. */
    META_TEST_EVENT_CODE: z.string().max(40).optional(),
    GOOGLE_ADS_CONVERSION_ID: z
      .string()
      .regex(/^AW-\d{6,15}$/)
      .optional(),
    GOOGLE_ADS_CONVERSION_LABEL: z.string().max(60).optional(),

    SITE_URL: z.url().default('http://localhost:3100'),
    /** Customer portal origin (my.shimanto.xyz): sign-in links, order and download pages. */
    PORTAL_URL: z.url().default('http://localhost:3102'),
    /** Customer session length. Password changes end all older sessions immediately. */
    CUSTOMER_SESSION_DAYS: z.coerce.number().int().positive().max(365).default(30),
    /** Admin panel origin, used for links in notification emails. */
    ADMIN_URL: z.url().default('http://localhost:3101'),
    API_PUBLIC_URL: z.url().default('http://localhost:4000'),
    REVALIDATE_SECRET: z.string().min(8),
    /** Next.js on-demand revalidation endpoint. Unset = revalidation skipped. */
    WEB_REVALIDATE_URL: z.url().optional(),

    /**
     * GitHub repository delivery. Preferred: a GitHub App installed on the repositories you sell,
     * with "Administration: read & write" (to invite collaborators). The App's OAuth credentials
     * identify customers' GitHub accounts. GITHUB_TOKEN (fine-grained PAT) is a fallback for repo
     * access when no App is configured. All of it stays server-side.
     */
    GITHUB_APP_ID: z.string().regex(/^\d+$/).optional(),
    /** PEM private key of the App. Literal "\n" escapes are accepted for single-line env files. */
    GITHUB_APP_PRIVATE_KEY: z.string().optional(),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    /** Secret of the App's webhook (member / repository invitation events). */
    GITHUB_WEBHOOK_SECRET: z.string().min(16).optional(),
    GITHUB_TOKEN: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    const weak = (value: string) => value === 'change-me' || value.length < 32;
    if (weak(env.JWT_ACCESS_SECRET)) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_ACCESS_SECRET'],
        message: 'use ≥32 random chars in production',
      });
    }
    if (weak(env.REVALIDATE_SECRET)) {
      ctx.addIssue({
        code: 'custom',
        path: ['REVALIDATE_SECRET'],
        message: 'use ≥32 random chars in production',
      });
    }
    if (env.STRIPE_SECRET_KEY && !env.STRIPE_WEBHOOK_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['STRIPE_WEBHOOK_SECRET'],
        message: 'required when Stripe is enabled',
      });
    }
    if (env.GITHUB_APP_ID && !env.GITHUB_APP_PRIVATE_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['GITHUB_APP_PRIVATE_KEY'],
        message: 'required when GITHUB_APP_ID is set',
      });
    }
    if (env.GITHUB_CLIENT_ID && !env.GITHUB_CLIENT_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['GITHUB_CLIENT_SECRET'],
        message: 'required when GITHUB_CLIENT_ID is set',
      });
    }
    if (env.TURNSTILE_SECRET_KEY === TURNSTILE_TEST_SECRET) {
      ctx.addIssue({
        code: 'custom',
        path: ['TURNSTILE_SECRET_KEY'],
        message: 'test key not allowed in production',
      });
    }
  });

export type Env = Omit<z.infer<typeof EnvSchema>, 'API_PORT'>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // `KEY=` in a .env file means "not set", not "set to empty string".
  const present = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== ''));
  const parsed = EnvSchema.safeParse(present);
  if (!parsed.success) {
    throw new Error(`Invalid API environment:\n${z.prettifyError(parsed.error)}`);
  }
  const { API_PORT, ...env } = parsed.data;
  return { ...env, PORT: API_PORT ?? env.PORT };
}
