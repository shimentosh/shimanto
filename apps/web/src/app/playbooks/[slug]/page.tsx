import { Button, Container, accentBg, cn } from '@shimanto/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ReadingProgress } from '@/components/blog/reading-progress';
import { RelatedPosts } from '@/components/blog/related-posts';
import { ShareLinks } from '@/components/blog/share-links';
import { ArticleBody, AuthorCard, formatDate } from '@/components/page/article';
import { Breadcrumbs } from '@/components/page/breadcrumbs';
import { JsonLd } from '@/components/page/json-ld';
import { Toc } from '@/components/page/toc';
import { PlaybookCard } from '@/components/playbook/playbook-card';
import { PlaybookChecklist } from '@/components/playbook/playbook-checklist';
import { PlaybookSteps } from '@/components/playbook/playbook-steps';
import { TemplateDownloads } from '@/components/playbook/template-downloads';
import { playbooks } from '@/content/playbooks';
import { postsIn } from '@/lib/blog';
import {
  getPlaybook,
  playbookWorld,
  relatedPlaybooks,
  sortedPlaybooks,
  stepCount,
  templateHref,
} from '@/lib/playbooks';
import { pageMetadata } from '@/lib/seo';
import { absoluteUrl, site } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return playbooks.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const playbook = getPlaybook(slug);
  if (!playbook) return {};
  return pageMetadata({
    title: playbook.title,
    description: playbook.summary,
    path: `/playbooks/${playbook.slug}`,
  });
}

/** Blog categories whose notes pair well with each playbook category. */
const relatedTopics: Record<string, string[]> = {
  Frameworks: ['Business', 'Marketing', 'Founder notes'],
  Systems: ['Automation', 'Founder notes'],
  Workflows: ['Automation', 'AI', 'Marketing'],
  SOPs: ['Automation', 'Product building'],
};

export default async function PlaybookPage({ params }: Props) {
  const { slug } = await params;
  const all = sortedPlaybooks();
  const index = all.findIndex((p) => p.slug === slug);
  const playbook = all[index];
  if (!playbook) notFound();
  const tone = playbookWorld(playbook);
  const newer = all[index - 1];
  const older = all[index + 1];
  const related = relatedPlaybooks(playbook);
  const url = absoluteUrl(`/playbooks/${playbook.slug}`);

  const sections = [
    { id: 'overview', text: 'Overview' },
    { id: 'steps', text: 'The steps' },
    { id: 'checklist', text: 'Checklist' },
    ...(playbook.templates.length ? [{ id: 'templates', text: 'Templates' }] : []),
  ];

  const facts = [
    { term: 'You’ll get', value: playbook.outcome },
    { term: 'Best for', value: playbook.audience },
    { term: 'Time', value: playbook.time },
    { term: 'Level', value: playbook.level },
  ];

  return (
    <main id="main">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: playbook.title,
          description: playbook.summary,
          url,
          author: { '@type': 'Person', name: site.name },
          datePublished: playbook.publishedAt,
          tool: playbook.tools.map((name) => ({ '@type': 'HowToTool', name })),
          step: playbook.steps.map((s, i) => ({
            '@type': 'HowToStep',
            position: i + 1,
            name: s.title,
            text: s.body,
            url: `${url}#steps`,
          })),
        }}
      />
      <ReadingProgress targetId="playbook-body" tone={tone} />

      {/* Header */}
      <header className="pt-28 md:pt-36">
        <Container>
          <Breadcrumbs
            items={[
              { label: 'Playbooks', href: '/playbooks' },
              { label: playbook.title, href: `/playbooks/${playbook.slug}` },
            ]}
          />
          <div className="mt-10 max-w-3xl">
            <p className="text-ink-soft flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className={cn('size-2 rounded-full', accentBg[tone])} />
                {playbook.category}
              </span>
              <span aria-hidden="true">·</span>
              <span>{stepCount(playbook)}</span>
              {playbook.templates.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {playbook.templates.length} template
                    {playbook.templates.length === 1 ? '' : 's'}
                  </span>
                </>
              )}
            </p>
            <h1 className="mt-4 text-[clamp(36px,5vw,60px)] leading-[1.04] font-medium tracking-[-0.045em] text-balance">
              {playbook.title}
            </h1>
            <p className="text-ink-soft mt-5 text-lg leading-relaxed md:text-xl">
              {playbook.summary}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button href="#steps">Start the playbook</Button>
              {playbook.templates[0] && (
                <a
                  href={templateHref(playbook, playbook.templates[0])}
                  download={playbook.templates[0].file}
                  className="border-ink/20 hover:border-ink/50 rounded-pill inline-flex items-center gap-2 border px-5 py-2.5 font-medium transition-colors"
                >
                  Download the template ↓
                </a>
              )}
            </div>
          </div>

          <dl className="border-ink/10 mt-12 grid gap-6 border-y py-6 sm:grid-cols-2 lg:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.term}>
                <dt className="text-ink-soft text-sm">{fact.term}</dt>
                <dd className="mt-1 font-medium">{fact.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-ink-soft mt-4 text-sm">
            <span className="text-ink font-medium">Tools:</span> {playbook.tools.join(' · ')}
          </p>
        </Container>
      </header>

      <Container className="mt-14 md:mt-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_220px] lg:gap-16">
          <div id="playbook-body" className="min-w-0">
            <section id="overview" aria-labelledby="overview-title" className="scroll-mt-28">
              <h2 id="overview-title" className="text-ink-soft text-sm font-medium">
                Overview
              </h2>
              <div className="mt-4">
                <ArticleBody blocks={playbook.body} tone={tone} />
              </div>
            </section>

            <section
              id="steps"
              aria-labelledby="steps-title"
              className="border-ink/10 mt-16 scroll-mt-28 border-t pt-12"
            >
              <p className="text-ink-soft text-sm font-medium">
                {stepCount(playbook)} · {playbook.time}
              </p>
              <h2
                id="steps-title"
                className="mt-2 text-2xl font-medium tracking-[-0.03em] md:text-4xl"
              >
                The steps
              </h2>
              <div className="mt-10">
                <PlaybookSteps steps={playbook.steps} tone={tone} />
              </div>
            </section>

            <section
              id="checklist"
              aria-labelledby="checklist-title"
              className="border-ink/10 mt-16 scroll-mt-28 border-t pt-12"
            >
              <p className="text-ink-soft text-sm font-medium">Before you call it done</p>
              <h2
                id="checklist-title"
                className="mt-2 text-2xl font-medium tracking-[-0.03em] md:text-4xl"
              >
                The checklist
              </h2>
              <div className="mt-8">
                <PlaybookChecklist slug={playbook.slug} items={playbook.checklist} tone={tone} />
              </div>
            </section>

            {playbook.templates.length > 0 && (
              <section
                id="templates"
                aria-labelledby="templates-title"
                className="border-ink/10 mt-16 scroll-mt-28 border-t pt-12"
              >
                <p className="text-ink-soft text-sm font-medium">Free to download</p>
                <h2
                  id="templates-title"
                  className="mt-2 text-2xl font-medium tracking-[-0.03em] md:text-4xl"
                >
                  Templates
                </h2>
                <div className="mt-8">
                  <TemplateDownloads playbook={playbook} tone={tone} />
                </div>
              </section>
            )}

            <div className="border-ink/10 mt-16 flex flex-wrap items-center justify-between gap-6 border-t pt-10">
              <div>
                <p className="text-ink-soft text-sm font-medium">Use this playbook</p>
                <p className="mt-1 max-w-[30ch] text-xl leading-snug font-medium md:text-2xl">
                  Want it running in your business, not just on paper?
                </p>
              </div>
              <Button href="/collaborate?intent=CONSULTING" variant="secondary">
                Set it up with me
              </Button>
            </div>

            <div className="max-w-[68ch]">
              <AuthorCard tone={tone} />
            </div>
          </div>

          <aside>
            <div className="space-y-10 lg:sticky lg:top-28">
              <div className="hidden lg:block">
                <Toc headings={sections} />
              </div>
              <ShareLinks url={url} title={playbook.title} />
              <p className="text-ink-soft text-sm">
                Published{' '}
                <time dateTime={playbook.publishedAt}>{formatDate(playbook.publishedAt)}</time>
              </p>
            </div>
          </aside>
        </div>

        {(older || newer) && (
          <nav
            aria-label="More playbooks"
            className="border-ink/10 mt-20 grid gap-8 border-t pt-10 md:grid-cols-2"
          >
            {older ? (
              <Link href={`/playbooks/${older.slug}`} className="group block">
                <span className="text-ink-soft text-sm">← Older</span>
                <span className="mt-2 block text-xl leading-snug font-medium group-hover:underline">
                  {older.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {newer && (
              <Link href={`/playbooks/${newer.slug}`} className="group block md:text-right">
                <span className="text-ink-soft text-sm">Newer →</span>
                <span className="mt-2 block text-xl leading-snug font-medium group-hover:underline">
                  {newer.title}
                </span>
              </Link>
            )}
          </nav>
        )}

        {related.length > 0 && (
          <section aria-labelledby="related-title" className="border-ink/10 mt-20 border-t pt-12">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-ink-soft text-sm font-medium">Keep building</p>
                <h2
                  id="related-title"
                  className="mt-2 text-2xl font-medium tracking-[-0.03em] md:text-4xl"
                >
                  More playbooks.
                </h2>
              </div>
              <Button href="/playbooks" variant="text">
                All playbooks →
              </Button>
            </div>
            <ul className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <li key={p.slug}>
                  <PlaybookCard playbook={p} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="pb-24 md:pb-32">
          <RelatedPosts
            posts={postsIn(relatedTopics[playbook.category] ?? ['Automation'])}
            title="Read the thinking behind it."
            className="mt-20"
          />
        </div>
      </Container>
    </main>
  );
}
