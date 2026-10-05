import { Button, Container, Marquee, Squiggle } from '@shimanto/ui';
import Link from 'next/link';
import { PostCard } from '@/components/blog/post-card';
import { DisplayTitle, Section, SectionTitle } from '@/components/page/section';
import {
  Blocks,
  Broadcast,
  Caret,
  Equalizer,
  LiveDot,
  LoadingDots,
  Strike,
} from '@/components/page/title-motifs';
import { SocialReach } from '@/components/page/social-reach';
import { MoreBuildsNote, VentureRow } from '@/components/page/venture-card';
import { ProductCard } from '@/components/store/product-card';
import { musicChannel, signatureWin, toneFor, ventures } from '@/content/catalog';
import { home } from '@/content/home';
import { tools } from '@/content/tools';
import { sortedPosts } from '@/lib/blog';
import { getStoreProducts, isStoreOpen } from '@/lib/store';
import { type Accent, Icon, type IconName, accentBg, cn } from '@shimanto/ui';
import { MusicPlayer } from '@/components/home/music-player';
import { OnlineCounter, YearProgress } from '@/components/home/now-live';
import { HeroLens } from '@/components/home/hero-lens';
import { ToolSpotlight, ToolTile } from '@/components/home/tool-tiles';

const pillarStyle: Record<string, { icon: IconName; world: Accent }> = {
  Builds: { icon: 'rocket', world: 'build' },
  Notes: { icon: 'pen', world: 'signal' },
  Playbooks: { icon: 'list', world: 'idea' },
  Products: { icon: 'box', world: 'spark' },
};

/** An icon per discipline in the hero strip. */
const topicIcon: Record<string, IconName> = {
  Business: 'briefcase',
  Marketing: 'megaphone',
  Technology: 'cpu',
  AI: 'spark',
  Automation: 'bolt',
  Content: 'pen',
  Design: 'palette',
  Music: 'music',
};

function More({ href, children }: { href: string; children: string }) {
  return (
    <Button href={href} variant="text">
      {children} →
    </Button>
  );
}

/** ① Hero: eyebrow, headline, sub, CTAs, a proof row and the disciplines. */
/** One headline word in its rising mask; nouns can take a turn in a world colour. */
function KineticWord({
  i,
  children,
  accent,
  turn,
  tile,
}: {
  i: number;
  children: string;
  accent?: Accent;
  turn?: number;
  /** Icon tile before the word; it pops in, then flips and fills when the word is lit. */
  tile?: IconName;
}) {
  const vars = {
    '--i': i,
    '--c': accent ? `var(--${accent})` : undefined,
    '--d': `${(turn ?? 0) * 2.5}s`,
  } as React.CSSProperties;
  return (
    <span className="kw">
      <span className="kw-in" style={vars}>
        {tile && (
          <span aria-hidden="true" className="kw-tile" data-turn={turn ?? 0} data-icon={tile}>
            <Icon name={tile} className="kw-tile-icon" strokeWidth={2} />
          </span>
        )}
        {accent ? (
          <span className="kw-cycle" data-turn={turn ?? 0}>
            {children}
          </span>
        ) : (
          children
        )}
      </span>
    </span>
  );
}

export function HeroSection() {
  const { hero } = home;
  const proof = [
    {
      value: `${new Date().getFullYear() - hero.journey.since}+`,
      label: 'years building online',
    },
    { value: String(ventures.length), label: 'ventures built' },
  ];
  return (
    <section className="pt-24 pb-6 md:pt-28">
      <Container className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
        <div className="min-w-0">
          <p className="text-ink-soft flex items-center gap-2 text-sm font-medium">
            <span aria-hidden="true" className="bg-build size-2 rounded-full" />
            {hero.eyebrow}
          </p>
          <h1 className="mt-6 text-[clamp(40px,5vw,80px)] leading-[0.95] font-medium tracking-[-0.055em]">
            <KineticWord i={0}>I</KineticWord> <KineticWord i={1}>build</KineticWord>
            <br />
            <KineticWord i={2} accent="build" turn={0} tile="briefcase">
              businesses,
            </KineticWord>
            <br />
            <KineticWord i={3} accent="signal" turn={1} tile="code">
              software
            </KineticWord>{' '}
            <KineticWord i={4}>&amp;</KineticWord>
            <br />
            <KineticWord i={5} accent="create" turn={2} tile="gear">
              systems.
            </KineticWord>
          </h1>
          <p className="text-ink-soft mt-8 max-w-[40ch] text-lg leading-relaxed md:text-xl md:leading-relaxed">
            At the intersection of business, marketing, technology, AI and automation.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button href={hero.primaryCta.href}>{hero.primaryCta.label}</Button>
            <Button href={hero.secondaryCta.href} variant="secondary">
              {hero.secondaryCta.label}
            </Button>
          </div>
          <dl className="mt-10 flex flex-wrap gap-x-8 gap-y-5 md:mt-12">
            {proof.map((item, i) => (
              <div
                key={item.label}
                className={cn('flex flex-col-reverse', i > 0 && 'border-ink/10 border-l pl-8')}
              >
                <dt className="text-ink-soft mt-1 text-sm">{item.label}</dt>
                <dd className="text-3xl font-medium tracking-tighter md:text-4xl">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative z-10 w-full px-6 sm:px-10 lg:px-0">
          <HeroLens />
        </div>
      </Container>
    </section>
  );
}

/** The disciplines as a large, slow ticker. */
function TopicsStrip() {
  const { hero } = home;
  return (
    <Marquee
      label="What I work across"
      duration={36}
      gapClassName="gap-3"
      className="mt-16 md:mt-20"
      rows={[
        {
          items: hero.marquee.map((topic, i) => (
            <span
              key={topic}
              className="border-ink/10 bg-paper rounded-pill inline-flex items-center gap-3 border py-2 pr-6 pl-2 text-lg font-medium whitespace-nowrap md:text-xl"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'text-on-world grid size-10 place-items-center rounded-full',
                  accentBg[toneFor(i)],
                )}
              >
                <Icon name={topicIcon[topic] ?? 'spark'} className="size-5" />
              </span>
              {topic}
            </span>
          )),
        },
      ]}
    />
  );
}

/**
 * ② Manifesto: one panel straight under the hero, so the two read as one opening. The why on the
 * left, the four doorways into the site on the right.
 */
export function ManifestoSection() {
  const { manifesto } = home;
  return (
    <Section labelledBy="manifesto-title">
      <div className="border-ink/10 bg-paper rounded-card relative overflow-hidden border p-6 sm:p-8 md:p-12">
        <div
          aria-hidden="true"
          className="bg-build/15 pointer-events-none absolute -top-24 -left-24 size-72 rounded-full blur-3xl"
        />
        <div className="relative grid gap-10 lg:grid-cols-[1fr_1.15fr] lg:items-center lg:gap-14">
          <div>
            <p className="text-ink-soft flex items-center gap-2 text-sm font-medium">
              <span aria-hidden="true" className="bg-build size-2 rounded-full" />
              {manifesto.eyebrow}
            </p>
            <DisplayTitle
              id="manifesto-title"
              size="md"
              className="mt-4"
              lead={
                <>
                  Not a <Strike>portfolio</Strike>.
                </>
              }
              rest={
                <>
                  A <Squiggle world="build">headquarters</Squiggle>.
                </>
              }
            />
            <p className="text-ink-soft mt-5 max-w-[46ch] text-lg leading-relaxed">
              {manifesto.body}
            </p>
            <div className="mt-8">
              <More href={manifesto.cta.href}>{manifesto.cta.label}</More>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {manifesto.pillars.map((pillar) => {
              const style = pillarStyle[pillar.label] ?? { icon: 'spark', world: 'build' };
              return (
                <li key={pillar.label}>
                  <Link
                    href={pillar.href}
                    className="group border-ink/10 bg-canvas hover:border-ink/25 flex h-full flex-col gap-6 rounded-2xl border p-5 transition-[transform,border-color] duration-300 motion-safe:hover:-translate-y-0.5"
                  >
                    <span className="flex items-center justify-between">
                      <span
                        className={cn(
                          'on-world grid size-11 place-items-center rounded-xl transition-transform duration-300 motion-safe:group-hover:-rotate-6',
                          accentBg[style.world],
                        )}
                      >
                        <Icon name={style.icon} className="size-5" />
                      </span>
                      <span
                        aria-hidden="true"
                        className="text-ink-soft group-hover:text-ink text-lg transition-transform duration-300 group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </span>
                    <span>
                      <span className="block text-lg font-medium">{pillar.label}</span>
                      <span className="text-ink-soft mt-1 block text-sm leading-snug">
                        {pillar.note}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <TopicsStrip />
    </Section>
  );
}

/** ③ Selected work as a list. */
export function WorkSection() {
  const { work } = home;
  return (
    <Section divided labelledBy="work-title">
      <SectionTitle
        eyebrow={work.eyebrow}
        id="work-title"
        title={
          <>
            <Squiggle world="build">Built</Squiggle>,
          </>
        }
        motif={<Blocks />}
        rest="not just planned."
        action={<More href={work.cta.href}>{work.cta.label}</More>}
      />
      <ul className="border-ink/10 mt-10 border-b">
        {ventures.map((venture, i) => (
          <li key={venture.slug}>
            <VentureRow venture={venture} index={i} />
          </li>
        ))}
      </ul>
      <MoreBuildsNote />
    </Section>
  );
}

/**
 * ④ Free tools: the newest one as a big spotlight, the next two stacked beside it, and a strip of
 * plain facts about all of them underneath.
 */
export function ToolsSection() {
  const { tools: copy } = home;
  const [spotlight, ...rest] = tools;
  if (!spotlight) return null;
  const others = rest.slice(0, 2);
  const stats = [
    { value: String(tools.length), label: tools.length === 1 ? 'tool' : 'tools' },
    { value: String(tools.filter((t) => !t.price).length), label: 'free forever' },
    { value: String(tools.filter((t) => t.source).length), label: 'open source' },
    { value: '0', label: 'signups needed' },
  ];
  return (
    <Section divided labelledBy="tools-title">
      <SectionTitle
        eyebrow={copy.eyebrow}
        id="tools-title"
        title={<Squiggle world="create">Made</Squiggle>}
        motif={<Blocks tone="create" />}
        rest="for me. Free for you."
        action={<More href={copy.cta.href}>{copy.cta.label}</More>}
      />
      <ul className={cn('mt-10 grid gap-6', others.length > 0 && 'lg:grid-cols-[1.35fr_1fr]')}>
        <li>
          <ToolSpotlight tool={spotlight} />
        </li>
        {others.length > 0 && (
          <li>
            <ul className="grid h-full gap-6 sm:grid-cols-2 lg:grid-cols-1">
              {others.map((tool) => (
                <li key={tool.slug}>
                  <ToolTile tool={tool} />
                </li>
              ))}
            </ul>
          </li>
        )}
      </ul>
      <div className="border-ink/15 rounded-card mt-6 flex flex-col gap-6 border border-dashed p-5 sm:p-6 md:flex-row md:items-center md:justify-between">
        <dl className="flex flex-wrap gap-x-8 gap-y-4">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={cn(
                'flex flex-row-reverse items-baseline justify-end gap-2',
                i > 0 && 'sm:border-ink/10 sm:border-l sm:pl-8',
              )}
            >
              <dt className="text-ink-soft text-sm">{stat.label}</dt>
              <dd className="text-2xl font-medium tracking-tighter">{stat.value}</dd>
            </div>
          ))}
        </dl>
        <Link
          href={copy.suggest.href}
          className="group text-ink inline-flex items-center gap-2 font-medium"
        >
          <span
            aria-hidden="true"
            className="bg-create on-world grid size-8 place-items-center rounded-full transition-transform duration-300 motion-safe:group-hover:rotate-90"
          >
            <Icon name="plus" className="size-4" />
          </span>
          <span className="underline decoration-1 underline-offset-[6px] group-hover:decoration-2">
            {copy.suggest.label}
          </span>
        </Link>
      </div>
    </Section>
  );
}

/** The store's empty slot: the categories still in the workshop, linking to the store. */
function MoreComing({ href, categories }: { href: string; categories: readonly string[] }) {
  return (
    <Link href={href} data-cursor="View" className="group flex h-full flex-col">
      <div className="rounded-card border-ink/15 group-hover:border-ink/30 relative flex aspect-4/3 flex-col justify-between overflow-hidden border border-dashed p-5 transition-colors">
        <span
          aria-hidden="true"
          className="bg-signal/10 absolute -top-1/3 -right-1/4 size-2/3 rounded-full blur-3xl"
        />
        <span className="text-ink-soft relative flex items-center gap-2 font-mono text-[11px] tracking-[0.14em] uppercase">
          <span className="relative grid size-1.5 place-items-center" aria-hidden="true">
            <span className="motif-ping bg-signal absolute inset-0 rounded-full" />
            <span className="bg-signal relative size-1.5 rounded-full" />
          </span>
          In the workshop
        </span>
        <ul className="relative flex flex-wrap gap-2">
          {categories.map((category, i) => (
            <li
              key={category}
              className="border-ink/10 bg-paper rounded-pill flex items-center gap-2 border py-1 pr-3 pl-1.5 text-sm font-medium"
            >
              <span
                aria-hidden="true"
                className={cn('size-2.5 rounded-full', accentBg[toneFor(i)])}
              />
              {category}
            </li>
          ))}
        </ul>
      </div>
      <span className="text-ink-soft mt-4 text-sm">More on the way</span>
      <h3 className="mt-1 text-xl leading-snug font-medium tracking-[-0.02em] group-hover:underline">
        The rest of the store
      </h3>
      <p className="text-ink-soft mt-1 line-clamp-2">
        {new Intl.ListFormat('en', { type: 'conjunction' }).format(
          categories.map((category, i) => (i === 0 ? category : category.toLowerCase())),
        )}
        , as they ship.
      </p>
      <p className="mt-3 text-lg font-medium">See what&apos;s coming →</p>
    </Link>
  );
}

/** ⑤ Three products from the store; an empty slot shows what's still on the way. */
export async function ProductsSection() {
  const { products } = home;
  const all = await getStoreProducts();
  const featured = all.find((p) => p.featured && p.status !== 'sample');
  const picks = [...(featured ? [featured] : []), ...all.filter((p) => p !== featured)].slice(0, 3);
  const open = isStoreOpen(all);
  return (
    <Section divided labelledBy="products-title">
      <SectionTitle
        eyebrow={products.eyebrow}
        id="products-title"
        title={<Squiggle world="signal">{open ? 'Tools' : 'Products'}</Squiggle>}
        motif={open ? undefined : <LoadingDots />}
        rest={open ? 'you can use today.' : 'coming soon.'}
        action={
          <More href={products.cta.href}>{open ? products.cta.label : 'See what’s coming'}</More>
        }
      />
      <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {picks.map((product) => (
          <li key={product.slug}>
            <ProductCard product={product} />
          </li>
        ))}
        {/* Fill the row's empty slot (only where there is one) with what's on the way. */}
        {picks.length % 3 !== 0 && (
          <li
            className={cn(
              picks.length % 2 === 0 ? 'hidden lg:block' : 'sm:col-span-2 lg:col-span-1',
              picks.length % 3 === 1 && 'lg:col-span-2',
            )}
          >
            <MoreComing href={products.cta.href} categories={products.categories} />
          </li>
        )}
      </ul>
    </Section>
  );
}

/** ⑥ Latest blog posts. */
export function WritingSection() {
  const { writing } = home;
  const latest = sortedPosts().slice(0, 3);
  return (
    <Section divided labelledBy="writing-title">
      <SectionTitle
        eyebrow={writing.eyebrow}
        id="writing-title"
        title={<Squiggle world="idea">Notes</Squiggle>}
        motif={<Caret />}
        rest="from the build."
        action={<More href={writing.cta.href}>{writing.cta.label}</More>}
      />
      <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {latest.map((post) => (
          <li key={post.slug}>
            <PostCard post={post} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** When this module rendered (build time for the static home page). Seeds the live counters. */
const serverNow = Date.now();

/** ⑦ Now: what I'm building, a live "days online" counter and this year's progress. */
export function NowSection() {
  const { now, hero } = home;
  return (
    <Section divided labelledBy="now-title">
      <div className="grid gap-10 md:grid-cols-[1fr_1.3fr] md:gap-16">
        <div>
          <p className="text-ink-soft text-sm font-medium">
            Updated <time dateTime={now.updated.iso}>{now.updated.label}</time>
          </p>
          <DisplayTitle
            id="now-title"
            size="md"
            className="mt-4"
            lead={<Squiggle world="build">Now</Squiggle>}
            motif={<LiveDot />}
            rest="what I’m doing."
          />
          <div className="mt-10">
            <OnlineCounter
              since={hero.journey.since}
              startedAtAge={hero.journey.startedAtAge}
              serverNow={serverNow}
            />
          </div>
        </div>
        <div className="flex flex-col gap-4 md:pt-10">
          <p className="text-ink-soft font-mono text-[11px] tracking-[0.16em] uppercase">
            Building · {now.building.length} things
          </p>
          <ul className="grid gap-3">
            {now.building.map((item) => {
              const body = (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'on-world grid size-12 shrink-0 place-items-center rounded-2xl',
                      accentBg[item.tone],
                    )}
                  >
                    <Icon name={item.icon} className="size-[22px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg leading-snug font-medium">{item.label}</span>
                    <span className="text-ink-soft block text-sm">{item.note}</span>
                  </span>
                  <span className="text-ink-soft hidden shrink-0 items-center gap-1.5 text-xs sm:flex">
                    <span aria-hidden="true" className="relative grid size-1.5 place-items-center">
                      <span
                        className={cn(
                          'motif-ping absolute inset-0 rounded-full',
                          accentBg[item.tone],
                        )}
                      />
                      <span className={cn('relative size-1.5 rounded-full', accentBg[item.tone])} />
                    </span>
                    Building
                  </span>
                  {'href' in item && (
                    <span
                      aria-hidden="true"
                      className="text-ink-soft group-hover:text-ink transition-transform duration-300 group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  )}
                </>
              );
              const box =
                'border-ink/10 rounded-card flex items-center gap-4 border p-4 transition-colors';
              return (
                <li key={item.label}>
                  {'href' in item ? (
                    <Link
                      href={item.href}
                      className={cn(box, 'group hover:border-ink/25 hover:bg-ink/[0.02]')}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className={box}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
          <YearProgress serverNow={serverNow} />
        </div>
      </div>
    </Section>
  );
}

/** ⑧ Music: the latest music videos from my channel, the biggest one first. */
export function CreativeSection() {
  const { creative } = home;
  return (
    <Section divided labelledBy="creative-title">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
        <div>
          <p className="text-ink-soft flex items-center gap-2 text-sm font-medium">
            <span aria-hidden="true" className="bg-create size-2 rounded-full" />
            {creative.eyebrow}
          </p>
          <DisplayTitle
            id="creative-title"
            className="mt-4"
            lead={<Squiggle world="create">Music</Squiggle>}
            motif={<Equalizer />}
            rest="never left."
          />
          <p className="text-ink-soft mt-6 max-w-[42ch] text-lg leading-relaxed">
            Songs, music videos and collaborations, released on my channel. Before startups, one of
            my songs passed {signatureWin.value} views.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <a
              href={musicChannel.url}
              target="_blank"
              rel="noopener"
              className="bg-create text-on-world rounded-pill inline-flex items-center gap-2 px-5 py-2.5 font-medium transition-opacity hover:opacity-90"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
                <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
              </svg>
              Listen on YouTube
              <span className="sr-only">(opens {musicChannel.handle} on YouTube)</span>
            </a>
            <Button href={creative.cta.href} variant="secondary">
              {creative.cta.label}
            </Button>
          </div>
        </div>

        <MusicPlayer videos={musicChannel.videos} />
      </div>
    </Section>
  );
}

/** ⑨ Social links. */
export function SocialSection() {
  const { social } = home;
  return (
    <Section divided labelledBy="social-title">
      <SectionTitle
        eyebrow={social.eyebrow}
        id="social-title"
        title={
          <>
            Shared <Squiggle world="spark">everywhere</Squiggle>.
          </>
        }
        motif={<Broadcast />}
        rest="Owned here."
        action={<More href={social.cta.href}>{social.cta.label}</More>}
      />
      <SocialReach className="mt-10" />
    </Section>
  );
}
