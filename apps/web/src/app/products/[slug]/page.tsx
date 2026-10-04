import { Button, Chip, Container, accentBg, cn } from '@shimanto/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/page/breadcrumbs';
import { JsonLd } from '@/components/page/json-ld';
import { Section, SectionTitle } from '@/components/page/section';
import { CancelledNotice } from '@/components/store/cancelled-notice';
import { type OrderOption, OrderPanel } from '@/components/store/order-panel';
import { TrackViewItem } from '@/components/analytics/analytics';
import { ProductArt } from '@/components/store/product-art';
import { ProductCard, StatusChip } from '@/components/store/product-card';
import { kindLabel } from '@/content/products';
import { pageMetadata } from '@/lib/seo';
import { absoluteUrl, site } from '@/lib/site';
import {
  type StoreProduct,
  getStoreProduct,
  getStoreProducts,
  majorUnits,
  priceLine,
} from '@/lib/store';
import { ventures } from '@/content/catalog';

/** Products added later in the admin render on demand, then stay cached until revalidated. */
export const dynamicParams = true;
export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getStoreProducts()).map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStoreProduct(slug);
  if (!product) return {};
  return {
    ...pageMetadata({
      title: product.name,
      description: `${product.tagline} ${product.summary}`.trim(),
      path: `/products/${product.slug}`,
    }),
    ...(product.status === 'sample' ? { robots: { index: false, follow: false } } : {}),
  };
}

/** Questions every product answers, plus the product's own. */
function faqFor(product: StoreProduct) {
  const delivery =
    product.kind === 'service'
      ? 'Right after payment you get an email with the next steps, including how to book.'
      : product.kind === 'course'
        ? 'Right after payment you get an email with your access link.'
        : 'Right after checkout it’s in your account: files download from there any time (fresh secure links every time), and repository products invite your connected GitHub account automatically.';
  return [
    ...(product.faq ?? []),
    { q: 'How do I get it after buying?', a: delivery },
    {
      q: 'Is payment secure?',
      a: 'Yes. Checkout runs on Stripe, and your card details never touch this site.',
    },
    {
      q: 'What if it doesn’t work for me?',
      a: 'If it doesn’t work as described and the problem can’t be fixed, you get a refund. See the refund policy for details.',
    },
    {
      q: 'Can I get an invoice for my company?',
      a: 'Yes. A receipt is emailed automatically, and you can add company details on the Stripe checkout page.',
    },
  ];
}

function orderOptions(product: StoreProduct): OrderOption[] {
  if (product.tiers?.length) {
    return product.tiers.map((t) => ({
      slug: t.slug,
      name: t.name,
      blurb: t.blurb,
      features: t.features,
      priceLabel: t.priceLabel,
      amount: t.amount,
      currency: t.currency,
      purchasable: t.purchasable,
      highlight: t.highlight,
    }));
  }
  return [
    {
      slug: product.slug,
      name: kindLabel[product.kind],
      features: product.included ?? product.highlights,
      priceLabel: product.priceLabel,
      amount: product.amount,
      currency: product.currency,
      purchasable: product.purchasable,
    },
  ];
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const all = await getStoreProducts();
  const product = all.find((p) => p.slug === slug);
  if (!product) notFound();
  const tone = product.world;
  const faq = faqFor(product);
  const related = all
    .filter((p) => p.slug !== product.slug && p.status === product.status)
    .slice(0, 3);
  const buyLabel =
    product.status === 'available'
      ? product.amount === 0
        ? 'Get it free'
        : 'Buy now'
      : product.status === 'sample'
        ? 'See pricing'
        : 'Get early access';

  return (
    <main id="main" className="pb-24 md:pb-0">
      {product.status === 'available' && (
        <TrackViewItem
          item={{
            item_id: product.slug,
            item_name: product.name,
            price: product.amount ?? 0,
            quantity: 1,
            item_category: product.kind,
          }}
          currency={product.currency}
        />
      )}
      {product.status !== 'sample' && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.name,
            description: product.summary || product.tagline,
            url: absoluteUrl(`/products/${product.slug}`),
            brand: { '@type': 'Person', name: site.name },
            ...(product.amount !== undefined && product.status === 'available'
              ? {
                  offers: {
                    '@type': 'Offer',
                    price: majorUnits(product.amount, product.currency),
                    priceCurrency: product.currency,
                    availability: 'https://schema.org/InStock',
                    url: absoluteUrl(`/products/${product.slug}`),
                  },
                }
              : {}),
          }}
        />
      )}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faq.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: item.a },
          })),
        }}
      />

      {/* Hero */}
      <section className="pt-28 pb-12 md:pt-36 md:pb-16">
        <Container>
          <Breadcrumbs
            items={[
              { label: 'Products', href: '/products' },
              { label: product.name, href: `/products/${product.slug}` },
            ]}
          />
          <div className="mt-10 grid items-center gap-10 md:grid-cols-[1.05fr_1fr] md:gap-14">
            <div className="rounded-card overflow-hidden">
              <ProductArt product={product} size="hero" className="aspect-4/3 rounded-none" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Chip variant="status" tone={tone}>
                  {kindLabel[product.kind]}
                </Chip>
                <StatusChip product={product} />
              </div>
              <h1 className="mt-4 text-[clamp(38px,5vw,64px)] leading-[1.02] font-medium tracking-[-0.045em] text-balance">
                {product.name}
              </h1>
              <p className="text-ink-soft mt-4 text-lg leading-relaxed md:text-xl">
                {product.tagline}
              </p>
              <ul className="mt-6 space-y-2">
                {product.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={cn('size-1.5 rounded-full', accentBg[tone])}
                    />
                    {h}
                  </li>
                ))}
              </ul>
              <div className="border-ink/10 mt-8 flex flex-wrap items-center gap-x-6 gap-y-4 border-t pt-6">
                <div className="mr-auto">
                  <p className="text-3xl font-medium tracking-[-0.03em]">{priceLine(product)}</p>
                  <p className="text-ink-soft text-sm">
                    {product.priceLabel && product.amount !== 0
                      ? `${product.currency} · one-time payment`
                      : product.status === 'coming-soon'
                        ? 'Pricing announced at launch'
                        : 'No card needed'}
                  </p>
                </div>
                <Button href="#order">{buyLabel}</Button>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* What it is */}
      {(product.summary || product.included?.length || product.specs?.length) && (
        <Section divided labelledBy="what-title">
          <div className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:gap-16">
            <div>
              <p className="text-ink-soft text-sm font-medium">What it is</p>
              <h2
                id="what-title"
                className="mt-2 text-2xl leading-snug font-medium tracking-[-0.025em] md:text-3xl"
              >
                {product.summary || product.tagline}
              </h2>
            </div>
            <div className="space-y-10">
              {product.included && product.included.length > 0 && (
                <div>
                  <p className="text-ink-soft text-sm font-medium">What you get</p>
                  <ul className="border-ink/10 mt-3 border-b">
                    {product.included.map((item) => (
                      <li
                        key={item}
                        className="border-ink/10 flex items-center gap-3 border-t py-3"
                      >
                        <span aria-hidden="true" className="text-ink-soft">
                          ✓
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  {product.fileCount !== undefined && product.fileCount > 0 && (
                    <p className="text-ink-soft mt-3 text-sm">
                      {product.fileCount} file{product.fileCount === 1 ? '' : 's'}, delivered by
                      email.
                    </p>
                  )}
                </div>
              )}
              {product.specs && product.specs.length > 0 && (
                <dl className="border-ink/10 border-b">
                  {product.specs.map((spec) => (
                    <div
                      key={spec.label}
                      className="border-ink/10 flex justify-between gap-6 border-t py-3"
                    >
                      <dt className="text-ink-soft">{spec.label}</dt>
                      <dd className="text-right font-medium">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* Features */}
      {product.features && product.features.length > 0 && (
        <Section divided labelledBy="features-title">
          <SectionTitle
            id="features-title"
            eyebrow="Inside"
            title="Built to be used, not just read."
          />
          <ul
            className={cn(
              'mt-10 grid gap-8 sm:grid-cols-2',
              product.features.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
            )}
          >
            {product.features.map((f, i) => (
              <li key={f.title}>
                <span className="text-ink-soft font-mono text-sm">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="mt-2 text-xl font-medium">{f.title}</p>
                <p className="text-ink-soft mt-1">{f.body}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Pricing + order */}
      <section id="order" className="scroll-mt-20 pb-16 md:pb-24">
        <Container>
          <div className="border-ink/10 border-t pt-12 md:pt-16">
            <CancelledNotice />
            <SectionTitle
              eyebrow="Pricing"
              title={product.tiers?.length ? 'Pick your plan.' : 'One price. Yours to keep.'}
            />
            <div className="mt-10">
              <OrderPanel
                productName={product.name}
                options={orderOptions(product)}
                tone={tone}
                status={product.status}
              />
            </div>
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <Section divided labelledBy="faq-title">
        <div className="grid gap-10 md:grid-cols-[1fr_1.4fr] md:gap-16">
          <div>
            <SectionTitle eyebrow="FAQ" title="Questions, answered." id="faq-title" />
            <p className="text-ink-soft mt-4">
              Something else?{' '}
              <Link
                href="/collaborate?intent=OTHER"
                className="text-ink font-medium underline underline-offset-4"
              >
                Ask me directly
              </Link>
              .
            </p>
          </div>
          <div className="border-ink/10 border-b">
            {faq.map((item) => (
              <details key={item.q} className="group border-ink/10 border-t py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="text-ink-soft text-xl transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="text-ink-soft mt-3 max-w-[60ch]">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </Section>

      {/* Related */}
      <Section divided className="pb-24 md:pb-32">
        {related.length > 0 && (
          <>
            <SectionTitle
              eyebrow="More from the store"
              title="You might also like."
              action={
                <Button href="/products" variant="text">
                  All products →
                </Button>
              }
            />
            <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <li key={p.slug}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </>
        )}
        {product.ventureSlug && ventures.some((v) => v.slug === product.ventureSlug) && (
          <p className="text-ink-soft mt-12 text-lg">
            Curious how {product.name} came to be?{' '}
            <Link
              href={`/work/${product.ventureSlug}`}
              className="text-ink font-medium underline underline-offset-4"
            >
              Read the story behind it
            </Link>
            .
          </p>
        )}
      </Section>

      {/* Sticky mobile buy bar (brief §5) */}
      <div className="bg-canvas/95 border-ink/10 fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-3 border-t px-5 py-3 backdrop-blur md:hidden">
        <span className="min-w-0 truncate font-medium">
          {product.name}
          <span className="text-ink-soft ml-2 text-sm">{priceLine(product)}</span>
        </span>
        <Button href="#order" className="shrink-0 px-4 py-2 text-sm">
          {product.status === 'available' ? 'Buy' : 'Details'}
        </Button>
      </div>
    </main>
  );
}
