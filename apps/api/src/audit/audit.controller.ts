import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Auth } from '../auth/guards.js';
import { cursorArgs, paginate } from '../common/cursor.js';
import { ZodQuery } from '../common/zod.js';
import { PrismaService } from '../prisma/prisma.service.js';

const AuditQuery = z.object({
  entity: z.string().max(40).optional(),
  entityId: z.string().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

@ApiTags('admin · audit')
@Auth('SUPER_ADMIN')
@Controller('admin/audit-log')
export class AdminAuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@ZodQuery(AuditQuery) query: z.output<typeof AuditQuery>) {
    const rows = await this.prisma.auditLog.findMany({
      where: { entity: query.entity, entityId: query.entityId },
      include: { actor: { select: { id: true, email: true, name: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      ...cursorArgs(query.limit, query.cursor),
    });
    return paginate(rows, query.limit);
  }
}
