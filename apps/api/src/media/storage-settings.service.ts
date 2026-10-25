import { Inject, Injectable } from '@nestjs/common';
import type { StorageConfigInput, StorageSettingsView } from '@shimanto/types';
import { type Actor, AuditService } from '../audit/audit.service.js';
import { secretHint, settingsBox } from '../common/secret-box.js';
import { unprocessable } from '../common/validate.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  STORAGE_SETTINGS_KEY,
  type StoredStorage,
  StoredStorageSchema,
  StorageService,
  connectionFor,
} from './storage.service.js';

/**
 * Admin → Settings → Storage: connect Cloudflare R2 (or AWS S3 / any S3-compatible storage)
 * without touching the server. A connection is tested before it's saved; once saved it wins over
 * the S3_* environment variables. Clearing it goes back to the environment.
 */
@Injectable()
export class StorageSettingsService {
  private readonly box;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {
    this.box = settingsBox(env);
  }

  private async saved(): Promise<StoredStorage | null> {
    const row = await this.prisma.setting.findUnique({ where: { key: STORAGE_SETTINGS_KEY } });
    const parsed = StoredStorageSchema.safeParse(row?.value);
    return parsed.success ? parsed.data : null;
  }

  async view(): Promise<StorageSettingsView> {
    const saved = await this.saved();
    const secret = saved ? this.box.open(saved.sealedSecret) : null;
    return {
      ...this.storage.summary(),
      maxUploadMb: this.env.FILE_UPLOAD_MAX_MB,
      saved: saved
        ? {
            provider: saved.provider,
            accountId: saved.accountId,
            endpoint: saved.endpoint,
            region: saved.region,
            bucket: saved.bucket,
            publicUrl: saved.publicUrl,
            accessKeyId: saved.accessKeyId,
            secretKeyHint: secret ? secretHint(secret) : 'unreadable: enter it again',
          }
        : null,
      encryptionKeySet: Boolean(this.env.SETTINGS_ENCRYPTION_KEY),
    };
  }

  /** The input as a stored connection; a missing secret means "keep the saved one". */
  private async resolve(input: StorageConfigInput) {
    const previous = await this.saved();
    const secret =
      input.secretAccessKey ?? (previous ? this.box.open(previous.sealedSecret) : null);
    if (!secret) unprocessable('Enter the secret access key', 'secretAccessKey');
    const stored: Omit<StoredStorage, 'sealedSecret'> = {
      provider: input.provider,
      accountId: input.provider === 'r2' ? (input.accountId ?? null) : null,
      endpoint: input.provider === 'r2' ? null : (input.endpoint ?? null),
      region: input.provider === 'r2' ? null : (input.region ?? null),
      bucket: input.bucket,
      publicUrl: input.publicUrl.replace(/\/+$/, ''),
      accessKeyId: input.accessKeyId,
    };
    return { stored, secret };
  }

  async test(input: StorageConfigInput) {
    const { stored, secret } = await this.resolve(input);
    return this.storage.checkConnection(connectionFor(stored, secret));
  }

  /** Tests the connection, then saves it and switches storage over to it. */
  async save(input: StorageConfigInput, actor: Actor): Promise<StorageSettingsView> {
    const { stored, secret } = await this.resolve(input);
    const check = await this.storage.checkConnection(connectionFor(stored, secret));
    if (!check.ok) unprocessable(check.message);
    const value = { ...stored, sealedSecret: this.box.seal(secret) };
    const updatedById = actor.type === 'user' ? actor.id : null;
    await this.prisma.setting.upsert({
      where: { key: STORAGE_SETTINGS_KEY },
      create: { key: STORAGE_SETTINGS_KEY, value: value as Prisma.InputJsonValue, updatedById },
      update: { value: value as Prisma.InputJsonValue, updatedById },
    });
    await this.storage.reload();
    await this.audit.record(actor, 'settings.storage', 'Setting', STORAGE_SETTINGS_KEY, {
      provider: stored.provider,
      bucket: stored.bucket,
    });
    return this.view();
  }

  /** Back to the S3_* environment variables. */
  async clear(actor: Actor): Promise<StorageSettingsView> {
    await this.prisma.setting.deleteMany({ where: { key: STORAGE_SETTINGS_KEY } });
    await this.storage.reload();
    await this.audit.record(actor, 'settings.storage', 'Setting', STORAGE_SETTINGS_KEY, {
      provider: 'env',
    });
    return this.view();
  }
}
