import {
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type AdminCustomerDetail,
  AdminCustomerDetailSchema,
  AdminCustomerSummarySchema,
  AdminCustomerUpdateSchema,
  type AdminDashboard,
  AdminDashboardSchema,
  AdminEmailEventSchema,
  AdminSettingsSchema,
  CustomerStatusSchema,
  EmailStatusSchema,
  GeneralSettingsSchema,
  GitHubOwnerSchema,
  GitHubRepoSchema,
  IntegrationCheckSchema,
  OkSchema,
  TestEmailInputSchema,
  pageSchema,
} from '@shimanto/types';
import { z } from 'zod';
import { customerTouch } from '../analytics/attribution.js';
import { AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { AdminAuth, Auth, CurrentUser } from '../auth/guards.js';
import { PaymentsGateway } from '../commerce/payments.gateway.js';
import { ENTITLED_ORDER } from '../commerce/status.js';
import {
  adminOrderSummaryInclude,
  customerSummaryInclude,
  toAdminCustomerSummary,
  toAdminDelivery,
  toAdminOrderSummary,
  toEmailEvent,
} from '../commerce/views.js';
import { cursorArgs, paginate } from '../common/cursor.js';
import { ApiZodResponse, ZodBody, ZodQuery } from '../common/zod.js';
import { CustomerAuthService } from '../customers/customer-auth.service.js';
import { GitHubClient } from '../github/github.client.js';
import { EmailService } from '../mail/email.service.js';
import { StorageService } from '../media/storage.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';

const actor = (user: AuthUser) => ({ type: 'user' as const, id: user.id });

@ApiTags('admin · dashboard')
@AdminAuth()
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiZodResponse(AdminDashboardSchema)
  async get(): Promise<AdminDashboard> {
    const since = new Date(Date.now() - 30 * 86_400_000);
    const [
      paid,
      paid30,
      orders,
      orders30,
      customers,
      published,
      total,
      openTickets,
      attention,
      recent,
      recentCustomers,
      tickets,
    ] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['currency'],
        where: { paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      this.prisma.order.groupBy({
        by: ['currency'],
        where: { paymentStatus: 'PAID', paidAt: { gte: since } },
        _sum: { total: true },
      }),
      this.prisma.order.count({ where: { status: { in: ENTITLED_ORDER } } }),
      this.prisma.order.count({
        where: { status: { in: ENTITLED_ORDER }, createdAt: { gte: since } },
      }),
      this.prisma.customer.count(),
      this.prisma.product.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.product.count({ where: { status: { not: 'ARCHIVED' } } }),
      this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      this.prisma.delivery.count({
        where: {
          status: { in: ['FAILED', 'ACTION_REQUIRED', 'EXPIRED'] },
          order: { status: { in: ENTITLED_ORDER } },
        },
      }),
      this.prisma.order.findMany({
        where: { NOT: { status: 'CANCELLED', paidAt: null, source: 'CHECKOUT' } },
        include: adminOrderSummaryInclude,
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.customer.findMany({
        include: customerSummaryInclude,
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.supportTicket.findMany({
        where: { status: { in: ['OPEN', 'PENDING'] } },
        include: { customer: { select: { email: true } } },
        orderBy: { lastMessageAt: 'desc' },
        take: 5,
      }),
    ]);
    const sums = (rows: Array<{ currency: string; _sum: { total: number | null } }>) =>
      Object.fromEntries(rows.map((r) => [r.currency, r._sum.total ?? 0]));
    return {
      revenue: sums(paid),
      revenueLast30Days: sums(paid30),
      orders,
      ordersLast30Days: orders30,
      customers,
      products: { published, total },
      openTickets,
      deliveriesNeedingAttention: attention,
      recentOrders: recent.map(toAdminOrderSummary),
      recentCustomers: recentCustomers.map(toAdminCustomerSummary),
      tickets: tickets.map((t) => ({
        id: t.id,
        number: t.number,
        subject: t.subject,
        status: t.status,
        customerEmail: t.customer.email,
        lastMessageAt: t.lastMessageAt.toISOString(),
      })),
    };
  }
}

const CustomerQuery = z.object({
  q: z.string().max(120).optional(),
  status: CustomerStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

@ApiTags('admin · customers')
@AdminAuth()
@Controller('admin/customers')
export class AdminCustomersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomerAuthService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ApiZodResponse(pageSchema(AdminCustomerSummarySchema))
  async list(@ZodQuery(CustomerQuery) query: z.output<typeof CustomerQuery>) {
    const rows = await this.prisma.customer.findMany({
      where: {
        status: query.status,
        ...(query.q
          ? {
              OR: [
                { email: { contains: query.q, mode: 'insensitive' } },
                { name: { contains: query.q, mode: 'insensitive' } },
                { githubLogin: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: customerSummaryInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      ...cursorArgs(query.limit, query.cursor),
    });
    const page = paginate(rows, query.limit);
    return { items: page.items.map(toAdminCustomerSummary), nextCursor: page.nextCursor };
  }

  @Get(':id')
  @ApiZodResponse(AdminCustomerDetailSchema)
  async get(@Param('id') id: string): Promise<AdminCustomerDetail> {
    const c = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        ...customerSummaryInclude,
        tickets: { orderBy: { lastMessageAt: 'desc' }, take: 20 },
        deliveries: {
          include: { product: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
    if (!c) throw new NotFoundException('Customer not found');
    const orders = await this.prisma.order.findMany({
      where: { customerId: id },
      include: adminOrderSummaryInclude,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      ...toAdminCustomerSummary(c),
      locale: c.locale,
      hasPassword: Boolean(c.passwordHash),
      lastLoginAt: c.lastLoginAt?.toISOString() ?? null,
      githubConnectedAt: c.githubConnectedAt?.toISOString() ?? null,
      attribution: { first: customerTouch(c), last: null },
      orderList: orders.map(toAdminOrderSummary),
      deliveries: c.deliveries.map(toAdminDelivery),
      tickets: c.tickets.map((t) => ({
        id: t.id,
        number: t.number,
        subject: t.subject,
        status: t.status,
        lastMessageAt: t.lastMessageAt.toISOString(),
      })),
    };
  }

  /** Disabling signs the customer out everywhere and blocks sign-in and checkout. */
  @Patch(':id')
  @ApiZodResponse(AdminCustomerDetailSchema)
  async update(
    @Param('id') id: string,
    @ZodBody(AdminCustomerUpdateSchema) body: z.output<typeof AdminCustomerUpdateSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    const before = await this.prisma.customer.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Customer not found');
    await this.prisma.customer.update({
      where: { id },
      data: {
        status: body.status,
        ...(body.status === 'DISABLED' && before.status !== 'DISABLED'
          ? { sessionVersion: { increment: 1 } }
          : {}),
      },
    });
    await this.audit.record(actor(user), 'customer.status', 'Customer', id, {
      from: before.status,
      to: body.status,
    });
    return this.get(id);
  }

  @Post(':id/password-reset')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiZodResponse(OkSchema)
  async sendReset(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const c = await this.prisma.customer.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Customer not found');
    await this.customers.forgotPassword(c.email);
    await this.audit.record(actor(user), 'customer.passwordResetSent', 'Customer', id);
    return { ok: true as const };
  }
}

const RepoCheckInput = z.object({ owner: GitHubOwnerSchema, repo: GitHubRepoSchema });

/** Store settings. Integration secrets live in environment variables and are never returned. */
@ApiTags('admin · settings')
@AdminAuth()
@Controller('admin/settings')
export class AdminSettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly email: EmailService,
    private readonly storage: StorageService,
    private readonly payments: PaymentsGateway,
    private readonly github: GitHubClient,
  ) {}

  @Get()
  @ApiZodResponse(AdminSettingsSchema)
  async get() {
    return { general: await this.settings.general(), integrations: this.settings.integrations() };
  }

  @Put('general')
  @Auth('SUPER_ADMIN')
  @ApiZodResponse(AdminSettingsSchema)
  async general(
    @ZodBody(GeneralSettingsSchema) body: z.output<typeof GeneralSettingsSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    return {
      general: await this.settings.updateGeneral(body, actor(user)),
      integrations: this.settings.integrations(),
    };
  }

  @Post('test-email')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiZodResponse(IntegrationCheckSchema)
  async testEmail(
    @ZodBody(TestEmailInputSchema) body: z.output<typeof TestEmailInputSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    await this.email.send('testEmail', {
      to: body.to,
      idempotencyKey: `test:${user.id}:${Date.now()}`,
      data: { admin: user.email },
    });
    const provider = this.settings.integrations().email.provider;
    return {
      ok: true,
      message:
        provider === 'log'
          ? 'Queued, but email is in log-only mode (no RESEND_API_KEY / SMTP_URL). Check the email log.'
          : `Queued via ${provider}. Check the inbox and the email log for its status.`,
    };
  }

  @Post('check/storage')
  @HttpCode(200)
  @ApiZodResponse(IntegrationCheckSchema)
  checkStorage() {
    return this.storage.check();
  }

  @Post('check/payments')
  @HttpCode(200)
  @ApiZodResponse(IntegrationCheckSchema)
  checkPayments() {
    return this.payments.check();
  }

  /** Can the configured GitHub App / token invite collaborators to this repository? */
  @Post('check/github')
  @HttpCode(200)
  @ApiZodResponse(IntegrationCheckSchema)
  async checkGithub(@ZodBody(RepoCheckInput) body: z.output<typeof RepoCheckInput>) {
    if (!this.github.mode) {
      return {
        ok: false,
        message:
          'GitHub delivery is not configured: set GITHUB_APP_ID + GITHUB_APP_PRIVATE_KEY (or GITHUB_TOKEN)',
      };
    }
    return this.github.checkRepository(body.owner, body.repo);
  }
}

const EmailQuery = z.object({
  status: EmailStatusSchema.optional(),
  type: z.string().max(60).optional(),
  q: z.string().max(120).optional(),
  orderId: z.string().max(40).optional(),
  customerId: z.string().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

@ApiTags('admin · settings')
@AdminAuth()
@Controller('admin/emails')
export class AdminEmailsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiZodResponse(pageSchema(AdminEmailEventSchema))
  async list(@ZodQuery(EmailQuery) query: z.output<typeof EmailQuery>) {
    const rows = await this.prisma.emailEvent.findMany({
      where: {
        status: query.status,
        type: query.type,
        orderId: query.orderId,
        customerId: query.customerId,
        ...(query.q
          ? {
              OR: [
                { recipient: { contains: query.q, mode: 'insensitive' } },
                { subject: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      ...cursorArgs(query.limit, query.cursor),
    });
    const page = paginate(rows, query.limit);
    return { items: page.items.map(toEmailEvent), nextCursor: page.nextCursor };
  }
}
