import type { Metadata } from 'next';
import { ContentOsFeatures } from '@/components/content-os/features';
import { CONTENT_OS_SLUG, contentOsCopy } from '@/content/content-os';
import { storyDemo } from '@/content/content-os/demos';
import { featuresEn } from '@/content/content-os/features';
import { pageMetadata } from '@/lib/seo';
import { getStoreProduct } from '@/lib/store';

export const revalidate = 3600;

const path = '/content-os/features';

export function generateMetadata(): Metadata {
  const meta = pageMetadata({
    title: featuresEn.meta.title,
    description: featuresEn.meta.description,
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

export default async function ContentOsFeaturesPage() {
  const product = await getStoreProduct(CONTENT_OS_SLUG);
  return (
    <ContentOsFeatures
      copy={contentOsCopy.en}
      features={featuresEn}
      product={product}
      lang="en"
      path={path}
    />
  );
}
