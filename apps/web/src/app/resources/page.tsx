import { Chip, Squiggle } from '@shimanto/ui';
import Image from 'next/image';
import Link from 'next/link';
import { CategoryGrid } from '@/components/page/category-grid';
import { RelatedPosts } from '@/components/blog/related-posts';
import { EmptyState } from '@/components/page/empty-state';
import { Masthead } from '@/components/page/masthead';
import { Section, SectionTitle } from '@/components/page/section';
import { resourceCategories } from '@/content/catalog';
import { priceLabel, tools } from '@/content/tools';
import { postsIn } from '@/lib/blog';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Resources',
  description: 'Tools, templates and guides Shimanto uses and recommends, curated and original.',
  path: '/resources',
});

export default function ResourcesPage() {
  return (
    <main id="main">
      <Masthead
        crumbs={[{ label: 'Resources', href: '/resources' }]}
        kicker="Resources / Mine and curated"
        world="signal"
        title={
          <>
            The <Squiggle world="signal">toolbox</Squiggle>, open.
          </>
        }
        intro="Tools, templates and guides I actually use. Mine and curated, always labelled which is which."
      />
      <Section labelledBy="types-title">
        <SectionTitle id="types-title" eyebrow="Filter by type" title="Three shelves." />
        <CategoryGrid
          label="Resource types"
          className="mt-10 md:grid-cols-3"
          items={resourceCategories.map((c) =>
            c.name === 'Tools' ? { ...c, href: '/tools', meta: `${tools.length} of mine` } : c,
          )}
        />
      </Section>
      <Section divided labelledBy="mine-title">
        <SectionTitle
          id="mine-title"
          eyebrow="Made by me"
          title="Free tools I built."
          action={
            <Link
              href="/tools"
              className="font-medium underline decoration-1 underline-offset-[6px] hover:decoration-2"
            >
              All tools →
            </Link>
          }
        />
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {tools.map((tool) => (
            <li key={tool.slug}>
              <Link
                href={`/tools/${tool.slug}`}
                className="group border-ink/10 bg-paper hover:border-ink/25 rounded-card flex h-full items-start gap-4 border p-5 transition-[transform,border-color] duration-300 motion-safe:hover:-translate-y-0.5 md:p-6"
              >
                <Image
                  src={tool.logo.src}
                  alt=""
                  width={56}
                  height={56}
                  className="size-14 shrink-0 rounded-2xl"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-lg font-medium group-hover:underline">{tool.name}</span>
                    <Chip variant="status" tone={tool.price ? 'spark' : 'build'}>
                      {priceLabel(tool)}
                    </Chip>
                  </span>
                  <span className="text-ink-soft block text-sm">{tool.kind}</span>
                  <span className="text-ink-soft mt-2 block leading-snug">{tool.tagline}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <Section divided className="pb-24 md:pb-32">
        <EmptyState
          art="package"
          tone="signal"
          title="Curated picks are on the way."
          body="Templates, guides and the tools I pay for, each with a short note on why it earned its place and a clear label when it's an affiliate link."
          cta={{ href: '/products', label: 'See the products' }}
        />
        <RelatedPosts posts={postsIn(['Automation', 'AI'])} />
      </Section>
    </main>
  );
}
