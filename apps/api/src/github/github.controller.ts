import { createHmac } from 'node:crypto';
import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  Logger,
  Post,
  Query,
  Redirect,
  Req,
  Res,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { CustomerMeSchema } from '@shimanto/types';
import type { Request, Response } from 'express';
import { GITHUB_STATE_COOKIE } from '../auth/auth.types.js';
import { randomToken, safeEqual } from '../auth/crypto.js';
import { CustomerSessionService } from '../auth/customer-session.service.js';
import { CurrentCustomerId, CustomerAuth } from '../auth/guards.js';
import { FulfillmentService } from '../commerce/fulfillment.service.js';
import { ApiZodResponse } from '../common/zod.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { CustomerAuthService } from '../customers/customer-auth.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { GitHubClient } from './github.client.js';

const STATE_TTL_MS = 10 * 60_000;

/** Verifies GitHub's `X-Hub-Signature-256` over the raw body. */
export function verifyGithubSignature(secret: string, body: Buffer, header?: string): boolean {
  if (!header?.startsWith('sha256=')) return false;
  const expected = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
  return safeEqual(header, expected);
}

/**
 * Connecting a customer's GitHub account (OAuth, identity only: the user token is used once to
 * read id + login and then dropped) and GitHub's webhook for invitation acceptance.
 */
@ApiTags('customer · github')
@Controller()
export class GitHubController {
  private readonly logger = new Logger('GitHub');

  constructor(
    private readonly github: GitHubClient,
    private readonly sessions: CustomerSessionService,
    private readonly customers: CustomerAuthService,
    private readonly fulfillment: FulfillmentService,
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private get callbackUrl() {
    return `${this.env.API_PUBLIC_URL}/v1/github/callback`;
  }

  private portal(status: string) {
    return `${this.env.PORTAL_URL}/account/github?github=${status}`;
  }

  /** Portal "Connect GitHub" button: a top-level navigation here, then on to GitHub. */
  @Get('account/github/connect')
  @CustomerAuth()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Redirect()
  connect(@Res({ passthrough: true }) res: Response) {
    if (!this.github.oauthEnabled) return { url: this.portal('unavailable'), statusCode: 302 };
    const state = randomToken(24);
    res.cookie(GITHUB_STATE_COOKIE, state, this.sessions.cookieOptions(STATE_TTL_MS, '/v1/github'));
    return { url: this.github.authorizeUrl(state, this.callbackUrl), statusCode: 302 };
  }

  @Get('github/callback')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiExcludeEndpoint()
  @Redirect()
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const expected = (req.cookies as Record<string, string> | undefined)?.[GITHUB_STATE_COOKIE];
    res.clearCookie(GITHUB_STATE_COOKIE, this.sessions.cookieOptions(undefined, '/v1/github'));
    const customerId = await this.sessions.optional(req);
    if (!customerId) {
      return { url: `${this.env.PORTAL_URL}/login?next=/account/github`, statusCode: 302 };
    }
    if (error) return { url: this.portal('cancelled'), statusCode: 302 };
    if (!code || !state || !expected || !safeEqual(state, expected)) {
      return { url: this.portal('invalid'), statusCode: 302 };
    }

    let identity;
    try {
      identity = await this.github.identify(code, this.callbackUrl);
    } catch (err) {
      this.logger.warn(`GitHub OAuth failed: ${(err as Error).message}`);
      return { url: this.portal('failed'), statusCode: 302 };
    }

    try {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: {
          githubId: identity.id,
          githubLogin: identity.login,
          githubConnectedAt: new Date(),
        },
      });
    } catch (err) {
      // That GitHub account is already linked to another customer.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return { url: this.portal('taken'), statusCode: 302 };
      }
      throw err;
    }
    // Deliveries waiting for a GitHub account continue automatically.
    await this.fulfillment.continueForCustomer(customerId);
    return { url: this.portal('connected'), statusCode: 302 };
  }

  /** Unlinks the GitHub account. Access already granted stays; new deliveries wait for a reconnect. */
  @Delete('account/github')
  @CustomerAuth()
  @HttpCode(200)
  @ApiZodResponse(CustomerMeSchema)
  async disconnect(@CurrentCustomerId() customerId: string) {
    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data: { githubId: null, githubLogin: null, githubConnectedAt: null },
    });
    return this.customers.toMe(customer);
  }

  /**
   * GitHub App webhook. Signature-checked, processed once per delivery id. `member` events mark
   * invitations accepted (collaborator added) or access removed.
   */
  @Post('webhooks/github')
  @HttpCode(200)
  @SkipThrottle()
  @ApiExcludeEndpoint()
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-hub-signature-256') signature?: string,
    @Headers('x-github-event') event?: string,
    @Headers('x-github-delivery') deliveryId?: string,
  ) {
    const secret = this.env.GITHUB_WEBHOOK_SECRET;
    if (!secret || !req.rawBody || !verifyGithubSignature(secret, req.rawBody, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }
    if (event === 'ping' || !deliveryId) return { received: true };
    try {
      await this.prisma.processedWebhookEvent.create({
        data: { id: `github:${deliveryId}`, type: event ?? 'unknown', provider: 'github' },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return { received: true };
      }
      throw err;
    }

    if (event === 'member') {
      const payload = JSON.parse(req.rawBody.toString()) as {
        action?: string;
        member?: { id?: number };
        repository?: { name?: string; owner?: { login?: string } };
      };
      const owner = payload.repository?.owner?.login;
      const repo = payload.repository?.name;
      const userId = payload.member?.id;
      if (payload.action && owner && repo && userId) {
        await this.fulfillment.onMemberEvent(payload.action, owner, repo, String(userId));
      }
    }
    return { received: true };
  }
}
