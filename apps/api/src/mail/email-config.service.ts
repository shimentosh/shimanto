import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { EmailSettingsUpdate, EmailSettingsView, IntegrationCheck } from '@shimanto/types';
import { z } from 'zod';
import { type Actor, AuditService } from '../audit/audit.service.js';
import { secretHint, settingsBox } from '../common/secret-box.js';
import { unprocessable } from '../common/validate.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const SETTINGS_KEY = 'email';
const CACHE_MS = 30_000;
const RESEND_API = 'https://api.resend.com';

/** What the admin saved. The Resend key is sealed (encrypted) and never sent anywhere. */
const StoredSchema = z.object({
  sealedResendKey: z.string().nullable(),
  from: z.string().nullable(),
});
type Stored = z.infer<typeof StoredSchema>;

export interface MailConfig {
  resendKey: string | null;
  keySource: 'admin' | 'env' | null;
  from: string;
  fromSource: 'admin' | 'env';
  provider: 'resend' | 'smtp' | 'log';
}

/**
 * How email goes out: a Resend API key and sender entered in Admin → Settings → Emails win over
 * RESEND_API_KEY / MAIL_FROM; removing them goes back to the environment. Read at send time with
 * a 30s cache, so a saved key is picked up without a restart.
 */
@Injectable()
export class EmailConfigService implements OnModuleInit {
  private readonly box;
  private cached?: { value: MailConfig; saved: Stored | null; at: number };

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {
    this.box = settingsBox(env);
  }

  async onModuleInit() {
    await this.config().catch(() => undefined);
  }

  async config(): Promise<MailConfig> {
    return (await this.load()).value;
  }

  /** The last loaded config without waiting, for synchronous status reports. */
  current(): MailConfig {
    return this.cached?.value ?? this.resolve(null);
  }

  async view(): Promise<EmailSettingsView> {
    const { value, saved } = await this.load();
    const savedKey = saved?.sealedResendKey ? this.box.open(saved.sealedResendKey) : null;
    return {
      provider: value.provider,
      resend: {
        source: value.keySource,
        hint: savedKey
          ? secretHint(savedKey)
          : saved?.sealedResendKey
            ? 'unreadable: enter it again'
            : value.resendKey
              ? secretHint(value.resendKey)
              : null,
      },
      from: value.from,
      fromSource: value.fromSource,
      envKeySet: Boolean(this.env.RESEND_API_KEY),
      encryptionKeySet: Boolean(this.env.SETTINGS_ENCRYPTION_KEY),
    };
  }

  /** Saves the sender and key. A new key is checked with Resend first and refused if rejected. */
  async update(input: EmailSettingsUpdate, actor: Actor): Promise<EmailSettingsView> {
    const previous = (await this.load()).saved;
    let sealedResendKey = previous?.sealedResendKey ?? null;
    if (input.resendApiKey === null) sealedResendKey = null;
    if (input.resendApiKey) {
      const check = await checkResendKey(input.resendApiKey);
      if (!check.ok) unprocessable(check.message, 'resendApiKey');
      sealedResendKey = this.box.seal(input.resendApiKey);
    }
    const value: Stored = { sealedResendKey, from: input.from };
    const updatedById = actor.type === 'user' ? actor.id : null;
    await this.prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      create: { key: SETTINGS_KEY, value: value as Prisma.InputJsonValue, updatedById },
      update: { value: value as Prisma.InputJsonValue, updatedById },
    });
    this.cached = undefined;
    await this.audit.record(actor, 'settings.email', 'Setting', SETTINGS_KEY, {
      resendKey:
        input.resendApiKey === undefined ? 'kept' : input.resendApiKey ? 'replaced' : 'removed',
      from: input.from ?? 'env',
    });
    return this.view();
  }

  /** Is the key in use accepted, and is the sender's domain verified in Resend? */
  async check(): Promise<IntegrationCheck> {
    const config = await this.config();
    if (!config.resendKey) {
      return {
        ok: false,
        message: 'No Resend API key yet. Add one above, or set RESEND_API_KEY on the server.',
      };
    }
    return checkResendKey(config.resendKey, senderDomain(config.from));
  }

  private async load() {
    if (this.cached && Date.now() - this.cached.at < CACHE_MS) return this.cached;
    const row = await this.prisma.setting.findUnique({ where: { key: SETTINGS_KEY } });
    const parsed = StoredSchema.safeParse(row?.value);
    const saved = parsed.success ? parsed.data : null;
    this.cached = { value: this.resolve(saved), saved, at: Date.now() };
    return this.cached;
  }

  private resolve(saved: Stored | null): MailConfig {
    const env = this.env;
    const savedKey = saved?.sealedResendKey ? this.box.open(saved.sealedResendKey) : null;
    const resendKey = savedKey ?? env.RESEND_API_KEY ?? null;
    return {
      resendKey,
      keySource: savedKey ? 'admin' : env.RESEND_API_KEY ? 'env' : null,
      from: saved?.from ?? env.MAIL_FROM,
      fromSource: saved?.from ? 'admin' : 'env',
      provider: resendKey ? 'resend' : env.SMTP_URL === 'json' ? 'log' : 'smtp',
    };
  }
}

/** "Shimanto <hello@shimanto.xyz>" → "shimanto.xyz". */
function senderDomain(from: string): string | null {
  const address = from.match(/<([^<>]+)>/)?.[1] ?? from;
  return address.split('@')[1]?.trim().toLowerCase() ?? null;
}

/**
 * Asks Resend whether it accepts the key. A full-access key can also list domains, so the
 * sender's domain is checked too; a sending-only key can't, which is fine.
 */
async function checkResendKey(key: string, domain?: string | null): Promise<IntegrationCheck> {
  let res: Response;
  try {
    res = await fetch(`${RESEND_API}/domains`, {
      headers: { authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    return { ok: false, message: `Couldn’t reach Resend: ${(error as Error).message}` };
  }
  const body = (await res.json().catch(() => ({}))) as {
    data?: Array<{ name: string; status: string }>;
    name?: string;
    message?: string;
  };
  if (body.name === 'restricted_api_key') {
    return {
      ok: true,
      message:
        'Resend accepts this key. It can only send, so the sender’s domain can’t be checked from here.',
    };
  }
  if (!res.ok) {
    return { ok: false, message: `Resend rejected this key: ${body.message ?? res.statusText}` };
  }
  if (!domain) return { ok: true, message: 'Resend accepts this key.' };
  const match = body.data?.find((d) => d.name.toLowerCase() === domain);
  if (!match) {
    return {
      ok: false,
      message: `Resend accepts this key, but ${domain} isn’t added in Resend yet. Add and verify it, or use a sender on a verified domain.`,
    };
  }
  if (match.status !== 'verified') {
    return {
      ok: false,
      message: `Resend accepts this key, but ${domain} is ${match.status.replaceAll('_', ' ')}. Finish its DNS records in Resend.`,
    };
  }
  return { ok: true, message: `Resend accepts this key and ${domain} is verified.` };
}
