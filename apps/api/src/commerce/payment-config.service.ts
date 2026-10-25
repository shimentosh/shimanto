import { Inject, Injectable } from '@nestjs/common';
import {
  type ManualMethod,
  type ManualMethodView,
  type ManualPaymentSettings,
  ManualPaymentSettingsSchema,
  type PaymentSettingsUpdate,
  type PaymentSettingsView,
} from '@shimanto/types';
import { z } from 'zod';
import { type Actor, AuditService } from '../audit/audit.service.js';
import { type SecretBox, secretHint, settingsBox } from '../common/secret-box.js';
import { unprocessable } from '../common/validate.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import type { Prisma } from '../generated/prisma/client.js';
import { mediaUrl } from '../media/media.mapper.js';
import { PRIVATE_PREFIX, StorageService } from '../media/storage.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const SETTINGS_KEY = 'payments';
const SECRETS_KEY = 'paymentSecrets';
const CACHE_MS = 30_000;

/** Currencies PayPal's REST API takes (https://developer.paypal.com/api/rest/reference/currency-codes/). */
export const PAYPAL_CURRENCIES = [
  'AUD', 'BRL', 'CAD', 'CNY', 'CZK', 'DKK', 'EUR', 'HKD', 'HUF', 'ILS', 'JPY', 'MYR',
  'MXN', 'TWD', 'NZD', 'NOK', 'PHP', 'PLN', 'GBP', 'SGD', 'SEK', 'CHF', 'THB', 'USD',
]; // prettier-ignore

/** Non-secret payment settings, stored as JSON in `Setting`. */
const StoredSchema = z.object({
  stripe: z.object({ enabled: z.boolean() }),
  paypal: z.object({
    enabled: z.boolean(),
    mode: z.enum(['sandbox', 'live']),
    clientId: z.string().nullable(),
    webhookId: z.string().nullable(),
  }),
  manual: ManualPaymentSettingsSchema,
});
type Stored = z.infer<typeof StoredSchema>;

/** Sealed (encrypted) secrets, stored apart from the settings so they're never sent anywhere. */
const SecretsSchema = z.object({
  stripeSecretKey: z.string().optional(),
  stripeWebhookSecret: z.string().optional(),
  paypalClientSecret: z.string().optional(),
});
type Secrets = z.infer<typeof SecretsSchema>;

const DEFAULTS: Stored = {
  stripe: { enabled: true },
  paypal: { enabled: true, mode: 'sandbox', clientId: null, webhookId: null },
  manual: { methods: [], windowHours: 48 },
};

export interface StripeConfig {
  secretKey: string;
  webhookSecret: string | null;
}

export interface PaypalConfig {
  clientId: string;
  clientSecret: string;
  mode: 'sandbox' | 'live';
  webhookId: string | null;
}

interface Resolved {
  stored: Stored;
  /** Opened secrets, env first. */
  stripe: { secretKey?: string; webhookSecret?: string; source: 'env' | 'admin' | null };
  paypal: { clientId?: string; clientSecret?: string; source: 'env' | 'admin' | null };
}

/**
 * Payment configuration: what's enabled, provider credentials and manual methods. Secrets come
 * from the environment when set there, else from the admin (sealed in the database). Admin
 * views only ever get hints of secrets.
 */
@Injectable()
export class PaymentConfigService {
  private readonly box: SecretBox;
  private cached?: { value: Resolved; at: number };

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    @Inject(ENV) private readonly env: Env,
  ) {
    this.box = settingsBox(env);
  }

  private async resolve(): Promise<Resolved> {
    if (this.cached && Date.now() - this.cached.at < CACHE_MS) return this.cached.value;
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: [SETTINGS_KEY, SECRETS_KEY] } },
    });
    const raw = rows.find((r) => r.key === SETTINGS_KEY)?.value as Partial<Stored> | undefined;
    const parsed = StoredSchema.safeParse({
      stripe: { ...DEFAULTS.stripe, ...raw?.stripe },
      paypal: { ...DEFAULTS.paypal, ...raw?.paypal },
      manual: { ...DEFAULTS.manual, ...raw?.manual },
    });
    const stored = parsed.success ? parsed.data : DEFAULTS;
    const sealed = SecretsSchema.safeParse(rows.find((r) => r.key === SECRETS_KEY)?.value ?? {});
    const secrets = sealed.success ? sealed.data : {};
    const open = (value?: string) => (value ? (this.box.open(value) ?? undefined) : undefined);
    const env = this.env;

    const value: Resolved = {
      stored,
      stripe: env.STRIPE_SECRET_KEY
        ? {
            secretKey: env.STRIPE_SECRET_KEY,
            webhookSecret: env.STRIPE_WEBHOOK_SECRET,
            source: 'env',
          }
        : {
            secretKey: open(secrets.stripeSecretKey),
            webhookSecret: open(secrets.stripeWebhookSecret),
            source: secrets.stripeSecretKey ? 'admin' : null,
          },
      paypal: env.PAYPAL_CLIENT_ID
        ? { clientId: env.PAYPAL_CLIENT_ID, clientSecret: env.PAYPAL_CLIENT_SECRET, source: 'env' }
        : {
            clientId: stored.paypal.clientId ?? undefined,
            clientSecret: open(secrets.paypalClientSecret),
            source: stored.paypal.clientId ? 'admin' : null,
          },
    };
    this.cached = { value, at: Date.now() };
    return value;
  }

  /** Stripe credentials when Stripe is enabled and has a key; else null. */
  async stripe(): Promise<StripeConfig | null> {
    const { stored, stripe } = await this.resolve();
    if (!stored.stripe.enabled || !stripe.secretKey) return null;
    return { secretKey: stripe.secretKey, webhookSecret: stripe.webhookSecret ?? null };
  }

  /** Stripe's webhook secret, even while Stripe is switched off (late events still settle). */
  async stripeWebhook(): Promise<StripeConfig | null> {
    const { stripe } = await this.resolve();
    if (!stripe.secretKey) return null;
    return { secretKey: stripe.secretKey, webhookSecret: stripe.webhookSecret ?? null };
  }

  /** PayPal credentials, regardless of the on/off switch (webhooks, captures and refunds). */
  async paypalCredentials(): Promise<PaypalConfig | null> {
    const { stored, paypal } = await this.resolve();
    if (!paypal.clientId || !paypal.clientSecret) return null;
    return {
      clientId: paypal.clientId,
      clientSecret: paypal.clientSecret,
      mode: paypal.source === 'env' ? this.env.PAYPAL_MODE : stored.paypal.mode,
      webhookId:
        paypal.source === 'env' ? (this.env.PAYPAL_WEBHOOK_ID ?? null) : stored.paypal.webhookId,
    };
  }

  /** PayPal credentials when PayPal is enabled for new checkouts; else null. */
  async paypal(): Promise<PaypalConfig | null> {
    const { stored } = await this.resolve();
    return stored.paypal.enabled ? this.paypalCredentials() : null;
  }

  async manual(): Promise<ManualPaymentSettings> {
    return (await this.resolve()).stored.manual;
  }

  /** Enabled manual methods for a currency, in the admin's order, as buyers see them. */
  async manualMethods(currency: string): Promise<ManualMethodView[]> {
    const manual = await this.manual();
    const methods = manual.methods.filter(
      (m) => m.enabled && (m.currencies.length === 0 || m.currencies.includes(currency)),
    );
    const urls = await this.mediaUrls(methods);
    return methods.map((m) => this.toMethodView(m, urls));
  }

  /** A manual method by id (enabled or not), as buyers see it. */
  async manualMethod(id: string): Promise<ManualMethodView | null> {
    const method = (await this.manual()).methods.find((m) => m.id === id);
    if (!method) return null;
    return this.toMethodView(method, await this.mediaUrls([method]));
  }

  private toMethodView(m: ManualMethod, urls: Map<string, string>): ManualMethodView {
    return {
      id: m.id,
      kind: m.kind,
      name: m.name,
      description: m.description,
      logoUrl: (m.logoId && urls.get(m.logoId)) || null,
      qrUrl: (m.qrId && urls.get(m.qrId)) || null,
      fields: m.fields,
      instructions: m.instructions,
      referenceLabel: m.referenceLabel,
      senderLabel: m.senderLabel,
      proof: m.proof,
    };
  }

  private async mediaUrls(methods: ManualMethod[]): Promise<Map<string, string>> {
    const ids = methods.flatMap((m) => [m.logoId, m.qrId]).filter((id): id is string => !!id);
    if (!ids.length) return new Map();
    const media = await this.prisma.media.findMany({
      where: { id: { in: ids }, key: { not: { startsWith: PRIVATE_PREFIX } } },
      select: { id: true, key: true },
    });
    return new Map(media.map((m) => [m.id, mediaUrl(this.storage.publicUrl, m.key)]));
  }

  // ───────────── Admin ─────────────

  async view(): Promise<PaymentSettingsView> {
    const { stored, stripe, paypal } = await this.resolve();
    const urls = await this.mediaUrls(stored.manual.methods);
    const api = this.env.API_PUBLIC_URL.replace(/\/+$/, '');
    return {
      stripe: {
        enabled: stored.stripe.enabled,
        active: stored.stripe.enabled && Boolean(stripe.secretKey),
        source: stripe.source,
        mode: stripe.secretKey ? (/^(sk|rk)_live_/.test(stripe.secretKey) ? 'live' : 'test') : null,
        secretKeyHint: stripe.secretKey ? secretHint(stripe.secretKey) : null,
        webhookSecretSet: Boolean(stripe.webhookSecret),
        webhookUrl: `${api}/v1/webhooks/stripe`,
      },
      paypal: {
        enabled: stored.paypal.enabled,
        active: stored.paypal.enabled && Boolean(paypal.clientId && paypal.clientSecret),
        source: paypal.source,
        mode: paypal.source === 'env' ? this.env.PAYPAL_MODE : stored.paypal.mode,
        clientId: paypal.clientId ?? null,
        clientSecretHint: paypal.clientSecret ? secretHint(paypal.clientSecret) : null,
        webhookId:
          paypal.source === 'env' ? (this.env.PAYPAL_WEBHOOK_ID ?? null) : stored.paypal.webhookId,
        webhookUrl: `${api}/v1/webhooks/paypal`,
        currencies: PAYPAL_CURRENCIES,
      },
      manual: {
        windowHours: stored.manual.windowHours,
        methods: stored.manual.methods.map((m) => ({
          ...m,
          logoUrl: (m.logoId && urls.get(m.logoId)) || null,
          qrUrl: (m.qrId && urls.get(m.qrId)) || null,
        })),
      },
      encryptionKeySet: Boolean(this.env.SETTINGS_ENCRYPTION_KEY),
    };
  }

  async update(input: PaymentSettingsUpdate, actor: Actor): Promise<PaymentSettingsView> {
    const { stored, stripe, paypal } = await this.resolve();
    const row = await this.prisma.setting.findUnique({ where: { key: SECRETS_KEY } });
    const secrets: Secrets = SecretsSchema.safeParse(row?.value ?? {}).data ?? {};
    const next: Stored = structuredClone(stored);
    const changed: string[] = [];

    /** string → seal, null → clear, undefined → keep. */
    const setSecret = (key: keyof Secrets, value: string | null | undefined) => {
      if (value === undefined) return;
      if (value === null) delete secrets[key];
      else secrets[key] = this.box.seal(value);
      changed.push(key);
    };
    const fromEnv = (provider: string) =>
      unprocessable(`${provider} keys are set in the server environment; change them there.`);

    if (input.stripe) {
      const { enabled, secretKey, webhookSecret } = input.stripe;
      if ((secretKey !== undefined || webhookSecret !== undefined) && stripe.source === 'env') {
        fromEnv('Stripe');
      }
      if (enabled !== undefined) next.stripe.enabled = enabled;
      setSecret('stripeSecretKey', secretKey);
      setSecret('stripeWebhookSecret', webhookSecret);
      changed.push('stripe');
    }
    if (input.paypal) {
      const { enabled, mode, clientId, clientSecret, webhookId } = input.paypal;
      const credentials = [mode, clientId, clientSecret, webhookId].some((v) => v !== undefined);
      if (credentials && paypal.source === 'env') fromEnv('PayPal');
      if (enabled !== undefined) next.paypal.enabled = enabled;
      if (mode !== undefined) next.paypal.mode = mode;
      if (clientId !== undefined) next.paypal.clientId = clientId;
      if (webhookId !== undefined) next.paypal.webhookId = webhookId;
      setSecret('paypalClientSecret', clientSecret);
      changed.push('paypal');
    }
    if (input.manual) {
      next.manual = input.manual;
      changed.push('manual');
    }

    const updatedById = actor.type === 'user' ? actor.id : null;
    await this.prisma.$transaction([
      this.prisma.setting.upsert({
        where: { key: SETTINGS_KEY },
        create: { key: SETTINGS_KEY, value: next as Prisma.InputJsonValue, updatedById },
        update: { value: next as Prisma.InputJsonValue, updatedById },
      }),
      this.prisma.setting.upsert({
        where: { key: SECRETS_KEY },
        create: { key: SECRETS_KEY, value: secrets as Prisma.InputJsonValue, updatedById },
        update: { value: secrets as Prisma.InputJsonValue, updatedById },
      }),
    ]);
    this.cached = undefined;
    // Which parts changed, never the values.
    await this.audit.record(actor, 'settings.payments', 'Setting', SETTINGS_KEY, {
      changed: [...new Set(changed)],
    });
    return this.view();
  }
}
