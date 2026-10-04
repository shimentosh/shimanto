import { z } from 'zod';
import { AttributionInputSchema, ConfirmedPurchaseSchema } from './analytics.js';
import {
  CouponTypeSchema,
  DeliveryStatusSchema,
  DeliveryTypeSchema,
  FulfillmentStatusSchema,
  LocaleSchema,
  OrderSourceSchema,
  OrderStatusSchema,
  PaymentProviderSchema,
  PaymentStatusSchema,
  ProductStatusSchema,
  ProductTypeSchema,
} from './enums.js';

export const SlugSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'lowercase words separated by hyphens');

/** ISO 4217 code. Stripe charges in the product's currency. */
export const CurrencySchema = z.string().regex(/^[A-Z]{3}$/, 'ISO 4217, e.g. USD');

/** Minor units (cents). */
export const AmountSchema = z.number().int().min(0).max(100_000_000);

export const PublicMediaSchema = z.object({
  id: z.string(),
  url: z.string(),
  mimeType: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  alt: z.string().nullable(),
  blurDataUrl: z.string().nullable(),
  variants: z.array(z.object({ url: z.string(), width: z.number(), height: z.number() })),
});
export type PublicMedia = z.infer<typeof PublicMediaSchema>;

// ───────────── Products ─────────────

/** GitHub owner / repository names (GitHub's own character rules). */
export const GitHubOwnerSchema = z
  .string()
  .trim()
  .min(1)
  .max(39)
  .regex(/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/, 'a GitHub user or organisation name');
export const GitHubRepoSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9._-]+$/, 'a GitHub repository name');

/** What the public site needs to render a product: sales info, price and how it is delivered. */
export const PublicProductSchema = z.object({
  slug: z.string(),
  name: z.string(),
  summary: z.string().nullable(),
  description: z.string().nullable(),
  type: ProductTypeSchema,
  /** Minor units (cents). 0 = free. */
  price: z.number().int(),
  compareAtPrice: z.number().int().nullable(),
  currency: z.string(),
  free: z.boolean(),
  cover: PublicMediaSchema.nullable(),
  version: z.string().nullable(),
  features: z.array(z.string()),
  requirements: z.array(z.string()),
  deliveryMethods: z.array(DeliveryTypeSchema),
  /** Number of files the buyer receives (names stay private until purchase). */
  fileCount: z.number().int(),
  /** Delivered as GitHub repository access: the buyer needs a connected GitHub account. */
  requiresGithub: z.boolean(),
});
export type PublicProduct = z.infer<typeof PublicProductSchema>;

export const ProductFileInputSchema = z.object({
  mediaId: z.string(),
  label: z.string().trim().min(1).max(120).optional(),
  version: z.string().trim().max(40).optional(),
});

export const ProductInputSchema = z
  .object({
    slug: SlugSchema,
    name: z.string().trim().min(1).max(120),
    summary: z.string().trim().max(300).nullish(),
    description: z.string().trim().max(20_000).nullish(),
    type: ProductTypeSchema.default('DIGITAL_PRODUCT'),
    price: AmountSchema,
    compareAtPrice: AmountSchema.nullish(),
    currency: CurrencySchema.default('USD'),
    coverId: z.string().nullish(),
    features: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
    requirements: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
    version: z.string().trim().max(40).nullish(),
    deliverFiles: z.boolean().default(false),
    deliverGithub: z.boolean().default(false),
    githubOwner: GitHubOwnerSchema.nullish(),
    githubRepo: GitHubRepoSchema.nullish(),
    files: z.array(ProductFileInputSchema).max(50).default([]),
  })
  .superRefine((p, ctx) => {
    if (p.deliverGithub && (!p.githubOwner || !p.githubRepo)) {
      ctx.addIssue({
        code: 'custom',
        path: ['githubRepo'],
        message: 'Set the repository owner and name for GitHub delivery',
      });
    }
    if (p.compareAtPrice != null && p.compareAtPrice <= p.price) {
      ctx.addIssue({
        code: 'custom',
        path: ['compareAtPrice'],
        message: 'The compare-at price must be higher than the price',
      });
    }
  });
export type ProductInput = z.input<typeof ProductInputSchema>;

/** Partial update: same rules, every field optional. */
export const ProductUpdateSchema = z.object({
  slug: SlugSchema.optional(),
  name: z.string().trim().min(1).max(120).optional(),
  summary: z.string().trim().max(300).nullish(),
  description: z.string().trim().max(20_000).nullish(),
  type: ProductTypeSchema.optional(),
  price: AmountSchema.optional(),
  compareAtPrice: AmountSchema.nullish(),
  currency: CurrencySchema.optional(),
  coverId: z.string().nullish(),
  features: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
  requirements: z.array(z.string().trim().min(1).max(200)).max(30).optional(),
  version: z.string().trim().max(40).nullish(),
  deliverFiles: z.boolean().optional(),
  deliverGithub: z.boolean().optional(),
  githubOwner: GitHubOwnerSchema.nullish(),
  githubRepo: GitHubRepoSchema.nullish(),
  files: z.array(ProductFileInputSchema).max(50).optional(),
});
export type ProductUpdate = z.input<typeof ProductUpdateSchema>;

export const AdminProductSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  summary: z.string().nullable(),
  description: z.string().nullable(),
  type: ProductTypeSchema,
  status: ProductStatusSchema,
  price: z.number().int(),
  compareAtPrice: z.number().int().nullable(),
  currency: z.string(),
  cover: PublicMediaSchema.nullable(),
  features: z.array(z.string()),
  requirements: z.array(z.string()),
  version: z.string().nullable(),
  deliverFiles: z.boolean(),
  deliverGithub: z.boolean(),
  githubOwner: z.string().nullable(),
  githubRepo: z.string().nullable(),
  files: z.array(
    z.object({
      id: z.string(),
      mediaId: z.string(),
      label: z.string(),
      version: z.string().nullable(),
      filename: z.string(),
      mimeType: z.string(),
      size: z.number().int(),
    }),
  ),
  sales: z.number().int(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type AdminProduct = z.infer<typeof AdminProductSchema>;

// ───────────── Checkout ─────────────

export const CartItemInputSchema = z.object({
  slug: SlugSchema,
  quantity: z.number().int().min(1).max(10).default(1),
});

export const CouponCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[A-Za-z0-9_-]+$/, 'letters, numbers, - and _')
  .transform((v) => v.toUpperCase());

export const CheckoutQuoteInputSchema = z.object({
  items: z.array(CartItemInputSchema).min(1).max(10),
  couponCode: CouponCodeSchema.optional(),
});
export type CheckoutQuoteInput = z.input<typeof CheckoutQuoteInputSchema>;

export const QuoteLineSchema = z.object({
  productId: z.string(),
  slug: z.string(),
  name: z.string(),
  type: ProductTypeSchema,
  unitPrice: z.number().int(),
  quantity: z.number().int(),
  discount: z.number().int(),
  total: z.number().int(),
  deliveryMethods: z.array(DeliveryTypeSchema),
});

export const CheckoutQuoteSchema = z.object({
  currency: z.string(),
  items: z.array(QuoteLineSchema),
  subtotal: z.number().int(),
  discount: z.number().int(),
  total: z.number().int(),
  coupon: z
    .object({ code: z.string(), type: CouponTypeSchema, value: z.number().int() })
    .nullable(),
  /** Why a submitted coupon was not applied (expired, not valid for these products…). */
  couponError: z.string().nullable(),
  paymentRequired: z.boolean(),
  requiresGithub: z.boolean(),
});
export type CheckoutQuote = z.infer<typeof CheckoutQuoteSchema>;

const honeypot = z.string().max(500).optional();

/**
 * Checkout. A signed-in customer can omit email/name. A guest gives an email (and optionally a
 * password to create their account right away). Existing accounts are never signed in by checkout.
 */
export const CheckoutInputSchema = z.object({
  items: z.array(CartItemInputSchema).min(1).max(10),
  couponCode: CouponCodeSchema.optional(),
  email: z.email().max(254).optional(),
  name: z.string().trim().max(120).optional(),
  password: z.string().min(8).max(200).optional(),
  locale: LocaleSchema.default('en'),
  turnstileToken: z.string().min(1).max(4096),
  utm: z.record(z.string().max(40), z.string().max(200)).optional(),
  /** First/last touch, anonymous ids and consent from the browser (optional). */
  attribution: AttributionInputSchema.optional(),
  website: honeypot,
});
export type CheckoutInput = z.input<typeof CheckoutInputSchema>;

/** Paid: send the buyer to the payment page. $0: done, the order is being fulfilled. */
export const CheckoutResultSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('redirect'), url: z.url(), orderNumber: z.number().int() }),
  z.object({
    kind: z.literal('complete'),
    orderNumber: z.number().int(),
    /** A session was started for a brand-new account. */
    signedIn: z.boolean(),
    portalUrl: z.string(),
    /** Server-confirmed $0 purchase, for browser pixels (same event id as the server event). */
    purchase: ConfirmedPurchaseSchema.nullable().optional(),
  }),
]);
export type CheckoutResult = z.infer<typeof CheckoutResultSchema>;

// ───────────── Orders & delivery (views) ─────────────

export const DeliveryFileSchema = z.object({
  id: z.string(),
  label: z.string(),
  filename: z.string(),
  version: z.string().nullable(),
  size: z.number().int(),
  mimeType: z.string(),
});
export type DeliveryFile = z.infer<typeof DeliveryFileSchema>;

/** A delivery as a customer sees it: friendly status, no internal errors or credentials. */
export const DeliveryViewSchema = z.object({
  id: z.string(),
  type: DeliveryTypeSchema,
  status: DeliveryStatusSchema,
  productId: z.string(),
  productName: z.string(),
  deliveredAt: z.string().nullable(),
  /** R2 deliveries: the downloadable files (only when READY). */
  files: z.array(DeliveryFileSchema),
  /** GitHub deliveries. Repository details appear once access has been initiated. */
  github: z
    .object({
      login: z.string().nullable(),
      repository: z.string().nullable(),
      url: z.string().nullable(),
      canRetry: z.boolean(),
    })
    .nullable(),
});
export type DeliveryView = z.infer<typeof DeliveryViewSchema>;

export const OrderItemViewSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  productSlug: z.string(),
  productType: ProductTypeSchema,
  unitPrice: z.number().int(),
  quantity: z.number().int(),
  discount: z.number().int(),
  total: z.number().int(),
});

export const OrderSummarySchema = z.object({
  id: z.string(),
  number: z.number().int(),
  createdAt: z.string(),
  status: OrderStatusSchema,
  paymentStatus: PaymentStatusSchema,
  fulfillmentStatus: FulfillmentStatusSchema,
  currency: z.string(),
  total: z.number().int(),
  items: z.array(z.object({ productName: z.string(), quantity: z.number().int() })),
});
export type OrderSummary = z.infer<typeof OrderSummarySchema>;

export const OrderDetailSchema = OrderSummarySchema.extend({
  subtotal: z.number().int(),
  discount: z.number().int(),
  couponCode: z.string().nullable(),
  provider: PaymentProviderSchema,
  source: OrderSourceSchema,
  paidAt: z.string().nullable(),
  items: z.array(OrderItemViewSchema),
  deliveries: z.array(DeliveryViewSchema),
});
export type OrderDetail = z.infer<typeof OrderDetailSchema>;

// ───────────── Coupons ─────────────

export const CouponInputSchema = z
  .object({
    code: CouponCodeSchema,
    type: CouponTypeSchema,
    /** PERCENT: 1–100. FIXED: minor units. */
    value: z.number().int().min(1),
    currency: CurrencySchema.nullish(),
    description: z.string().trim().max(200).nullish(),
    active: z.boolean().default(true),
    expiresAt: z.iso.datetime().nullish(),
    usageLimit: z.number().int().min(1).nullish(),
    productIds: z.array(z.string()).max(100).default([]),
  })
  .superRefine((c, ctx) => {
    if (c.type === 'PERCENT' && c.value > 100) {
      ctx.addIssue({ code: 'custom', path: ['value'], message: 'A percentage is at most 100' });
    }
  });
export type CouponInput = z.input<typeof CouponInputSchema>;

export const CouponSchema = z.object({
  id: z.string(),
  code: z.string(),
  type: CouponTypeSchema,
  value: z.number().int(),
  currency: z.string().nullable(),
  description: z.string().nullable(),
  active: z.boolean(),
  expiresAt: z.string().nullable(),
  usageLimit: z.number().int().nullable(),
  usedCount: z.number().int(),
  products: z.array(z.object({ id: z.string(), name: z.string() })),
  createdAt: z.string(),
});
export type Coupon = z.infer<typeof CouponSchema>;

// ───────────── Legacy buyer access (email sign-in link) ─────────────

export const LoginLinkInputSchema = z.object({
  email: z.email().max(254),
  locale: LocaleSchema.default('en'),
});
