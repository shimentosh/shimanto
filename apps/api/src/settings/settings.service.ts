import { Inject, Injectable } from '@nestjs/common';
import {
  type GeneralSettings,
  GeneralSettingsSchema,
  type IntegrationStatus,
} from '@shimanto/types';
import { type Actor, AuditService } from '../audit/audit.service.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import type { Prisma } from '../generated/prisma/client.js';
import { EmailConfigService } from '../mail/email-config.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const GENERAL_KEY = 'general';
const CACHE_MS = 30_000;

export const DEFAULT_GENERAL: GeneralSettings = {
  storeName: 'Shimanto',
  supportEmail: null,
  defaultCurrency: 'USD',
};

/**
 * Store settings. Only non-secret values are stored and returned; integrations are reported as
 * configured / not. Payments, storage and email delivery have their own settings services
 * (PaymentConfigService, StorageSettingsService, EmailConfigService).
 */
@Injectable()
export class SettingsService {
  private cached?: { value: GeneralSettings; at: number };

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly emailConfig: EmailConfigService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async general(): Promise<GeneralSettings> {
    if (this.cached && Date.now() - this.cached.at < CACHE_MS) return this.cached.value;
    const row = await this.prisma.setting.findUnique({ where: { key: GENERAL_KEY } });
    const parsed = GeneralSettingsSchema.safeParse({
      ...DEFAULT_GENERAL,
      ...(row?.value as object),
    });
    const value = parsed.success ? parsed.data : DEFAULT_GENERAL;
    this.cached = { value, at: Date.now() };
    return value;
  }

  async updateGeneral(input: GeneralSettings, actor: Actor): Promise<GeneralSettings> {
    await this.prisma.setting.upsert({
      where: { key: GENERAL_KEY },
      create: {
        key: GENERAL_KEY,
        value: input as Prisma.InputJsonValue,
        updatedById: actor.type === 'user' ? actor.id : null,
      },
      update: {
        value: input as Prisma.InputJsonValue,
        updatedById: actor.type === 'user' ? actor.id : null,
      },
    });
    this.cached = undefined;
    await this.audit.record(actor, 'settings.update', 'Setting', GENERAL_KEY, {
      fields: Object.keys(input),
    });
    return this.general();
  }

  integrations(): IntegrationStatus {
    const env = this.env;
    const endpoint = env.S3_ENDPOINT ?? '';
    const mail = this.emailConfig.current();
    return {
      email: {
        provider: mail.provider,
        configured: mail.provider !== 'log',
        from: mail.from,
      },
      storage: {
        configured: Boolean(env.S3_ACCESS_KEY && env.S3_SECRET_KEY),
        provider: endpoint.includes('r2.cloudflarestorage.com')
          ? 'r2'
          : endpoint === '' || endpoint.includes('amazonaws.com')
            ? 's3'
            : 'local',
        bucket: env.S3_BUCKET,
        maxUploadMb: env.FILE_UPLOAD_MAX_MB,
      },
      github: {
        app: Boolean(env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY),
        oauth: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
        webhook: Boolean(env.GITHUB_WEBHOOK_SECRET),
        token: Boolean(env.GITHUB_TOKEN),
      },
    };
  }
}
