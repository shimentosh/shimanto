import { z } from 'zod';

// ───────────── Admin · email delivery settings ─────────────

const SourceSchema = z.enum(['admin', 'env']);

/** How email is delivered right now. The Resend key is write-only: only a hint comes back. */
export const EmailSettingsViewSchema = z.object({
  provider: z.enum(['resend', 'smtp', 'log']),
  resend: z.object({
    /** Where the key in use comes from; null when there is none. */
    source: SourceSchema.nullable(),
    /** "re_…a1b2"; "unreadable" when a saved key can't be decrypted. */
    hint: z.string().nullable(),
  }),
  /** Sender in use, e.g. "Shimanto <hello@shimanto.xyz>". */
  from: z.string(),
  fromSource: SourceSchema,
  /** RESEND_API_KEY is set on the server (a saved key still wins over it). */
  envKeySet: z.boolean(),
  /** SETTINGS_ENCRYPTION_KEY is set; otherwise secrets are sealed with a key derived from the JWT secret. */
  encryptionKeySet: z.boolean(),
});
export type EmailSettingsView = z.infer<typeof EmailSettingsViewSchema>;

const ADDRESS = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export const EmailSettingsUpdateSchema = z.object({
  /** A new key; null removes the saved one; omitted keeps it. */
  resendApiKey: z
    .string()
    .trim()
    .regex(/^re_\w+$/, 'A Resend API key (re_…)')
    .max(200)
    .nullish(),
  /** "Name <address>" or a bare address on a domain verified in Resend; null = MAIL_FROM. */
  from: z
    .string()
    .trim()
    .max(200)
    .refine((v) => {
      const named = v.match(/^[^<>]+<([^<>]+)>$/);
      return ADDRESS.test(named ? named[1]!.trim() : v);
    }, 'Use an address like Shimanto <hello@shimanto.xyz>')
    .nullable(),
});
export type EmailSettingsUpdate = z.infer<typeof EmailSettingsUpdateSchema>;
