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
  ProductVisibilitySchema,
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

/** The video id from a YouTube link (watch, youtu.be, embed or shorts), or null. */
export function youtubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/,
  );
  return match?.[1] ?? null;
}

/** A feature block on the sales page. */
export const ProductBenefitSchema = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(400),
});
export type ProductBenefit = z.infer<typeof ProductBenefitSchema>;

/** A product-specific question, shown before the store-wide ones. */
export const ProductFaqSchema = z.object({
  q: z.string().trim().min(1).max(200),
  a: z.string().trim().min(1).max(1500),
});
export type ProductFaq = z.infer<typeof ProductFaqSchema>;

const WebUrlSchema = z.url({ protocol: /^https?$/ }).max(300);
const YouTubeUrlSchema = WebUrlSchema.refine((v) => youtubeId(v) !== null, 'a YouTube video link');

/** Sales-page fields, shared by create (with defaults) and update (all optional). */
const salesPage = {
  visibility: ProductVisibilitySchema,
  featured: z.boolean(),
  tagline: z.string().trim().max(160).nullish(),
  badge: z.string().trim().max(24).nullish(),
  highlights: z.array(z.string().trim().min(1).max(60)).max(4),
  benefits: z.array(ProductBenefitSchema).max(8),
  faq: z.array(ProductFaqSchema).max(12),
  demoUrl: WebUrlSchema.nullish(),
  videoUrl: YouTubeUrlSchema.nullish(),
  /** Public images for the gallery, in order. Replaces the whole gallery. */
  galleryIds: z.array(z.string()).max(12),
};

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
  /** False for unlisted products: reachable by link, kept out of listings and search. */
  listed: z.boolean(),
  featured: z.boolean(),
  tagline: z.string().nullable(),
  badge: z.string().nullable(),
  highlights: z.array(z.string()),
  benefits: z.array(ProductBenefitSchema),
  faq: z.array(ProductFaqSchema),
  demoUrl: z.string().nullable(),
  videoUrl: z.string().nullable(),
  gallery: z.array(PublicMediaSchema),
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
    visibility: salesPage.visibility.default('LISTED'),
    featured: salesPage.featured.default(false),
    tagline: salesPage.tagline,
    badge: salesPage.badge,
    highlights: salesPage.highlights.default([]),
    benefits: salesPage.benefits.default([]),
    faq: salesPage.faq.default([]),
    demoUrl: salesPage.demoUrl,
    videoUrl: salesPage.videoUrl,
    galleryIds: salesPage.galleryIds.default([]),
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
  visibility: salesPage.visibility.optional(),
  featured: salesPage.featured.optional(),
  tagline: salesPage.tagline,
  badge: salesPage.badge,
  highlights: salesPage.highlights.optional(),
  benefits: salesPage.benefits.optional(),
  faq: salesPage.faq.optional(),
  demoUrl: salesPage.demoUrl,
  videoUrl: salesPage.videoUrl,
  galleryIds: salesPage.galleryIds.optional(),
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
  visibility: ProductVisibilitySchema,
  featured: z.boolean(),
  tagline: z.string().nullable(),
  badge: z.string().nullable(),
  highlights: z.array(z.string()),
  benefits: z.array(ProductBenefitSchema),
  faq: z.array(ProductFaqSchema),
  demoUrl: z.string().nullable(),
  videoUrl: z.string().nullable(),
  gallery: z.array(PublicMediaSchema),
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

// ───────────── Payment options ─────────────

export const ManualMethodKindSchema = z.enum(['MOBILE_WALLET', 'BANK_TRANSFER', 'OTHER']);
export type ManualMethodKind = z.infer<typeof ManualMethodKindSchema>;

/** One "label: value" line of a manual method, e.g. "bKash number: 01700000000". */
export const ManualMethodFieldSchema = z.object({
  label: z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(200),
});
export type ManualMethodField = z.infer<typeof ManualMethodFieldSchema>;

export const ProofRequirementSchema = z.enum(['OFF', 'OPTIONAL', 'REQUIRED']);
export type ProofRequirement = z.infer<typeof ProofRequirementSchema>;

/** A manual payment method as buyers see it (checkout, order page, email). */
export const ManualMethodViewSchema = z.object({
  id: z.string(),
  kind: ManualMethodKindSchema,
  name: z.string(),
  /** One line under the name at checkout, e.g. "Send Money from any bKash account". */
  description: z.string().nullable(),
  logoUrl: z.string().nullable(),
  qrUrl: z.string().nullable(),
  fields: z.array(ManualMethodFieldSchema),
  /** Step-by-step instructions, one step per line. */
  instructions: z.string(),
  /** What the buyer types as proof, e.g. "Transaction ID (TrxID)". */
  referenceLabel: z.string(),
  /** Asked when set, e.g. "bKash number you sent from"; null = not asked. */
  senderLabel: z.string().nullable(),
  /** Screenshot / receipt upload. */
  proof: ProofRequirementSchema,
});
export type ManualMethodView = z.infer<typeof ManualMethodViewSchema>;

export const PaymentOptionTypeSchema = z.enum(['stripe', 'paypal', 'manual']);
export type PaymentOptionType = z.infer<typeof PaymentOptionTypeSchema>;

/**
 * One way to pay a cart, in the store's order. `id` is what checkout sends back:
 * "stripe", "paypal" or "manual:<method id>". Only options for the cart's currency are listed.
 */
export const PaymentOptionSchema = z.object({
  id: z.string(),
  type: PaymentOptionTypeSchema,
  name: z.string(),
  description: z.string().nullable(),
  manual: ManualMethodViewSchema.nullable(),
});
export type PaymentOption = z.infer<typeof PaymentOptionSchema>;

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
  /** Ways to pay this cart (empty when nothing is set up for its currency). */
  paymentOptions: z.array(PaymentOptionSchema),
  /** Manual payments: hours the buyer has to pay before the order is cancelled. */
  paymentWindowHours: z.number().int(),
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
  /** Paid carts only: a `PaymentOption.id`. Defaults to the first option offered. */
  paymentOption: z.string().max(80).optional(),
  /** Manual payments: proof sent right away when the buyer has already paid (optional). */
  manualProof: z
    .object({
      reference: z.string().trim().min(3).max(120),
      senderAccount: z.string().trim().max(120).optional(),
    })
    .optional(),
  website: honeypot,
});
export type CheckoutInput = z.input<typeof CheckoutInputSchema>;

/**
 * Card / PayPal: send the buyer to the provider's payment page. Manual: the order waits for the
 * buyer to pay and an admin to confirm it. $0: done, the order is being fulfilled.
 */
export const CheckoutResultSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('redirect'), url: z.url(), orderNumber: z.number().int() }),
  z.object({
    kind: z.literal('manual'),
    orderNumber: z.number().int(),
    signedIn: z.boolean(),
    portalUrl: z.string(),
  }),
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

/**
 * Where a manual payment stands: AWAITING (not paid yet), SUBMITTED (proof sent, being checked),
 * REJECTED (proof didn't match; send it again), CONFIRMED (paid), CLOSED (cancelled / refunded).
 */
export const ManualPaymentStateSchema = z.enum([
  'AWAITING',
  'SUBMITTED',
  'REJECTED',
  'CONFIRMED',
  'CLOSED',
]);
export type ManualPaymentState = z.infer<typeof ManualPaymentStateSchema>;

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
  /** Manual-payment checkout orders: how to pay, and where the payment stands. */
  manualPayment: z
    .object({
      method: ManualMethodViewSchema,
      state: ManualPaymentStateSchema,
      /** Pay before this or the order is cancelled. */
      dueAt: z.string().nullable(),
      reference: z.string().nullable(),
      senderAccount: z.string().nullable(),
      proof: z.object({ filename: z.string() }).nullable(),
      submittedAt: z.string().nullable(),
      rejectedReason: z.string().nullable(),
    })
    .nullable(),
});
export type OrderDetail = z.infer<typeof OrderDetailSchema>;

/**
 * The customer's proof of a manual payment: the bank / wallet transaction id, the account it was
 * sent from, and (multipart field `proof`) a screenshot or receipt.
 */
export const ManualPaymentSubmitSchema = z.object({
  reference: z.string().trim().min(3).max(120),
  senderAccount: z.string().trim().max(120).optional(),
});
export type ManualPaymentSubmit = z.infer<typeof ManualPaymentSubmitSchema>;

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
