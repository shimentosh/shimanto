import type { Metadata } from 'next';
import { CONTENT_OS_MARKETS, type ContentOsLocale, contentOsCopy } from '@/content/content-os';
import { storyDemo } from '@/content/content-os/demos';
import { featuresEn } from '@/content/content-os/features';
import { featuresBn } from '@/content/content-os/features-bn';
import { guidesEn } from '@/content/content-os/guides';
import { guidesBn } from '@/content/content-os/guides-bn';
import { pageMetadata } from '@/lib/seo';
import { formatPrice, getStoreProduct } from '@/lib/store';
import { ContentOsFeatures } from './features';
import { ContentOsGuides } from './guides';
import { ContentOsLanding } from './landing';

/**
 * The three Content OS pages, built once for each market: `/content-os/*` in English and
 * `/bn/content-os/*` in Bangla (Bangladesh, taka). The route files only pick the language.
 */

const featuresCopy = { en: featuresEn, bn: featuresBn };
const guidesCopy = { en: guidesEn, bn: guidesBn };

function metadata(title: string, description: string, path: string): Metadata {
  const meta = pageMetadata({ title, description, path });
  return {
    ...meta,
    icons: { icon: [{ url: '/content-os/mark.webp', type: 'image/webp' }] },
    openGraph: {
      ...meta.openGraph,
      images: [{ url: storyDemo.poster, width: 1280, height: 720, alt: 'Content OS' }],
    },
  };
}

const productOf = (lang: ContentOsLocale) => getStoreProduct(CONTENT_OS_MARKETS[lang].slug);

export async function landingMetadata(lang: ContentOsLocale): Promise<Metadata> {
  const market = CONTENT_OS_MARKETS[lang];
  const product = await productOf(lang);
  const price =
    product?.priceLabel ?? formatPrice(market.fallback.amount, market.fallback.currency);
  const copy = contentOsCopy[lang];
  return metadata(copy.meta.title, copy.meta.description.replaceAll('{price}', price), market.base);
}

export async function LandingRoute({ lang }: { lang: ContentOsLocale }) {
  return (
    <ContentOsLanding
      copy={contentOsCopy[lang]}
      product={await productOf(lang)}
      lang={lang}
      path={CONTENT_OS_MARKETS[lang].base}
    />
  );
}

export function featuresMetadata(lang: ContentOsLocale): Metadata {
  const f = featuresCopy[lang];
  return metadata(f.meta.title, f.meta.description, `${CONTENT_OS_MARKETS[lang].base}/features`);
}

export async function FeaturesRoute({ lang }: { lang: ContentOsLocale }) {
  return (
    <ContentOsFeatures
      copy={contentOsCopy[lang]}
      features={featuresCopy[lang]}
      product={await productOf(lang)}
      lang={lang}
      path={`${CONTENT_OS_MARKETS[lang].base}/features`}
    />
  );
}

export function guidesMetadata(lang: ContentOsLocale): Metadata {
  const g = guidesCopy[lang];
  return metadata(g.meta.title, g.meta.description, `${CONTENT_OS_MARKETS[lang].base}/guides`);
}

export async function GuidesRoute({ lang }: { lang: ContentOsLocale }) {
  return (
    <ContentOsGuides
      copy={contentOsCopy[lang]}
      guides={guidesCopy[lang]}
      product={await productOf(lang)}
      lang={lang}
      path={`${CONTENT_OS_MARKETS[lang].base}/guides`}
    />
  );
}
