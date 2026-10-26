import { type PublicProduct, PublicProductSchema, youtubeId } from '@shimanto/types';
import type { Accent } from '@shimanto/ui';
import {
  type ProductContent,
  type ProductKind,
  type ProductTier,
  productContent,
  tierSlugs,
} from '@/content/products';
import type { ToolImage } from '@/content/tools';
import { hash } from './blog';

export interface StoreTier extends ProductTier {
  amount?: number;
  currency: string;
  priceLabel?: string;
  purchasable: boolean;
}

export interface StoreProduct extends Omit<ProductContent, 'tiers'> {
  tiers?: StoreTier[];
  /** Minor units. For tiered products, the cheapest tier. */
  amount?: number;
  currency: string;
  priceLabel?: string;
  /** "From $29" for tiered products. */
  fromPrice: boolean;
  fileCount?: number;
  cover?: { url: string; alt: string };
  purchasable: boolean;
  status: 'available' | 'coming-soon' | 'sample';
  /** False for unlisted products: reachable by link only, never in listings or search. */
  listed: boolean;
  /** Short label from the admin, e.g. "New". */
  badge?: string;
  /** Long description, paragraphs split on blank lines. */
  description?: string;
  gallery: ToolImage[];
  /** YouTube id, played over the first gallery image. */
  videoId?: string;
  demoUrl?: string;
}

/** Minor units → major units ("1900" USD → 19), respecting zero-decimal currencies. */
export function majorUnits(amount: number, currency: string): number {
  const digits =
    new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits ?? 2;
  return amount / 10 ** digits;
}

/** Formats minor units in any ISO currency, dropping ".00" on round amounts. */
export function formatPrice(amount: number, currency: string): string {
  if (amount === 0) return 'Free';
  const base = new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  });
  const digits = base.resolvedOptions().maximumFractionDigits ?? 2;
  const value = amount / 10 ** digits;
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: Number.isInteger(value) ? 0 : digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/**
 * Published products from the API. Tagged so the API's revalidation webhook refreshes prices
 * immediately; `null` when the API is unreachable (local preview, build without the API).
 */
async function fetchApiProducts(): Promise<PublicProduct[] | null> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl.replace(/\/+$/, '')}/v1/products`, {
      next: { tags: ['products'], revalidate: 3600 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const parsed = PublicProductSchema.array().safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

const worlds: Accent[] = ['build', 'create', 'signal', 'idea', 'spark'];

const kinds: Record<PublicProduct['type'], ProductKind> = {
  SOFTWARE: 'software',
  DIGITAL_PRODUCT: 'digital',
  SOURCE_CODE: 'source-code',
  EBOOK: 'ebook',
  TEMPLATE: 'template',
  COURSE: 'course',
};

/** Specs for an admin-made product: what it is, how it arrives, what it needs. */
function specsFor(api: PublicProduct): ProductContent['specs'] {
  const delivery = [
    api.deliveryMethods.includes('R2') &&
      (api.fileCount > 0
        ? `${api.fileCount} download${api.fileCount === 1 ? '' : 's'}`
        : 'Download'),
    api.requiresGithub && 'Private GitHub repository',
  ].filter(Boolean);
  return [
    ...(api.version ? [{ label: 'Version', value: api.version }] : []),
    ...(delivery.length ? [{ label: 'Delivery', value: delivery.join(' + ') }] : []),
    ...(api.requirements.length ? [{ label: 'Requires', value: api.requirements.join(', ') }] : []),
    { label: 'Updates', value: 'Included, in your account' },
  ];
}

/** Sales content for a product that exists only in the API (added from the admin). */
function genericContent(api: PublicProduct): ProductContent {
  return {
    slug: api.slug,
    name: api.name,
    kind: kinds[api.type],
    tagline: api.tagline ?? api.summary ?? 'Available now.',
    summary: api.summary ?? '',
    world: worlds[hash(api.slug) % worlds.length]!,
    highlights: api.highlights.length
      ? api.highlights
      : [
          api.fileCount > 0
            ? `${api.fileCount} file${api.fileCount === 1 ? '' : 's'}`
            : 'Instant access',
          'Secure checkout',
          'Delivered by email',
        ],
    features: api.benefits.length ? api.benefits : undefined,
    included: api.features.length ? api.features : undefined,
    specs: specsFor(api),
    faq: api.faq.length ? api.faq : undefined,
    featured: api.featured,
  };
}

function merge(content: ProductContent, api: Map<string, PublicProduct>): StoreProduct {
  const own = api.get(content.slug);
  const tiers = content.tiers?.map((tier): StoreTier => {
    const t = api.get(tier.slug);
    const amount = t?.price ?? tier.price;
    const currency = t?.currency ?? tier.currency ?? 'USD';
    return {
      ...tier,
      amount,
      currency,
      priceLabel: amount === undefined ? undefined : formatPrice(amount, currency),
      purchasable: Boolean(t) && !content.sample,
    };
  });

  const priced = tiers?.filter((t) => t.amount !== undefined);
  const cheapest = priced?.length
    ? priced.reduce((a, b) => ((a.amount ?? 0) <= (b.amount ?? 0) ? a : b))
    : undefined;
  const amount = tiers ? cheapest?.amount : (own?.price ?? content.price);
  const currency = (tiers ? cheapest?.currency : own?.currency) ?? content.currency ?? 'USD';
  const purchasable = content.sample
    ? false
    : tiers
      ? tiers.some((t) => t.purchasable)
      : Boolean(own);

  return {
    ...content,
    tiers,
    amount,
    currency,
    priceLabel: amount === undefined ? undefined : formatPrice(amount, currency),
    fromPrice: Boolean(tiers && tiers.length > 1),
    fileCount: own?.fileCount,
    cover: own?.cover ? { url: own.cover.url, alt: own.cover.alt ?? content.name } : undefined,
    purchasable,
    status: content.sample ? 'sample' : purchasable ? 'available' : 'coming-soon',
    listed: own?.listed ?? true,
    badge: own?.badge ?? undefined,
    description: own?.description ?? undefined,
    gallery: (own?.gallery ?? []).map((m) => ({
      src: m.url,
      alt: m.alt ?? content.name,
      width: m.width ?? 1600,
      height: m.height ?? 1000,
    })),
    videoId: (own?.videoUrl && youtubeId(own.videoUrl)) || undefined,
    demoUrl: own?.demoUrl ?? undefined,
  };
}

/** Every product in the store: code-described ones first, then API-only ones. */
export async function getStoreProducts(): Promise<StoreProduct[]> {
  const apiList = (await fetchApiProducts()) ?? [];
  const api = new Map(apiList.map((p) => [p.slug, p]));
  const described = new Set(productContent.map((p) => p.slug));
  const extras = apiList
    .filter((p) => !described.has(p.slug) && !tierSlugs.has(p.slug))
    .map(genericContent);
  return [...productContent, ...extras].map((content) => merge(content, api));
}

/** One published product by slug, listed or not (the API list leaves unlisted ones out). */
async function fetchApiProduct(slug: string): Promise<PublicProduct | null> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl || !/^[a-z0-9-]{1,120}$/.test(slug)) return null;
  try {
    const res = await fetch(`${apiUrl.replace(/\/+$/, '')}/v1/products/${slug}`, {
      next: { tags: ['products', `products:${slug}`], revalidate: 3600 },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const parsed = PublicProductSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function getStoreProduct(slug: string): Promise<StoreProduct | undefined> {
  const found = (await getStoreProducts()).find((p) => p.slug === slug);
  if (found?.status === 'available' || found?.status === 'sample') return found;
  // Not in the list: maybe unlisted. Ask for it by slug.
  const api = await fetchApiProduct(slug);
  if (!api) return found;
  const content = productContent.find((p) => p.slug === slug) ?? genericContent(api);
  return merge(content, new Map([[slug, api]]));
}

/**
 * True once something real is on sale. Until then the store runs in pre-launch mode: no checkout
 * promises, no department list, just what's coming and how to hear first.
 */
export function isStoreOpen(products: StoreProduct[]): boolean {
  return products.some((p) => p.status === 'available');
}

/** Price line for cards and buy bars: "$29", "From $29", "Free", or a status. */
export function priceLine(product: StoreProduct): string {
  if (product.priceLabel)
    return product.fromPrice ? `From ${product.priceLabel}` : product.priceLabel;
  return product.status === 'coming-soon' ? 'Coming soon' : 'Price on request';
}
