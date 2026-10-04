import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { ChangePasswordInput, CustomerMe, ProfileInput, RegisterInput } from '@shimanto/types';
import { customerFirstTouch } from '../analytics/attribution.js';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { AuditService } from '../audit/audit.service.js';
import { dummyPasswordHash, hashPassword, verifyPassword } from '../auth/crypto.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { Prisma, type Customer, type Locale } from '../generated/prisma/client.js';
import { EmailService } from '../mail/email.service.js';
import { unprocessable } from '../common/validate.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CustomerTokensService, TOKEN_TTL_MINUTES } from './customer-tokens.service.js';

export interface SignInContext {
  userAgent?: string;
  /** The browser's anonymous analytics id: its earlier visits now belong to this customer. */
  anonymousId?: string | null;
  /** This browser has signed in to this account before (no new-sign-in alert). */
  knownDevice?: (customerId: string) => boolean;
}

/** A short, human description of a user agent for security emails ("Chrome on Windows"). */
export function describeDevice(userAgent?: string): string {
  if (!userAgent) return 'an unknown device';
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\//.test(userAgent)
      ? 'Opera'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Chrome\//.test(userAgent)
          ? 'Chrome'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : 'A browser';
  const os = /Windows/.test(userAgent)
    ? 'Windows'
    : /iPhone|iPad/.test(userAgent)
      ? 'iOS'
      : /Android/.test(userAgent)
        ? 'Android'
        : /Mac OS X|Macintosh/.test(userAgent)
          ? 'macOS'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : null;
  return os ? `${browser} on ${os}` : browser;
}

/**
 * Customer accounts: register, sign in, verify email, reset / change password, profile.
 * Responses never reveal whether an email has an account, except registration, which must
 * prevent duplicates.
 */
@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: CustomerTokensService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private portal(path: string) {
    return `${this.env.PORTAL_URL}${path}`;
  }

  async register(
    input: RegisterInput,
    ctx: { userAgent?: string; ip?: string } = {},
  ): Promise<Customer> {
    const email = input.email.toLowerCase();
    const existing = await this.prisma.customer.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({
        message:
          'An account with this email already exists. Sign in, or reset your password to set one.',
        issues: [{ path: 'email', message: 'This email already has an account' }],
      });
    }
    let customer: Customer;
    try {
      customer = await this.prisma.customer.create({
        data: {
          email,
          name: input.name,
          locale: (input.locale ?? 'en') as Locale,
          passwordHash: await hashPassword(input.password),
          lastLoginAt: new Date(),
          ...customerFirstTouch(input.attribution),
        },
      });
    } catch (error) {
      // Two registrations racing for the same email.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('An account with this email already exists');
      }
      throw error;
    }
    await this.sendVerifyWelcome(customer);
    const a = input.attribution;
    const marketing = a?.consent?.marketing ?? false;
    await this.analytics.trackSignup(customer.id, {
      method: 'email',
      touch: a?.first ?? a?.last,
      tracking: a
        ? {
            anonymousId: a.anonymousId,
            sessionId: a.sessionId,
            gaClientId: a.gaClientId,
            fbp: marketing ? a.fbp : null,
            fbc: marketing ? a.fbc : null,
            userAgent: marketing ? ctx.userAgent?.slice(0, 400) : null,
            ip: marketing ? ctx.ip : null,
            pageUrl: `${this.env.PORTAL_URL}/register`,
            consent: a.consent ?? null,
          }
        : null,
    });
    return customer;
  }

  /** Welcome email for an account with a password: asks to verify the email address. */
  async sendVerifyWelcome(customer: Customer): Promise<void> {
    const verify = await this.tokens.issue(customer.id, 'VERIFY_EMAIL');
    await this.email.send('welcome', {
      to: customer.email,
      customerId: customer.id,
      idempotencyKey: `customer:${customer.id}:welcome`,
      data: {
        name: customer.name,
        verifyUrl: this.portal(`/verify-email?token=${verify.token}`),
        portalUrl: this.portal('/'),
      },
    });
  }

  /**
   * Account created on the customer's behalf (checkout without a password, admin order). They get
   * a welcome email with a 7-day link that signs them in, from where they can set a password.
   */
  async createPasswordless(input: { email: string; name?: string | null; locale?: Locale }) {
    const email = input.email.toLowerCase();
    const customer = await this.prisma.customer.upsert({
      where: { email },
      create: { email, name: input.name || null, locale: input.locale ?? 'en' },
      update: {},
    });
    return customer;
  }

  /** Welcome email for a passwordless account: one per customer. */
  async sendAccessWelcome(customer: Customer): Promise<void> {
    const idempotencyKey = `customer:${customer.id}:welcome`;
    // Checked first so a repeat doesn't issue a new link (which would void the emailed one).
    if (await this.prisma.emailEvent.findUnique({ where: { idempotencyKey } })) return;
    const link = await this.tokens.issue(customer.id, 'LOGIN_LINK');
    await this.email.send('welcome', {
      to: customer.email,
      customerId: customer.id,
      idempotencyKey,
      data: {
        name: customer.name,
        setPasswordUrl: this.portal(`/auth/link?token=${link.token}&next=/account/security`),
        portalUrl: this.portal('/'),
      },
    });
  }

  async login(emailInput: string, password: string, ctx: SignInContext): Promise<Customer> {
    const email = emailInput.toLowerCase();
    const customer = await this.prisma.customer.findUnique({ where: { email } });
    const ok = await verifyPassword(
      customer?.passwordHash ?? (await dummyPasswordHash()),
      password,
    );
    let account = customer && customer.passwordHash && ok ? customer : null;
    // Team members sign in with their admin credentials and see the portal as a customer would.
    account ??= await this.adminAsCustomer(email, password);
    if (!account) throw new UnauthorizedException('Invalid email or password');
    if (account.status !== 'ACTIVE') {
      throw new ForbiddenException('This account is disabled. Please contact support.');
    }
    await this.analytics.trackLogin(account.id, ctx.anonymousId);
    return this.signedIn(account, ctx);
  }

  /**
   * An active admin with the right password gets the customer account for the same email
   * (created, and verified, on first use). Their admin role grants nothing extra in the portal.
   */
  private async adminAsCustomer(email: string, password: string): Promise<Customer | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.disabledAt || !(await verifyPassword(user.passwordHash, password))) {
      return null;
    }
    return this.customerForAdmin(user.id);
  }

  /**
   * The customer account of a signed-in admin (same email), created and verified on first use.
   * Lets the team open the portal straight from an admin session.
   */
  async customerForAdmin(userId: string): Promise<Customer> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const customer = await this.prisma.customer.upsert({
      where: { email: user.email },
      create: { email: user.email, name: user.name, emailVerifiedAt: new Date() },
      update: {},
    });
    if (customer.status !== 'ACTIVE') {
      throw new ForbiddenException('This account is disabled. Please contact support.');
    }
    await this.audit.record(
      { type: 'user', id: user.id },
      'customer.adminSignIn',
      'Customer',
      customer.id,
    );
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: new Date() },
    });
    return customer;
  }

  /** Email sign-in link: always "sent", so the response can't be used to probe emails. */
  async requestLoginLink(emailInput: string): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { email: emailInput.toLowerCase() },
    });
    if (!customer || customer.status !== 'ACTIVE') return;
    const link = await this.tokens.issue(customer.id, 'LOGIN_LINK');
    await this.email.send('signInLink', {
      to: customer.email,
      customerId: customer.id,
      idempotencyKey: `customer:${customer.id}:login-link:${link.id}`,
      data: { name: customer.name, url: this.portal(`/auth/link?token=${link.token}`), days: 7 },
    });
  }

  /** Signs in with an emailed link. Using it also proves the inbox, so the email is verified. */
  async consumeLoginLink(token: string, ctx: SignInContext): Promise<Customer> {
    const customer = await this.tokens.consume(token, 'LOGIN_LINK');
    if (!customer) unprocessable('This link has expired or was already used. Request a new one.');
    if (customer.status !== 'ACTIVE') {
      throw new ForbiddenException('This account is disabled. Please contact support.');
    }
    const updated = customer.emailVerifiedAt
      ? customer
      : await this.prisma.customer.update({
          where: { id: customer.id },
          data: { emailVerifiedAt: new Date() },
        });
    return this.signedIn(updated, ctx);
  }

  private async signedIn(customer: Customer, ctx: SignInContext): Promise<Customer> {
    const now = new Date();
    await this.prisma.customer.update({ where: { id: customer.id }, data: { lastLoginAt: now } });
    if (ctx.knownDevice && !ctx.knownDevice(customer.id) && customer.lastLoginAt) {
      await this.email.send('newLogin', {
        to: customer.email,
        customerId: customer.id,
        idempotencyKey: `customer:${customer.id}:login:${now.getTime()}`,
        data: {
          name: customer.name,
          when: `${now.toUTCString()}`,
          device: describeDevice(ctx.userAgent),
          resetUrl: this.portal('/forgot-password'),
        },
      });
    }
    return customer;
  }

  async verifyEmail(token: string): Promise<void> {
    const customer = await this.tokens.consume(token, 'VERIFY_EMAIL');
    if (!customer) unprocessable('This verification link has expired or was already used.');
    if (!customer.emailVerifiedAt) {
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: { emailVerifiedAt: new Date() },
      });
      await this.analytics.trackEmailVerified(customer.id);
    }
  }

  async resendVerification(customerId: string): Promise<void> {
    const customer = await this.prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
    if (customer.emailVerifiedAt) unprocessable('Your email is already verified.');
    const verify = await this.tokens.issue(customer.id, 'VERIFY_EMAIL');
    await this.email.send('verifyEmail', {
      to: customer.email,
      customerId: customer.id,
      idempotencyKey: `customer:${customer.id}:verify:${verify.id}`,
      data: {
        name: customer.name,
        url: this.portal(`/verify-email?token=${verify.token}`),
        resend: true,
      },
    });
  }

  /** Always succeeds from the caller's point of view (no account probing). */
  async forgotPassword(emailInput: string): Promise<void> {
    const customer = await this.prisma.customer.findUnique({
      where: { email: emailInput.toLowerCase() },
    });
    if (!customer || customer.status !== 'ACTIVE') return;
    const reset = await this.tokens.issue(customer.id, 'RESET_PASSWORD');
    await this.email.send('passwordReset', {
      to: customer.email,
      customerId: customer.id,
      idempotencyKey: `customer:${customer.id}:reset:${reset.id}`,
      data: {
        name: customer.name,
        url: this.portal(`/reset-password?token=${reset.token}`),
        minutes: TOKEN_TTL_MINUTES.RESET_PASSWORD,
      },
    });
  }

  /** New password from an emailed link. Ends all other sessions. */
  async resetPassword(token: string, password: string): Promise<Customer> {
    const customer = await this.tokens.consume(token, 'RESET_PASSWORD');
    if (!customer)
      unprocessable('This reset link has expired or was already used. Request a new one.');
    if (customer.status !== 'ACTIVE') {
      throw new ForbiddenException('This account is disabled. Please contact support.');
    }
    const updated = await this.prisma.customer.update({
      where: { id: customer.id },
      data: {
        passwordHash: await hashPassword(password),
        sessionVersion: { increment: 1 },
        emailVerifiedAt: customer.emailVerifiedAt ?? new Date(),
        lastLoginAt: new Date(),
      },
    });
    await this.passwordChangedEmail(updated);
    return updated;
  }

  /** Signed-in password change. Other sessions end; the caller starts a fresh one. */
  async changePassword(customerId: string, input: ChangePasswordInput): Promise<Customer> {
    const customer = await this.prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
    if (customer.passwordHash) {
      const ok = input.currentPassword
        ? await verifyPassword(customer.passwordHash, input.currentPassword)
        : false;
      if (!ok) unprocessable('Your current password is incorrect', 'currentPassword');
    }
    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: { passwordHash: await hashPassword(input.password), sessionVersion: { increment: 1 } },
    });
    await this.passwordChangedEmail(updated);
    return updated;
  }

  private passwordChangedEmail(customer: Customer) {
    return this.email.send('passwordChanged', {
      to: customer.email,
      customerId: customer.id,
      idempotencyKey: `customer:${customer.id}:password-changed:${customer.sessionVersion}`,
      data: { name: customer.name, supportUrl: this.portal('/support') },
    });
  }

  async me(customerId: string): Promise<CustomerMe> {
    const c = await this.prisma.customer.findUniqueOrThrow({ where: { id: customerId } });
    return this.toMe(c);
  }

  async updateProfile(customerId: string, input: ProfileInput): Promise<CustomerMe> {
    const c = await this.prisma.customer.update({
      where: { id: customerId },
      data: { name: input.name, ...(input.locale ? { locale: input.locale } : {}) },
    });
    return this.toMe(c);
  }

  toMe(c: Customer): CustomerMe {
    return {
      id: c.id,
      email: c.email,
      name: c.name,
      locale: c.locale,
      status: c.status,
      emailVerified: Boolean(c.emailVerifiedAt),
      hasPassword: Boolean(c.passwordHash),
      createdAt: c.createdAt.toISOString(),
      github: {
        connected: Boolean(c.githubId),
        login: c.githubLogin,
        connectedAt: c.githubConnectedAt?.toISOString() ?? null,
        available: Boolean(this.env.GITHUB_CLIENT_ID && this.env.GITHUB_CLIENT_SECRET),
      },
    };
  }
}
