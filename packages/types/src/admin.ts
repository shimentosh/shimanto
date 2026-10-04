import { z } from 'zod';
import { OrderAttributionSchema } from './analytics.js';
import { CouponCodeSchema, CurrencySchema, OrderItemViewSchema } from './commerce.js';
import {
  CustomerStatusSchema,
  DeliveryStatusSchema,
  DeliveryTypeSchema,
  EmailStatusSchema,
  FulfillmentStatusSchema,
  OrderSourceSchema,
  OrderStatusSchema,
  PaymentProviderSchema,
  PaymentStatusSchema,
  TicketStatusSchema,
} from './enums.js';

// ───────────── Orders ─────────────

/**
 * Admin-created order. It runs through the same order + fulfillment pipeline as checkout.
 * A $0 total needs no payment; a paid total must be marked as paid outside the store.
 */
export const AdminOrderCreateSchema = z.object({
  customerEmail: z.email().max(254),
  customerName: z.string().trim().max(120).optional(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1).max(10).default(1),
        /** Override the unit price (minor units), e.g. 0 for a gift. */
        unitPrice: z.number().int().min(0).optional(),
      }),
    )
    .min(1)
    .max(10),
  couponCode: CouponCodeSchema.optional(),
  /** Required when the total is above zero. */
  paidExternally: z.boolean().default(false),
  note: z.string().trim().max(2000).optional(),
  /** Send the order confirmation email. Delivery emails always go out. */
  notifyCustomer: z.boolean().default(true),
});
export type AdminOrderCreate = z.input<typeof AdminOrderCreateSchema>;

export const AdminOrderUpdateSchema = z.object({ note: z.string().trim().max(2000).nullable() });

export const AdminDeliverySchema = z.object({
  id: z.string(),
  type: DeliveryTypeSchema,
  status: DeliveryStatusSchema,
  productId: z.string(),
  productName: z.string(),
  githubOwner: z.string().nullable(),
  githubRepo: z.string().nullable(),
  githubLogin: z.string().nullable(),
  githubInvitationId: z.string().nullable(),
  attempts: z.number().int(),
  lastError: z.string().nullable(),
  lastSyncedAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type AdminDelivery = z.infer<typeof AdminDeliverySchema>;

export const AdminPaymentSchema = z.object({
  id: z.string(),
  provider: PaymentProviderSchema,
  status: PaymentStatusSchema,
  amount: z.number().int(),
  currency: z.string(),
  providerRef: z.string().nullable(),
  providerPaymentId: z.string().nullable(),
  failureReason: z.string().nullable(),
  paidAt: z.string().nullable(),
  refundedAt: z.string().nullable(),
  createdAt: z.string(),
});

export const AdminEmailEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  recipient: z.string(),
  subject: z.string(),
  status: EmailStatusSchema,
  provider: z.string().nullable(),
  providerMessageId: z.string().nullable(),
  failureReason: z.string().nullable(),
  sentAt: z.string().nullable(),
  createdAt: z.string(),
  orderId: z.string().nullable(),
  customerId: z.string().nullable(),
});
export type AdminEmailEvent = z.infer<typeof AdminEmailEventSchema>;

const CustomerRefSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
});

export const AdminOrderSummarySchema = z.object({
  id: z.string(),
  number: z.number().int(),
  createdAt: z.string(),
  status: OrderStatusSchema,
  paymentStatus: PaymentStatusSchema,
  fulfillmentStatus: FulfillmentStatusSchema,
  source: OrderSourceSchema,
  provider: PaymentProviderSchema,
  currency: z.string(),
  total: z.number().int(),
  customer: CustomerRefSchema,
  items: z.array(z.object({ productName: z.string(), quantity: z.number().int() })),
});
export type AdminOrderSummary = z.infer<typeof AdminOrderSummarySchema>;

export const AdminOrderDetailSchema = AdminOrderSummarySchema.extend({
  subtotal: z.number().int(),
  discount: z.number().int(),
  couponCode: z.string().nullable(),
  note: z.string().nullable(),
  locale: z.string(),
  paidAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  cancelledAt: z.string().nullable(),
  refundedAt: z.string().nullable(),
  createdBy: z.object({ id: z.string(), email: z.string() }).nullable(),
  customerGithubLogin: z.string().nullable(),
  attribution: OrderAttributionSchema,
  items: z.array(OrderItemViewSchema),
  payments: z.array(AdminPaymentSchema),
  deliveries: z.array(AdminDeliverySchema),
  emails: z.array(AdminEmailEventSchema),
});
export type AdminOrderDetail = z.infer<typeof AdminOrderDetailSchema>;

// ───────────── Customers ─────────────

export const AdminCustomerSummarySchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  status: CustomerStatusSchema,
  emailVerified: z.boolean(),
  githubLogin: z.string().nullable(),
  orders: z.number().int(),
  /** Per-currency totals of paid orders (never add USD to BDT). */
  totals: z.record(z.string(), z.number().int()),
  createdAt: z.string(),
});
export type AdminCustomerSummary = z.infer<typeof AdminCustomerSummarySchema>;

export const AdminCustomerDetailSchema = AdminCustomerSummarySchema.extend({
  locale: z.string(),
  hasPassword: z.boolean(),
  lastLoginAt: z.string().nullable(),
  githubConnectedAt: z.string().nullable(),
  attribution: OrderAttributionSchema,
  orderList: z.array(AdminOrderSummarySchema),
  deliveries: z.array(AdminDeliverySchema),
  tickets: z.array(
    z.object({
      id: z.string(),
      number: z.number().int(),
      subject: z.string(),
      status: TicketStatusSchema,
      lastMessageAt: z.string(),
    }),
  ),
});
export type AdminCustomerDetail = z.infer<typeof AdminCustomerDetailSchema>;

export const AdminCustomerUpdateSchema = z.object({ status: CustomerStatusSchema });

// ───────────── Files (private R2 objects) ─────────────

export const AdminFileSchema = z.object({
  id: z.string(),
  key: z.string(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number().int(),
  createdAt: z.string(),
  uploadedBy: z.string().nullable(),
  products: z.array(
    z.object({
      productFileId: z.string(),
      productId: z.string(),
      productName: z.string(),
      label: z.string(),
      version: z.string().nullable(),
    }),
  ),
});
export type AdminFile = z.infer<typeof AdminFileSchema>;

export const AttachFileInputSchema = z.object({
  productId: z.string(),
  label: z.string().trim().min(1).max(120).optional(),
  version: z.string().trim().max(40).optional(),
});

// ───────────── Dashboard ─────────────

export const AdminDashboardSchema = z.object({
  revenue: z.record(z.string(), z.number().int()),
  revenueLast30Days: z.record(z.string(), z.number().int()),
  orders: z.number().int(),
  ordersLast30Days: z.number().int(),
  customers: z.number().int(),
  products: z.object({ published: z.number().int(), total: z.number().int() }),
  openTickets: z.number().int(),
  deliveriesNeedingAttention: z.number().int(),
  recentOrders: z.array(AdminOrderSummarySchema),
  recentCustomers: z.array(AdminCustomerSummarySchema),
  tickets: z.array(
    z.object({
      id: z.string(),
      number: z.number().int(),
      subject: z.string(),
      status: TicketStatusSchema,
      customerEmail: z.string(),
      lastMessageAt: z.string(),
    }),
  ),
});
export type AdminDashboard = z.infer<typeof AdminDashboardSchema>;

// ───────────── Settings ─────────────

export const GeneralSettingsSchema = z.object({
  storeName: z.string().trim().min(1).max(80),
  supportEmail: z.email().max(254).nullable(),
  defaultCurrency: CurrencySchema,
});
export type GeneralSettings = z.infer<typeof GeneralSettingsSchema>;

/** Integration status only: which pieces are configured. Never returns secret values. */
export const IntegrationStatusSchema = z.object({
  payments: z.object({
    stripe: z.object({
      configured: z.boolean(),
      webhookConfigured: z.boolean(),
      mode: z.enum(['test', 'live']).nullable(),
    }),
  }),
  email: z.object({
    provider: z.enum(['resend', 'smtp', 'log']),
    configured: z.boolean(),
    from: z.string(),
  }),
  storage: z.object({
    configured: z.boolean(),
    provider: z.enum(['r2', 's3', 'local']),
    bucket: z.string(),
    maxUploadMb: z.number().int(),
  }),
  github: z.object({
    app: z.boolean(),
    oauth: z.boolean(),
    webhook: z.boolean(),
    token: z.boolean(),
  }),
});
export type IntegrationStatus = z.infer<typeof IntegrationStatusSchema>;

export const AdminSettingsSchema = z.object({
  general: GeneralSettingsSchema,
  integrations: IntegrationStatusSchema,
});
export type AdminSettings = z.infer<typeof AdminSettingsSchema>;

export const TestEmailInputSchema = z.object({ to: z.email().max(254) });

export const IntegrationCheckSchema = z.object({ ok: z.boolean(), message: z.string() });
export type IntegrationCheck = z.infer<typeof IntegrationCheckSchema>;

/** Keyset page of anything. */
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), nextCursor: z.string().nullable() });
}
export type Page<T> = { items: T[]; nextCursor: string | null };
