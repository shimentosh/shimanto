import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import type { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AccessTokenPayload, AuthUser } from './auth.types.js';
import { dummyPasswordHash, randomToken, sha256, verifyPassword } from './crypto.js';

export interface Session {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  refreshTokenId: string;
}

export function toAuthUser(user: Pick<User, 'id' | 'email' | 'name' | 'role'>): AuthUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/**
 * Sessions = short-lived JWT access token + opaque rotating refresh token (stored hashed).
 * Every refresh replaces the token. Reusing a replaced token revokes its whole family, so a
 * stolen refresh token stops working as soon as either party uses it again.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async login(email: string, password: string, userAgent?: string): Promise<Session> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    const ok = await verifyPassword(user?.passwordHash ?? (await dummyPasswordHash()), password);
    if (!user || !ok || user.disabledAt)
      throw new UnauthorizedException('Invalid email or password');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issue(user, randomToken(16), userAgent);
  }

  async refresh(presented: string | undefined, userAgent?: string): Promise<Session> {
    if (!presented) throw new UnauthorizedException('No session');
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(presented) },
      include: { user: true },
    });
    if (!token) throw new UnauthorizedException('Invalid session');

    if (token.revokedAt || token.replacedById) {
      // Reuse of a rotated/revoked token → assume theft, kill the whole family.
      await this.revokeFamily(token.familyId);
      throw new UnauthorizedException('Session revoked');
    }
    if (token.expiresAt < new Date() || token.user.disabledAt) {
      throw new UnauthorizedException('Session expired');
    }

    const session = await this.issue(token.user, token.familyId, userAgent);
    await this.prisma.refreshToken.update({
      where: { id: token.id },
      data: { revokedAt: new Date(), replacedById: session.refreshTokenId },
    });
    return session;
  }

  async logout(presented: string | undefined): Promise<void> {
    if (!presented) return;
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(presented) },
    });
    if (token) await this.revokeFamily(token.familyId);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
      secret: this.env.JWT_ACCESS_SECRET,
    });
    if (payload.typ !== 'admin') throw new UnauthorizedException('Not an admin session');
    return payload;
  }

  private async issue(user: User, familyId: string, userAgent?: string): Promise<Session> {
    const payload: AccessTokenPayload = { sub: user.id, role: user.role, typ: 'admin' };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.env.JWT_ACCESS_SECRET,
      expiresIn: this.env.ACCESS_TOKEN_TTL_SECONDS,
    });
    const refreshToken = randomToken();
    const refreshExpiresAt = new Date(Date.now() + this.env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
    const created = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash: sha256(refreshToken),
        expiresAt: refreshExpiresAt,
        userAgent: userAgent?.slice(0, 300),
      },
    });
    return {
      user: toAuthUser(user),
      accessToken,
      refreshToken,
      refreshExpiresAt,
      refreshTokenId: created.id,
    };
  }

  private async revokeFamily(familyId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
