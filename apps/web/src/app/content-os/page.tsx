import type { Metadata } from 'next';
import { ContentOsLanding } from '@/components/content-os/landing';
import { CONTENT_OS_FALLBACK, CONTENT_OS_SLUG, contentOsCopy } from '@/content/content-os';
import { storyDemo } from '@/content/content-os/demos';
import { pageMetadata } from '@/lib/seo';
import { formatPrice, getStoreProduct } from '@/lib/store';

/** The price comes from the store; the API's revalidation webhook refreshes it on change. */
export const revalidate = 3600;

const copy = contentOsCopy.en;
const path = '/content-os';

async function priceLabel() {
  const product = await getStoreProduct(CONTENT_OS_SLUG);
  return (
    product?.priceLabel ?? formatPrice(CONTENT_OS_FALLBACK.amount, CONTENT_OS_FALLBACK.currency)
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const description = copy.meta.description.replaceAll('{price}', await priceLabel());
  const meta = pageMetadata({ title: copy.meta.title, description, path });
  return {
    ...meta,
    icons: { icon: [{ url: '/content-os/mark.webp', type: 'image/webp' }] },
    openGraph: {
      ...meta.openGraph,
      images: [{ url: storyDemo.poster, width: 1280, height: 720, alt: 'Content OS' }],
    },
  };
}

export default async function ContentOsPage() {
  const product = await getStoreProduct(CONTENT_OS_SLUG);
  return <ContentOsLanding copy={copy} product={product} lang="en" path={path} />;
}
