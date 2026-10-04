import { z } from 'zod';
import { AttributionInputSchema } from './analytics.js';
import { DeliveryViewSchema, DeliveryFileSchema, OrderSummarySchema } from './commerce.js';
import {
  CustomerStatusSchema,
  LocaleSchema,
  ProductTypeSchema,
  TicketStatusSchema,
} from './enums.js';

/** Customer passwords: long enough to matter, short enough to hash quickly. */
export const PasswordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .max(200, 'At most 200 characters');

const confirm = <T extends { password: string; confirmPassword: string }>(
  v: T,
  ctx: z.RefinementCtx,
) => {
  if (v.password !== v.confirmPassword) {
    ctx.addIssue({ code: 'custom', path: ['confirmPassword'], message: 'Passwords don’t match' });
  }
};

// ───────────── Customer auth ─────────────

export const RegisterInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Tell us your name').max(120),
    email: z.email('Enter a valid email').max(254),
    password: PasswordSchema,
    confirmPassword: z.string(),
    locale: LocaleSchema.default('en'),
    attribution: AttributionInputSchema.optional(),
  })
  .superRefine(confirm);
export type RegisterInput = z.input<typeof RegisterInputSchema>;

export const CustomerLoginInputSchema = z.object({
  email: z.email('Enter a valid email').max(254),
  password: z.string().min(1, 'Enter your password').max(200),
  /** The browser's anonymous analytics id: its earlier visits become this customer's. */
  anonymousId: z.string().max(64).optional(),
});
export type CustomerLoginInput = z.input<typeof CustomerLoginInputSchema>;

export const EmailInputSchema = z.object({
  email: z.email('Enter a valid email').max(254),
  locale: LocaleSchema.default('en'),
});

export const TokenInputSchema = z.object({ token: z.string().min(20).max(200) });

export const ResetPasswordInputSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: PasswordSchema,
    confirmPassword: z.string(),
  })
  .superRefine(confirm);
export type ResetPasswordInput = z.input<typeof ResetPasswordInputSchema>;

/** `currentPassword` is required only when the account already has a password. */
export const ChangePasswordInputSchema = z
  .object({
    currentPassword: z.string().max(200).optional(),
    password: PasswordSchema,
    confirmPassword: z.string(),
  })
  .superRefine(confirm);
export type ChangePasswordInput = z.input<typeof ChangePasswordInputSchema>;

export const ProfileInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  locale: LocaleSchema.optional(),
});
export type ProfileInput = z.input<typeof ProfileInputSchema>;

export const CustomerMeSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  locale: LocaleSchema,
  status: CustomerStatusSchema,
  emailVerified: z.boolean(),
  hasPassword: z.boolean(),
  createdAt: z.string(),
  github: z.object({
    connected: z.boolean(),
    login: z.string().nullable(),
    connectedAt: z.string().nullable(),
    /** The store can connect GitHub accounts (OAuth configured). */
    available: z.boolean(),
  }),
});
export type CustomerMe = z.infer<typeof CustomerMeSchema>;

// ───────────── Portal views ─────────────

/** "My products": everything the customer owns, derived from valid orders and deliveries. */
export const OwnedProductSchema = z.object({
  productId: z.string(),
  name: z.string(),
  slug: z.string(),
  type: ProductTypeSchema,
  version: z.string().nullable(),
  purchasedAt: z.string(),
  orderNumber: z.number().int(),
  deliveries: z.array(DeliveryViewSchema),
});
export type OwnedProduct = z.infer<typeof OwnedProductSchema>;

export const DownloadItemSchema = DeliveryFileSchema.extend({
  deliveryId: z.string(),
  productId: z.string(),
  productName: z.string(),
  orderNumber: z.number().int(),
});
export type DownloadItem = z.infer<typeof DownloadItemSchema>;

export const CustomerDashboardSchema = z.object({
  recentOrders: z.array(OrderSummarySchema),
  products: z.array(OwnedProductSchema),
  downloadCount: z.number().int(),
  /** GitHub deliveries waiting for the customer (e.g. GitHub not connected). */
  actionRequired: z.number().int(),
  openTickets: z.array(
    z.object({
      number: z.number().int(),
      subject: z.string(),
      status: TicketStatusSchema,
      lastMessageAt: z.string(),
    }),
  ),
});
export type CustomerDashboard = z.infer<typeof CustomerDashboardSchema>;

export const SignedUrlSchema = z.object({ url: z.string() });
export const OkSchema = z.object({ ok: z.literal(true) });
