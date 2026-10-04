import { Controller, Get, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthUserSchema, type LoginInput, LoginInputSchema } from '@shimanto/types';
import type { CookieOptions, Request, Response } from 'express';
import { z } from 'zod';
import { ApiZodResponse, ZodBody } from '../common/zod.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { AuthService, type Session } from './auth.service.js';
import { ACCESS_COOKIE, type AuthUser, REFRESH_COOKIE } from './auth.types.js';
import { Auth, CurrentUser } from './guards.js';

const SessionResponse = z.object({ user: AuthUserSchema, accessTokenExpiresIn: z.number() });

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiZodResponse(SessionResponse)
  async login(
    @ZodBody(LoginInputSchema) body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.respond(
      res,
      await this.auth.login(body.email, body.password, req.get('user-agent')),
    );
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @ApiZodResponse(SessionResponse)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const presented = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    try {
      return this.respond(res, await this.auth.refresh(presented, req.get('user-agent')));
    } catch (error) {
      this.clear(res);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout((req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE]);
    this.clear(res);
  }

  @Get('me')
  @Auth()
  @ApiZodResponse(AuthUserSchema)
  me(@CurrentUser() user: AuthUser) {
    return user;
  }

  private cookie(maxAgeMs: number, path = '/'): CookieOptions {
    return {
      httpOnly: true,
      secure: this.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: this.env.COOKIE_DOMAIN,
      path,
      maxAge: maxAgeMs,
    };
  }

  private respond(res: Response, session: Session) {
    res.cookie(
      ACCESS_COOKIE,
      session.accessToken,
      this.cookie(this.env.ACCESS_TOKEN_TTL_SECONDS * 1000),
    );
    // Refresh cookie is only ever sent to the auth endpoints.
    res.cookie(
      REFRESH_COOKIE,
      session.refreshToken,
      this.cookie(session.refreshExpiresAt.getTime() - Date.now(), '/v1/auth'),
    );
    return { user: session.user, accessTokenExpiresIn: this.env.ACCESS_TOKEN_TTL_SECONDS };
  }

  private clear(res: Response) {
    res.clearCookie(ACCESS_COOKIE, { ...this.cookie(0), maxAge: undefined });
    res.clearCookie(REFRESH_COOKIE, { ...this.cookie(0, '/v1/auth'), maxAge: undefined });
  }
}
