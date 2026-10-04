import { randomUUID } from 'node:crypto';
import { open, rm } from 'node:fs/promises';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { AdminFile, Page } from '@shimanto/types';
import { type Actor, AuditService } from '../audit/audit.service.js';
import { cursorArgs, paginate } from '../common/cursor.js';
import { unprocessable } from '../common/validate.js';
import type { Prisma } from '../generated/prisma/client.js';
import { JobsService } from '../jobs/jobs.types.js';
import { sniff } from '../media/media.service.js';
import { PRIVATE_PREFIX, StorageService } from '../media/storage.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Where product deliverables live in the bucket (never publicly readable). */
export const FILES_PREFIX = `${PRIVATE_PREFIX}files/`;
/** Support attachments are private too, but they are not product files. */
const SUPPORT_PREFIX = `${PRIVATE_PREFIX}support/`;

/** Every private object that can be a product file (older uploads used `private/<yyyy>/…`). */
const deliverable = {
  AND: [{ key: { startsWith: PRIVATE_PREFIX } }, { NOT: { key: { startsWith: SUPPORT_PREFIX } } }],
} satisfies Prisma.MediaWhereInput;

const EXTENSION_TYPES: Record<string, string> = {
  zip: 'application/zip',
  pdf: 'application/pdf',
  epub: 'application/epub+zip',
  mobi: 'application/x-mobipocket-ebook',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  gz: 'application/gzip',
  tgz: 'application/gzip',
  '7z': 'application/x-7z-compressed',
  rar: 'application/vnd.rar',
  dmg: 'application/x-apple-diskimage',
  pkg: 'application/octet-stream',
  exe: 'application/vnd.microsoft.portable-executable',
  msi: 'application/x-msi',
  apk: 'application/vnd.android.package-archive',
  deb: 'application/vnd.debian.binary-package',
  appimage: 'application/octet-stream',
  json: 'application/json',
  csv: 'text/csv',
  txt: 'text/plain',
  md: 'text/markdown',
  fig: 'application/octet-stream',
  sketch: 'application/octet-stream',
  psd: 'image/vnd.adobe.photoshop',
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff2: 'font/woff2',
};

/** Keeps a readable, safe filename (and its extension, e.g. `.tar.gz`) for the download. */
export function deliverableName(original: string): string {
  const base = (original.split(/[\\/]/).pop() ?? '').normalize('NFKD');
  const match = /^(.*?)((?:\.tar)?\.[A-Za-z0-9]{1,10})?$/.exec(base);
  const stem = (match?.[1] ?? '')
    .replace(/[^\w.-]+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80);
  const ext = (match?.[2] ?? '').toLowerCase();
  return `${stem || 'file'}${ext}`;
}

export function contentTypeFor(filename: string, head: Buffer): string {
  const sniffed = sniff(head);
  if (sniffed) return sniffed.mime;
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_TYPES[ext] ?? 'application/octet-stream';
}

export interface UploadedDiskFile {
  path: string;
  originalname: string;
  size: number;
}

const include = {
  uploadedBy: { select: { email: true } },
  productFiles: { include: { product: { select: { id: true, name: true } } } },
} satisfies Prisma.MediaInclude;

type FileRow = Prisma.MediaGetPayload<{ include: typeof include }>;

function toFile(m: FileRow): AdminFile {
  return {
    id: m.id,
    key: m.key,
    filename: m.filename,
    mimeType: m.mimeType,
    size: m.size,
    createdAt: m.createdAt.toISOString(),
    uploadedBy: m.uploadedBy?.email ?? null,
    products: m.productFiles.map((pf) => ({
      productFileId: pf.id,
      productId: pf.product.id,
      productName: pf.product.name,
      label: pf.label,
      version: pf.version,
    })),
  };
}

/**
 * Private product files in R2 for admins: upload (streamed from a temp file, never exposed),
 * search, rename, attach to / detach from products, replace a version, delete. Downloads for
 * customers go through entitlement checks and short-lived signed URLs, elsewhere.
 */
@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly jobs: JobsService,
  ) {}

  async list(query: {
    q?: string;
    attached?: 'yes' | 'no';
    limit: number;
    cursor?: string;
  }): Promise<Page<AdminFile>> {
    const rows = await this.prisma.media.findMany({
      where: {
        ...deliverable,
        ...(query.q
          ? {
              OR: [
                { filename: { contains: query.q, mode: 'insensitive' } },
                { productFiles: { some: { label: { contains: query.q, mode: 'insensitive' } } } },
                {
                  productFiles: {
                    some: { product: { name: { contains: query.q, mode: 'insensitive' } } },
                  },
                },
              ],
            }
          : {}),
        ...(query.attached === 'yes' ? { productFiles: { some: {} } } : {}),
        ...(query.attached === 'no' ? { productFiles: { none: {} } } : {}),
      },
      include,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      ...cursorArgs(query.limit, query.cursor),
    });
    const page = paginate(rows, query.limit);
    return { items: page.items.map(toFile), nextCursor: page.nextCursor };
  }

  private async row(id: string): Promise<FileRow> {
    const media = await this.prisma.media.findFirst({
      where: { id, ...deliverable },
      include,
    });
    if (!media) throw new NotFoundException('File not found');
    return media;
  }

  async get(id: string): Promise<AdminFile> {
    return toFile(await this.row(id));
  }

  /** Stores the upload privately and records its metadata. The temp file is always removed. */
  async store(file: UploadedDiskFile, actor: Actor & { type: 'user' }) {
    try {
      if (file.size === 0) unprocessable('The file is empty', 'file');
      const handle = await open(file.path, 'r');
      const head = Buffer.alloc(16);
      await handle.read(head, 0, 16, 0);
      await handle.close();

      const filename = deliverableName(file.originalname);
      const mimeType = contentTypeFor(filename, head);
      const now = new Date();
      const key = `${FILES_PREFIX}${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}/${filename}`;
      await this.storage.putFile(key, file.path, mimeType, file.size);
      const media = await this.prisma.media.create({
        data: { key, filename, mimeType, size: file.size, uploadedById: actor.id },
      });
      await this.audit.record(actor, 'file.upload', 'Media', media.id, {
        key,
        size: file.size,
        mimeType,
      });
      return media;
    } finally {
      await rm(file.path, { force: true });
    }
  }

  async upload(
    file: UploadedDiskFile,
    input: { productId?: string; label?: string; version?: string },
    actor: Actor & { type: 'user' },
  ): Promise<AdminFile> {
    if (input.productId) await this.product(input.productId);
    const media = await this.store(file, actor);
    if (input.productId) {
      await this.attach(
        media.id,
        { productId: input.productId, label: input.label, version: input.version },
        actor,
      );
    }
    return this.get(media.id);
  }

  async rename(id: string, filename: string, actor: Actor): Promise<AdminFile> {
    const media = await this.row(id);
    const next = deliverableName(filename);
    await this.prisma.media.update({ where: { id }, data: { filename: next } });
    await this.audit.record(actor, 'file.rename', 'Media', id, { from: media.filename, to: next });
    return this.get(id);
  }

  async remove(id: string, actor: Actor): Promise<void> {
    const media = await this.row(id);
    if (media.productFiles.length) {
      unprocessable('This file is delivered by a product. Detach it from the product first.');
    }
    await this.prisma.media.delete({ where: { id } });
    await this.storage.remove([media.key]);
    await this.audit.record(actor, 'file.delete', 'Media', id, { key: media.key });
  }

  private async product(productId: string) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) unprocessable('Product not found', 'productId');
    return product;
  }

  async attach(
    id: string,
    input: { productId: string; label?: string; version?: string },
    actor: Actor,
  ): Promise<AdminFile> {
    const media = await this.row(id);
    const product = await this.product(input.productId);
    if (media.productFiles.some((pf) => pf.productId === product.id)) {
      unprocessable('This file is already attached to that product');
    }
    const last = await this.prisma.productFile.aggregate({
      where: { productId: product.id },
      _max: { order: true },
    });
    const productFile = await this.prisma.productFile.create({
      data: {
        productId: product.id,
        mediaId: id,
        label: input.label ?? media.filename,
        version: input.version ?? null,
        order: (last._max.order ?? -1) + 1,
      },
    });
    await this.audit.record(actor, 'file.attach', 'ProductFile', productFile.id, {
      mediaId: id,
      productId: product.id,
    });
    await this.revalidate(product.slug);
    return this.get(id);
  }

  private async productFile(productFileId: string) {
    const pf = await this.prisma.productFile.findUnique({
      where: { id: productFileId },
      include: { product: true, media: true },
    });
    if (!pf) throw new NotFoundException('Attachment not found');
    return pf;
  }

  async updateAttachment(
    productFileId: string,
    input: { label?: string; version?: string | null },
    actor: Actor,
  ) {
    const pf = await this.productFile(productFileId);
    await this.prisma.productFile.update({
      where: { id: productFileId },
      data: { label: input.label, version: input.version },
    });
    await this.audit.record(actor, 'file.attachment.update', 'ProductFile', productFileId, {
      fields: Object.keys(input),
    });
    return this.get(pf.mediaId);
  }

  async detach(productFileId: string, actor: Actor): Promise<void> {
    const pf = await this.productFile(productFileId);
    const remaining = await this.prisma.productFile.count({ where: { productId: pf.productId } });
    if (remaining === 1 && pf.product.deliverFiles && pf.product.status === 'PUBLISHED') {
      unprocessable('This is the last file of a published product. Upload a replacement instead.');
    }
    await this.prisma.productFile.delete({ where: { id: productFileId } });
    await this.audit.record(actor, 'file.detach', 'ProductFile', productFileId, {
      mediaId: pf.mediaId,
      productId: pf.productId,
    });
    await this.revalidate(pf.product.slug);
  }

  /**
   * New version of a delivered file: buyers get the new one from their next download. The old
   * object is deleted when nothing else uses it.
   */
  async replace(
    productFileId: string,
    file: UploadedDiskFile,
    input: { version?: string },
    actor: Actor & { type: 'user' },
  ): Promise<AdminFile> {
    const pf = await this.productFile(productFileId);
    const media = await this.store(file, actor);
    await this.prisma.productFile.update({
      where: { id: productFileId },
      data: {
        mediaId: media.id,
        ...(input.version !== undefined ? { version: input.version } : {}),
      },
    });
    const stillUsed = await this.prisma.productFile.count({ where: { mediaId: pf.mediaId } });
    const inTickets = await this.prisma.supportMessage.count({
      where: { attachmentId: pf.mediaId },
    });
    if (!stillUsed && !inTickets) {
      await this.prisma.media.delete({ where: { id: pf.mediaId } });
      await this.storage.remove([pf.media.key]);
    }
    await this.audit.record(actor, 'file.replace', 'ProductFile', productFileId, {
      from: pf.mediaId,
      to: media.id,
      version: input.version,
    });
    return this.get(media.id);
  }

  /** Admin preview: a 5-minute signed URL. */
  async downloadUrl(id: string): Promise<{ url: string }> {
    const media = await this.row(id);
    return { url: await this.storage.signedDownloadUrl(media.key, media.filename) };
  }

  private revalidate(slug: string) {
    return this.jobs.enqueue('web.revalidate', { tags: ['products', `products:${slug}`] });
  }
}
