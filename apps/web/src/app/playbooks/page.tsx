import { Squiggle } from '@shimanto/ui';
import Link from 'next/link';
import { RelatedPosts } from '@/components/blog/related-posts';
import { CategoryGrid } from '@/components/page/category-grid';
import { EmptyState } from '@/components/page/empty-state';
import { JsonLd } from '@/components/page/json-ld';
import { CtaBand, Masthead, ctaPrimary, ctaSecondary } from '@/components/page/masthead';
import { Section, SectionTitle } from '@/components/page/section';
import { PlaybookBrowser } from '@/components/playbook/playbook-browser';
import { PlaybookCard } from '@/components/playbook/playbook-card';
import { playbookCategories } from '@/content/catalog';
import { postsIn } from '@/lib/blog';
import { playbookWorld, sortedPlaybooks } from '@/lib/playbooks';
import { pageMetadata } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Playbooks',
  description:
    'Frameworks, systems, workflows and SOPs from Shimanto, with steps, checklists and templates you can download.',
  path: '/playbooks',
});

export default function PlaybooksPage() {
  const all = sortedPlaybooks();
  const featured = all[0];
  const templates = all.reduce((n, p) => n + p.templates.length, 0);

  return (
    <main id="main">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListElement: all.map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: absoluteUrl(`/playbooks/${p.slug}`),
            name: p.title,
          })),
        }}
      />
      <Masthead
        crumbs={[{ label: 'Playbooks', href: '/playbooks' }]}
        kicker={`Playbooks / ${all.length} playbooks`}
        world="signal"
        title={
          <>
            Systems you can <Squiggle world="signal">copy</Squiggle>.
          </>
        }
        intro="Frameworks, workflows and SOPs pulled out of real businesses, with steps, a checklist and templates you can use the same day."
      >
        <dl className="grid grid-cols-3 gap-6 md:max-w-2xl">
          {[
            { value: all.length, label: 'playbooks' },
            { value: templates, label: 'downloadable templates' },
            { value: playbookCategories.length, label: 'kinds of playbook' },
          ].map((stat) => (
            <div key={stat.label} className="border-ink/10 flex flex-col-reverse border-l pl-5">
              <dt className="text-ink-soft mt-1 text-sm">{stat.label}</dt>
              <dd className="text-4xl font-medium tracking-[-0.045em] md:text-5xl">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </Masthead>

      {featured ? (
        <>
          <Section className="pb-16 md:pb-20">
            <PlaybookCard playbook={featured} variant="feature" headingLevel="h2" />
          </Section>

          {all.length > 1 && (
            <Section divided labelledBy="all-title">
              <SectionTitle id="all-title" eyebrow="The library" title="Every playbook." />
              <div className="mt-8">
                <PlaybookBrowser
                  categories={playbookCategories.map((c) => c.name)}
                  items={all.map((p) => ({
                    slug: p.slug,
                    category: p.category,
                    card: <PlaybookCard playbook={p} />,
                  }))}
                />
              </div>
            </Section>
          )}

          <Section divided labelledBy="kinds-title">
            <SectionTitle
              id="kinds-title"
              eyebrow="Four kinds"
              title="How the playbooks are organised."
            />
            <CategoryGrid
              label="Playbook categories"
              className="mt-10"
              items={playbookCategories.map((c) => {
                const count = all.filter((p) => p.category === c.name).length;
                return {
                  ...c,
                  tone: playbookWorld({ category: c.name }),
                  meta: `${count} playbook${count === 1 ? '' : 's'}`,
                };
              })}
            />
          </Section>
        </>
      ) : (
        <Section>
          <EmptyState
            tone="signal"
            title="The first playbooks are being documented."
            body="Each one ships with steps, a checklist and a template you can download."
          />
        </Section>
      )}

      <Section divided>
        <RelatedPosts
          className="mt-0"
          posts={postsIn(['Automation', 'Business', 'Product building'])}
          title="The thinking behind the playbooks."
        />
      </Section>
      <Section className="pb-24 md:pb-32">
        <CtaBand
          eyebrow="Want it done for you?"
          title="I can set the system up inside your business."
          world="signal"
        >
          <Link href="/collaborate" className={ctaPrimary}>
            Build it with me →
          </Link>
          <Link href="/products" className={ctaSecondary}>
            Products
          </Link>
        </CtaBand>
      </Section>
    </main>
  );
}
