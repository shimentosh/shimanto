import { type Accent, Button, Chip, Container, Icon, accentBg, cn } from '@shimanto/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BenefitMap } from '@/components/page/benefit-map';
import { Breadcrumbs } from '@/components/page/breadcrumbs';
import { JsonLd } from '@/components/page/json-ld';
import { Section, SectionTitle } from '@/components/page/section';
import { VentureLogo } from '@/components/page/venture-card';
import type { CaseStudy } from '@/content/case-studies';
import {
  type Venture,
  caseStudyOutline,
  toneFor,
  ventureStatusLabel,
  ventureStatusTone,
  ventures,
} from '@/content/catalog';
import { pageMetadata } from '@/lib/seo';
import { absoluteUrl, site } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return ventures.map((v) => ({ slug: v.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const venture = ventures.find((v) => v.slug === slug);
  if (!venture) return {};
  return pageMetadata({
    title: venture.name,
    description:
      venture.caseStudy?.summary ??
      venture.oneLiner ??
      `${venture.name}: a venture by ${site.name}. Case study in progress.`,
    path: `/work/${venture.slug}`,
  });
}

/** An external link styled as the primary button. */
function Visit({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="group bg-ink text-canvas rounded-pill inline-flex items-center gap-2 px-5 py-2.5 font-medium transition-opacity hover:opacity-85"
    >
      <span>{children}</span>
      <Icon name="external" className="size-4" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export default async function VenturePage({ params }: Props) {
  const { slug } = await params;
  const index = ventures.findIndex((v) => v.slug === slug);
  const venture = ventures[index];
  if (!venture) notFound();
  const tone = toneFor(index);
  const nextIndex = (index + 1) % ventures.length;
  const next = ventures[nextIndex]!;
  const story = venture.caseStudy;
  const website = venture.links?.[0];

  const facts = [
    { term: 'Status', value: ventureStatusLabel[venture.status] },
    { term: 'Role', value: venture.role },
    { term: 'Category', value: venture.category },
    { term: 'Years', value: venture.years },
  ].filter((f): f is { term: string; value: string } => Boolean(f.value));

  const description = story?.summary ?? venture.oneLiner;

  return (
    <main id="main">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CreativeWork',
          name: venture.name,
          url: absoluteUrl(`/work/${venture.slug}`),
          creator: { '@type': 'Person', name: site.name },
          ...(description ? { description } : {}),
          ...(website ? { sameAs: website.href } : {}),
        }}
      />
      <section className="pt-28 pb-12 md:pt-36 md:pb-16">
        <Container>
          <Breadcrumbs
            items={[
              { label: 'Work', href: '/work' },
              { label: venture.name, href: `/work/${venture.slug}` },
            ]}
          />
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <div>
              <div className="mt-10 flex items-center gap-4">
                <VentureLogo venture={venture} tone={tone} size={64} className="text-xl" />
                <div className="flex flex-wrap items-center gap-3">
                  <Chip variant="status" tone={ventureStatusTone[venture.status]}>
                    {ventureStatusLabel[venture.status]}
                  </Chip>
                  {venture.role && <Chip>{venture.role}</Chip>}
                </div>
              </div>
              <h1 className="mt-6 text-[clamp(40px,6vw,76px)] leading-[1] font-medium tracking-[-0.045em]">
                {venture.name}
              </h1>
              <p className="mt-5 max-w-[56ch] text-xl leading-relaxed md:text-2xl">
                {venture.oneLiner ??
                  'One of the ventures I am building. The full case study is being written.'}
              </p>
              {story && (
                <p className="text-ink-soft mt-4 max-w-[62ch] text-lg leading-relaxed">
                  {story.summary}
                </p>
              )}
              {website && (
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Visit href={website.href}>{`Visit ${website.label}`}</Visit>
                  <Button href="/work" variant="secondary">
                    All builds
                  </Button>
                </div>
              )}
            </div>
            {story && (
              <BenefitMap
                venture={venture}
                tone={tone}
                items={story.highlights}
                className="mx-auto max-w-[540px] lg:mt-10"
              />
            )}
          </div>

          <dl className="border-ink/10 mt-12 grid grid-cols-2 gap-6 border-y py-6 md:grid-cols-4">
            {facts.map((fact) => (
              <div key={fact.term}>
                <dt className="text-ink-soft text-sm">{fact.term}</dt>
                <dd className="mt-1 font-medium">{fact.value}</dd>
              </div>
            ))}
            {venture.productSlug && (
              <div>
                <dt className="text-ink-soft text-sm">In the store</dt>
                <dd className="mt-1">
                  <Link
                    href={`/products/${venture.productSlug}`}
                    className="font-medium underline underline-offset-4"
                  >
                    View product
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </Container>
      </section>

      {story ? (
        <Story venture={venture} story={story} tone={tone} />
      ) : (
        <Outline venture={venture} />
      )}

      <Section divided className="pb-24 md:pb-32">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <Link
            href={`/work/${next.slug}`}
            data-cursor="Next"
            className="group flex items-center gap-5"
          >
            <VentureLogo venture={next} tone={toneFor(nextIndex)} size={56} className="text-lg" />
            <span>
              <span className="text-ink-soft block text-sm font-medium">Next venture</span>
              <span className="mt-1 block text-3xl font-medium tracking-[-0.035em] group-hover:underline md:text-5xl">
                {next.name} →
              </span>
            </span>
          </Link>
          <Button href="/work" variant="secondary">
            All builds
          </Button>
        </div>
      </Section>
    </main>
  );
}

/** The full case study: numbers, problem and build, highlights, audience and stack, outcome. */
function Story({ venture, story, tone }: { venture: Venture; story: CaseStudy; tone: Accent }) {
  const related = (story.related ?? []).flatMap((r) => {
    const v = ventures.find((x) => x.slug === r.slug);
    return v ? [{ ...r, venture: v }] : [];
  });

  return (
    <>
      {story.numbers && story.numbers.length > 0 && (
        <Section labelledBy="numbers-title">
          <h2 id="numbers-title" className="sr-only">
            In numbers
          </h2>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
            {story.numbers.map((n) => (
              <li key={n.label}>
                <p className="text-[clamp(40px,5vw,64px)] leading-none font-medium tracking-[-0.045em]">
                  {n.value}
                </p>
                <p className="text-ink-soft mt-3 max-w-[26ch]">{n.label}</p>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section divided labelledBy="story-title">
        <h2 id="story-title" className="sr-only">
          The story
        </h2>
        <div className="grid gap-12 md:grid-cols-2 md:gap-16">
          <div>
            <p className="text-ink-soft text-sm font-medium">The problem</p>
            <p className="mt-3 text-xl leading-relaxed md:text-2xl">{story.problem}</p>
          </div>
          <div>
            <p className="text-ink-soft text-sm font-medium">What was built</p>
            <p className="mt-3 text-xl leading-relaxed md:text-2xl">{story.built}</p>
          </div>
        </div>
        {story.why && (
          <blockquote className="border-ink/15 mt-14 border-l-2 pl-6 md:pl-8">
            <p className="text-ink-soft text-sm font-medium">Why it exists</p>
            <p className="mt-3 max-w-[60ch] text-2xl leading-snug font-medium tracking-[-0.02em] md:text-3xl">
              “{story.why}”
            </p>
          </blockquote>
        )}
      </Section>

      <Section divided labelledBy="highlights-title">
        <SectionTitle id="highlights-title" eyebrow="Highlights" title="What it does best." />
        <ul className="mt-10 grid gap-x-10 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
          {story.highlights.map((item) => (
            <li key={item.title} className="border-ink/10 border-t py-6">
              <span
                aria-hidden="true"
                className={cn(
                  'text-on-world grid size-10 place-items-center rounded-full',
                  accentBg[tone],
                )}
              >
                <Icon name={item.icon} />
              </span>
              <h3 className="mt-4 text-lg font-medium">{item.title}</h3>
              <p className="text-ink-soft mt-1">{item.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {(story.audience || story.stack) && (
        <Section divided>
          <div className="grid gap-12 md:grid-cols-2 md:gap-16">
            {story.audience && (
              <div>
                <h2 className="text-2xl font-medium tracking-[-0.03em] md:text-3xl">
                  Who it’s for
                </h2>
                <ul className="mt-6 space-y-3">
                  {story.audience.map((who) => (
                    <li key={who} className="flex items-start gap-3 text-lg">
                      <span
                        aria-hidden="true"
                        className={cn('mt-2.5 size-1.5 shrink-0 rounded-full', accentBg[tone])}
                      />
                      {who}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {story.stack && (
              <div>
                <h2 className="text-2xl font-medium tracking-[-0.03em] md:text-3xl">
                  System & tech
                </h2>
                <ul aria-label="Tech stack" className="mt-6 flex flex-wrap gap-2">
                  {story.stack.map((tech) => (
                    <li
                      key={tech}
                      className="border-ink/15 rounded-pill border px-3.5 py-1.5 text-sm font-medium"
                    >
                      {tech}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      <Section>
        <div className="bg-ink/4 rounded-card p-8 md:p-12">
          <Chip variant="status" tone={ventureStatusTone[venture.status]}>
            {ventureStatusLabel[venture.status]}
          </Chip>
          <h2 className="mt-4 text-2xl font-medium tracking-[-0.03em] md:text-3xl">
            Where it stands.
          </h2>
          <p className="text-ink-soft mt-3 max-w-[64ch] text-lg leading-relaxed">{story.outcome}</p>
          <p className="text-ink-soft mt-6 text-sm">
            Sources:{' '}
            {story.sources.map((source, i) => (
              <span key={source.href}>
                {i > 0 && ' · '}
                <a
                  href={source.href}
                  target="_blank"
                  rel="noopener"
                  className="underline underline-offset-4 hover:no-underline"
                >
                  {source.label}
                </a>
              </span>
            ))}
          </p>
        </div>
      </Section>

      {related.length > 0 && (
        <Section divided labelledBy="related-title">
          <SectionTitle id="related-title" eyebrow="Connected" title="Part of the same story." />
          <ul className="border-ink/10 mt-8 border-b">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/work/${r.slug}`}
                  className="group border-ink/10 flex items-center gap-4 border-t py-5"
                >
                  <VentureLogo
                    venture={r.venture}
                    tone={toneFor(ventures.indexOf(r.venture))}
                    size={44}
                    className="text-sm"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xl font-medium tracking-[-0.02em]">
                      {r.venture.name}
                    </span>
                    <span className="text-ink-soft block">{r.note}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="text-ink-soft group-hover:text-ink text-xl transition-transform group-hover:translate-x-1"
                  >
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

/** Shown while a venture has no case study yet. */
function Outline({ venture }: { venture: Venture }) {
  return (
    <Section labelledBy="case-title">
      <div className="grid gap-10 md:grid-cols-[1fr_1.2fr] md:gap-16">
        <div>
          <p className="text-ink-soft text-sm font-medium">Case study in progress</p>
          <h2
            id="case-title"
            className="mt-2 text-2xl leading-tight font-medium tracking-[-0.03em] md:text-3xl"
          >
            The full story of {venture.name} is being written.
          </h2>
          <p className="text-ink-soft mt-4 max-w-[44ch] text-lg">
            Real numbers, real screenshots, real lessons, or nothing at all. Here is what it will
            cover.
          </p>
        </div>
        <ol className="border-ink/10 border-b">
          {caseStudyOutline.map((item, i) => (
            <li key={item} className="border-ink/10 flex items-center gap-4 border-t py-3.5">
              <span className="text-ink-soft font-mono text-xs">
                {String(i + 1).padStart(2, '0')}
              </span>
              {item}
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
