import { z } from 'zod';

/** Supported locales. English is the default and lives at `/`; Bangla lives at `/bn`. */
export const LOCALES = ['en', 'bn'] as const;
export const DEFAULT_LOCALE = 'en' satisfies Locale;
export const LocaleSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof LocaleSchema>;

/** Venture / project lifecycle (used by code-defined content in the web app). */
export const VentureStatusSchema = z.enum([
  'LIVE',
  'PARTIAL',
  'BUILDING',
  'PAUSED',
  'SUNSET',
  'EXITED',
]);
export type VentureStatus = z.infer<typeof VentureStatusSchema>;

export const ExperimentStageSchema = z.enum(['IDEA', 'PROTOTYPE', 'TESTING', 'SHIPPED', 'FAILED']);
export type ExperimentStage = z.infer<typeof ExperimentStageSchema>;

export const LeadIntentSchema = z.enum([
  'WORK_WITH_ME',
  'BUILD_SOMETHING',
  'BUSINESS_COLLABORATION',
  'PRODUCT_COLLABORATION',
  'CONSULTING',
  'PARTNERSHIP',
  'SPEAKING',
  'SUPPORT',
  'OTHER',
]);
export type LeadIntent = z.infer<typeof LeadIntentSchema>;

export const LeadStatusSchema = z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST']);
export type LeadStatus = z.infer<typeof LeadStatusSchema>;

/** Order lifecycle. Payment and fulfillment have their own status fields. */
export const OrderStatusSchema = z.enum([
  'PENDING',
  'PAID',
  'PROCESSING',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

/** Admin panel roles. Buyers are customers (see account.ts), not users. */
export const RoleSchema = z.enum(['SUPER_ADMIN', 'EDITOR']);
export type Role = z.infer<typeof RoleSchema>;

export const WinTypeSchema = z.enum(['LAUNCH', 'USERS', 'VIEWS', 'REVENUE', 'PRESS']);
export type WinType = z.infer<typeof WinTypeSchema>;

/** Each major section of the site "owns" one accent colour (brief §2.1). */
export const WorldSchema = z.enum(['build', 'create', 'spark', 'signal', 'idea']);
export type World = z.infer<typeof WorldSchema>;

export const ProductTypeSchema = z.enum(['SOFTWARE', 'DIGITAL_PRODUCT', 'SOURCE_CODE']);
export type ProductType = z.infer<typeof ProductTypeSchema>;

export const ProductStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
export type ProductStatus = z.infer<typeof ProductStatusSchema>;

export const PaymentStatusSchema = z.enum([
  'PENDING',
  'PAID',
  'FAILED',
  'REFUNDED',
  'NOT_REQUIRED',
]);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const FulfillmentStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'PARTIALLY_DELIVERED',
  'DELIVERED',
  'FAILED',
  'COMPLETED',
]);
export type FulfillmentStatus = z.infer<typeof FulfillmentStatusSchema>;

export const PaymentProviderSchema = z.enum(['FREE', 'STRIPE', 'MANUAL']);
export type PaymentProvider = z.infer<typeof PaymentProviderSchema>;

export const OrderSourceSchema = z.enum(['CHECKOUT', 'ADMIN']);
export type OrderSource = z.infer<typeof OrderSourceSchema>;

/** How a product reaches the buyer: private R2 files and/or GitHub repository access. */
export const DeliveryTypeSchema = z.enum(['R2', 'GITHUB']);
export type DeliveryType = z.infer<typeof DeliveryTypeSchema>;

export const DeliveryStatusSchema = z.enum([
  'PENDING',
  'ACTION_REQUIRED',
  'READY',
  'INVITATION_SENT',
  'ACCEPTED',
  'EXPIRED',
  'FAILED',
  'REVOKED',
]);
export type DeliveryStatus = z.infer<typeof DeliveryStatusSchema>;

export const CouponTypeSchema = z.enum(['PERCENT', 'FIXED']);
export type CouponType = z.infer<typeof CouponTypeSchema>;

export const CustomerStatusSchema = z.enum(['ACTIVE', 'DISABLED']);
export type CustomerStatus = z.infer<typeof CustomerStatusSchema>;

export const TicketStatusSchema = z.enum(['OPEN', 'PENDING', 'RESOLVED', 'CLOSED']);
export type TicketStatus = z.infer<typeof TicketStatusSchema>;

export const MessageAuthorSchema = z.enum(['CUSTOMER', 'ADMIN']);
export type MessageAuthor = z.infer<typeof MessageAuthorSchema>;

export const EmailStatusSchema = z.enum(['QUEUED', 'SENT', 'FAILED']);
export type EmailStatus = z.infer<typeof EmailStatusSchema>;
