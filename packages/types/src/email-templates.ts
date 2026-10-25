import { z } from 'zod';

// ───────────── Admin · email templates ─────────────

export const EmailTemplateGroupSchema = z.enum([
  'account',
  'orders',
  'delivery',
  'support',
  'system',
]);
export type EmailTemplateGroup = z.infer<typeof EmailTemplateGroupSchema>;

/** One transactional template, as listed in the admin, with how often it has gone out. */
export const EmailTemplateSummarySchema = z.object({
  key: z.string(),
  group: EmailTemplateGroupSchema,
  name: z.string(),
  /** When the store sends it, in plain words. */
  trigger: z.string(),
  audience: z.enum(['customer', 'admin']),
  /** Subject line, rendered with sample data. */
  subject: z.string(),
  sent: z.number().int(),
  failed: z.number().int(),
  lastSentAt: z.iso.datetime().nullable(),
});
export type EmailTemplateSummary = z.infer<typeof EmailTemplateSummarySchema>;

/** The template rendered with sample data, exactly as the provider would receive it. */
export const EmailTemplatePreviewSchema = z.object({
  key: z.string(),
  subject: z.string(),
  html: z.string(),
  text: z.string(),
});
export type EmailTemplatePreview = z.infer<typeof EmailTemplatePreviewSchema>;
