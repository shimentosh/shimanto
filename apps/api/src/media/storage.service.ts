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
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';

/** Only this prefix is publicly readable. Product deliverables live under `private/`. */
export const PUBLIC_PREFIX = 'media/';
export const PRIVATE_PREFIX = 'private/';

/**
 * S3-compatible object storage: RustFS locally, Cloudflare R2 or AWS S3 in production.
 * The code only speaks the S3 API.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger('Storage');
  private readonly client: S3Client;
  private ready?: Promise<void>;

  constructor(@Inject(ENV) private readonly env: Env) {
    this.client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
      credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.ensureBucket();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.env.S3_BUCKET,
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
    await this.ensureBucket();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.env.S3_BUCKET,
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
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.env.S3_BUCKET }));
      return { ok: true, message: `Connected to bucket "${this.env.S3_BUCKET}"` };
    } catch (error) {
      const name = (error as { name?: string }).name ?? 'Error';
      return {
        ok: false,
        message: `Could not reach bucket "${this.env.S3_BUCKET}" (${name}). Check the endpoint and keys.`,
      };
    }
  }

  /**
   * Short-lived download URL for a private object, forcing a download with the original filename.
   * Buyers never see a permanent link to a paid file.
   */
  signedDownloadUrl(key: string, filename: string, expiresInSeconds = 300): Promise<string> {
    const safe = filename.replace(/[\r\n"]/g, '');
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.env.S3_BUCKET,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      }),
      { expiresIn: expiresInSeconds },
    );
  }

  async remove(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await this.client.send(
      new DeleteObjectsCommand({
        Bucket: this.env.S3_BUCKET,
        Delete: { Objects: keys.map((Key) => ({ Key })) },
      }),
    );
  }

  /**
   * Local dev convenience: create the bucket and make only `media/*` publicly readable.
   * In production the bucket and its public access are provisioned explicitly (R2/S3 console or IaC).
   */
  private ensureBucket(): Promise<void> {
    if (this.env.NODE_ENV === 'production') return Promise.resolve();
    this.ready ??= (async () => {
      const Bucket = this.env.S3_BUCKET;
      try {
        await this.client.send(new HeadBucketCommand({ Bucket }));
      } catch {
        await this.client.send(new CreateBucketCommand({ Bucket }));
        this.logger.log(`Created bucket ${Bucket}`);
      }
      await this.client.send(
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
