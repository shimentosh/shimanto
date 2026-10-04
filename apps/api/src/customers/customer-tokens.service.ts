import { Injectable } from '@nestjs/common';
import { randomToken, sha256 } from '../auth/crypto.js';
import type { Customer, CustomerTokenPurpose } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** How long each kind of emailed link works. */
export const TOKEN_TTL_MINUTES: Record<CustomerTokenPurpose, number> = {
  /** Sign-in / set-password link for accounts created at checkout or by an admin. */
  LOGIN_LINK: 7 * 24 * 60,
  VERIFY_EMAIL: 48 * 60,
  RESET_PASSWORD: 60,
};

/**
 * Single-use emailed tokens. Only a SHA-256 of the token is stored; issuing a new token of the
 * same purpose invalidates the older ones, and consuming is atomic so a token works exactly once.
 */
@Injectable()
export class CustomerTokensService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(
    customerId: string,
    purpose: CustomerTokenPurpose,
  ): Promise<{ id: string; token: string }> {
    const token = randomToken();
    const now = new Date();
    const [, created] = await this.prisma.$transaction([
      this.prisma.customerToken.updateMany({
        where: { customerId, purpose, usedAt: null },
        data: { usedAt: now },
      }),
      this.prisma.customerToken.create({
        data: {
          customerId,
          purpose,
          tokenHash: sha256(token),
          expiresAt: new Date(now.getTime() + TOKEN_TTL_MINUTES[purpose] * 60_000),
        },
      }),
    ]);
    return { id: created.id, token };
  }

  /** The token's customer, or null when it is unknown, used, expired or for another purpose. */
  async consume(token: string, purpose: CustomerTokenPurpose): Promise<Customer | null> {
    const tokenHash = sha256(token);
    const { count } = await this.prisma.customerToken.updateMany({
      where: { tokenHash, purpose, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (count === 0) return null;
    const row = await this.prisma.customerToken.findUnique({
      where: { tokenHash },
      include: { customer: true },
    });
    return row?.customer ?? null;
  }
}
