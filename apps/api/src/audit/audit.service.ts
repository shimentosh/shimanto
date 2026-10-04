import { Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type Actor =
  { type: 'user'; id: string } | { type: 'api-key'; id: string } | { type: 'system' };

/** Append-only record of every privileged change (admin mutations, API-key writes). */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    actor: Actor,
    action: string,
    entity: string,
    entityId?: string,
    meta?: Prisma.InputJsonValue,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorType: actor.type,
        actorId: actor.type === 'user' ? actor.id : null,
        action,
        entity,
        entityId,
        meta: actor.type === 'api-key' ? { ...(meta as object), apiKeyId: actor.id } : meta,
      },
    });
  }
}
