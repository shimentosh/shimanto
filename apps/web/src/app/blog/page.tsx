import { Button, Container, Squiggle } from '@shimanto/ui';
import { BlogBrowser } from '@/components/blog/blog-browser';
import { PostLead } from '@/components/blog/post-card';
import { EmptyState } from '@/components/page/empty-state';
import { JsonLd } from '@/components/page/json-ld';
import { Breadcrumbs } from '@/components/page/breadcrumbs';
import { Section, SectionTitle } from '@/components/page/section';
import { SocialBanner } from '@/components/page/social-reach';
import { sortedPosts } from '@/lib/blog';
import { pageMetadata } from '@/lib/seo';
import { absoluteUrl, site } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Blog',
  description:
    'Founder notes on business, marketing, technology, AI, automation and product building by Shimanto.',
  path: '/blog',
});

export default function BlogPage() {
  const all = sortedPosts();
  const featured = all.find((p) => p.featured) ?? all[0];
  const rest = all.filter((p) => p !== featured);

  return (
    <main id="main">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: `${site.name}'s blog`,
          url: absoluteUrl('/blog'),
          author: { '@type': 'Person', name: site.name },
        }}
      />
      <header className="pt-28 md:pt-36">
        <Container>
          <Breadcrumbs items={[{ label: 'Blog', href: '/blog' }]} />
          <div className="border-ink/10 mt-10 grid items-end gap-6 border-b pb-10 md:grid-cols-[1.3fr_1fr] md:gap-12">
            <div>
              <p className="text-ink-soft flex items-center gap-2.5 font-mono text-xs tracking-[0.14em] uppercase">
                <span aria-hidden="true" className="bg-idea size-2 rounded-full" />
                The blog <span aria-hidden="true">/</span> {all.length} notes
              </p>
              <h1 className="mt-5 text-[clamp(44px,6vw,84px)] leading-[0.96] font-medium tracking-[-0.05em]">
                Notes from the <Squiggle world="idea">build</Squiggle>.
              </h1>
            </div>
            <p className="text-ink-soft max-w-[40ch] text-lg leading-relaxed md:justify-self-end md:text-right">
              Lessons, frameworks and opinions from the operator seat, written while building, not
              after.
            </p>
          </div>
        </Container>
      </header>

      {featured ? (
        <>
          <Section className="pt-10 md:pt-14">
            <PostLead post={featured} />
          </Section>

          {rest.length > 0 && (
            <Section divided labelledBy="latest-title">
              <SectionTitle
                id="latest-title"
                eyebrow="The index"
                title="Every note, newest first."
                action={
                  <a
                    href="/rss.xml"
                    className="font-medium underline decoration-1 underline-offset-[6px] hover:decoration-2"
                  >
                    RSS feed
                  </a>
                }
              />
              <div className="mt-8">
                <BlogBrowser posts={rest} />
              </div>
            </Section>
          )}

          <Section divided labelledBy="follow-title">
            <SocialBanner titleId="follow-title" />
          </Section>

          <Section divided className="pb-24 md:pb-32">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-ink-soft text-sm font-medium">Got a question?</p>
                <h2 className="mt-2 max-w-[24ch] text-2xl font-medium tracking-[-0.03em] md:text-4xl">
                  The best notes start as someone&apos;s problem.
                </h2>
                <p className="text-ink-soft mt-3 max-w-[48ch]">
                  Stuck on a business, marketing or automation problem? Send it over. The good ones
                  become notes.
                </p>
              </div>
              <Button href="/collaborate?intent=OTHER" variant="secondary">
                Ask me something
              </Button>
            </div>
          </Section>
        </>
      ) : (
        <Section className="pb-24 md:pb-32">
          <EmptyState
            tone="idea"
            title="The first notes are being written."
            body="Founder notes, marketing breakdowns and AI experiments land here first."
          />
        </Section>
      )}
    </main>
  );
}
