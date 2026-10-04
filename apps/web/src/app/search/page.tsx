import { Container } from '@shimanto/ui';
import { Breadcrumbs } from '@/components/page/breadcrumbs';
import { SearchBox } from '@/components/page/search-box';
import { pageMetadata } from '@/lib/seo';
import { buildSearchIndex } from '@/lib/search-index';

export const metadata = {
  ...pageMetadata({
    title: 'Search',
    description: 'Search ventures, products, notes, playbooks and experiments on shimanto.xyz.',
    path: '/search',
  }),
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ q?: string | string[] }> };

export default async function SearchPage({ searchParams }: Props) {
  const q = (await searchParams).q;
  return (
    <main id="main">
      <section data-world="canvas" className="min-h-[70vh] pt-32 pb-32 md:pt-40 md:pb-40">
        <Container className="max-w-3xl">
          <Breadcrumbs items={[{ label: 'Search', href: '/search' }]} />
          <h1 className="text-h2 mt-8 font-medium">Search</h1>
          <p className="text-ink-soft mt-4 text-lg">
            Tip: press{' '}
            <kbd className="border-ink/15 rounded-md border px-1.5 py-0.5 font-mono text-sm">
              Ctrl
            </kbd>{' '}
            +{' '}
            <kbd className="border-ink/15 rounded-md border px-1.5 py-0.5 font-mono text-sm">K</kbd>{' '}
            anywhere to jump straight to a page.
          </p>
          <div className="mt-10">
            <SearchBox docs={await buildSearchIndex()} initialQuery={Array.isArray(q) ? q[0] : q} />
          </div>
        </Container>
      </section>
    </main>
  );
}
