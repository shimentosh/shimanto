import { Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type CustomerLoginInput,
  CustomerLoginInputSchema,
  CustomerMeSchema,
  EmailInputSchema,
  OkSchema,
  type RegisterInput,
  RegisterInputSchema,
  type ResetPasswordInput,
  ResetPasswordInputSchema,
  TokenInputSchema,
} from '@shimanto/types';
import type { Request, Response } from 'express';
import type { z } from 'zod';
import { CustomerSessionService } from '../auth/customer-session.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { Auth, CurrentCustomerId, CurrentUser, CustomerAuth } from '../auth/guards.js';
import { ApiZodResponse, ZodBody } from '../common/zod.js';
import type { Customer } from '../generated/prisma/client.js';
import { CustomerAuthService, type SignInContext } from './customer-auth.service.js';

const ok = { ok: true as const };

/** Customer accounts for the portal. Sessions are an httpOnly cookie; nothing is stored in JS. */
@ApiTags('customer · auth')
@Controller('customer/auth')
export class CustomerAuthController {
  constructor(
    private readonly auth: CustomerAuthService,
    private readonly sessions: CustomerSessionService,
  ) {}

  private context(req: Request, anonymousId?: string): SignInContext {
    return {
      userAgent: req.get('user-agent'),
      knownDevice: (customerId) => this.sessions.isKnownDevice(req, customerId),
      anonymousId: anonymousId ?? null,
    };
  }

  private async start(req: Request, res: Response, customer: Customer) {
    await this.sessions.start(res, customer);
    this.sessions.rememberDevice(req, res, customer.id);
    return this.auth.toMe(customer);
  }

  @Post('register')
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiZodResponse(CustomerMeSchema, 201)
  async register(
    @ZodBody(RegisterInputSchema) body: RegisterInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.start(
      req,
      res,
      await this.auth.register(body, { userAgent: req.get('user-agent'), ip: req.ip }),
    );
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiZodResponse(CustomerMeSchema)
  async login(
    @ZodBody(CustomerLoginInputSchema) body: CustomerLoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.start(
      req,
      res,
      await this.auth.login(body.email, body.password, this.context(req, body.anonymousId)),
    );
  }

  /**
   * Signed in to the admin? Opens the portal as the customer account with the same email.
   * Needs a valid admin session (cookie); the admin role grants nothing in the portal.
   */
  @Post('from-admin')
  @HttpCode(200)
  @Auth()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiZodResponse(CustomerMeSchema)
  async fromAdmin(
    @CurrentUser() user: AuthUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.start(req, res, await this.auth.customerForAdmin(user.id));
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response) {
    this.sessions.clear(res);
  }

  /** Emails a one-time sign-in link. Always 202, whether or not the email has an account. */
  @Post('login-link')
  @HttpCode(202)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiZodResponse(OkSchema, 202)
  async loginLink(@ZodBody(EmailInputSchema) body: z.output<typeof EmailInputSchema>) {
    await this.auth.requestLoginLink(body.email);
    return ok;
  }

  /** Exchanges an emailed sign-in link for a session. */
  @Post('link')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiZodResponse(CustomerMeSchema)
  async link(
    @ZodBody(TokenInputSchema) body: z.output<typeof TokenInputSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.start(req, res, await this.auth.consumeLoginLink(body.token, this.context(req)));
  }

  @Post('forgot-password')
  @HttpCode(202)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiZodResponse(OkSchema, 202)
  async forgot(@ZodBody(EmailInputSchema) body: z.output<typeof EmailInputSchema>) {
    await this.auth.forgotPassword(body.email);
    return ok;
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiZodResponse(CustomerMeSchema)
  async reset(
    @ZodBody(ResetPasswordInputSchema) body: ResetPasswordInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.start(req, res, await this.auth.resetPassword(body.token, body.password));
  }

  @Post('verify-email')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiZodResponse(OkSchema)
  async verify(@ZodBody(TokenInputSchema) body: z.output<typeof TokenInputSchema>) {
    await this.auth.verifyEmail(body.token);
    return ok;
  }

  @Post('resend-verification')
  @HttpCode(202)
  @CustomerAuth()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiZodResponse(OkSchema, 202)
  async resend(@CurrentCustomerId() customerId: string) {
    await this.auth.resendVerification(customerId);
    return ok;
  }
}
