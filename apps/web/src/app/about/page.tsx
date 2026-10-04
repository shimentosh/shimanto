import { Button, Container, Icon, type IconName, Squiggle, accentBg, cn } from '@shimanto/ui';
import Image from 'next/image';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/page/breadcrumbs';
import { JsonLd } from '@/components/page/json-ld';
import { Section, SectionTitle } from '@/components/page/section';
import { VentureLogo } from '@/components/page/venture-card';
import {
  aboutChapters,
  aboutQuotes,
  interests,
  signatureWin,
  toneFor,
  ventures,
} from '@/content/catalog';
import { home } from '@/content/home';
import { pageMetadata } from '@/lib/seo';
import { absoluteUrl, site } from '@/lib/site';
import photo from '../../../public/me/shimanto.png';

export const metadata = pageMetadata({
  title: 'About',
  description:
    'The story behind Shimanto: online since 2012, music and a 35M+ view song, seven ventures, and a systems approach to business, marketing, technology, AI and automation.',
  path: '/about',
});

/** One icon per chapter, in story order. */
const chapterIcon: IconName[] = ['bolt', 'music', 'rocket', 'gear', 'heart'];

export default function AboutPage() {
  const { journey } = home.hero;
  const facts = [
    {
      value: `${new Date().getFullYear() - journey.since}+`,
      label: 'years building online',
      note: `Since ${journey.since}, at ${journey.startedAtAge}`,
      tone: 'build',
    },
    {
      value: String(ventures.length),
      label: 'ventures and builds',
      note: 'and counting',
      tone: 'signal',
    },
    {
      value: signatureWin.value,
      label: signatureWin.label,
      note: `on ${signatureWin.platform}`,
      tone: 'create',
    },
    {
      value: '5',
      label: 'skills, one toolkit',
      note: 'Business, marketing, tech, AI, automation',
      tone: 'idea',
    },
  ] as const;

  return (
    <main id="main">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'ProfilePage',
          mainEntity: {
            '@type': 'Person',
            name: site.name,
            url: absoluteUrl('/'),
            jobTitle: 'Founder',
            description: site.description,
          },
        }}
      />

      {/* Hero: the pitch beside an ID-card portrait */}
      <header className="pt-28 pb-16 md:pt-36 md:pb-24">
        <Container>
          <Breadcrumbs items={[{ label: 'About', href: '/about' }]} />
          <div className="mt-10 grid items-center gap-12 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
            <div>
              <p className="text-ink-soft flex items-center gap-2.5 font-mono text-xs tracking-[0.14em] uppercase">
                <span aria-hidden="true" className="bg-create size-2 rounded-full" />
                About me
              </p>
              <h1 className="mt-5 text-[clamp(44px,6vw,84px)] leading-[0.98] font-medium tracking-[-0.05em]">
                Entrepreneur. Founder. <Squiggle world="create">Creator</Squiggle>.
              </h1>
              <p className="text-ink-soft mt-7 max-w-[46ch] text-lg leading-relaxed md:text-xl">
                {site.description}
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Button href="/collaborate">Build with me</Button>
                <Button href="/work" variant="secondary">
                  See my work
                </Button>
              </div>
            </div>

            <figure className="mx-auto w-full max-w-[420px]">
              <div className="bg-create rounded-sheet relative aspect-[4/5] overflow-hidden">
                <div
                  aria-hidden="true"
                  className="bg-on-world/10 absolute inset-x-[12%] top-[14%] bottom-0 rounded-t-full"
                />
                <Image
                  src={photo}
                  alt={`${site.name}, smiling with arms crossed`}
                  priority
                  sizes="(min-width: 1024px) 420px, 90vw"
                  className="absolute bottom-0 left-1/2 w-[104%] max-w-none -translate-x-1/2 brightness-[1.03] contrast-[1.18] saturate-[1.45]"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent"
                />
                <figcaption className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 text-white">
                  <span>
                    <span className="block text-2xl font-medium tracking-[-0.03em]">
                      {site.name}
                    </span>
                    <span className="block text-sm text-white/75">Founder · Builder · Creator</span>
                  </span>
                  <span className="rounded-pill bg-white/15 px-3 py-1 font-mono text-[11px] tracking-[0.12em] uppercase backdrop-blur-md">
                    Online since {journey.since}
                  </span>
                </figcaption>
              </div>
            </figure>
          </div>
        </Container>
      </header>

      {/* Facts as coloured tiles */}
      <Section labelledBy="facts-title">
        <h2 id="facts-title" className="sr-only">
          In numbers
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map((fact) => (
            <div
              key={fact.label}
              className={cn(
                'on-world rounded-card flex flex-col-reverse justify-end p-6',
                accentBg[fact.tone],
              )}
            >
              <dt className="mt-3">
                <span className="block font-medium">{fact.label}</span>
                <span className="mt-1 block text-sm opacity-75">{fact.note}</span>
              </dt>
              <dd className="text-6xl font-medium tracking-[-0.05em]">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* The story as a numbered timeline */}
      <Section divided labelledBy="story-title">
        <SectionTitle
          eyebrow="The story"
          id="story-title"
          title={
            <>
              How I got <Squiggle world="build">here</Squiggle>.
            </>
          }
        />
        <ol className="relative mt-12">
          <span
            aria-hidden="true"
            className="bg-ink/10 absolute top-2 bottom-2 left-[23px] w-px md:left-[27px]"
          />
          {aboutChapters.map((chapter, i) => {
            const tone = toneFor(i);
            return (
              <li
                key={chapter.id}
                id={chapter.id}
                className="relative grid scroll-mt-28 grid-cols-[48px_1fr] gap-5 pb-14 last:pb-0 md:grid-cols-[56px_1fr] md:gap-10"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'on-world ring-canvas relative grid size-12 place-items-center rounded-full ring-8 md:size-14',
                    accentBg[tone],
                  )}
                >
                  <Icon name={chapterIcon[i] ?? 'spark'} className="size-5 md:size-6" />
                </span>
                <div className="grid gap-4 pt-1 md:grid-cols-[1fr_1.4fr] md:gap-12">
                  <div>
                    <p className="text-ink-soft font-mono text-xs tracking-[0.14em] uppercase">
                      Chapter {chapter.number}
                    </p>
                    <h3 className="mt-2 text-2xl leading-tight font-medium tracking-[-0.035em] md:text-[34px]">
                      {chapter.title}
                    </h3>
                  </div>
                  <div>
                    <div className="text-ink-soft space-y-4 text-lg leading-relaxed">
                      {chapter.body.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                    {chapter.id === 'music' && (
                      <div className="mt-5">
                        <Button href="/creative" variant="text">
                          Enter the creative archive →
                        </Button>
                      </div>
                    )}
                    {chapter.id === 'building' && (
                      <div className="mt-6">
                        <ul aria-label="Ventures" className="flex flex-wrap gap-2.5">
                          {ventures.map((venture, v) => (
                            <li key={venture.slug}>
                              <Link
                                href={`/work/${venture.slug}`}
                                className="border-ink/10 bg-paper hover:border-ink/25 rounded-pill inline-flex items-center gap-2.5 border py-1.5 pr-4 pl-1.5 text-sm font-medium transition-colors"
                              >
                                <VentureLogo
                                  venture={venture}
                                  tone={toneFor(v)}
                                  size={28}
                                  className="text-xs"
                                />
                                {venture.name}
                              </Link>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-5">
                          <Button href="/work" variant="text">
                            See the builds →
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      {/* Beliefs as big quote cards */}
      <Section divided labelledBy="beliefs-title">
        <SectionTitle
          eyebrow="Beliefs"
          title="Two lines I keep coming back to."
          id="beliefs-title"
        />
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {aboutQuotes.map((quote, i) => (
            <li key={quote}>
              <blockquote
                className={cn(
                  'rounded-sheet relative flex h-full min-h-[240px] flex-col justify-end overflow-hidden p-8 md:p-10',
                  i === 0 ? 'bg-night text-cream ring-1 ring-white/10' : 'bg-spark on-world',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-4 left-7 font-serif text-[120px] leading-none',
                    i === 0 ? 'text-create' : 'text-on-world/30',
                  )}
                >
                  “
                </span>
                <p className="relative text-[clamp(26px,3vw,40px)] leading-[1.1] font-medium tracking-[-0.035em] text-balance">
                  {quote}
                </p>
              </blockquote>
            </li>
          ))}
        </ul>
      </Section>

      {/* Interests */}
      <Section divided className="pb-24 md:pb-32" labelledBy="interests-title">
        <SectionTitle
          eyebrow="Outside the roadmap"
          title="Things I can’t stop doing."
          id="interests-title"
          action={
            <Button href="/personal" variant="text">
              The personal side →
            </Button>
          }
        />
        <ul className="mt-8 flex flex-wrap gap-2.5">
          {interests.map((interest) => (
            <li
              key={interest.name}
              className="border-ink/15 rounded-pill inline-flex items-center gap-2.5 border py-2 pr-5 pl-3 text-lg"
            >
              <span
                aria-hidden="true"
                className={cn('size-3 rounded-full', accentBg[interest.tone])}
              />
              {interest.name}
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
