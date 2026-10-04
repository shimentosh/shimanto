import { Chip } from '@shimanto/ui';
import Link from 'next/link';
import { kindLabel } from '@/content/products';
import { type StoreProduct, priceLine } from '@/lib/store';
import { ProductArt } from './product-art';

export function StatusChip({ product, className }: { product: StoreProduct; className?: string }) {
  if (product.status === 'available') return null;
  return (
    <Chip
      variant="status"
      tone={product.status === 'sample' ? 'idea' : 'spark'}
      className={className}
    >
      {product.status === 'sample' ? 'Sample · preview only' : 'Coming soon'}
    </Chip>
  );
}

/** Store item: product image, then kind, name, tagline and price. The whole item is one link. */
export function ProductCard({
  product,
  headingLevel: Heading = 'h3',
}: {
  product: StoreProduct;
  headingLevel?: 'h2' | 'h3';
}) {
  return (
    <Link
      href={`/products/${product.slug}`}
      data-cursor="View"
      className="group flex h-full flex-col"
    >
      <div className="rounded-card overflow-hidden">
        <ProductArt
          product={product}
          className="aspect-4/3 rounded-none transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-ink-soft text-sm">{kindLabel[product.kind]}</span>
        <StatusChip product={product} />
      </div>
      <Heading className="mt-1 text-xl leading-snug font-medium tracking-[-0.02em] group-hover:underline">
        {product.name}
      </Heading>
      <p className="text-ink-soft mt-1 line-clamp-2">{product.tagline}</p>
      <p className="mt-3 text-lg font-medium">{priceLine(product)}</p>
    </Link>
  );
}
