import { z } from 'zod';
import { MessageAuthorSchema, TicketStatusSchema } from './enums.js';

/** Multipart form fields arrive as strings; empty strings mean "not set". */
const optionalId = z
  .string()
  .max(40)
  .optional()
  .transform((v) => (v ? v : undefined));

export const TicketCreateInputSchema = z.object({
  subject: z.string().trim().min(3, 'Add a short subject').max(160),
  message: z.string().trim().min(10, 'Tell us a little more (10+ characters)').max(10_000),
  productId: optionalId,
  orderId: optionalId,
});
export type TicketCreateInput = z.input<typeof TicketCreateInputSchema>;

export const TicketReplyInputSchema = z.object({
  message: z.string().trim().min(1, 'Write a reply').max(10_000),
  /** Admin replies can change the status at the same time. */
  status: TicketStatusSchema.optional(),
});
export type TicketReplyInput = z.input<typeof TicketReplyInputSchema>;

export const TicketStatusInputSchema = z.object({ status: TicketStatusSchema });

export const TicketMessageSchema = z.object({
  id: z.string(),
  authorType: MessageAuthorSchema,
  authorName: z.string(),
  body: z.string(),
  createdAt: z.string(),
  attachment: z.object({ id: z.string(), filename: z.string(), size: z.number().int() }).nullable(),
});
export type TicketMessage = z.infer<typeof TicketMessageSchema>;

export const TicketSummarySchema = z.object({
  id: z.string(),
  number: z.number().int(),
  subject: z.string(),
  status: TicketStatusSchema,
  product: z.object({ id: z.string(), name: z.string() }).nullable(),
  order: z.object({ id: z.string(), number: z.number().int() }).nullable(),
  customer: z.object({ id: z.string(), email: z.string(), name: z.string().nullable() }),
  lastMessageAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TicketSummary = z.infer<typeof TicketSummarySchema>;

export const TicketDetailSchema = TicketSummarySchema.extend({
  messages: z.array(TicketMessageSchema),
});
export type TicketDetail = z.infer<typeof TicketDetailSchema>;
