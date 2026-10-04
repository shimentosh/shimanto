import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { AdminOrderCreate, AdminOrderDetail } from '@shimanto/types';
import type { orderAttribution } from '../analytics/attribution.js';
import { AnalyticsService } from '../analytics/analytics.service.js';
import type { TrackingContext } from '../analytics/events.js';
import { type Actor, AuditService } from '../audit/audit.service.js';
import { cursorArgs, paginate } from '../common/cursor.js';
import { unprocessable } from '../common/validate.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import type {
  FulfillmentStatus,
  Locale,
  Order,
  OrderSource,
  OrderStatus,
  PaymentStatus,
  Prisma,
} from '../generated/prisma/client.js';
import { CustomerAuthService } from '../customers/customer-auth.service.js';
import { JobsService } from '../jobs/jobs.types.js';
import { csvCell } from '../leads/leads.service.js';
import { EmailService } from '../mail/email.service.js';
import type { OrderMailData } from '../mail/transactional.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FulfillmentService } from './fulfillment.service.js';
import { PaymentsGateway } from './payments.gateway.js';
import {
  type CartLine,
  type CouponRule,
  type PricedCart,
  PricingError,
  priceCart,
} from './pricing.js';
import {
  adminOrderDetailInclude,
  adminOrderSummaryInclude,
  toAdminOrderDetail,
  toAdminOrderSummary,
} from './views.js';

export interface CreateOrderArgs {
  customerId: string;
  cart: PricedCart;
  source: OrderSource;
  locale: Locale;
  utm?: Record<string, string>;
  /** First/last touch columns (see analytics/attribution.ts). */
  attribution?: ReturnType<typeof orderAttribution>;
  /** Browser ids + consent for server-side conversion events. */
  tracking?: TrackingContext | null;
  note?: string | null;
  createdById?: string | null;
}

export type ConfirmationEmail = 'free' | 'paid' | 'admin' | null;

export interface OrderFilter {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  fulfillmentStatus?: FulfillmentStatus;
  source?: OrderSource;
  customerId?: string;
  productId?: string;
  /** Customer email, or an order number. */
  q?: string;
}

const SYSTEM: Actor = { type: 'system' };

/**
 * Orders are the single source of truth for what a customer bought. Checkout, $0 claims and
 * admin-created orders all go through `create` → `confirm` → fulfillment; nothing else grants
 * access. Payment status only changes from verified webhooks or an admin.
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger('Orders');

  constructor(
    private readonly prisma: PrismaService,
    private readonly fulfillment: FulfillmentService,
    private readonly payments: PaymentsGateway,
    private readonly customers: CustomerAuthService,
    private readonly email: EmailService,
    private readonly jobs: JobsService,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  // ───────────── Pricing inputs ─────────────

  /** Coupon by code as a pricing rule. `unknown` when a code was given but doesn't exist. */
  async coupon(code?: string | null): Promise<{ rule: CouponRule | null; unknown: boolean }> {
    if (!code) return { rule: null, unknown: false };
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: { products: { select: { id: true } } },
    });
    if (!coupon) return { rule: null, unknown: true };
    return {
      rule: { ...coupon, productIds: coupon.products.map((p) => p.id) },
      unknown: false,
    };
  }

  price(lines: CartLine[], coupon: { rule: CouponRule | null; unknown: boolean }): PricedCart {
    try {
      return priceCart(lines, coupon.rule, new Date(), coupon.unknown);
    } catch (error) {
      if (error instanceof PricingError) unprocessable(error.message);
      throw error;
    }
  }

  // ───────────── Lifecycle ─────────────

  /** A PENDING order with item snapshots. $0 orders need no payment. */
  async create(args: CreateOrderArgs): Promise<Order> {
    const { cart } = args;
    const free = cart.total === 0;
    return this.prisma.order.create({
      data: {
        customerId: args.customerId,
        source: args.source,
        status: 'PENDING',
        paymentStatus: free ? 'NOT_REQUIRED' : 'PENDING',
        fulfillmentStatus: 'PENDING',
        provider: free ? 'FREE' : args.source === 'ADMIN' ? 'MANUAL' : 'STRIPE',
        currency: cart.currency,
        subtotal: cart.subtotal,
        discount: cart.discount,
        total: cart.total,
        couponId: cart.coupon?.id ?? null,
        couponCode: cart.coupon?.code ?? null,
        locale: args.locale,
        utm: args.utm,
        ...(args.attribution ?? {}),
        ...(args.tracking ? { tracking: args.tracking as Prisma.InputJsonValue } : {}),
        note: args.note ?? null,
        createdById: args.createdById ?? null,
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            productName: item.name,
            productSlug: item.slug,
            productType: item.type,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            discount: item.discount,
            total: item.total,
          })),
        },
      },
    });
  }

  /**
   * The one place an order becomes entitled: $0 orders right away, paid orders from a verified
   * payment. Idempotent: only a PENDING (or cancelled-then-paid) order moves forward, so a
   * replayed webhook or double click does nothing.
   */
  async confirm(orderId: string, opts: { paid: boolean; email: ConfirmationEmail; actor?: Actor }) {
    const now = new Date();
    const { count } = await this.prisma.order.updateMany({
      where: {
        id: orderId,
        status: { in: opts.paid ? ['PENDING', 'CANCELLED'] : ['PENDING'] },
      },
      data: opts.paid
        ? { status: 'PAID', paymentStatus: 'PAID', paidAt: now, cancelledAt: null }
        : { status: 'PROCESSING', paymentStatus: 'NOT_REQUIRED' },
    });
    if (count === 0) return false;

    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { customer: true },
    });
    // Accounts created for a guest or by an admin get one welcome with a sign-in link.
    if (!order.customer.passwordHash) await this.customers.sendAccessWelcome(order.customer);
    if (order.couponId) {
      await this.prisma.coupon.update({
        where: { id: order.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }
    await this.audit.record(
      opts.actor ?? SYSTEM,
      opts.paid ? 'order.paid' : 'order.confirmed',
      'Order',
      orderId,
      {
        total: order.total,
        currency: order.currency,
      },
    );

    if (opts.email) {
      const key = {
        free: 'freeOrderConfirmation',
        paid: 'paymentSuccessful',
        admin: 'orderConfirmation',
      } as const;
      const data = await this.mailData(orderId);
      await this.email.send(key[opts.email], {
        to: data.email,
        customerId: order.customerId,
        orderId,
        idempotencyKey: `order:${orderId}:${key[opts.email]}`,
        data: data.mail,
      });
    }
    // Server-confirmed purchase ($0 or paid): internal event + GA4 + Meta CAPI, in the
    // background. Analytics can never fail the order.
    await this.analytics.trackPurchase(orderId);
    await this.jobs.enqueue('fulfillment.run', { orderId });
    return true;
  }

  async mailData(orderId: string): Promise<{ email: string; mail: OrderMailData }> {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { customer: true, items: { orderBy: { createdAt: 'asc' } } },
    });
    return {
      email: order.customer.email,
      mail: {
        name: order.customer.name,
        orderNumber: order.number,
        items: order.items.map((i) => ({
          name: i.productName,
          quantity: i.quantity,
          total: i.total,
        })),
        subtotal: order.subtotal,
        discount: order.discount,
        total: order.total,
        currency: order.currency,
        couponCode: order.couponCode,
        orderUrl: `${this.env.PORTAL_URL}/orders/${order.number}`,
      },
    };
  }

  /** Refund recorded (Stripe webhook, admin refund): access is revoked, the customer told once. */
  async markRefunded(orderId: string, actor: Actor, via: string) {
    const now = new Date();
    const { count } = await this.prisma.order.updateMany({
      where: { id: orderId, status: { not: 'REFUNDED' } },
      data: { status: 'REFUNDED', paymentStatus: 'REFUNDED', refundedAt: now },
    });
    if (count === 0) return;
    await this.prisma.payment.updateMany({
      where: { orderId, status: 'PAID' },
      data: { status: 'REFUNDED', refundedAt: now },
    });
    await this.fulfillment.revokeOrder(orderId, actor, 'refunded');
    await this.analytics.trackRefund(orderId);
    await this.audit.record(actor, 'order.refunded', 'Order', orderId, { via });
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { customer: true },
    });
    await this.email.send('orderCancelled', {
      to: order.customer.email,
      customerId: order.customerId,
      orderId,
      idempotencyKey: `order:${orderId}:refunded`,
      data: {
        name: order.customer.name,
        orderNumber: order.number,
        refunded: true,
        supportUrl: `${this.env.PORTAL_URL}/support`,
      },
    });
  }

  // ───────────── Admin ─────────────

  async list(query: OrderFilter & { limit: number; cursor?: string }) {
    const rows = await this.prisma.order.findMany({
      where: this.where(query),
      include: adminOrderSummaryInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      ...cursorArgs(query.limit, query.cursor),
    });
    const page = paginate(rows, query.limit);
    return { items: page.items.map(toAdminOrderSummary), nextCursor: page.nextCursor };
  }

  async detail(id: string): Promise<AdminOrderDetail> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: adminOrderDetailInclude,
    });
    if (!order) throw new NotFoundException('Order not found');
    return toAdminOrderDetail(order);
  }

  /** Admin-created order: same pipeline as checkout, never a shortcut around it. */
  async createByAdmin(input: AdminOrderCreate, actor: Actor & { type: 'user' }) {
    const productIds = input.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, status: { not: 'ARCHIVED' } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    const lines: CartLine[] = input.items.map((item) => {
      const product = byId.get(item.productId);
      if (!product) unprocessable('One of the products does not exist or is archived', 'items');
      return { product, quantity: item.quantity ?? 1, unitPrice: item.unitPrice };
    });
    const coupon = await this.coupon(input.couponCode);
    const cart = this.price(lines, coupon);
    if (input.couponCode && cart.couponError) unprocessable(cart.couponError, 'couponCode');
    if (cart.total > 0 && !input.paidExternally) {
      unprocessable(
        'The total is above zero. Mark it as paid outside the store, or set the price to 0.',
        'paidExternally',
      );
    }

    const existing = await this.prisma.customer.findUnique({
      where: { email: input.customerEmail.toLowerCase() },
    });
    if (existing?.status === 'DISABLED')
      unprocessable('This customer account is disabled', 'customerEmail');
    const customer =
      existing ??
      (await this.customers.createPasswordless({
        email: input.customerEmail,
        name: input.customerName,
      }));

    const order = await this.create({
      customerId: customer.id,
      cart,
      source: 'ADMIN',
      locale: customer.locale,
      note: input.note,
      createdById: actor.id,
    });
    if (cart.total > 0) {
      await this.prisma.payment.create({
        data: {
          orderId: order.id,
          provider: 'MANUAL',
          status: 'PAID',
          amount: cart.total,
          currency: cart.currency,
          paidAt: new Date(),
        },
      });
    }
    await this.audit.record(actor, 'order.create', 'Order', order.id, {
      number: order.number,
      total: cart.total,
      currency: cart.currency,
      customer: customer.email,
    });
    await this.confirm(order.id, {
      paid: cart.total > 0,
      email: input.notifyCustomer === false ? null : 'admin',
      actor,
    });
    return this.detail(order.id);
  }

  async updateNote(id: string, note: string | null, actor: Actor) {
    await this.prisma.order.update({ where: { id }, data: { note } });
    await this.audit.record(actor, 'order.note', 'Order', id);
    return this.detail(id);
  }

  /** Cancels an order and removes access. Paid orders keep their payment (refund separately). */
  async cancel(id: string, actor: Actor) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      unprocessable(`This order is already ${order.status.toLowerCase()}`);
    }
    await this.prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    for (const payment of order.payments.filter((p) => p.status === 'PENDING')) {
      if (payment.provider === 'STRIPE' && payment.providerRef) {
        await this.payments.cancelCheckout(payment.providerRef);
      }
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', failureReason: 'Order cancelled' },
      });
    }
    if (order.paymentStatus === 'PENDING') {
      await this.prisma.order.update({ where: { id }, data: { paymentStatus: 'FAILED' } });
    }
    const failed = await this.fulfillment.revokeOrder(id, actor, 'cancelled');
    await this.audit.record(actor, 'order.cancel', 'Order', id, { revokeFailures: failed.length });
    const { email, mail } = await this.mailData(id);
    await this.email.send('orderCancelled', {
      to: email,
      customerId: order.customerId,
      orderId: id,
      idempotencyKey: `order:${id}:cancelled`,
      data: {
        name: mail.name,
        orderNumber: order.number,
        refunded: false,
        supportUrl: `${this.env.PORTAL_URL}/support`,
      },
    });
    return this.detail(id);
  }

  /** Stripe payments are refunded through Stripe; manual payments are recorded as refunded. */
  async refund(id: string, actor: Actor) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus !== 'PAID') unprocessable('Only paid orders can be refunded');
    const payment = order.payments.find((p) => p.status === 'PAID');
    if (payment?.provider === 'STRIPE') {
      if (!payment.providerPaymentId) unprocessable('This order has no Stripe payment to refund');
      await this.payments.refund(payment.providerPaymentId);
    }
    await this.markRefunded(id, actor, payment?.provider === 'STRIPE' ? 'stripe' : 'manual');
    return this.detail(id);
  }

  /** Re-runs fulfillment (e.g. after fixing a product's files or GitHub setup). */
  async fulfill(id: string, actor: Actor) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    if (!['PAID', 'PROCESSING', 'COMPLETED'].includes(order.status)) {
      unprocessable('Only paid or confirmed orders can be fulfilled');
    }
    await this.fulfillment.run(id);
    await this.audit.record(actor, 'order.fulfill', 'Order', id);
    return this.detail(id);
  }

  /** Sends the confirmation / receipt again (a new email, not a duplicate of an automatic one). */
  async resendConfirmation(id: string, actor: Actor) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');
    const { email, mail } = await this.mailData(id);
    const key =
      order.total === 0
        ? 'freeOrderConfirmation'
        : order.paymentStatus === 'PAID'
          ? 'paymentSuccessful'
          : 'orderConfirmation';
    await this.email.send(key, {
      to: email,
      customerId: order.customerId,
      orderId: id,
      idempotencyKey: `order:${id}:${key}:manual:${Date.now()}`,
      data: mail,
    });
    await this.audit.record(actor, 'order.resendConfirmation', 'Order', id);
    return { ok: true as const };
  }

  async exportCsv(query: OrderFilter): Promise<string> {
    const orders = await this.prisma.order.findMany({
      where: this.where(query),
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
      take: 10_000,
    });
    const header =
      'number,createdAt,status,paymentStatus,fulfillmentStatus,source,provider,products,email,name,subtotal,discount,total,currency,coupon,paidAt,refundedAt';
    const lines = orders.map((o) =>
      [
        o.number,
        o.createdAt,
        o.status,
        o.paymentStatus,
        o.fulfillmentStatus,
        o.source,
        o.provider,
        o.items
          .map((i) => (i.quantity > 1 ? `${i.productName} ×${i.quantity}` : i.productName))
          .join('; '),
        o.customer.email,
        o.customer.name,
        (o.subtotal / 100).toFixed(2),
        (o.discount / 100).toFixed(2),
        (o.total / 100).toFixed(2),
        o.currency,
        o.couponCode,
        o.paidAt,
        o.refundedAt,
      ]
        .map(csvCell)
        .join(','),
    );
    return [header, ...lines].join('\r\n');
  }

  private where(query: OrderFilter): Prisma.OrderWhereInput {
    const q = query.q?.trim().replace(/^#/, '');
    return {
      status: query.status,
      paymentStatus: query.paymentStatus,
      fulfillmentStatus: query.fulfillmentStatus,
      source: query.source,
      customerId: query.customerId,
      ...(query.productId ? { items: { some: { productId: query.productId } } } : {}),
      ...(q
        ? {
            OR: [
              { customer: { email: { contains: q, mode: 'insensitive' } } },
              { customer: { name: { contains: q, mode: 'insensitive' } } },
              ...(/^\d{1,9}$/.test(q) ? [{ number: Number(q) }] : []),
            ],
          }
        : {}),
    };
  }
}
