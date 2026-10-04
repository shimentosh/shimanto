import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import sharp from 'sharp';
import { type Actor, AuditService } from '../audit/audit.service.js';
import { cursorArgs, paginate } from '../common/cursor.js';
import { unprocessable } from '../common/validate.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { type MediaVariant, toPublicMedia } from './media.mapper.js';
import { PRIVATE_PREFIX, PUBLIC_PREFIX, StorageService } from './storage.service.js';

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const VARIANT_WIDTHS = [480, 960, 1600] as const;

/**
 * Allowed uploads, identified by their first bytes, never by the client-supplied MIME type or
 * extension. SVG is deliberately excluded: it can carry scripts.
 */
const SIGNATURES: Array<{ mime: string; ext: string; test: (b: Buffer) => boolean }> = [
  { mime: 'image/jpeg', ext: 'jpg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: 'image/png',
    ext: 'png',
    test: (b) =>
      b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  { mime: 'image/gif', ext: 'gif', test: (b) => b.subarray(0, 4).toString('ascii') === 'GIF8' },
  {
    mime: 'image/webp',
    ext: 'webp',
    test: (b) =>
      b.subarray(0, 4).toString('ascii') === 'RIFF' &&
      b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  {
    mime: 'image/avif',
    ext: 'avif',
    test: (b) => b.subarray(4, 12).toString('ascii').startsWith('ftypavi'),
  },
  {
    mime: 'application/pdf',
    ext: 'pdf',
    test: (b) => b.subarray(0, 5).toString('ascii') === '%PDF-',
  },
  {
    mime: 'application/zip',
    ext: 'zip',
    test: (b) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04,
  },
  {
    mime: 'audio/mpeg',
    ext: 'mp3',
    test: (b) =>
      b.subarray(0, 3).toString('ascii') === 'ID3' || (b[0] === 0xff && (b[1]! & 0xe0) === 0xe0),
  },
];

export function sniff(buffer: Buffer) {
  return SIGNATURES.find((s) => s.test(buffer));
}

/** Filesystem- and URL-safe version of the original name, keeping it readable in the key. */
export function safeName(original: string, ext: string): string {
  const base = (original.split(/[\\/]/).pop() ?? '')
    .replace(/\.[^.]+$/, '')
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${base.slice(0, 60) || 'file'}.${ext}`;
}

export interface UploadInput {
  alt?: string;
  visibility: 'public' | 'private';
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async upload(
    file: { buffer: Buffer; originalname: string },
    input: UploadInput,
    actor: Actor & { type: 'user' },
  ) {
    const kind = sniff(file.buffer);
    if (!kind)
      unprocessable(
        'Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, AVIF, PDF, ZIP, MP3.',
        'file',
      );
    const isImage = kind.mime.startsWith('image/');
    // Public images end up on pages, so they need alt text. Private files are downloads.
    if (isImage && input.visibility === 'public' && !input.alt?.trim()) {
      unprocessable('Alt text is required for public images', 'alt');
    }

    const id = randomUUID();
    const now = new Date();
    const folder = `${input.visibility === 'private' ? PRIVATE_PREFIX : PUBLIC_PREFIX}${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${id}`;
    const filename = safeName(file.originalname, kind.ext);
    const key = `${folder}/${filename}`;

    let body = file.buffer;
    let width: number | null = null;
    let height: number | null = null;
    let blurDataUrl: string | null = null;
    const variants: MediaVariant[] = [];
    const uploads: Array<Promise<void>> = [];

    if (isImage) {
      const animated = kind.mime === 'image/gif';
      // Auto-orient and drop EXIF/GPS metadata (privacy) by re-encoding in the same format.
      if (!animated) body = await sharp(file.buffer).rotate().toBuffer();
      const meta = await sharp(body).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;

      const tiny = await sharp(body).resize(16).webp({ quality: 40 }).toBuffer();
      blurDataUrl = `data:image/webp;base64,${tiny.toString('base64')}`;

      if (!animated && width) {
        for (const w of VARIANT_WIDTHS.filter((vw) => vw < width!)) {
          const out = await sharp(body)
            .resize({ width: w })
            .webp({ quality: 80 })
            .toBuffer({ resolveWithObject: true });
          const variantKey = `${folder}/w${w}.webp`;
          variants.push({
            key: variantKey,
            width: out.info.width,
            height: out.info.height,
            format: 'webp',
          });
          uploads.push(this.storage.put(variantKey, out.data, 'image/webp'));
        }
      }
    }

    uploads.push(this.storage.put(key, body, kind.mime));
    await Promise.all(uploads);

    const media = await this.prisma.media.create({
      data: {
        key,
        filename,
        mimeType: kind.mime,
        size: body.length,
        width,
        height,
        alt: input.alt?.trim() || null,
        variants: variants as unknown as object[],
        blurDataUrl,
        uploadedById: actor.id,
      },
    });
    await this.audit.record(actor, 'media.upload', 'Media', media.id, { key, mimeType: kind.mime });
    return this.present(media);
  }

  async list(query: { q?: string; limit: number; cursor?: string }) {
    const rows = await this.prisma.media.findMany({
      where: query.q
        ? {
            OR: [
              { alt: { contains: query.q, mode: 'insensitive' } },
              { key: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      ...cursorArgs(query.limit, query.cursor),
    });
    const page = paginate(rows, query.limit);
    return { items: page.items.map((m) => this.present(m)), nextCursor: page.nextCursor };
  }

  async update(id: string, input: { alt?: string }, actor: Actor) {
    const media = await this.prisma.media.update({ where: { id }, data: input });
    await this.audit.record(actor, 'media.update', 'Media', id);
    return this.present(media);
  }

  async remove(id: string, actor: Actor) {
    const media = await this.prisma.media.findUnique({
      where: { id },
      include: { _count: { select: { productFiles: true } } },
    });
    if (!media) throw new NotFoundException('Media not found');
    if (media._count.productFiles > 0) {
      unprocessable('This file is delivered by a product. Remove it from the product first.');
    }
    const variants = (media.variants as unknown as MediaVariant[]) ?? [];
    await this.prisma.media.delete({ where: { id } });
    await this.storage.remove([media.key, ...variants.map((v) => v.key)]);
    await this.audit.record(actor, 'media.delete', 'Media', id, { key: media.key });
  }

  private present(media: Parameters<typeof toPublicMedia>[0] & object) {
    const isPrivate = media.key.startsWith(PRIVATE_PREFIX);
    return {
      ...toPublicMedia(media, this.env.MEDIA_PUBLIC_URL)!,
      key: media.key,
      filename: media.filename,
      size: media.size,
      private: isPrivate,
      createdAt: media.createdAt,
    };
  }
}
