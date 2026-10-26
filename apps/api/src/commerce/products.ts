import {
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Injectable,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type AdminProduct,
  AdminProductSchema,
  ProductBenefitSchema,
  ProductFaqSchema,
  type ProductInput,
  ProductInputSchema,
  ProductUpdateSchema,
  type PublicProduct,
  PublicProductSchema,
  SlugSchema,
} from '@shimanto/types';
import { z } from 'zod';
import { type Actor, AuditService } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/auth.types.js';
import { AdminAuth, CurrentUser } from '../auth/guards.js';
import { unprocessable } from '../common/validate.js';
import { ApiZodResponse, ZodBody, ZodPipe } from '../common/zod.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { Prisma, type ProductStatus } from '../generated/prisma/client.js';
import { JobsService } from '../jobs/jobs.types.js';
import { toPublicMedia } from '../media/media.mapper.js';
import { StorageService } from '../media/storage.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ENTITLED_ORDER } from './status.js';

const images = { orderBy: { order: 'asc' }, include: { media: true } } as const;

const adminInclude = {
  cover: true,
  images,
  files: { orderBy: { order: 'asc' }, include: { media: true } },
  _count: {
    select: { orderItems: { where: { order: { status: { in: ENTITLED_ORDER } } } } },
  },
} satisfies Prisma.ProductInclude;

type AdminRow = Prisma.ProductGetPayload<{ include: typeof adminInclude }>;

const publicInclude = {
  cover: true,
  images,
  _count: { select: { files: true } },
} satisfies Prisma.ProductInclude;

type PublicRow = Prisma.ProductGetPayload<{ include: typeof publicInclude }>;

/** Stored JSON read back leniently: anything malformed shows as empty rather than failing a page. */
const benefitsOf = (value: unknown) => z.array(ProductBenefitSchema).catch([]).parse(value);
const faqOf = (value: unknown) => z.array(ProductFaqSchema).catch([]).parse(value);

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly jobs: JobsService,
    private readonly storage: StorageService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  // ───────────── Public ─────────────

  /** Published and listed. Unlisted products are only reachable by slug. */
  async publicList(): Promise<PublicProduct[]> {
    const products = await this.prisma.product.findMany({
      where: { status: 'PUBLISHED', visibility: 'LISTED' },
      include: publicInclude,
      orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return products.map((p) => this.toPublic(p));
  }

  async publicGet(slug: string): Promise<PublicProduct> {
    const product = await this.prisma.product.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: publicInclude,
    });
    if (!product) throw new NotFoundException(`No product "${slug}"`);
    return this.toPublic(product);
  }

  private toPublic(p: PublicRow): PublicProduct {
    return {
      slug: p.slug,
      name: p.name,
      summary: p.summary,
      description: p.description,
      type: p.type,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      currency: p.currency,
      free: p.price === 0,
      cover: toPublicMedia(p.cover, this.storage.publicUrl),
      version: p.version,
      features: p.features,
      requirements: p.requirements,
      deliveryMethods: [
        ...(p.deliverFiles ? (['R2'] as const) : []),
        ...(p.deliverGithub ? (['GITHUB'] as const) : []),
      ],
      fileCount: p.deliverFiles ? p._count.files : 0,
      requiresGithub: p.deliverGithub,
      listed: p.visibility === 'LISTED',
      ...this.salesPage(p),
    };
  }

  private salesPage(p: PublicRow | AdminRow) {
    return {
      featured: p.featured,
      tagline: p.tagline,
      badge: p.badge,
      highlights: p.highlights,
      benefits: benefitsOf(p.benefits),
      faq: faqOf(p.faq),
      demoUrl: p.demoUrl,
      videoUrl: p.videoUrl,
      gallery: p.images
        .map((image) => toPublicMedia(image.media, this.storage.publicUrl))
        .filter((media) => media !== null),
    };
  }

  // ───────────── Admin ─────────────

  toAdmin(p: AdminRow): AdminProduct {
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      summary: p.summary,
      description: p.description,
      type: p.type,
      status: p.status,
      visibility: p.visibility,
      ...this.salesPage(p),
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      currency: p.currency,
      cover: toPublicMedia(p.cover, this.storage.publicUrl),
      features: p.features,
      requirements: p.requirements,
      version: p.version,
      deliverFiles: p.deliverFiles,
      deliverGithub: p.deliverGithub,
      githubOwner: p.githubOwner,
      githubRepo: p.githubRepo,
      files: p.files.map((f) => ({
        id: f.id,
        mediaId: f.mediaId,
        label: f.label,
        version: f.version,
        filename: f.media.filename,
        mimeType: f.media.mimeType,
        size: f.media.size,
      })),
      sales: p._count.orderItems,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  async list(): Promise<AdminProduct[]> {
    const rows = await this.prisma.product.findMany({
      include: adminInclude,
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((p) => this.toAdmin(p));
  }

  private async row(id: string): Promise<AdminRow> {
    const product = await this.prisma.product.findUnique({ where: { id }, include: adminInclude });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async get(id: string): Promise<AdminProduct> {
    return this.toAdmin(await this.row(id));
  }

  async create(input: z.output<typeof ProductInputSchema>, actor: Actor): Promise<AdminProduct> {
    await this.assertFiles(input.files);
    await this.assertCover(input.coverId);
    await this.assertGallery(input.galleryIds);
    try {
      const product = await this.prisma.product.create({
        data: {
          slug: input.slug,
          name: input.name,
          summary: input.summary ?? null,
          description: input.description ?? null,
          type: input.type,
          price: input.price,
          compareAtPrice: input.compareAtPrice ?? null,
          currency: input.currency,
          coverId: input.coverId ?? null,
          features: input.features,
          requirements: input.requirements,
          version: input.version ?? null,
          deliverFiles: input.deliverFiles,
          deliverGithub: input.deliverGithub,
          githubOwner: input.githubOwner ?? null,
          githubRepo: input.githubRepo ?? null,
          files: { create: await this.fileRows(input.files) },
          visibility: input.visibility,
          featured: input.featured,
          tagline: input.tagline ?? null,
          badge: input.badge ?? null,
          highlights: input.highlights,
          benefits: input.benefits,
          faq: input.faq,
          demoUrl: input.demoUrl ?? null,
          videoUrl: input.videoUrl ?? null,
          images: { create: input.galleryIds.map((mediaId, order) => ({ mediaId, order })) },
        },
        include: adminInclude,
      });
      await this.audit.record(actor, 'product.create', 'Product', product.id, {
        slug: product.slug,
      });
      return this.toAdmin(product);
    } catch (error) {
      throw this.slugConflict(error);
    }
  }

  async update(id: string, input: z.output<typeof ProductUpdateSchema>, actor: Actor) {
    const before = await this.row(id);
    if (input.files) await this.assertFiles(input.files);
    if (input.coverId) await this.assertCover(input.coverId);
    if (input.galleryIds) await this.assertGallery(input.galleryIds);

    const next = {
      price: input.price ?? before.price,
      compareAtPrice:
        input.compareAtPrice === undefined ? before.compareAtPrice : input.compareAtPrice,
      deliverGithub: input.deliverGithub ?? before.deliverGithub,
      githubOwner: input.githubOwner === undefined ? before.githubOwner : input.githubOwner,
      githubRepo: input.githubRepo === undefined ? before.githubRepo : input.githubRepo,
    };
    if (next.compareAtPrice != null && next.compareAtPrice <= next.price) {
      unprocessable('The compare-at price must be higher than the price', 'compareAtPrice');
    }
    if (next.deliverGithub && (!next.githubOwner || !next.githubRepo)) {
      unprocessable('Set the repository owner and name for GitHub delivery', 'githubRepo');
    }

    let product: AdminRow;
    try {
      product = await this.prisma.$transaction(async (tx) => {
        if (input.files) {
          await tx.productFile.deleteMany({ where: { productId: id } });
          await tx.productFile.createMany({
            data: (await this.fileRows(input.files)).map((row) => ({ ...row, productId: id })),
          });
        }
        if (input.galleryIds) {
          await tx.productImage.deleteMany({ where: { productId: id } });
          await tx.productImage.createMany({
            data: input.galleryIds.map((mediaId, order) => ({ productId: id, mediaId, order })),
          });
        }
        return tx.product.update({
          where: { id },
          data: {
            slug: input.slug,
            name: input.name,
            summary: input.summary,
            description: input.description,
            type: input.type,
            price: input.price,
            compareAtPrice: input.compareAtPrice,
            currency: input.currency,
            coverId: input.coverId,
            features: input.features,
            requirements: input.requirements,
            version: input.version,
            deliverFiles: input.deliverFiles,
            deliverGithub: input.deliverGithub,
            githubOwner: input.githubOwner,
            githubRepo: input.githubRepo,
            visibility: input.visibility,
            featured: input.featured,
            tagline: input.tagline,
            badge: input.badge,
            highlights: input.highlights,
            benefits: input.benefits,
            faq: input.faq,
            demoUrl: input.demoUrl,
            videoUrl: input.videoUrl,
          },
          include: adminInclude,
        });
      });
    } catch (error) {
      throw this.slugConflict(error);
    }
    if (product.status === 'PUBLISHED') this.assertPublishable(product);
    await this.audit.record(actor, 'product.update', 'Product', id, {
      fields: Object.keys(input),
      ...(input.price !== undefined && input.price !== before.price
        ? { priceFrom: before.price, priceTo: input.price }
        : {}),
      ...(input.githubRepo !== undefined || input.githubOwner !== undefined
        ? { repository: `${product.githubOwner}/${product.githubRepo}` }
        : {}),
    });
    if (before.status === 'PUBLISHED') await this.revalidate(before.slug, product.slug);
    return this.toAdmin(product);
  }

  /** A published product must be deliverable: every enabled method fully configured. */
  private assertPublishable(product: AdminRow) {
    if (!product.deliverFiles && !product.deliverGithub) {
      unprocessable(
        'Choose how buyers receive this product: files, a GitHub repository, or both',
        'deliverFiles',
      );
    }
    if (product.deliverFiles && product.files.length === 0) {
      unprocessable('Attach at least one file: that is what buyers download', 'files');
    }
    if (product.deliverGithub && (!product.githubOwner || !product.githubRepo)) {
      unprocessable('Set the GitHub repository buyers get access to', 'githubRepo');
    }
  }

  async setStatus(id: string, status: ProductStatus, actor: Actor): Promise<AdminProduct> {
    const product = await this.row(id);
    if (status === 'PUBLISHED') this.assertPublishable(product);
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        status,
        ...(status === 'PUBLISHED' && !product.publishedAt ? { publishedAt: new Date() } : {}),
      },
      include: adminInclude,
    });
    await this.audit.record(actor, `product.${status.toLowerCase()}`, 'Product', id);
    await this.revalidate(product.slug);
    return this.toAdmin(updated);
  }

  async remove(id: string, actor: Actor) {
    const product = await this.row(id);
    const orders = await this.prisma.orderItem.count({ where: { productId: id } });
    // Orders reference the product forever (receipts, re-downloads), so sold products are archived.
    if (orders > 0) unprocessable('This product has orders. Archive it instead of deleting.');
    await this.prisma.product.delete({ where: { id } });
    await this.audit.record(actor, 'product.delete', 'Product', id, { slug: product.slug });
    if (product.status === 'PUBLISHED') await this.revalidate(product.slug);
  }

  private slugConflict(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      try {
        unprocessable('Another product already uses this slug', 'slug');
      } catch (conflict) {
        return conflict;
      }
    }
    return error;
  }

  private async assertCover(coverId?: string | null) {
    if (!coverId) return;
    const cover = await this.prisma.media.findUnique({ where: { id: coverId } });
    if (!cover || !cover.mimeType.startsWith('image/') || cover.key.startsWith('private/')) {
      unprocessable('The cover must be a public image from the media library', 'coverId');
    }
  }

  /** Gallery images follow the cover's rule: public images from the media library, each once. */
  private async assertGallery(ids: string[] = []) {
    if (ids.length === 0) return;
    if (new Set(ids).size !== ids.length)
      unprocessable('The same image is in the gallery twice', 'galleryIds');
    const media = await this.prisma.media.findMany({ where: { id: { in: ids } } });
    const ok = media.filter(
      (m) => m.mimeType.startsWith('image/') && !m.key.startsWith('private/'),
    );
    if (ok.length !== ids.length) {
      unprocessable('Gallery images must be public images from the media library', 'galleryIds');
    }
  }

  private async assertFiles(files: ProductInput['files'] = []) {
    const ids = [...new Set(files.map((f) => f.mediaId))];
    if (ids.length !== files.length) unprocessable('The same file is listed twice', 'files');
    const found = await this.prisma.media.count({ where: { id: { in: ids } } });
    if (found !== ids.length) unprocessable('One or more files do not exist in storage', 'files');
  }

  private async fileRows(files: ProductInput['files'] = []) {
    const media = await this.prisma.media.findMany({
      where: { id: { in: files.map((f) => f.mediaId) } },
    });
    const byId = new Map(media.map((m) => [m.id, m]));
    return files.map((file, order) => ({
      mediaId: file.mediaId,
      label: file.label ?? byId.get(file.mediaId)!.filename,
      version: file.version ?? null,
      order,
    }));
  }

  revalidate(...slugs: string[]) {
    const tags = new Set(['products', ...slugs.map((slug) => `products:${slug}`)]);
    return this.jobs.enqueue('web.revalidate', { tags: [...tags] });
  }
}

@ApiTags('products')
@Controller('products')
export class PublicProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiZodResponse(z.array(PublicProductSchema))
  list() {
    return this.products.publicList();
  }

  @Get(':slug')
  @ApiZodResponse(PublicProductSchema)
  get(@Param('slug', new ZodPipe(SlugSchema)) slug: string) {
    return this.products.publicGet(slug);
  }
}

const actor = (user: AuthUser) => ({ type: 'user' as const, id: user.id });

@ApiTags('admin · products')
@AdminAuth()
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiZodResponse(z.array(AdminProductSchema))
  list() {
    return this.products.list();
  }

  @Get(':id')
  @ApiZodResponse(AdminProductSchema)
  get(@Param('id') id: string) {
    return this.products.get(id);
  }

  @Post()
  @ApiZodResponse(AdminProductSchema, 201)
  create(
    @ZodBody(ProductInputSchema) body: z.output<typeof ProductInputSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.products.create(body, actor(user));
  }

  @Patch(':id')
  @ApiZodResponse(AdminProductSchema)
  update(
    @Param('id') id: string,
    @ZodBody(ProductUpdateSchema) body: z.output<typeof ProductUpdateSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.products.update(id, body, actor(user));
  }

  @Post(':id/publish')
  @HttpCode(200)
  @ApiZodResponse(AdminProductSchema)
  publish(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.products.setStatus(id, 'PUBLISHED', actor(user));
  }

  @Post(':id/unpublish')
  @HttpCode(200)
  @ApiZodResponse(AdminProductSchema)
  unpublish(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.products.setStatus(id, 'DRAFT', actor(user));
  }

  @Post(':id/archive')
  @HttpCode(200)
  @ApiZodResponse(AdminProductSchema)
  archive(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.products.setStatus(id, 'ARCHIVED', actor(user));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.products.remove(id, actor(user));
  }
}
