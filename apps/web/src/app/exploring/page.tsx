import { Squiggle } from '@shimanto/ui';
import { CategoryGrid } from '@/components/page/category-grid';
import { RelatedPosts } from '@/components/blog/related-posts';
import { EmptyState } from '@/components/page/empty-state';
import { PageHero } from '@/components/page/page-hero';
import { Section, SectionTitle } from '@/components/page/section';
import { nowEntries } from '@/content/catalog';
import { postsIn } from '@/lib/blog';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Currently exploring',
  description: 'Topics, tools and questions Shimanto is digging into right now.',
  path: '/exploring',
});

export default function ExploringPage() {
  const current = nowEntries[0];
  return (
    <main id="main">
      <PageHero
        art="magnifier"
        eyebrow="Currently exploring"
        stickers={['Reading', 'Testing', 'Questioning']}
        world="idea"
        crumbs={[{ label: 'Currently exploring', href: '/exploring' }]}
        title={
          <>
            Rabbit holes, <Squiggle world="idea">on purpose</Squiggle>.
          </>
        }
        intro="The questions and tools I'm digging into before they turn into products, playbooks or notes."
      />
      {current && (
        <Section labelledBy="focus-title">
          <SectionTitle
            id="focus-title"
            eyebrow={`As of ${current.label}`}
            title="Where my head is."
          />
          <CategoryGrid
            label="Current focus"
            className="mt-10 md:grid-cols-3"
            items={current.building.map((item) => ({
              name: item,
              note: 'Building now',
              icon: 'spark' as const,
            }))}
          />
        </Section>
      )}
      <Section className="pb-32 md:pb-40">
        <EmptyState
          art="bulb"
          tone="idea"
          title="The exploration log opens soon."
          body="Short entries on what I'm reading, testing and questioning, with links to wherever each thread ends up."
          cta={{ href: '/experiments', label: 'See the experiments' }}
        />
        <RelatedPosts
          posts={postsIn(['AI', 'Founder notes'])}
          title={"What I've been thinking about."}
        />
      </Section>
    </main>
  );
}
