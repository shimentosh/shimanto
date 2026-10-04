import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { type Coupon, CouponInputSchema, CouponSchema } from '@shimanto/types';
import { z } from 'zod';
import { type Actor, AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { AdminAuth, CurrentUser } from '../auth/guards.js';
import { unprocessable } from '../common/validate.js';
import { ApiZodResponse, ZodBody } from '../common/zod.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

type CouponInput = z.output<typeof CouponInputSchema>;

const include = { products: { select: { id: true, name: true } } } satisfies Prisma.CouponInclude;

function toCoupon(c: Prisma.CouponGetPayload<{ include: typeof include }>): Coupon {
  return {
    id: c.id,
    code: c.code,
    type: c.type,
    value: c.value,
    currency: c.currency,
    description: c.description,
    active: c.active,
    expiresAt: c.expiresAt?.toISOString() ?? null,
    usageLimit: c.usageLimit,
    usedCount: c.usedCount,
    products: c.products,
    createdAt: c.createdAt.toISOString(),
  };
}

@Injectable()
export class CouponsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<Coupon[]> {
    const rows = await this.prisma.coupon.findMany({ include, orderBy: { createdAt: 'desc' } });
    return rows.map(toCoupon);
  }

  private data(input: Partial<CouponInput>) {
    return {
      code: input.code,
      type: input.type,
      value: input.value,
      currency: input.currency === undefined ? undefined : input.currency,
      description: input.description === undefined ? undefined : input.description,
      active: input.active,
      expiresAt:
        input.expiresAt === undefined
          ? undefined
          : input.expiresAt
            ? new Date(input.expiresAt)
            : null,
      usageLimit: input.usageLimit === undefined ? undefined : input.usageLimit,
    };
  }

  private async assertProducts(ids: string[] = []) {
    if (!ids.length) return;
    const found = await this.prisma.product.count({ where: { id: { in: ids } } });
    if (found !== new Set(ids).size)
      unprocessable('One or more products do not exist', 'productIds');
  }

  private conflict(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      unprocessable('A coupon with this code already exists', 'code');
    }
    throw error;
  }

  async create(input: CouponInput, actor: Actor): Promise<Coupon> {
    await this.assertProducts(input.productIds);
    try {
      const coupon = await this.prisma.coupon.create({
        data: {
          ...this.data(input),
          code: input.code,
          type: input.type,
          value: input.value,
          products: { connect: input.productIds.map((id) => ({ id })) },
        },
        include,
      });
      await this.audit.record(actor, 'coupon.create', 'Coupon', coupon.id, { code: coupon.code });
      return toCoupon(coupon);
    } catch (error) {
      this.conflict(error);
    }
  }

  async update(id: string, input: Partial<CouponInput>, actor: Actor): Promise<Coupon> {
    const before = await this.prisma.coupon.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Coupon not found');
    const type = input.type ?? before.type;
    const value = input.value ?? before.value;
    if (type === 'PERCENT' && value > 100) unprocessable('A percentage is at most 100', 'value');
    await this.assertProducts(input.productIds);
    try {
      const coupon = await this.prisma.coupon.update({
        where: { id },
        data: {
          ...this.data(input),
          ...(input.productIds
            ? { products: { set: input.productIds.map((pid) => ({ id: pid })) } }
            : {}),
        },
        include,
      });
      await this.audit.record(actor, 'coupon.update', 'Coupon', id, { fields: Object.keys(input) });
      return toCoupon(coupon);
    } catch (error) {
      this.conflict(error);
    }
  }

  /** Used coupons stay (orders reference them); they are deactivated instead. */
  async remove(id: string, actor: Actor) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    if (!coupon) throw new NotFoundException('Coupon not found');
    if (coupon._count.orders > 0) {
      unprocessable('This coupon has been used. Deactivate it instead of deleting.');
    }
    await this.prisma.coupon.delete({ where: { id } });
    await this.audit.record(actor, 'coupon.delete', 'Coupon', id, { code: coupon.code });
  }
}

const actor = (user: AuthUser) => ({ type: 'user' as const, id: user.id });
const CouponUpdateSchema = z.object({
  code: z.string().optional(),
  type: z.enum(['PERCENT', 'FIXED']).optional(),
  value: z.number().int().min(1).optional(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .nullish(),
  description: z.string().trim().max(200).nullish(),
  active: z.boolean().optional(),
  expiresAt: z.iso.datetime().nullish(),
  usageLimit: z.number().int().min(1).nullish(),
  productIds: z.array(z.string()).max(100).optional(),
});

@ApiTags('admin · coupons')
@AdminAuth()
@Controller('admin/coupons')
export class AdminCouponsController {
  constructor(private readonly coupons: CouponsService) {}

  @Get()
  @ApiZodResponse(z.array(CouponSchema))
  list() {
    return this.coupons.list();
  }

  @Post()
  @ApiZodResponse(CouponSchema, 201)
  create(@ZodBody(CouponInputSchema) body: CouponInput, @CurrentUser() user: AuthUser) {
    return this.coupons.create(body, actor(user));
  }

  @Patch(':id')
  @ApiZodResponse(CouponSchema)
  update(
    @Param('id') id: string,
    @ZodBody(CouponUpdateSchema) body: z.output<typeof CouponUpdateSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    const code = body.code?.trim().toUpperCase();
    if (code !== undefined && !/^[A-Z0-9_-]{2,40}$/.test(code)) {
      unprocessable('Use 2–40 letters, numbers, - and _', 'code');
    }
    return this.coupons.update(id, { ...body, code } as Partial<CouponInput>, actor(user));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.coupons.remove(id, actor(user));
  }
}
