import {
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiProduces, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import {
  AdminDeliverySchema,
  AdminOrderCreateSchema,
  AdminOrderDetailSchema,
  AdminOrderSummarySchema,
  AdminOrderUpdateSchema,
  CheckoutConfirmationSchema,
  CheckoutInputSchema,
  CheckoutQuoteInputSchema,
  CheckoutQuoteSchema,
  CheckoutResultSchema,
  FulfillmentStatusSchema,
  OkSchema,
  OrderSourceSchema,
  OrderStatusSchema,
  PaymentStatusSchema,
  pageSchema,
} from '@shimanto/types';
import type { Request, Response } from 'express';
import { z } from 'zod';
import type { AuthUser } from '../auth/auth.types.js';
import { CustomerSessionService } from '../auth/customer-session.service.js';
import { AdminAuth, CurrentUser } from '../auth/guards.js';
import { ApiZodResponse, ZodBody, ZodQuery } from '../common/zod.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CheckoutService } from './checkout.service.js';
import { FulfillmentService } from './fulfillment.service.js';
import { OrdersService } from './orders.service.js';
import { PaymentsService } from './payments.service.js';
import { toAdminDelivery } from './views.js';

@ApiTags('checkout')
@Controller()
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly payments: PaymentsService,
    private readonly sessions: CustomerSessionService,
  ) {}

  /** Prices a cart (and coupon) from the database. Nothing is created. */
  @Post('checkout/quote')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiZodResponse(CheckoutQuoteSchema)
  quote(@ZodBody(CheckoutQuoteInputSchema) body: z.output<typeof CheckoutQuoteInputSchema>) {
    return this.checkoutService.quote(body);
  }

  /**
   * Places an order. Paid → `{ kind: "redirect", url }` to the payment page. $0 → `{ kind:
   * "complete" }`: the order is confirmed and fulfilment has started, through the same pipeline.
   */
  @Post('checkout')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiZodResponse(CheckoutResultSchema)
  async checkout(
    @ZodBody(CheckoutInputSchema) body: z.output<typeof CheckoutInputSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const customerId = await this.sessions.optional(req);
    const outcome = await this.checkoutService.checkout(body, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      customerId,
    });
    if (outcome.startSession) {
      await this.sessions.start(res, outcome.startSession);
      this.sessions.rememberDevice(req, res, outcome.startSession.id);
    }
    return outcome.result;
  }

  /** Success page: was this paid checkout confirmed by the payment webhook yet? */
  @Get('checkout/confirmation')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiZodResponse(CheckoutConfirmationSchema)
  confirmation(
    @ZodQuery(z.object({ session: z.string().min(8).max(200) })) q: { session: string },
  ) {
    return this.checkoutService.confirmation(q.session);
  }

  /** Stripe → us. Signature-verified against the raw body; idempotent per event id. */
  @Post('webhooks/stripe')
  @HttpCode(200)
  @SkipThrottle()
  @ApiExcludeEndpoint()
  async stripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    await this.payments.handleWebhook(req.rawBody, signature);
    return { received: true };
  }
}

const OrderFilter = z.object({
  status: OrderStatusSchema.optional(),
  paymentStatus: PaymentStatusSchema.optional(),
  fulfillmentStatus: FulfillmentStatusSchema.optional(),
  source: OrderSourceSchema.optional(),
  customerId: z.string().max(40).optional(),
  productId: z.string().max(40).optional(),
  /** Customer email or name, or an order number. */
  q: z.string().max(120).optional(),
});
const OrderListQuery = OrderFilter.extend({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

const actor = (user: AuthUser) => ({ type: 'user' as const, id: user.id });

@ApiTags('admin · orders')
@AdminAuth()
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiZodResponse(pageSchema(AdminOrderSummarySchema))
  list(@ZodQuery(OrderListQuery) query: z.output<typeof OrderListQuery>) {
    return this.orders.list(query);
  }

  @Get('export.csv')
  @Header('content-type', 'text/csv; charset=utf-8')
  @Header('content-disposition', 'attachment; filename="orders.csv"')
  @ApiProduces('text/csv')
  exportCsv(@ZodQuery(OrderFilter) query: z.output<typeof OrderFilter>) {
    return this.orders.exportCsv(query);
  }

  /** Manual order (gift, offline sale): runs through the same order + fulfillment pipeline. */
  @Post()
  @ApiZodResponse(AdminOrderDetailSchema, 201)
  create(
    @ZodBody(AdminOrderCreateSchema) body: z.output<typeof AdminOrderCreateSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.createByAdmin(body, actor(user));
  }

  @Get(':id')
  @ApiZodResponse(AdminOrderDetailSchema)
  get(@Param('id') id: string) {
    return this.orders.detail(id);
  }

  @Patch(':id')
  @ApiZodResponse(AdminOrderDetailSchema)
  update(
    @Param('id') id: string,
    @ZodBody(AdminOrderUpdateSchema) body: z.output<typeof AdminOrderUpdateSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.orders.updateNote(id, body.note, actor(user));
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @ApiZodResponse(AdminOrderDetailSchema)
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.orders.cancel(id, actor(user));
  }

  @Post(':id/refund')
  @HttpCode(200)
  @ApiZodResponse(AdminOrderDetailSchema)
  refund(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.orders.refund(id, actor(user));
  }

  @Post(':id/fulfill')
  @HttpCode(200)
  @ApiZodResponse(AdminOrderDetailSchema)
  fulfill(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.orders.fulfill(id, actor(user));
  }

  @Post(':id/resend-confirmation')
  @HttpCode(200)
  @ApiZodResponse(OkSchema)
  resend(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.orders.resendConfirmation(id, actor(user));
  }
}

const RevokeInput = z.object({ reason: z.string().trim().max(300).default('Revoked by admin') });

/** Delivery actions on an order: retry, sync with GitHub, revoke. */
@ApiTags('admin · orders')
@AdminAuth()
@Controller('admin/deliveries')
export class AdminDeliveriesController {
  constructor(
    private readonly fulfillment: FulfillmentService,
    private readonly prisma: PrismaService,
  ) {}

  private async view(id: string) {
    return toAdminDelivery(
      await this.prisma.delivery.findUniqueOrThrow({
        where: { id },
        include: { product: { select: { name: true } } },
      }),
    );
  }

  @Post(':id/retry')
  @HttpCode(200)
  @ApiZodResponse(AdminDeliverySchema)
  async retry(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.fulfillment.retry(id, actor(user), { allowRevoked: true });
    return this.view(id);
  }

  @Post(':id/refresh')
  @HttpCode(200)
  @ApiZodResponse(AdminDeliverySchema)
  async refresh(@Param('id') id: string) {
    await this.fulfillment.refresh(id);
    return this.view(id);
  }

  @Post(':id/revoke')
  @HttpCode(200)
  @ApiZodResponse(AdminDeliverySchema)
  async revoke(
    @Param('id') id: string,
    @ZodBody(RevokeInput) body: z.output<typeof RevokeInput>,
    @CurrentUser() user: AuthUser,
  ) {
    await this.fulfillment.revoke(id, actor(user), body.reason);
    return this.view(id);
  }
}
