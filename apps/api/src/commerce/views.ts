import {
  type AdminCustomerSummary,
  type AdminDelivery,
  type AdminEmailEvent,
  type AdminOrderDetail,
  type AdminOrderSummary,
  type DeliveryView,
  type ManualMethodView,
  ManualMethodViewSchema,
  type ManualPaymentState,
  type OrderDetail,
  type OrderSummary,
} from '@shimanto/types';
import type { Order, Payment, Prisma } from '../generated/prisma/client.js';
import { toOrderAttribution } from '../analytics/attribution.js';
import { ENTITLED_ORDER } from './status.js';

const iso = (d: Date | null | undefined) => d?.toISOString() ?? null;

// ───────────── Manual payments ─────────────

type ManualPaymentRow = Pick<
  Payment,
  | 'status'
  | 'method'
  | 'methodDetails'
  | 'reference'
  | 'senderAccount'
  | 'submittedAt'
  | 'rejectedReason'
> & { proof?: { filename: string; mimeType: string } | null };

/** The method as it was when the order was placed (a fallback keeps old rows readable). */
export function methodSnapshot(
  payment: Pick<Payment, 'method' | 'methodDetails'>,
): ManualMethodView {
  const parsed = ManualMethodViewSchema.safeParse(payment.methodDetails);
  if (parsed.success) return parsed.data;
  return {
    id: payment.method ?? 'manual',
    kind: 'OTHER',
    name: 'Manual payment',
    description: null,
    logoUrl: null,
    qrUrl: null,
    fields: [],
    instructions: '',
    referenceLabel: 'Transaction ID',
    senderLabel: null,
    proof: 'OFF',
  };
}

export function manualState(
  order: Pick<Order, 'status' | 'paymentStatus'>,
  payment: ManualPaymentRow,
): ManualPaymentState {
  if (payment.status === 'PAID' || order.paymentStatus === 'PAID') return 'CONFIRMED';
  if (order.status === 'CANCELLED' || order.status === 'REFUNDED') return 'CLOSED';
  if (payment.submittedAt) return 'SUBMITTED';
  if (payment.rejectedReason) return 'REJECTED';
  return 'AWAITING';
}

// ───────────── Customer-facing ─────────────

export const deliveryInclude = {
  product: {
    select: {
      name: true,
      files: { orderBy: { order: 'asc' }, include: { media: true } },
    },
  },
} satisfies Prisma.DeliveryInclude;

export type DeliveryRow = Prisma.DeliveryGetPayload<{ include: typeof deliveryInclude }>;

/**
 * A delivery as its customer sees it: files only when downloadable, repository details only
 * once access was initiated, never internal errors or ids.
 */
export function toDeliveryView(
  d: DeliveryRow,
  ctx: { orderActive: boolean; githubConnected: boolean },
): DeliveryView {
  const downloadable = ctx.orderActive && d.type === 'R2' && d.status === 'READY';
  const repoVisible = ['INVITATION_SENT', 'ACCEPTED'].includes(d.status);
  const repository =
    repoVisible && d.githubOwner && d.githubRepo ? `${d.githubOwner}/${d.githubRepo}` : null;
  return {
    id: d.id,
    type: d.type,
    status: d.status,
    productId: d.productId,
    productName: d.product.name,
    deliveredAt: iso(d.deliveredAt),
    files: downloadable
      ? d.product.files.map((f) => ({
          id: f.id,
          label: f.label,
          filename: f.media.filename,
          version: f.version,
          size: f.media.size,
          mimeType: f.media.mimeType,
        }))
      : [],
    github:
      d.type === 'GITHUB'
        ? {
            login: d.githubLogin,
            repository,
            url: repository
              ? d.status === 'ACCEPTED'
                ? `https://github.com/${repository}`
                : `https://github.com/${repository}/invitations`
              : null,
            canRetry:
              ctx.orderActive &&
              (['FAILED', 'EXPIRED'].includes(d.status) ||
                (d.status === 'ACTION_REQUIRED' && ctx.githubConnected)),
          }
        : null,
  };
}

export const orderSummaryInclude = {
  items: { select: { productName: true, quantity: true }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.OrderInclude;

type OrderSummaryRow = Prisma.OrderGetPayload<{ include: typeof orderSummaryInclude }>;

export function toOrderSummary(o: OrderSummaryRow): OrderSummary {
  return {
    id: o.id,
    number: o.number,
    createdAt: o.createdAt.toISOString(),
    status: o.status,
    paymentStatus: o.paymentStatus,
    fulfillmentStatus: o.fulfillmentStatus,
    currency: o.currency,
    total: o.total,
    items: o.items.map((i) => ({ productName: i.productName, quantity: i.quantity })),
  };
}

export const orderDetailInclude = {
  items: { orderBy: { createdAt: 'asc' } },
  deliveries: { include: deliveryInclude, orderBy: { createdAt: 'asc' } },
  payments: {
    where: { provider: 'MANUAL' },
    include: { proof: { select: { filename: true, mimeType: true } } },
    orderBy: { createdAt: 'desc' },
    take: 1,
  },
} satisfies Prisma.OrderInclude;

type OrderDetailRow = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;

export function toOrderDetail(o: OrderDetailRow, githubConnected: boolean): OrderDetail {
  const orderActive = ENTITLED_ORDER.includes(o.status);
  return {
    id: o.id,
    number: o.number,
    createdAt: o.createdAt.toISOString(),
    status: o.status,
    paymentStatus: o.paymentStatus,
    fulfillmentStatus: o.fulfillmentStatus,
    currency: o.currency,
    total: o.total,
    subtotal: o.subtotal,
    discount: o.discount,
    couponCode: o.couponCode,
    provider: o.provider,
    source: o.source,
    paidAt: iso(o.paidAt),
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      productSlug: i.productSlug,
      productType: i.productType,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      discount: i.discount,
      total: i.total,
    })),
    deliveries: o.deliveries.map((d) => toDeliveryView(d, { orderActive, githubConnected })),
    manualPayment: (() => {
      const payment = o.payments[0];
      if (o.provider !== 'MANUAL' || o.source !== 'CHECKOUT' || !payment) return null;
      return {
        method: methodSnapshot(payment),
        state: manualState(o, payment),
        dueAt: iso(o.paymentDueAt),
        reference: payment.reference,
        senderAccount: payment.senderAccount,
        proof: payment.proof ? { filename: payment.proof.filename } : null,
        submittedAt: iso(payment.submittedAt),
        rejectedReason: payment.rejectedReason,
      };
    })(),
  };
}

// ───────────── Admin ─────────────

export function toAdminDelivery(
  d: Prisma.DeliveryGetPayload<{ include: { product: { select: { name: true } } } }>,
): AdminDelivery {
  return {
    id: d.id,
    type: d.type,
    status: d.status,
    productId: d.productId,
    productName: d.product.name,
    githubOwner: d.githubOwner,
    githubRepo: d.githubRepo,
    githubLogin: d.githubLogin,
    githubInvitationId: d.githubInvitationId,
    attempts: d.attempts,
    lastError: d.lastError,
    lastSyncedAt: iso(d.lastSyncedAt),
    deliveredAt: iso(d.deliveredAt),
    revokedAt: iso(d.revokedAt),
    createdAt: d.createdAt.toISOString(),
  };
}

export function toEmailEvent(e: Prisma.EmailEventGetPayload<object>): AdminEmailEvent {
  return {
    id: e.id,
    type: e.type,
    recipient: e.recipient,
    subject: e.subject,
    status: e.status,
    provider: e.provider,
    providerMessageId: e.providerMessageId,
    failureReason: e.failureReason,
    sentAt: iso(e.sentAt),
    createdAt: e.createdAt.toISOString(),
    orderId: e.orderId,
    customerId: e.customerId,
  };
}

export const adminOrderSummaryInclude = {
  customer: { select: { id: true, email: true, name: true } },
  items: { select: { productName: true, quantity: true }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.OrderInclude;

type AdminOrderSummaryRow = Prisma.OrderGetPayload<{ include: typeof adminOrderSummaryInclude }>;

export function toAdminOrderSummary(o: AdminOrderSummaryRow): AdminOrderSummary {
  return {
    id: o.id,
    number: o.number,
    createdAt: o.createdAt.toISOString(),
    status: o.status,
    paymentStatus: o.paymentStatus,
    fulfillmentStatus: o.fulfillmentStatus,
    source: o.source,
    provider: o.provider,
    currency: o.currency,
    total: o.total,
    customer: o.customer,
    items: o.items,
  };
}

export const adminOrderDetailInclude = {
  customer: { select: { id: true, email: true, name: true, githubLogin: true } },
  items: { orderBy: { createdAt: 'asc' } },
  payments: {
    include: { proof: { select: { filename: true, mimeType: true } } },
    orderBy: { createdAt: 'asc' },
  },
  deliveries: { include: { product: { select: { name: true } } }, orderBy: { createdAt: 'asc' } },
  emails: { orderBy: { createdAt: 'desc' } },
  createdBy: { select: { id: true, email: true } },
} satisfies Prisma.OrderInclude;

type AdminOrderDetailRow = Prisma.OrderGetPayload<{ include: typeof adminOrderDetailInclude }>;

/** `duplicates`: payment reference → other orders that used it. */
export function toAdminOrderDetail(
  o: AdminOrderDetailRow,
  duplicates: Map<string, number[]> = new Map(),
): AdminOrderDetail {
  return {
    id: o.id,
    number: o.number,
    createdAt: o.createdAt.toISOString(),
    status: o.status,
    paymentStatus: o.paymentStatus,
    fulfillmentStatus: o.fulfillmentStatus,
    source: o.source,
    provider: o.provider,
    currency: o.currency,
    total: o.total,
    subtotal: o.subtotal,
    discount: o.discount,
    couponCode: o.couponCode,
    note: o.note,
    locale: o.locale,
    paidAt: iso(o.paidAt),
    paymentDueAt: iso(o.paymentDueAt),
    completedAt: iso(o.completedAt),
    cancelledAt: iso(o.cancelledAt),
    refundedAt: iso(o.refundedAt),
    createdBy: o.createdBy,
    customer: { id: o.customer.id, email: o.customer.email, name: o.customer.name },
    customerGithubLogin: o.customer.githubLogin,
    attribution: toOrderAttribution(o),
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      productSlug: i.productSlug,
      productType: i.productType,
      unitPrice: i.unitPrice,
      quantity: i.quantity,
      discount: i.discount,
      total: i.total,
    })),
    payments: o.payments.map((p) => ({
      id: p.id,
      provider: p.provider,
      status: p.status,
      amount: p.amount,
      currency: p.currency,
      providerRef: p.providerRef,
      providerPaymentId: p.providerPaymentId,
      failureReason: p.failureReason,
      manual:
        p.provider === 'MANUAL' && p.method
          ? {
              method: methodSnapshot(p),
              state: manualState(o, p),
              reference: p.reference,
              senderAccount: p.senderAccount,
              proof: p.proof,
              submittedAt: iso(p.submittedAt),
              rejectedReason: p.rejectedReason,
              duplicateOrders: (p.reference && duplicates.get(p.reference)) || [],
            }
          : null,
      paidAt: iso(p.paidAt),
      refundedAt: iso(p.refundedAt),
      createdAt: p.createdAt.toISOString(),
    })),
    deliveries: o.deliveries.map(toAdminDelivery),
    emails: o.emails.map(toEmailEvent),
  };
}

export const customerSummaryInclude = {
  orders: {
    where: { paymentStatus: 'PAID' },
    select: { total: true, currency: true },
  },
  _count: { select: { orders: true } },
} satisfies Prisma.CustomerInclude;

type CustomerSummaryRow = Prisma.CustomerGetPayload<{ include: typeof customerSummaryInclude }>;

export function toAdminCustomerSummary(c: CustomerSummaryRow): AdminCustomerSummary {
  return {
    id: c.id,
    email: c.email,
    name: c.name,
    status: c.status,
    emailVerified: Boolean(c.emailVerifiedAt),
    githubLogin: c.githubLogin,
    orders: c._count.orders,
    // Per-currency totals: never add USD to BDT.
    totals: c.orders.reduce<Record<string, number>>(
      (acc, o) => ({ ...acc, [o.currency]: (acc[o.currency] ?? 0) + o.total }),
      {},
    ),
    createdAt: c.createdAt.toISOString(),
  };
}
