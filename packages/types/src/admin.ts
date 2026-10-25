import { z } from 'zod';
import { OrderAttributionSchema } from './analytics.js';
import {
  CouponCodeSchema,
  CurrencySchema,
  ManualMethodFieldSchema,
  ManualMethodKindSchema,
  ManualMethodViewSchema,
  ManualPaymentStateSchema,
  OrderItemViewSchema,
  ProofRequirementSchema,
} from './commerce.js';
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
  /** Manual payments: the method as it was at order time, and the customer's proof. */
  manual: z
    .object({
      method: ManualMethodViewSchema,
      state: ManualPaymentStateSchema,
      reference: z.string().nullable(),
      senderAccount: z.string().nullable(),
      proof: z.object({ filename: z.string(), mimeType: z.string() }).nullable(),
      submittedAt: z.string().nullable(),
      rejectedReason: z.string().nullable(),
      /** Other orders whose payment used the same reference (possible reuse). */
      duplicateOrders: z.array(z.number().int()),
    })
    .nullable(),
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
  /** Manual payments: unpaid orders are cancelled after this. */
  paymentDueAt: z.string().nullable(),
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
  /** Manual payments with proof sent, waiting for an admin to confirm or reject. */
  paymentsToVerify: z.number().int(),
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

// ───────────── Payment settings ─────────────

const MethodIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, numbers and dashes')
  .max(40);

/** A manual payment method (bKash, bank transfer…) as the admin configures it. */
export const ManualMethodSchema = z.object({
  id: MethodIdSchema,
  kind: ManualMethodKindSchema,
  name: z.string().trim().min(1).max(60),
  enabled: z.boolean(),
  description: z.string().trim().max(160).nullable(),
  /** Public media ids (uploaded in the media library). */
  logoId: z.string().nullable(),
  qrId: z.string().nullable(),
  fields: z.array(ManualMethodFieldSchema).max(10),
  instructions: z.string().trim().min(1).max(2000),
  referenceLabel: z.string().trim().min(1).max(60),
  senderLabel: z.string().trim().max(60).nullable(),
  proof: ProofRequirementSchema,
  /** Offered only for these currencies; empty = every currency. */
  currencies: z.array(CurrencySchema).max(20),
});
export type ManualMethod = z.infer<typeof ManualMethodSchema>;

export const ManualPaymentSettingsSchema = z.object({
  methods: z
    .array(ManualMethodSchema)
    .max(12)
    .refine((m) => new Set(m.map((x) => x.id)).size === m.length, 'Method ids must be unique'),
  /** Hours a buyer has to pay; unpaid orders are cancelled after it (reminder halfway). */
  windowHours: z.number().int().min(1).max(720),
});
export type ManualPaymentSettings = z.infer<typeof ManualPaymentSettingsSchema>;

/** Where a provider's keys come from: the server environment wins over admin-entered keys. */
export const SecretSourceSchema = z.enum(['env', 'admin']).nullable();

/** Payment settings for the admin. Secret keys are write-only: only a hint is returned. */
export const PaymentSettingsViewSchema = z.object({
  stripe: z.object({
    enabled: z.boolean(),
    /** A secret key is set (env or admin) and enabled: offered at checkout. */
    active: z.boolean(),
    source: SecretSourceSchema,
    mode: z.enum(['test', 'live']).nullable(),
    secretKeyHint: z.string().nullable(),
    webhookSecretSet: z.boolean(),
    webhookUrl: z.string(),
  }),
  paypal: z.object({
    enabled: z.boolean(),
    active: z.boolean(),
    source: SecretSourceSchema,
    mode: z.enum(['sandbox', 'live']),
    clientId: z.string().nullable(),
    clientSecretHint: z.string().nullable(),
    webhookId: z.string().nullable(),
    webhookUrl: z.string(),
    /** Currencies PayPal accepts; carts in other currencies don't offer PayPal. */
    currencies: z.array(z.string()),
  }),
  manual: ManualPaymentSettingsSchema.extend({
    methods: z.array(
      ManualMethodSchema.extend({ logoUrl: z.string().nullable(), qrUrl: z.string().nullable() }),
    ),
  }),
  /** Secrets are encrypted with SETTINGS_ENCRYPTION_KEY (else a key derived from the JWT secret). */
  encryptionKeySet: z.boolean(),
});
export type PaymentSettingsView = z.infer<typeof PaymentSettingsViewSchema>;

/**
 * Partial update. Secrets: a string sets it, null clears it, omitted keeps it. Keys set in the
 * server environment can't be changed here.
 */
export const PaymentSettingsUpdateSchema = z.object({
  stripe: z
    .object({
      enabled: z.boolean().optional(),
      secretKey: z
        .string()
        .trim()
        .regex(/^(sk|rk)_(test|live)_\w+$/, 'A Stripe secret key (sk_…)')
        .nullish(),
      webhookSecret: z
        .string()
        .trim()
        .regex(/^whsec_\w+$/, 'A webhook signing secret (whsec_…)')
        .nullish(),
    })
    .optional(),
  paypal: z
    .object({
      enabled: z.boolean().optional(),
      mode: z.enum(['sandbox', 'live']).optional(),
      clientId: z.string().trim().min(10).max(200).nullish(),
      clientSecret: z.string().trim().min(10).max(200).nullish(),
      webhookId: z.string().trim().min(5).max(80).nullish(),
    })
    .optional(),
  manual: ManualPaymentSettingsSchema.optional(),
});
export type PaymentSettingsUpdate = z.infer<typeof PaymentSettingsUpdateSchema>;

// ───────────── Storage settings ─────────────

export const StorageProviderSchema = z.enum(['r2', 's3', 'custom']);
export type StorageProvider = z.infer<typeof StorageProviderSchema>;

/** Storage connection as entered in the admin (Cloudflare R2, AWS S3 or any S3-compatible). */
export const StorageConfigInputSchema = z
  .object({
    provider: StorageProviderSchema,
    /** R2: the Cloudflare account id (endpoint https://<id>.r2.cloudflarestorage.com). */
    accountId: z
      .string()
      .trim()
      .regex(/^[a-f0-9]{32}$/, 'The 32-character account id from the R2 dashboard')
      .nullish(),
    /** S3 / custom: the endpoint URL (S3 may leave it empty to use AWS). */
    endpoint: z.url().nullish(),
    region: z.string().trim().min(1).max(40).nullish(),
    bucket: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/, 'A bucket name (lowercase, 3–63 chars)'),
    /** Where public cover images are served from: an r2.dev URL or a custom domain. */
    publicUrl: z.url(),
    accessKeyId: z.string().trim().min(8).max(200),
    /** Write-only. Omit to keep the saved one. */
    secretAccessKey: z.string().trim().min(8).max(200).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.provider === 'r2' && !v.accountId) {
      ctx.addIssue({ code: 'custom', path: ['accountId'], message: 'Enter the R2 account id' });
    }
    if (v.provider === 'custom' && !v.endpoint) {
      ctx.addIssue({ code: 'custom', path: ['endpoint'], message: 'Enter the S3 endpoint URL' });
    }
  });
export type StorageConfigInput = z.infer<typeof StorageConfigInputSchema>;

/** Which storage is live, and the admin-entered connection (secret as a hint only). */
export const StorageSettingsViewSchema = z.object({
  /** `admin`: the connection saved here; `env`: S3_* environment variables. */
  source: z.enum(['admin', 'env']),
  provider: z.enum(['r2', 's3', 'local']),
  bucket: z.string(),
  publicUrl: z.string(),
  configured: z.boolean(),
  maxUploadMb: z.number().int(),
  saved: z
    .object({
      provider: StorageProviderSchema,
      accountId: z.string().nullable(),
      endpoint: z.string().nullable(),
      region: z.string().nullable(),
      bucket: z.string(),
      publicUrl: z.string(),
      accessKeyId: z.string(),
      secretKeyHint: z.string(),
    })
    .nullable(),
  encryptionKeySet: z.boolean(),
});
export type StorageSettingsView = z.infer<typeof StorageSettingsViewSchema>;

export const ManualPaymentRejectSchema = z.object({
  reason: z.string().trim().min(3).max(300),
});
export type ManualPaymentReject = z.infer<typeof ManualPaymentRejectSchema>;

export const TestEmailInputSchema = z.object({ to: z.email().max(254) });

export const IntegrationCheckSchema = z.object({ ok: z.boolean(), message: z.string() });
export type IntegrationCheck = z.infer<typeof IntegrationCheckSchema>;

/** Keyset page of anything. */
export function pageSchema<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), nextCursor: z.string().nullable() });
}
export type Page<T> = { items: T[]; nextCursor: string | null };
