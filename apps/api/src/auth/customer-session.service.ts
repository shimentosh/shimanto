import { createHmac } from 'node:crypto';
import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions, Request, Response } from 'express';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CUSTOMER_COOKIE, type CustomerTokenPayload, DEVICE_COOKIE } from './auth.types.js';
import { safeEqual } from './crypto.js';

const cookies = (req: Request) => (req.cookies as Record<string, string> | undefined) ?? {};

/**
 * Customer sessions: a signed JWT in an httpOnly cookie, checked against the database on every
 * request so disabling an account or changing the password takes effect immediately.
 */
@Injectable()
export class CustomerSessionService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  cookieOptions(maxAgeMs?: number, path = '/'): CookieOptions {
    return {
      httpOnly: true,
      secure: this.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: this.env.COOKIE_DOMAIN,
      path,
      ...(maxAgeMs !== undefined ? { maxAge: maxAgeMs } : {}),
    };
  }

  async start(res: Response, customer: { id: string; sessionVersion: number }): Promise<void> {
    const payload: CustomerTokenPayload = {
      sub: customer.id,
      typ: 'customer',
      sv: customer.sessionVersion,
    };
    const days = this.env.CUSTOMER_SESSION_DAYS;
    const token = await this.jwt.signAsync(payload, {
      secret: this.env.JWT_ACCESS_SECRET,
      expiresIn: days * 86_400,
    });
    res.cookie(CUSTOMER_COOKIE, token, this.cookieOptions(days * 86_400_000));
  }

  clear(res: Response): void {
    res.clearCookie(CUSTOMER_COOKIE, this.cookieOptions());
  }

  /** The signed-in customer's id. Throws 401 for a missing, expired or superseded session. */
  async verify(req: Request): Promise<string> {
    const token = cookies(req)[CUSTOMER_COOKIE];
    if (!token) throw new UnauthorizedException('Please sign in');
    let payload: CustomerTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<CustomerTokenPayload>(token, {
        secret: this.env.JWT_ACCESS_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Your session has expired. Please sign in again.');
    }
    if (payload.typ !== 'customer') throw new UnauthorizedException('Please sign in');
    const customer = await this.prisma.customer.findUnique({
      where: { id: payload.sub },
      select: { status: true, sessionVersion: true },
    });
    if (!customer || customer.status !== 'ACTIVE' || customer.sessionVersion !== payload.sv) {
      throw new UnauthorizedException('Your session has ended. Please sign in again.');
    }
    return payload.sub;
  }

  /** Like verify, but "not signed in" is null instead of an error (checkout works for guests). */
  async optional(req: Request): Promise<string | null> {
    if (!cookies(req)[CUSTOMER_COOKIE]) return null;
    try {
      return await this.verify(req);
    } catch {
      return null;
    }
  }

  // ───────────── Known devices (for new sign-in alerts) ─────────────

  private deviceSignature(customerId: string): string {
    return createHmac('sha256', this.env.JWT_ACCESS_SECRET)
      .update(`device:${customerId}`)
      .digest('base64url');
  }

  isKnownDevice(req: Request, customerId: string): boolean {
    const known = (cookies(req)[DEVICE_COOKIE] ?? '').split('.');
    const expected = this.deviceSignature(customerId);
    return known.some((sig) => sig && safeEqual(sig, expected));
  }

  rememberDevice(req: Request, res: Response, customerId: string): void {
    const known = (cookies(req)[DEVICE_COOKIE] ?? '').split('.').filter(Boolean);
    const next = [this.deviceSignature(customerId), ...known].slice(0, 5);
    res.cookie(DEVICE_COOKIE, [...new Set(next)].join('.'), this.cookieOptions(365 * 86_400_000));
  }
}
