import 'reflect-metadata';
import { readFile } from 'node:fs/promises';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { inject } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { hashPassword } from '../src/auth/crypto.js';
import { configureApp } from '../src/bootstrap.js';
import {
  type CheckoutSessionArgs,
  type PaymentEvent,
  PaymentsGateway,
} from '../src/commerce/payments.gateway.js';
import {
  ANALYTICS_PROVIDERS,
  type AnalyticsProvider,
  buildGa4Payload,
  buildMetaPayload,
  ga4Provider,
  metaCapiProvider,
} from '../src/analytics/providers.js';
import { TurnstileService } from '../src/common/turnstile.service.js';
import {
  GitHubClient,
  GitHubError,
  type GitHubIdentity,
  type InviteResult,
} from '../src/github/github.client.js';
import { type Env, loadEnv } from '../src/config/env.js';
import { InlineJobsService } from '../src/jobs/jobs.drivers.js';
import { JobsService } from '../src/jobs/jobs.types.js';
import { StorageService } from '../src/media/storage.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

/** Turnstile: token "pass" is human, anything else is a bot. No network. */
export class FakeTurnstile {
  async verify(token: string) {
    return token === 'pass';
  }
}

/** In-memory object storage. */
export class FakeStorage {
  readonly objects = new Map<string, { body: Buffer; contentType: string }>();
  async put(key: string, body: Buffer, contentType: string) {
    this.objects.set(key, { body, contentType });
  }
  async putFile(key: string, path: string, contentType: string) {
    this.objects.set(key, { body: await readFile(path), contentType });
  }
  async check() {
    return { ok: true, message: 'fake storage' };
  }
  async remove(keys: string[]) {
    keys.forEach((k) => this.objects.delete(k));
  }
  async signedDownloadUrl(key: string, filename: string) {
    return `https://storage.test/${key}?signed=1&filename=${encodeURIComponent(filename)}`;
  }
}

/** Stripe stand-in: records sessions and refunds. Webhooks are JSON PaymentEvents signed "valid". */
export class FakePayments extends PaymentsGateway {
  enabled = true;
  readonly sessions: CheckoutSessionArgs[] = [];
  readonly refunds: string[] = [];
  async createCheckout(args: CheckoutSessionArgs) {
    this.sessions.push(args);
    return { id: `cs_test_${args.orderId}`, url: `https://checkout.stripe.test/${args.orderId}` };
  }
  parseWebhook(rawBody: Buffer, signature: string): PaymentEvent {
    if (signature !== 'valid') throw new Error('bad signature');
    return JSON.parse(rawBody.toString()) as PaymentEvent;
  }
  async refund(paymentRef: string) {
    this.refunds.push(paymentRef);
  }
  readonly cancelled: string[] = [];
  async cancelCheckout(sessionId: string) {
    this.cancelled.push(sessionId);
  }
  async check() {
    return { ok: true, message: 'fake payments' };
  }
}

/**
 * GitHub stand-in. Repositories are "owner/repo" keys; `collaborators` and `invitations` mirror
 * GitHub's state so tests can accept, expire or fail invitations. OAuth codes map to identities.
 */
export class FakeGitHub extends GitHubClient {
  mode: 'app' | 'token' | null = 'app';
  oauthEnabled = true;
  readonly collaborators = new Set<string>();
  readonly invitations = new Map<string, { repo: string; login: string; expired: boolean }>();
  readonly calls: string[] = [];
  readonly identities = new Map<string, GitHubIdentity>();
  /** Next invite fails with this message (once). */
  failNext: string | null = null;
  private nextId = 1000;

  private key(owner: string, repo: string, login: string) {
    return `${owner}/${repo}:${login}`.toLowerCase();
  }
  /** Simulates the customer accepting every pending invitation of `login`. */
  accept(login: string) {
    for (const [id, inv] of this.invitations) {
      if (inv.login.toLowerCase() === login.toLowerCase()) {
        this.collaborators.add(`${inv.repo}:${inv.login}`.toLowerCase());
        this.invitations.delete(id);
      }
    }
  }
  async invite(owner: string, repo: string, login: string): Promise<InviteResult> {
    this.calls.push(`invite ${owner}/${repo} ${login}`);
    if (this.failNext) {
      const message = this.failNext;
      this.failNext = null;
      throw new GitHubError(message, 422);
    }
    if (this.collaborators.has(this.key(owner, repo, login))) return { kind: 'collaborator' };
    for (const [id, inv] of this.invitations) {
      if (inv.repo === `${owner}/${repo}` && inv.login === login && !inv.expired) {
        return { kind: 'invited', invitationId: id };
      }
    }
    const id = String(this.nextId++);
    this.invitations.set(id, { repo: `${owner}/${repo}`, login, expired: false });
    return { kind: 'invited', invitationId: id };
  }
  async hasAccess(owner: string, repo: string, login: string) {
    return this.collaborators.has(this.key(owner, repo, login));
  }
  async invitation(_owner: string, _repo: string, invitationId: string) {
    const inv = this.invitations.get(invitationId);
    return inv ? { expired: inv.expired } : null;
  }
  async cancelInvitation(owner: string, repo: string, invitationId: string) {
    this.calls.push(`cancel ${owner}/${repo} ${invitationId}`);
    this.invitations.delete(invitationId);
  }
  async removeCollaborator(owner: string, repo: string, login: string) {
    this.calls.push(`remove ${owner}/${repo} ${login}`);
    this.collaborators.delete(this.key(owner, repo, login));
  }
  async checkRepository(owner: string, repo: string) {
    return { ok: true, message: `ok ${owner}/${repo}` };
  }
  authorizeUrl(state: string, redirectUri: string) {
    return `https://github.test/login/oauth/authorize?state=${state}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  }
  async identify(code: string) {
    const identity = this.identities.get(code);
    if (!identity) throw new GitHubError('bad code');
    return identity;
  }
}

/**
 * GA4 and Meta CAPI with their real configuration, consent rules and payload builders; only the
 * HTTP call is replaced. Sends are recorded, and `fail` makes a provider throw.
 */
export class FakeAnalytics {
  readonly sent: Array<{ provider: string; eventId: string; name: string; payload: unknown }> = [];
  readonly fail = new Set<string>();
  readonly providers: AnalyticsProvider[] = [ga4Provider, metaCapiProvider].map((real) => ({
    ...real,
    send: async (event) => {
      if (this.fail.has(real.name)) throw new Error(`${real.name} is down`);
      this.sent.push({
        provider: real.name,
        eventId: event.eventId,
        name: event.name,
        payload: real.name === 'ga4' ? buildGa4Payload(event) : buildMetaPayload(event),
      });
    },
  }));
  sentFor(eventId: string) {
    return this.sent.filter((s) => s.eventId === eventId);
  }
}

export interface Harness {
  app: NestExpressApplication;
  http: ReturnType<typeof request>;
  prisma: PrismaService;
  jobs: InlineJobsService;
  storage: FakeStorage;
  payments: FakePayments;
  github: FakeGitHub;
  analytics: FakeAnalytics;
  env: Env;
  close(): Promise<void>;
}

export function testEnv(overrides: Record<string, string> = {}): Env {
  return loadEnv({
    NODE_ENV: 'test',
    DATABASE_URL: inject('testDatabaseUrl'),
    JOBS_DRIVER: 'inline',
    SMTP_URL: 'json',
    JWT_ACCESS_SECRET: 'test-access-secret-0123456789',
    REVALIDATE_SECRET: 'test-revalidate-secret',
    NOTIFY_EMAIL: 'owner@shimanto.test',
    CORS_ORIGINS: 'http://localhost:3000',
    // Lets suites act as many distinct clients (X-Forwarded-For), like real traffic.
    TRUST_PROXY: 'true',
    ...overrides,
  });
}

type Http = ReturnType<typeof request>;

/**
 * Every request comes from a different client IP, so per-IP rate limits (sign-up, checkout)
 * don't trip in suites that act as many customers. Rate limiting itself is tested in leads.
 */
function asManyClients(http: Http): Http {
  let n = 1;
  const ip = () => {
    const i = n++;
    return `10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`;
  };
  const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;
  return Object.fromEntries(
    methods.map((m) => [m, (url: string) => http[m](url).set('X-Forwarded-For', ip())]),
  ) as unknown as Http;
}

export async function createHarness(
  envOverrides: Record<string, string> = {},
  options: { distinctClients?: boolean } = {},
): Promise<Harness> {
  const env = testEnv(envOverrides);
  const storage = new FakeStorage();
  const payments = new FakePayments();
  const github = new FakeGitHub();
  const analytics = new FakeAnalytics();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule.forRoot(env)] })
    .overrideProvider(TurnstileService)
    .useValue(new FakeTurnstile())
    .overrideProvider(StorageService)
    .useValue(storage)
    .overrideProvider(PaymentsGateway)
    .useValue(payments)
    .overrideProvider(GitHubClient)
    .useValue(github)
    .overrideProvider(ANALYTICS_PROVIDERS)
    .useValue(analytics.providers)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>({
    logger: false,
    rawBody: true,
  });
  configureApp(app, env);
  await app.init();

  return {
    app,
    http: options.distinctClients
      ? asManyClients(request(app.getHttpServer()))
      : request(app.getHttpServer()),
    prisma: app.get(PrismaService),
    jobs: app.get(JobsService) as InlineJobsService,
    storage,
    payments,
    github,
    analytics,
    env,
    close: () => app.close(),
  };
}

/** Wipe every table between test files. */
export async function resetDb(prisma: PrismaService) {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY CASCADE`,
  );
}

export const ADMIN = { email: 'admin@shimanto.test', password: 'correct-horse-battery-staple' };

export async function createAdmin(
  prisma: PrismaService,
  role: 'SUPER_ADMIN' | 'EDITOR' = 'SUPER_ADMIN',
  email = ADMIN.email,
) {
  return prisma.user.create({
    data: { email, role, name: 'Test Admin', passwordHash: await hashPassword(ADMIN.password) },
  });
}

/** Logs in and returns the Set-Cookie headers to send with admin requests. */
export async function loginCookies(
  h: Harness,
  email = ADMIN.email,
  password = ADMIN.password,
): Promise<string[]> {
  const res = await h.http.post('/v1/auth/login').send({ email, password }).expect(200);
  return setCookies(res);
}

/** "name=value" pairs from Set-Cookie headers, for the Cookie request header. */
export function cookieHeader(setCookies: string[], only?: string[]): string {
  return setCookies
    .map((c) => c.split(';')[0]!)
    .filter((pair) => !only || only.includes(pair.split('=')[0]!))
    .join('; ');
}

type SentMail = { to: string; subject: string; text: string; html?: string; eventId?: string };

/** Every email sent to `to`, oldest first (inline jobs driver records every job). */
export function mailsTo(h: Harness, to: string): SentMail[] {
  return h.jobs.history
    .filter((j) => j.name === 'mail.send')
    .map((j) => j.data as SentMail)
    .filter((m) => m.to === to);
}

/** The last email sent to `to`. */
export function lastMailTo(h: Harness, to: string) {
  return mailsTo(h, to).at(-1);
}

/** The token of the first link to `path` (e.g. "/reset-password") in the email's text. */
export function tokenFrom(mail: SentMail | undefined, path: string): string {
  const escaped = path.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  const match = mail?.text.match(new RegExp(`${escaped}\\?token=([\\w-]+)`));
  if (!match) throw new Error(`No ${path} link in email "${mail?.subject}"`);
  return match[1]!;
}

export const TEST_CUSTOMER = { password: 'customer-pass-123' };

/** Registers a customer and returns the session cookie header. */
export async function registerCustomer(h: Harness, email: string, name = 'Test Buyer') {
  const res = await h.http
    .post('/v1/customer/auth/register')
    .send({
      name,
      email,
      password: TEST_CUSTOMER.password,
      confirmPassword: TEST_CUSTOMER.password,
    })
    .expect(201);
  return { cookie: cookieHeader(setCookies(res), ['sx_cs']), me: res.body as { id: string } };
}

/** Set-Cookie headers of a response as an array (supertest types them loosely). */
export function setCookies(res: { headers: Record<string, unknown> }): string[] {
  const raw = res.headers['set-cookie'];
  return Array.isArray(raw) ? (raw as string[]) : typeof raw === 'string' ? [raw] : [];
}
