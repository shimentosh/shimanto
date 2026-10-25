import type { Metadata } from 'next';
import { ContentOsGuides } from '@/components/content-os/guides';
import { CONTENT_OS_SLUG, contentOsCopy } from '@/content/content-os';
import { storyDemo } from '@/content/content-os/demos';
import { guidesEn } from '@/content/content-os/guides';
import { pageMetadata } from '@/lib/seo';
import { getStoreProduct } from '@/lib/store';

export const revalidate = 3600;

const path = '/content-os/guides';

export function generateMetadata(): Metadata {
  const meta = pageMetadata({
    title: guidesEn.meta.title,
    description: guidesEn.meta.description,
    path,
  });
  return {
    ...meta,
    icons: { icon: [{ url: '/content-os/mark.webp', type: 'image/webp' }] },
    openGraph: {
      ...meta.openGraph,
      images: [{ url: storyDemo.poster, width: 1280, height: 720, alt: 'Content OS' }],
    },
  };
}

export default async function ContentOsGuidesPage() {
  const product = await getStoreProduct(CONTENT_OS_SLUG);
  return (
    <ContentOsGuides
      copy={contentOsCopy.en}
      guides={guidesEn}
      product={product}
      lang="en"
      path={path}
    />
  );
}
