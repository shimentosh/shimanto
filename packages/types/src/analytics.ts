import { z } from 'zod';

/**
 * The one event taxonomy for the whole app. Browser code, the API and every provider use these
 * names; nothing else is allowed.
 */
export const AnalyticsEventNameSchema = z.enum([
  // Website
  'page_view',
  'view_item',
  // Shopping
  'add_to_cart',
  'remove_from_cart',
  'begin_checkout',
  // Authentication
  'sign_up',
  'login',
  'email_verified',
  // Commerce (server only)
  'purchase',
  'refund',
  // Delivery
  'download',
  'github_access_granted',
  // Support
  'support_ticket_created',
]);
export type AnalyticsEventName = z.infer<typeof AnalyticsEventNameSchema>;

/** Events the browser may report to the internal collector. Commerce events are server-only. */
export const BrowserEventNameSchema = z.enum([
  'page_view',
  'view_item',
  'add_to_cart',
  'remove_from_cart',
  'begin_checkout',
]);
export type BrowserEventName = z.infer<typeof BrowserEventNameSchema>;

const short = z.string().trim().max(200);
const url = z.string().trim().max(2000);

/** One marketing touch: where a visit came from. */
export const TouchSchema = z.object({
  source: short.nullish(),
  medium: short.nullish(),
  campaign: short.nullish(),
  term: short.nullish(),
  content: short.nullish(),
  referrer: url.nullish(),
  landingPage: url.nullish(),
  at: z.iso.datetime().nullish(),
});
export type Touch = z.infer<typeof TouchSchema>;

/** Consent choices. Essential (orders, sessions, attribution kept first-party) is always on. */
export const ConsentSchema = z.object({
  analytics: z.boolean(),
  marketing: z.boolean(),
});
export type Consent = z.infer<typeof ConsentSchema>;

/**
 * What the browser sends with checkout / sign-up so the order or account keeps its attribution
 * and the server can match its conversion events to the browser's (never secrets or PII).
 */
export const AttributionInputSchema = z.object({
  first: TouchSchema.nullish(),
  last: TouchSchema.nullish(),
  anonymousId: z.string().max(64).nullish(),
  sessionId: z.string().max(64).nullish(),
  /** GA client id (from the `_ga` cookie), for Measurement Protocol events. */
  gaClientId: z.string().max(100).nullish(),
  /** Meta browser ids (`_fbp`, `_fbc` cookies), for Conversions API matching. */
  fbp: z.string().max(200).nullish(),
  fbc: z.string().max(300).nullish(),
  consent: ConsentSchema.nullish(),
});
export type AttributionInput = z.infer<typeof AttributionInputSchema>;

export const AnalyticsItemSchema = z.object({
  item_id: z.string().max(120),
  item_name: z.string().max(200),
  price: z.number(),
  quantity: z.number().int().min(1).max(100),
  discount: z.number().optional(),
  item_category: z.string().max(60).optional(),
});
export type AnalyticsItem = z.infer<typeof AnalyticsItemSchema>;

export const EcommerceSchema = z.object({
  transaction_id: z.string().max(120).optional(),
  value: z.number(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  discount: z.number().optional(),
  coupon: z.string().max(60).optional(),
  items: z.array(AnalyticsItemSchema).max(50),
});
export type Ecommerce = z.infer<typeof EcommerceSchema>;

/** Browser → internal collector (`POST /v1/analytics/collect`). */
export const CollectInputSchema = z.object({
  event_name: BrowserEventNameSchema,
  event_id: z.string().min(8).max(100),
  anonymous_id: z.string().min(8).max(64),
  session_id: z.string().min(8).max(64),
  page_url: url.optional(),
  referrer: url.optional(),
  attribution: TouchSchema.nullish(),
  ecommerce: EcommerceSchema.optional(),
});
export type CollectInput = z.infer<typeof CollectInputSchema>;

/** Server-confirmed purchase the browser may echo to Pixel/dataLayer with the same event id. */
export const ConfirmedPurchaseSchema = z.object({
  event_id: z.string(),
  ecommerce: EcommerceSchema,
});
export type ConfirmedPurchase = z.infer<typeof ConfirmedPurchaseSchema>;

export const CheckoutConfirmationSchema = z.object({
  orderNumber: z.number().int(),
  status: z.enum(['pending', 'confirmed', 'failed']),
  purchase: ConfirmedPurchaseSchema.nullable(),
});
export type CheckoutConfirmation = z.infer<typeof CheckoutConfirmationSchema>;

// ───────────── Settings ─────────────

const gaId = z
  .string()
  .trim()
  .regex(/^G-[A-Z0-9]{4,20}$/, 'e.g. G-ABC123XYZ');
const gtmId = z
  .string()
  .trim()
  .regex(/^GTM-[A-Z0-9]{4,12}$/, 'e.g. GTM-ABCD123');
const pixelId = z
  .string()
  .trim()
  .regex(/^\d{8,20}$/, 'the numeric Pixel ID');
const adsId = z
  .string()
  .trim()
  .regex(/^AW-\d{6,15}$/, 'e.g. AW-123456789');

/** Stored in the Setting table (admin-editable). Only public IDs: tokens live in env. */
export const TrackingSettingsSchema = z.object({
  ga4Enabled: z.boolean(),
  ga4MeasurementId: gaId.nullable(),
  gtmEnabled: z.boolean(),
  gtmContainerId: gtmId.nullable(),
  metaPixelEnabled: z.boolean(),
  metaPixelId: pixelId.nullable(),
  metaCapiEnabled: z.boolean(),
  googleAdsEnabled: z.boolean(),
  googleAdsConversionId: adsId.nullable(),
  googleAdsConversionLabel: z.string().trim().max(60).nullable(),
  utmTracking: z.boolean(),
  firstTouch: z.boolean(),
  lastTouch: z.boolean(),
  /** Ask before analytics / marketing tags run (banner). Off = tags run for everyone. */
  requireConsent: z.boolean(),
});
export type TrackingSettings = z.infer<typeof TrackingSettingsSchema>;

/** What the public site needs to load tags (no secrets). */
export const PublicTrackingConfigSchema = z.object({
  ga4MeasurementId: z.string().nullable(),
  gtmContainerId: z.string().nullable(),
  metaPixelId: z.string().nullable(),
  googleAds: z
    .object({ conversionId: z.string(), conversionLabel: z.string().nullable() })
    .nullable(),
  utmTracking: z.boolean(),
  firstTouch: z.boolean(),
  lastTouch: z.boolean(),
  requireConsent: z.boolean(),
});
export type PublicTrackingConfig = z.infer<typeof PublicTrackingConfigSchema>;

export const TrackingHealthSchema = z.object({
  ga4: z.object({ configured: z.boolean(), serverSide: z.boolean() }),
  gtm: z.object({ configured: z.boolean() }),
  metaPixel: z.object({ configured: z.boolean() }),
  metaCapi: z.object({ configured: z.boolean(), tokenSet: z.boolean(), apiVersion: z.string() }),
  googleAds: z.object({ configured: z.boolean() }),
});
export type TrackingHealth = z.infer<typeof TrackingHealthSchema>;

export const AdminTrackingSchema = z.object({
  settings: TrackingSettingsSchema,
  health: TrackingHealthSchema,
});
export type AdminTracking = z.infer<typeof AdminTrackingSchema>;

// ───────────── Reports (internal database) ─────────────

export const AnalyticsRangeSchema = z.object({
  from: z.iso.datetime(),
  to: z.iso.datetime(),
});

const money = z.record(z.string(), z.number().int());

export const SalesReportSchema = z.object({
  from: z.string(),
  to: z.string(),
  revenue: money,
  refunds: money,
  netRevenue: money,
  averageOrderValue: money,
  orders: z.number().int(),
  paidOrders: z.number().int(),
  freeOrders: z.number().int(),
  refundedOrders: z.number().int(),
  newCustomers: z.number().int(),
  visitors: z.number().int(),
  sessions: z.number().int(),
  /** Orders ÷ sessions, 0–1. Sessions only count visitors who allowed analytics. */
  conversionRate: z.number(),
  daily: z.array(z.object({ date: z.string(), orders: z.number().int(), revenue: money })),
});
export type SalesReport = z.infer<typeof SalesReportSchema>;

export const ProductReportRowSchema = z.object({
  productId: z.string(),
  name: z.string(),
  views: z.number().int(),
  addToCart: z.number().int(),
  checkouts: z.number().int(),
  orders: z.number().int(),
  freeOrders: z.number().int(),
  revenue: money,
  conversionRate: z.number(),
});
export type ProductReportRow = z.infer<typeof ProductReportRowSchema>;

export const AttributionModelSchema = z.enum(['first', 'last']);
export type AttributionModel = z.infer<typeof AttributionModelSchema>;

export const SourceReportRowSchema = z.object({
  source: z.string(),
  medium: z.string(),
  campaign: z.string(),
  visitors: z.number().int(),
  orders: z.number().int(),
  revenue: money,
});
export type SourceReportRow = z.infer<typeof SourceReportRowSchema>;

export const AnalyticsDeliverySchema = z.object({
  id: z.string(),
  provider: z.string(),
  status: z.enum(['PENDING', 'SENT', 'FAILED', 'SKIPPED']),
  attempts: z.number().int(),
  lastError: z.string().nullable(),
  sentAt: z.string().nullable(),
});

export const AnalyticsEventRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  eventId: z.string(),
  source: z.enum(['server', 'browser']),
  customer: z.object({ id: z.string(), email: z.string(), name: z.string().nullable() }).nullable(),
  order: z.object({ id: z.string(), number: z.number().int() }).nullable(),
  productId: z.string().nullable(),
  value: z.number().int().nullable(),
  currency: z.string().nullable(),
  attribution: z.object({
    source: z.string().nullable(),
    medium: z.string().nullable(),
    campaign: z.string().nullable(),
  }),
  deliveries: z.array(AnalyticsDeliverySchema),
  createdAt: z.string(),
});
export type AnalyticsEventRow = z.infer<typeof AnalyticsEventRowSchema>;

/** Attribution kept on an order / customer, for admin views. */
export const OrderAttributionSchema = z.object({
  first: TouchSchema.nullable(),
  last: TouchSchema.nullable(),
});
export type OrderAttribution = z.infer<typeof OrderAttributionSchema>;
