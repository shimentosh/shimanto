import { z } from 'zod';
import { LeadIntentSchema, LeadStatusSchema, LocaleSchema } from './enums.js';

/** Options shown on the collaborate form. Stored as-is on the lead. */
export const BUDGET_RANGES = ['< $5k', '$5k–$15k', '$15k–$50k', '$50k+', 'Not sure yet'] as const;
export const TIMELINES = ['ASAP', '1–3 months', '3–6 months', 'Flexible'] as const;

/**
 * Honeypot: a visually hidden field that humans leave empty. Any value is accepted here, then the
 * service drops the submission and returns a normal-looking success,
 * so bots learn nothing.
 */
const honeypot = z.string().max(500).optional();

export const LeadCreateInputSchema = z.object({
  intent: LeadIntentSchema.exclude(['SUPPORT']),
  name: z.string().trim().min(1).max(120),
  email: z.email().max(254),
  company: z.string().trim().max(160).optional(),
  budgetRange: z.enum(BUDGET_RANGES).optional(),
  timeline: z.enum(TIMELINES).optional(),
  message: z.string().trim().min(10).max(5000),
  locale: LocaleSchema.default('en'),
  /** Page path the form was submitted from. */
  source: z.string().max(300).optional(),
  utm: z.record(z.string().max(40), z.string().max(200)).optional(),
  turnstileToken: z.string().min(1).max(4096),
  website: honeypot,
});
export type LeadCreateInput = z.infer<typeof LeadCreateInputSchema>;

export const LeadCreatedSchema = z.object({ ok: z.literal(true) });

export const LoginInputSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(200),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  role: z.enum(['SUPER_ADMIN', 'EDITOR']),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const LeadUpdateInputSchema = z.object({
  status: LeadStatusSchema.optional(),
  position: z.number().int().min(0).optional(),
  assignedToId: z.string().nullable().optional(),
});

export const LeadNoteInputSchema = z.object({ body: z.string().trim().min(1).max(5000) });
