import { Chip, Squiggle, accentBg, cn } from '@shimanto/ui';
import { Icon } from '@shimanto/ui';
import Link from 'next/link';
import { CategoryGrid } from '@/components/page/category-grid';
import { EmptyState } from '@/components/page/empty-state';
import { JsonLd } from '@/components/page/json-ld';
import { CtaBand, Masthead, ctaPrimary, ctaSecondary } from '@/components/page/masthead';
import { Section, SectionTitle } from '@/components/page/section';
import { ProductArt } from '@/components/store/product-art';
import { ProductCard, StatusChip } from '@/components/store/product-card';
import { StoreBrowser } from '@/components/store/store-browser';
import { productCategories } from '@/content/catalog';
import { kindLabel } from '@/content/products';
import { pageMetadata } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site';
import { getStoreProducts, isStoreOpen, priceLine } from '@/lib/store';

export const metadata = pageMetadata({
  title: 'Products',
  description:
    'Software, templates and systems by Shimanto: the tools built for real work first, then packaged for you.',
  path: '/products',
});

const promises = [
  {
    title: 'Instant access',
    body: 'Your download link arrives by email right after payment.',
    icon: 'bolt' as const,
    tone: 'build' as const,
  },
  {
    title: 'Secure checkout',
    body: 'Payments run through Stripe. Card details never touch this site.',
    icon: 'lock' as const,
    tone: 'signal' as const,
  },
  {
    title: 'Fair refunds',
    body: 'If it doesn’t work as described and can’t be fixed, you get your money back.',
    icon: 'refund' as const,
    tone: 'create' as const,
  },
];

export default async function ProductsPage() {
  const products = await getStoreProducts();
  const featured = products.find((p) => p.featured && p.status !== 'sample') ?? products[0];
  const open = isStoreOpen(products);
  const earlyAccess = '/collaborate?intent=PRODUCT_COLLABORATION';

  return (
    <main id="main">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: products
            .filter((p) => p.status !== 'sample')
            .map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: absoluteUrl(`/products/${p.slug}`),
              name: p.name,
            })),
        }}
      />
      <Masthead
        crumbs={[{ label: 'Products', href: '/products' }]}
        kicker={
          open
            ? `The store / ${products.length} product${products.length === 1 ? '' : 's'}`
            : 'The store / Opening soon'
        }
        world="signal"
        title={
          open ? (
            <>
              Tools you can use <Squiggle world="signal">today</Squiggle>.
            </>
          ) : (
            <>
              The store opens <Squiggle world="signal">soon</Squiggle>.
            </>
          )
        }
        intro={
          open
            ? 'Software, ebooks, templates, source code, courses and services. The systems I build for my own work, packaged so you can run them too.'
            : `I'm packaging the systems I build for my own work so you can run them too.${featured ? ` ${featured.name} is first.` : ''} Get early access and you'll hear before the public launch.`
        }
      >
        {open && (
          <ul aria-label="How buying works" className="grid gap-3 md:grid-cols-3">
            {promises.map((p) => (
              <li
                key={p.title}
                className="border-ink/10 rounded-card flex items-start gap-3.5 border p-4"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'on-world grid size-10 shrink-0 place-items-center rounded-xl',
                    accentBg[p.tone],
                  )}
                >
                  <Icon name={p.icon} className="size-5" />
                </span>
                <span>
                  <span className="block font-medium">{p.title}</span>
                  <span className="text-ink-soft block text-sm leading-snug">{p.body}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Masthead>

      {featured ? (
        <Section>
          <Link
            href={`/products/${featured.slug}`}
            data-cursor="View"
            className="group border-ink/10 hover:border-ink/25 rounded-sheet bg-ink/[0.02] grid items-center gap-8 border p-5 transition-colors md:grid-cols-[1.1fr_1fr] md:gap-12 md:p-8"
          >
            <div className="rounded-card overflow-hidden">
              <ProductArt
                product={featured}
                size="hero"
                className="aspect-4/3 rounded-none transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <Chip variant="status" tone={featured.world}>
                  Featured · {kindLabel[featured.kind]}
                </Chip>
                <StatusChip product={featured} />
              </div>
              <h2 className="mt-4 text-3xl leading-tight font-medium tracking-[-0.035em] group-hover:underline md:text-5xl">
                {featured.name}
              </h2>
              <p className="text-ink-soft mt-4 text-lg">{featured.tagline}</p>
              <ul className="text-ink-soft mt-5 space-y-1.5">
                {featured.highlights.map((h) => (
                  <li key={h}>✓ {h}</li>
                ))}
              </ul>
              <p className="mt-6 text-2xl font-medium">{priceLine(featured)}</p>
            </div>
          </Link>
        </Section>
      ) : (
        <Section>
          <EmptyState
            tone="signal"
            title="The shelves are being stocked."
            body="Products land here as they ship."
          />
        </Section>
      )}

      {products.length > 1 && (
        <Section divided labelledBy="all-title">
          <SectionTitle id="all-title" eyebrow="Browse" title="Everything in the store." />
          <div className="mt-8">
            <StoreBrowser
              items={products.map((p) => ({
                slug: p.slug,
                kind: p.kind,
                card: <ProductCard product={p} />,
              }))}
            />
          </div>
        </Section>
      )}

      {open && (
        <Section divided labelledBy="departments-title">
          <SectionTitle
            id="departments-title"
            eyebrow="Departments"
            title="What the store carries."
          />
          <CategoryGrid label="Store departments" items={productCategories} className="mt-8" />
        </Section>
      )}
      <Section className="pb-24 md:pb-32">
        {open ? (
          <CtaBand
            eyebrow="Need something custom?"
            title="Some products start as a client build."
            world="signal"
          >
            <Link href="/collaborate?intent=PRODUCT_COLLABORATION" className={ctaPrimary}>
              Talk about a product →
            </Link>
            <Link href="/tools" className={ctaSecondary}>
              Free tools
            </Link>
          </CtaBand>
        ) : (
          <CtaBand
            eyebrow="Want it first?"
            title={
              featured ? `Get early access to ${featured.name}.` : 'Hear when the store opens.'
            }
            world="signal"
          >
            <Link href={earlyAccess} className={ctaPrimary}>
              Get early access →
            </Link>
            <Link href="/tools" className={ctaSecondary}>
              Free tools
            </Link>
          </CtaBand>
        )}
      </Section>
    </main>
  );
}
