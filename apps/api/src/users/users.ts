import {
  Controller,
  Get,
  Injectable,
  Param,
  Patch,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleSchema } from '@shimanto/types';
import { z } from 'zod';
import { type Actor, AuditService } from '../audit/audit.service.js';
import { hashPassword } from '../auth/crypto.js';
import type { AuthUser } from '../auth/auth.types.js';
import { Auth, CurrentUser } from '../auth/guards.js';
import { ZodBody } from '../common/zod.js';
import { PrismaService } from '../prisma/prisma.service.js';

const Password = z.string().min(12, 'at least 12 characters').max(200);
const CreateUser = z.object({
  email: z.email(),
  name: z.string().max(120).optional(),
  role: RoleSchema,
  password: Password,
});
const UpdateUser = z.object({
  name: z.string().max(120).nullable().optional(),
  role: RoleSchema.optional(),
  disabled: z.boolean().optional(),
  password: Password.optional(),
});

const publicFields = {
  id: true,
  email: true,
  name: true,
  role: true,
  disabledAt: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.user.findMany({ select: publicFields, orderBy: { createdAt: 'asc' } });
  }

  async create(input: z.output<typeof CreateUser>, actor: Actor) {
    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        role: input.role,
        passwordHash: await hashPassword(input.password),
      },
      select: publicFields,
    });
    await this.audit.record(actor, 'user.create', 'User', user.id, { role: user.role });
    return user;
  }

  async update(id: string, input: z.output<typeof UpdateUser>, actor: Actor) {
    const target = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    const losesSuperAdmin =
      target.role === 'SUPER_ADMIN' &&
      ((input.role && input.role !== 'SUPER_ADMIN') || input.disabled);
    if (losesSuperAdmin) {
      const others = await this.prisma.user.count({
        where: { role: 'SUPER_ADMIN', disabledAt: null, id: { not: id } },
      });
      if (others === 0)
        throw new UnprocessableEntityException('Cannot remove the last active super admin');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        name: input.name,
        role: input.role,
        ...(input.disabled !== undefined ? { disabledAt: input.disabled ? new Date() : null } : {}),
        ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
      },
      select: publicFields,
    });
    // Disabling or a password change ends every session.
    if (input.disabled || input.password) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await this.audit.record(actor, 'user.update', 'User', id, {
      fields: Object.keys(input).filter((k) => k !== 'password'),
      passwordChanged: Boolean(input.password),
    });
    return user;
  }
}

@ApiTags('admin · users')
@Auth('SUPER_ADMIN')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list() {
    return this.users.list();
  }

  @Post()
  create(@ZodBody(CreateUser) body: z.output<typeof CreateUser>, @CurrentUser() user: AuthUser) {
    return this.users.create(body, { type: 'user', id: user.id });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @ZodBody(UpdateUser) body: z.output<typeof UpdateUser>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.users.update(id, body, { type: 'user', id: user.id });
  }
}
