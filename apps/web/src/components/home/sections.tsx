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
import { sortedPosts } from '@/lib/blog';
import { getStoreProducts, isStoreOpen } from '@/lib/store';
import { type Accent, Icon, type IconName, accentBg, cn } from '@shimanto/ui';
import { MusicPlayer } from '@/components/home/music-player';
import { OnlineCounter, YearProgress } from '@/components/home/now-live';
import { HeroPortrait } from '@/components/home/portrait';

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
    <section className="pt-24 md:pt-28">
      <Container className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        <div className="min-w-0 lg:pb-14">
          <p className="text-ink-soft flex items-center gap-2 text-sm font-medium">
            <span aria-hidden="true" className="bg-build size-2 rounded-full" />
            {hero.eyebrow}
          </p>
          <h1 className="mt-6 max-w-[14ch] text-[clamp(40px,4.6vw,66px)] leading-[1.02] font-medium tracking-[-0.045em]">
            I build businesses, software and <Squiggle world="build">systems</Squiggle>.
          </h1>
          <p className="text-ink-soft mt-6 max-w-[40ch] text-lg leading-relaxed md:text-xl md:leading-relaxed">
            At the intersection of business, marketing, technology, AI and automation.
          </p>
          <div className="mt-12 flex flex-wrap items-center gap-3">
            <Button href={hero.primaryCta.href}>{hero.primaryCta.label}</Button>
            <Button href={hero.secondaryCta.href} variant="secondary">
              {hero.secondaryCta.label}
            </Button>
          </div>
          <dl className="mt-12 flex flex-wrap gap-x-8 gap-y-5 md:mt-14">
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
        {/* Bottom-aligned so the portrait stands on the manifesto panel below. */}
        <div className="relative z-10 mx-auto w-full max-w-md self-end lg:max-w-none">
          <HeroPortrait />
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

/** ④ Three products from the store. */
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
