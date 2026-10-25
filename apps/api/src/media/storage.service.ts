import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createReadStream } from 'node:fs';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { z } from 'zod';
import { settingsBox } from '../common/secret-box.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Only this prefix is publicly readable. Product deliverables live under `private/`. */
export const PUBLIC_PREFIX = 'media/';
export const PRIVATE_PREFIX = 'private/';

export const STORAGE_SETTINGS_KEY = 'storage';

/** A storage connection saved in the admin (`Setting` "storage"); the secret is sealed. */
export const StoredStorageSchema = z.object({
  provider: z.enum(['r2', 's3', 'custom']),
  accountId: z.string().nullable(),
  endpoint: z.string().nullable(),
  region: z.string().nullable(),
  bucket: z.string(),
  publicUrl: z.string(),
  accessKeyId: z.string(),
  sealedSecret: z.string(),
});
export type StoredStorage = z.infer<typeof StoredStorageSchema>;

/** Everything needed to talk to a bucket. */
export interface S3Connection {
  endpoint?: string;
  region: string;
  forcePathStyle: boolean;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
}

/** R2 always uses region "auto" and path-style URLs on the account endpoint. */
export function connectionFor(
  saved: Omit<StoredStorage, 'sealedSecret'>,
  secretAccessKey: string,
): S3Connection {
  const r2 = saved.provider === 'r2';
  return {
    endpoint: r2
      ? `https://${saved.accountId}.r2.cloudflarestorage.com`
      : (saved.endpoint ?? undefined),
    region: r2 ? 'auto' : (saved.region ?? 'us-east-1'),
    forcePathStyle: saved.provider !== 's3' || Boolean(saved.endpoint),
    bucket: saved.bucket,
    accessKeyId: saved.accessKeyId,
    secretAccessKey,
  };
}

function clientFor(c: S3Connection) {
  return new S3Client({
    endpoint: c.endpoint,
    region: c.region,
    forcePathStyle: c.forcePathStyle,
    credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
  });
}

interface Active {
  source: 'admin' | 'env';
  client: S3Client;
  bucket: string;
  publicUrl: string;
  provider: 'r2' | 's3' | 'local';
  configured: boolean;
}

/** Re-read the saved connection this often, so every API instance follows an admin change. */
const REFRESH_MS = 60_000;

/**
 * S3-compatible object storage: RustFS locally, Cloudflare R2 or AWS S3 in production. The code
 * only speaks the S3 API. The connection comes from Admin → Settings → Storage when one is saved
 * there, else from the S3_* environment variables.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger('Storage');
  private active: Active;
  private loadedAt = 0;
  private ready?: Promise<void>;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
  ) {
    this.active = this.fromEnv();
  }

  async onModuleInit() {
    await this.reload().catch((error: Error) =>
      this.logger.error(`Could not load storage settings: ${error.message}`),
    );
  }

  private fromEnv(): Active {
    const env = this.env;
    const endpoint = env.S3_ENDPOINT ?? '';
    return {
      source: 'env',
      client: clientFor({
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION,
        forcePathStyle: env.S3_FORCE_PATH_STYLE,
        bucket: env.S3_BUCKET,
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
      }),
      bucket: env.S3_BUCKET,
      publicUrl: env.MEDIA_PUBLIC_URL,
      provider: endpoint.includes('r2.cloudflarestorage.com')
        ? 'r2'
        : endpoint === '' || endpoint.includes('amazonaws.com')
          ? 's3'
          : 'local',
      configured: Boolean(env.S3_ACCESS_KEY && env.S3_SECRET_KEY),
    };
  }

  /** Picks up the connection saved in the admin (or falls back to the environment). */
  async reload(): Promise<void> {
    const row = await this.prisma.setting.findUnique({ where: { key: STORAGE_SETTINGS_KEY } });
    const saved = StoredStorageSchema.safeParse(row?.value);
    const secret = saved.success ? settingsBox(this.env).open(saved.data.sealedSecret) : null;
    if (saved.success && secret) {
      const connection = connectionFor(saved.data, secret);
      this.active = {
        source: 'admin',
        client: clientFor(connection),
        bucket: connection.bucket,
        publicUrl: saved.data.publicUrl,
        provider: saved.data.provider === 'r2' ? 'r2' : 's3',
        configured: true,
      };
    } else if (this.active.source !== 'env') {
      this.active = this.fromEnv();
    }
    this.loadedAt = Date.now();
  }

  private async current(): Promise<Active> {
    if (Date.now() - this.loadedAt > REFRESH_MS) {
      await this.reload().catch((error: Error) =>
        this.logger.warn(`Storage settings refresh failed: ${error.message}`),
      );
    }
    return this.active;
  }

  /** Base URL of public media (bucket, r2.dev or custom domain), for building image URLs. */
  get publicUrl(): string {
    return this.active.publicUrl;
  }

  /** What's live, for the admin settings page. */
  summary() {
    const { source, provider, bucket, publicUrl, configured } = this.active;
    return { source, provider, bucket, publicUrl, configured };
  }

  /** Can these credentials reach the bucket (and write to it)? Used before saving a connection. */
  async checkConnection(connection: S3Connection): Promise<{ ok: boolean; message: string }> {
    const client = clientFor(connection);
    try {
      await client.send(new HeadBucketCommand({ Bucket: connection.bucket }));
      return { ok: true, message: `Connected to bucket "${connection.bucket}"` };
    } catch (error) {
      const name = (error as { name?: string }).name ?? 'Error';
      return {
        ok: false,
        message: `Could not reach bucket "${connection.bucket}" (${name}). Check the account id or endpoint, the bucket name and the API token.`,
      };
    } finally {
      client.destroy();
    }
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    const { client, bucket } = await this.current();
    await this.ensureBucket();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Keys are content-addressed per upload (unique id in the path), so they never change.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  /**
   * Streams a file from disk (large deliverables: builds, archives) without buffering it in
   * memory. Private objects are never cached by intermediaries.
   */
  async putFile(key: string, path: string, contentType: string, size: number): Promise<void> {
    const { client, bucket } = await this.current();
    await this.ensureBucket();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: createReadStream(path),
        ContentLength: size,
        ContentType: contentType,
        CacheControl: 'private, no-store',
      }),
    );
  }

  /** Can we reach the bucket with the configured credentials? (Admin settings check.) */
  async check(): Promise<{ ok: boolean; message: string }> {
    const { client, bucket } = await this.current();
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
      return { ok: true, message: `Connected to bucket "${bucket}"` };
    } catch (error) {
      const name = (error as { name?: string }).name ?? 'Error';
      return {
        ok: false,
        message: `Could not reach bucket "${bucket}" (${name}). Check the endpoint and keys.`,
      };
    }
  }

  /**
   * Short-lived download URL for a private object, forcing a download with the original filename.
   * Buyers never see a permanent link to a paid file.
   */
  async signedDownloadUrl(key: string, filename: string, expiresInSeconds = 300): Promise<string> {
    const { client, bucket } = await this.current();
    const safe = filename.replace(/[\r\n"]/g, '');
    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      }),
      { expiresIn: expiresInSeconds },
    );
  }

  async remove(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    const { client, bucket } = await this.current();
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    );
  }

  /**
   * Local dev convenience (environment storage only): create the bucket and make only `media/*`
   * publicly readable. R2 / S3 buckets saved in the admin, and production, are provisioned in
   * their own console.
   */
  private ensureBucket(): Promise<void> {
    if (this.env.NODE_ENV === 'production' || this.active.source !== 'env')
      return Promise.resolve();
    const { client } = this.active;
    this.ready ??= (async () => {
      const Bucket = this.env.S3_BUCKET;
      try {
        await client.send(new HeadBucketCommand({ Bucket }));
      } catch {
        await client.send(new CreateBucketCommand({ Bucket }));
        this.logger.log(`Created bucket ${Bucket}`);
      }
      await client.send(
        new PutBucketPolicyCommand({
          Bucket,
          Policy: JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Principal: '*',
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${Bucket}/${PUBLIC_PREFIX}*`],
              },
            ],
          }),
        }),
      );
    })().catch((error: unknown) => {
      this.ready = undefined;
      throw error;
    });
    return this.ready;
  }
}
