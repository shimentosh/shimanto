/* eslint-disable @next/next/no-img-element -- pre-sized posters and renders from Content OS */
import { Container, Icon, accentBg, cn } from '@shimanto/ui';
import Link from 'next/link';
import { TrackViewItem } from '@/components/analytics/analytics';
import { JsonLd } from '@/components/page/json-ld';
import { PlatformMark, SocialIcon } from '@/components/page/social-icon';
import { Section, SectionTitle } from '@/components/page/section';
import { FaqSection } from '@/components/page/toolbox';
import { CONTENT_OS_FALLBACK, CONTENT_OS_SLUG, type ContentOsCopy } from '@/content/content-os';
import type { OutputMedia } from '@/content/content-os/types';
import {
  type GraphicDemo,
  beyondDemos,
  carouselDemos,
  demoGroups,
  formatDemos,
  graphicDemos,
  hostDemo,
  realDemos,
  storyDemo,
  videoDemoCount,
} from '@/content/content-os/demos';
import { absoluteUrl, site } from '@/lib/site';
import { type StoreProduct, formatPrice, majorUnits } from '@/lib/store';
import { BotChat, BotMark, type ChatAttachments } from './bot-chat';
import { BrandMemory, type OutputAsset } from './brand-memory';
import { CarouselViewer } from './carousel-viewer';
import { DemoGallery } from './demo-gallery';
import { Clip, ClipGallery, HoverClip, StoryVideo } from './media';

/** The real work each brand in the memory section points at. */
const pickCarousel = carouselDemos.find((d) => d.id.includes('small-team')) ?? carouselDemos[0]!;
const pickPost = graphicDemos.find((d) => d.id.includes('weak-first-line')) ?? graphicDemos[0]!;
const reel = (demo: { video: string; poster: string }): OutputAsset => ({
  kind: 'video',
  video: demo.video,
  poster: demo.poster,
  aspect: '9:16',
});
const outputMedia: Record<OutputMedia, OutputAsset> = {
  carousel: {
    kind: 'stack',
    images: pickCarousel.slides
      .slice(0, 3)
      .map((s) => s.src)
      .reverse(),
  },
  post: { kind: 'image', src: pickPost.image },
  story: { kind: 'video', video: storyDemo.video, poster: storyDemo.poster, aspect: '16:9' },
  'real-1': reel(realDemos[0]!),
  'real-2': reel(realDemos[1] ?? realDemos[0]!),
  host: reel(hostDemo ?? realDemos[0]!),
};

/** Soft card tint per accent. */
const tint = {
  build: 'bg-build/15',
  create: 'bg-create/15',
  spark: 'bg-spark/15',
  signal: 'bg-signal/15',
  idea: 'bg-idea/20',
} as const;

function IconTile({
  icon,
  tone,
  size = 'md',
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  tone: keyof typeof tint;
  size?: 'md' | 'lg';
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center rounded-[14px] text-[#2C2E2A]',
        accentBg[tone],
        size === 'lg' ? 'size-14' : 'size-11',
      )}
    >
      <Icon name={icon} className={size === 'lg' ? 'size-6' : 'size-5'} />
    </span>
  );
}

function Terminal({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <code
      className={cn(
        'inline-flex max-w-full items-center gap-2 overflow-x-auto rounded-[10px] bg-black/40 px-3 py-2 font-mono text-[13px] whitespace-nowrap text-[#F3EFE4] ring-1 ring-white/10',
        className,
      )}
    >
      <span aria-hidden="true" className="text-build">
        ›
      </span>
      {children}
    </code>
  );
}

/** A short line with a small icon in an accent tint. */
function PointItem({
  point,
  tone = 'build',
}: {
  point: { text: string; icon: Parameters<typeof Icon>[0]['name'] };
  tone?: keyof typeof tint;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className={cn('grid size-7 shrink-0 place-items-center rounded-[9px]', tint[tone])}
      >
        <Icon name={point.icon} className="size-3.5" />
      </span>
      {point.text}
    </li>
  );
}

/** Brand names whose logo leads an example chip ("Instagram 4:5" gets the Instagram mark). */
const PLATFORMS = ['Instagram', 'LinkedIn', 'Facebook', 'TikTok', 'YouTube', 'Threads', 'X'];
const platformOf = (label: string) => PLATFORMS.find((p) => label.startsWith(`${p} `));

/** The Content OS logo (mark + name), cropped and compressed for the web. */
function Wordmark({ className }: { className?: string }) {
  return (
    <img
      src="/content-os/logo.webp"
      alt="Content OS"
      width={340}
      height={80}
      className={cn('h-7 w-auto', className)}
    />
  );
}

/** Primary action: buy (with the price), or a plain "coming soon" until it's on sale. */
function BuyButton({
  href,
  label,
  comingSoon,
  size = 'lg',
  className,
}: {
  href: string | null;
  label: string;
  comingSoon: string;
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const base = cn(
    'rounded-pill inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap',
    size === 'lg' ? 'px-7 py-4 text-[17px] md:text-lg' : 'px-4 py-2 text-sm',
    className,
  );
  return href ? (
    <Link
      href={href}
      className={cn(
        base,
        'group bg-signal text-[#0E0F0C] shadow-[0_10px_40px_-10px_rgba(46,155,247,0.8)] transition hover:brightness-110',
      )}
    >
      {label}
      <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
        →
      </span>
    </Link>
  ) : (
    <span className={cn(base, 'text-ink-soft ring-1 ring-white/20')}>{comingSoon}</span>
  );
}

/** Columns of real renders drifting up and down: the hero's backdrop. */
function PosterWall() {
  const posters = formatDemos.filter((d) => d.aspect === '9:16').map((d) => d.poster);
  const columns = Array.from({ length: 8 }, (_, c) =>
    Array.from({ length: 6 }, (_, r) => posters[(c * 6 + r * 7) % posters.length]!),
  );
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 flex w-[170%] [transform:translate(-50%,-50%)_perspective(1400px)_rotateX(22deg)_rotateZ(-12deg)] gap-4 md:w-[130%]">
        {columns.map((column, c) => (
          <div key={c} className="min-w-0 flex-1 overflow-hidden">
            <div
              className={c % 2 ? 'cos-drift-down' : 'cos-drift-up'}
              style={{ ['--cos-speed' as string]: `${70 + (c % 3) * 18}s` }}
            >
              {[...column, ...column].map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt=""
                  width={180}
                  height={320}
                  loading={i < 3 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="mb-4 aspect-[9/16] w-full rounded-[14px] object-cover opacity-70"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {/* Darken towards the copy and the edges. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_45%,rgba(14,15,12,0.92)_0%,rgba(14,15,12,0.75)_45%,rgba(14,15,12,0.55)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-[#0E0F0C]" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0E0F0C] to-transparent" />
    </div>
  );
}

function PostCard({ post, readMore }: { post: GraphicDemo; readMore: string }) {
  return (
    <li className="group bg-paper flex flex-col overflow-hidden rounded-[20px] ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)] hover:ring-white/25">
      <img
        src={post.image}
        srcSet={`${post.image} 900w, ${post.full} 1080w`}
        sizes="(min-width: 1280px) 300px, (min-width: 1024px) 31vw, (min-width: 640px) 45vw, 92vw"
        alt={post.hook}
        width={720}
        height={900}
        loading="lazy"
        decoding="async"
        className="aspect-[4/5] w-full cursor-zoom-in object-cover"
      />
      <div className="flex flex-1 flex-col p-4">
        <p className="text-ink-soft flex min-w-0 items-center gap-2 text-xs">
          <span className="bg-signal size-1.5 shrink-0 rounded-full" aria-hidden="true" />
          <span className="truncate">{post.series?.name ?? post.channel}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0 capitalize">{post.channel}</span>
        </p>
        <p className="mt-2 line-clamp-2 min-h-[2.6em] text-[15px] leading-snug font-medium">
          {post.hook}
        </p>
        <details className="group/caption mt-auto pt-3">
          <summary className="text-ink-soft cursor-pointer list-none text-xs underline underline-offset-4 hover:text-[#F3EFE4] [&::-webkit-details-marker]:hidden">
            {readMore}
          </summary>
          <p className="text-ink-soft mt-3 text-[14px] leading-relaxed whitespace-pre-line">
            {post.caption}
          </p>
          {post.hashtags.length > 0 && (
            <p className="text-signal mt-3 text-xs">{post.hashtags.join(' ')}</p>
          )}
        </details>
      </div>
    </li>
  );
}

/**
 * The Content OS sales page: a standalone, always-dark landing for ads, rendered entirely from one
 * language's copy. Price and availability come from the store, with the launch price as fallback.
 */
export function ContentOsLanding({
  copy,
  product,
  lang,
  path,
}: {
  copy: ContentOsCopy;
  product: StoreProduct | undefined;
  lang: string;
  path: string;
}) {
  const amount = product?.amount ?? CONTENT_OS_FALLBACK.amount;
  const currency = product?.amount !== undefined ? product.currency : CONTENT_OS_FALLBACK.currency;
  const price = formatPrice(amount, currency);
  const fill = (text: string) =>
    text
      .replaceAll('{price}', price)
      .replaceAll('{videos}', `${videoDemoCount}+`)
      .replaceAll('{carousels}', String(carouselDemos.length))
      .replaceAll('{posts}', String(graphicDemos.length));
  // Until the product is published in the admin, the page sells nothing it can't deliver.
  const purchasable = product?.status === 'available';
  const buy = purchasable ? `/checkout?items=${CONTENT_OS_SLUG}` : null;
  const c = copy;

  const vertical = formatDemos.filter((d) => d.aspect === '9:16');
  const reel = formatDemos.find((d) => d.id === 'mx-product-hero') ?? vertical[0]!;
  const youtube = formatDemos.find((d) => d.group === 'youtube' && d.aspect === '16:9')!;
  const firstPost = graphicDemos[0]!;
  const attachments: ChatAttachments = {
    carousel: carouselDemos[0]!.slides.map((slide) => slide.src),
    reel: { video: reel.video, poster: reel.poster },
    post: { image: firstPost.image, caption: firstPost.caption },
    youtube: { video: youtube.video, poster: youtube.poster },
  };

  return (
    <main id="main" lang={lang} data-standalone="" className="cos-dark min-h-dvh">
      {purchasable && (
        <TrackViewItem
          item={{
            item_id: CONTENT_OS_SLUG,
            item_name: 'Content OS',
            price: amount,
            quantity: 1,
            item_category: 'software',
          }}
          currency={currency}
        />
      )}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Content OS',
          description: fill(c.meta.description),
          url: absoluteUrl(path),
          applicationCategory: 'MultimediaApplication',
          operatingSystem: 'macOS, Windows',
          author: { '@type': 'Person', name: site.name },
          ...(purchasable
            ? {
                offers: {
                  '@type': 'Offer',
                  price: majorUnits(amount, currency),
                  priceCurrency: currency,
                  availability: 'https://schema.org/InStock',
                  url: absoluteUrl(path),
                },
              }
            : {}),
        }}
      />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: c.faq.list.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: { '@type': 'Answer', text: fill(item.a) },
          })),
        }}
      />

      {/* ───────────── Header ───────────── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0E0F0C]/75 backdrop-blur-xl">
        <Container className="flex h-16 items-center gap-3 md:gap-5">
          <a href="#top" className="shrink-0">
            <Wordmark className="h-6 md:h-7" />
          </a>
          <nav aria-label="Content OS" className="ml-auto hidden lg:block">
            <ul className="flex items-center gap-1">
              {c.nav.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-ink-soft rounded-pill px-3 py-2 text-sm transition hover:text-[#F3EFE4]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <BuyButton
            href={buy ?? '#pricing'}
            label={fill(c.nav.buy)}
            comingSoon={c.pricing.comingSoon}
            size="sm"
            className="ml-auto lg:ml-0"
          />
        </Container>
      </header>

      {/* ───────────── Hero: the bot ───────────── */}
      <section id="top" className="relative isolate overflow-hidden">
        <PosterWall />
        <Container className="relative grid gap-12 pt-14 pb-20 md:pt-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-16 lg:pb-28">
          <div>
            <p className="rounded-pill inline-flex items-center gap-2 bg-white/[0.06] py-1.5 pr-4 pl-1.5 text-sm text-[#F3EFE4] ring-1 ring-white/15 backdrop-blur">
              <BotMark className="size-6 rounded-full text-[9px]" />
              {c.hero.badge}
            </p>
            <h1 className="mt-7 text-[clamp(46px,7.2vw,104px)] leading-[0.92] font-medium tracking-[-0.06em] text-balance">
              <span className="block">{c.hero.title.line1}</span>
              <span className="from-signal via-idea to-build block bg-gradient-to-r bg-clip-text text-transparent">
                {c.hero.title.line2}
              </span>
            </h1>
            <p className="text-ink-soft mt-7 max-w-[58ch] text-lg leading-relaxed md:text-xl">
              {c.hero.intro}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <BuyButton href={buy} label={fill(c.hero.buy)} comingSoon={c.pricing.comingSoon} />
              <a
                href="#story"
                className="rounded-pill inline-flex items-center gap-2 px-6 py-4 text-[17px] font-medium ring-1 ring-white/20 transition hover:bg-white/10"
              >
                <Icon name="play" className="size-4" />
                {c.hero.watch}
              </a>
            </div>
            <ul className="text-ink-soft mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
              {c.hero.points.map((point) => (
                <PointItem key={point.text} point={point} tone="signal" />
              ))}
            </ul>
            <dl className="mt-10 grid max-w-xl grid-cols-4 gap-4 border-t border-white/10 pt-6">
              {c.hero.stats.map((stat) => (
                <div key={stat.label} className="flex flex-col-reverse">
                  <dt className="text-ink-soft mt-1 text-xs md:text-sm">{stat.label}</dt>
                  <dd className="text-2xl font-medium tracking-[-0.04em] md:text-4xl">
                    {fill(stat.value)}
                  </dd>
                  <Icon name={stat.icon} className="text-signal mb-2 size-4 md:size-5" />
                </div>
              ))}
            </dl>
          </div>
          <BotChat bot={c.bot} files={attachments} />
        </Container>
      </section>

      {/* ───────────── Story video ───────────── */}
      <Section className="scroll-mt-20">
        <StoryVideo
          src={storyDemo.full}
          poster={storyDemo.poster}
          width={1920}
          height={1080}
          label={c.hero.videoLabel}
        />
        <p className="text-ink-soft mt-4 text-center text-sm">{c.hero.videoCaption}</p>
      </Section>

      {/* ───────────── Brand memory ───────────── */}
      <Section divided labelledBy="cos-memory">
        <SectionTitle
          id="cos-memory"
          eyebrow={c.memory.eyebrow}
          title={c.memory.title}
          rest={c.memory.rest}
        />
        <p className="text-ink-soft mt-6 max-w-[62ch] text-lg leading-relaxed">{c.memory.intro}</p>
        <div className="mt-10">
          <BrandMemory memory={c.memory} media={outputMedia} />
        </div>
      </Section>

      {/* ───────────── What it makes ───────────── */}
      <Section divided labelledBy="cos-makes" id="makes" className="scroll-mt-20">
        <SectionTitle
          id="cos-makes"
          eyebrow={c.makes.eyebrow}
          title={c.makes.title}
          rest={c.makes.rest}
        />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 md:gap-5 xl:grid-cols-3">
          {c.makes.kinds.map((kind) => (
            <li
              key={kind.title}
              className={cn('rounded-card p-6 ring-1 ring-white/10 md:p-7', tint[kind.tone])}
            >
              <IconTile icon={kind.icon} tone={kind.tone} size="lg" />
              <h3 className="mt-6 text-2xl font-medium tracking-[-0.03em]">{kind.title}</h3>
              <p className="text-ink-soft mt-2 leading-relaxed">{kind.body}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {kind.examples.map((example) => {
                  const platform = platformOf(example);
                  return (
                    <li
                      key={example}
                      className="rounded-pill inline-flex items-center gap-1.5 bg-white/[0.06] px-3 py-1 text-[13px] ring-1 ring-white/10"
                    >
                      {platform && <PlatformMark platform={platform} className="size-3.5" />}
                      {example}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </Section>

      {/* ───────────── Carousels ───────────── */}
      <Section divided labelledBy="cos-carousels">
        <SectionTitle
          id="cos-carousels"
          eyebrow={c.carousels.eyebrow}
          title={c.carousels.title}
          rest={c.carousels.rest}
        />
        <p className="text-ink-soft mt-6 max-w-[62ch] text-lg leading-relaxed">
          {c.carousels.intro}
        </p>
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
          {c.carousels.points.map((point) => (
            <PointItem key={point.text} point={point} />
          ))}
        </ul>
        <div className="mt-12">
          <CarouselViewer
            carousels={carouselDemos}
            labels={{
              pick: c.carousels.pick,
              slideOf: c.carousels.slideOf,
              captionLabel: c.carousels.captionLabel,
              prev: c.carousels.prev,
              next: c.carousels.next,
            }}
          />
        </div>
        <p className="text-ink-soft mt-6 text-sm">{c.carousels.note}</p>
      </Section>

      {/* ───────────── Text posts & graphics ───────────── */}
      <Section divided labelledBy="cos-posts">
        <SectionTitle
          id="cos-posts"
          eyebrow={c.posts.eyebrow}
          title={c.posts.title}
          rest={c.posts.rest}
        />
        <p className="text-ink-soft mt-6 max-w-[62ch] text-lg leading-relaxed">{c.posts.intro}</p>
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
          {c.posts.points.map((point) => (
            <PointItem key={point.text} point={point} tone="idea" />
          ))}
        </ul>
        {/* 12 posts: full rows at 1, 2, 3 and 4 columns. */}
        <ul className="mt-12 grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {graphicDemos.slice(0, 12).map((post) => (
            <PostCard key={post.id} post={post} readMore={c.posts.readMore} />
          ))}
        </ul>
        <p className="text-ink-soft mt-2 text-sm">{c.posts.note}</p>
      </Section>

      {/* ───────────── Every demo ───────────── */}
      <Section divided labelledBy="cos-demos" id="demos" className="scroll-mt-20">
        <SectionTitle
          id="cos-demos"
          eyebrow={c.gallery.eyebrow}
          title={fill(c.gallery.title)}
          rest={c.gallery.rest}
        />
        <p className="text-ink-soft mt-6 max-w-[62ch] text-lg leading-relaxed">{c.gallery.intro}</p>
        <div className="mt-10">
          <DemoGallery
            demos={formatDemos}
            groups={demoGroups}
            labels={{
              all: c.gallery.all,
              showMore: c.gallery.showMore,
              close: c.gallery.close,
              vertical: c.gallery.vertical,
              landscape: c.gallery.landscape,
              wideToo: c.gallery.wideToo,
              prev: c.carousels.prev,
              next: c.carousels.next,
            }}
          />
        </div>
        <p className="text-ink-soft mt-6 text-sm">{c.gallery.note}</p>
      </Section>

      {/* ───────────── Beyond the formats ───────────── */}
      <Section divided labelledBy="cos-beyond">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <div>
            <SectionTitle
              id="cos-beyond"
              eyebrow={c.beyond.eyebrow}
              title={c.beyond.title}
              rest={c.beyond.rest}
            />
            <p className="text-ink-soft mt-6 max-w-[58ch] text-lg leading-relaxed">
              {c.beyond.intro}
            </p>
          </div>
          {/* What you could ask for, as chat bubbles */}
          <ul className="flex flex-wrap gap-2.5 lg:justify-end">
            {c.beyond.asks.map((ask, i) => (
              <li
                key={ask}
                className={cn(
                  'rounded-[18px] px-4 py-2.5 text-[15px] leading-snug',
                  i % 2
                    ? 'bg-white/[0.06] ring-1 ring-white/10'
                    : 'bg-signal rounded-br-[6px] text-[#0E0F0C]',
                )}
              >
                {ask}
              </li>
            ))}
          </ul>
        </div>

        <ClipGallery
          className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-5"
          items={c.beyond.styles.flatMap((style) => {
            const clip = beyondDemos.find((b) => b.id === style.id);
            return clip ? [{ ...clip, title: style.title, body: style.body }] : [];
          })}
          labels={{ close: c.gallery.close, prev: c.carousels.prev, next: c.carousels.next }}
        />

        {hostDemo && (
          <div className="mt-10 grid gap-5 rounded-[24px] bg-white/[0.03] p-5 ring-1 ring-white/10 md:p-7 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.6fr)] lg:items-center lg:gap-8">
            <div className="flex gap-5 lg:block">
              <HoverClip
                video={hostDemo.video}
                poster={hostDemo.poster}
                full={hostDemo.full}
                title={c.beyond.host.title}
                aspect="9:16"
                closeLabel={c.gallery.close}
                className="aspect-[9/16] w-32 shrink-0 rounded-[16px] ring-1 ring-white/10 lg:w-full lg:max-w-[220px]"
              />
              <div className="lg:mt-5">
                <h3 className="text-2xl font-medium tracking-[-0.03em]">{c.beyond.host.title}</h3>
                <p className="text-ink-soft mt-2 leading-relaxed">{c.beyond.host.body}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <img
                src={hostDemo.sheet}
                srcSet={`${hostDemo.sheet} 1280w, ${hostDemo.sheetFull} 1920w`}
                sizes="(min-width: 1024px) 40vw, 92vw"
                alt={c.beyond.host.sheet}
                width={1280}
                height={720}
                loading="lazy"
                className="w-full rounded-[16px] bg-white ring-1 ring-white/10"
              />
              <img
                src={hostDemo.emotions}
                srcSet={`${hostDemo.emotions} 1280w, ${hostDemo.emotionsFull} 1920w`}
                sizes="(min-width: 1024px) 40vw, 92vw"
                alt={c.beyond.host.emotions}
                width={1280}
                height={720}
                loading="lazy"
                className="w-full rounded-[16px] bg-white ring-1 ring-white/10"
              />
            </div>
          </div>
        )}
        <p className="text-ink-soft mt-6 text-sm">{c.beyond.note}</p>
      </Section>

      {/* ───────────── Real work ───────────── */}
      {realDemos.length > 0 && (
        <Section divided labelledBy="cos-real">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-16">
            <div>
              <SectionTitle id="cos-real" eyebrow={c.real.eyebrow} title={c.real.title} />
              <p className="text-ink-soft mt-5 max-w-[48ch] text-lg leading-relaxed">
                {c.real.intro}
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-4 md:gap-5">
              {realDemos.map((r) => (
                <li key={r.id}>
                  <Clip
                    video={r.full}
                    poster={r.poster}
                    label={`${r.brand}: ${r.title}`}
                    className={cn(
                      'rounded-[18px] ring-1 ring-white/10',
                      r.aspect === '9:16' ? 'aspect-[9/16]' : 'aspect-video',
                    )}
                  />
                  <p className="mt-3 text-[15px] leading-snug font-medium">{r.title}</p>
                  <p className="text-ink-soft text-sm">{r.brand}</p>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {/* ───────────── Everything it can do ───────────── */}
      <Section divided labelledBy="cos-abilities">
        <SectionTitle
          id="cos-abilities"
          eyebrow={c.abilities.eyebrow}
          title={c.abilities.title}
          rest={c.abilities.rest}
        />
        <ul className="mt-12 grid gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-4">
          {c.abilities.groups.map((group) => (
            <li
              key={group.title}
              className={cn('rounded-[24px] p-6 ring-1 ring-white/10 md:p-7', tint[group.tone])}
            >
              <div className="flex items-center gap-3">
                <IconTile icon={group.icon} tone={group.tone} />
                <h3 className="text-2xl font-medium tracking-[-0.03em]">{group.title}</h3>
              </div>
              <p className="text-ink-soft mt-4 leading-relaxed">{group.blurb}</p>
              <ul className="mt-6 grid gap-2.5 border-t border-white/10 pt-6 text-[15px]">
                {group.items.map((item) => (
                  <PointItem key={item.text} point={item} tone={group.tone} />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Section>

      {/* ───────────── How it works ───────────── */}
      <Section divided labelledBy="cos-how" id="how" className="scroll-mt-20">
        <SectionTitle id="cos-how" eyebrow={c.how.eyebrow} title={c.how.title} rest={c.how.rest} />
        <ol className="mt-12 grid gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-4">
          {c.how.steps.map((step, i) => (
            <li
              key={step.title}
              className={cn(
                'rounded-card flex flex-col p-6 ring-1 ring-white/10 md:p-7',
                tint[step.tone],
              )}
            >
              <div className="flex items-center justify-between">
                <IconTile icon={step.icon} tone={step.tone} />
                <span className="text-ink-soft font-mono text-sm" aria-hidden="true">
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-6 text-xl font-medium tracking-[-0.02em]">{step.title}</h3>
              <p className="text-ink-soft mt-2 flex-1 leading-relaxed">{step.body}</p>
              {step.command && <Terminal className="mt-5 self-start">{step.command}</Terminal>}
            </li>
          ))}
        </ol>
      </Section>

      {/* ───────────── Why it's different ───────────── */}
      <Section divided labelledBy="cos-different">
        <SectionTitle
          id="cos-different"
          eyebrow={c.different.eyebrow}
          title={c.different.title}
          rest={c.different.rest}
        />
        <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {c.different.items.map((item) => (
            <li key={item.title}>
              <IconTile icon={item.icon} tone={item.tone} />
              <h3 className="mt-4 text-lg font-medium tracking-[-0.02em]">{item.title}</h3>
              <p className="text-ink-soft mt-1.5 leading-relaxed">{item.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* ───────────── Commands ───────────── */}
      <section aria-labelledby="cos-commands" className="pb-16 md:pb-24">
        <Container>
          <div className="grid gap-10 rounded-[24px] bg-gradient-to-br from-[#12233a] to-[#0E0F0C] p-7 ring-1 ring-white/10 md:p-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div>
              <p className="text-ink-soft font-mono text-xs tracking-[0.16em] uppercase">
                {c.commands.eyebrow}
              </p>
              <h2
                id="cos-commands"
                className="mt-4 text-[clamp(32px,4vw,52px)] leading-[1] font-medium tracking-[-0.045em]"
              >
                {c.commands.title}
              </h2>
              <p className="text-ink-soft mt-5 text-lg leading-relaxed">{c.commands.intro}</p>
            </div>
            <ul className="divide-y divide-white/10 rounded-[16px] bg-black/30 ring-1 ring-white/10">
              {c.commands.list.map((item) => (
                <li key={item.command} className="flex gap-4 px-5 py-4 md:px-6">
                  <span
                    aria-hidden="true"
                    className="bg-signal/15 text-signal grid size-9 shrink-0 place-items-center rounded-[10px]"
                  >
                    <Icon name={item.icon} className="size-4" />
                  </span>
                  <span className="grid min-w-0 gap-1">
                    <code className="font-mono text-[14px] break-words">{item.command}</code>
                    <span className="text-ink-soft text-[15px]">{item.does}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      {/* ───────────── Platforms + audience ───────────── */}
      <Section divided labelledBy="cos-platforms">
        <SectionTitle id="cos-platforms" eyebrow={c.platforms.eyebrow} title={c.platforms.title} />
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {c.platforms.list.map((platform) => (
            <li
              key={platform.name}
              className="rounded-card bg-white/[0.03] p-5 ring-1 ring-white/10"
            >
              <div className="flex items-center gap-3">
                <SocialIcon platform={platform.name} className="size-10" />
                <h3 className="text-lg font-medium">{platform.name}</h3>
              </div>
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {platform.formats.map((format) => (
                  <li
                    key={format.label}
                    className="rounded-pill text-ink-soft inline-flex items-center gap-1.5 bg-white/[0.06] px-2.5 py-1 text-[13px]"
                  >
                    <Icon name={format.icon} className="size-3.5" />
                    {format.label}
                  </li>
                ))}
              </ul>
            </li>
          ))}
          <li className="bg-idea rounded-card flex items-center gap-3 p-5 text-[15px] text-[#2C2E2A]">
            <Icon name="globe" className="size-5 shrink-0" />
            {c.platforms.languageNote}
          </li>
        </ul>
      </Section>

      <Section divided labelledBy="cos-audience">
        <SectionTitle id="cos-audience" eyebrow={c.audience.eyebrow} title={c.audience.title} />
        <ul className="mt-10 grid gap-4 md:grid-cols-3 md:gap-5">
          {c.audience.list.map((item) => (
            <li
              key={item.title}
              className={cn('rounded-card p-6 ring-1 ring-white/10 md:p-7', tint[item.tone])}
            >
              <IconTile icon={item.icon} tone={item.tone} size="lg" />
              <h3 className="mt-6 text-xl font-medium tracking-[-0.02em]">{item.title}</h3>
              <p className="text-ink-soft mt-2 leading-relaxed">{item.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* ───────────── Pricing ───────────── */}
      <Section divided labelledBy="cos-pricing" id="pricing" className="scroll-mt-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <SectionTitle
            id="cos-pricing"
            eyebrow={c.pricing.eyebrow}
            title={c.pricing.title}
            rest={c.pricing.rest}
            className="self-start"
          />
          <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#16304f] via-[#141618] to-[#141618] p-7 shadow-[0_40px_120px_-40px_rgba(46,155,247,0.6)] ring-1 ring-white/15 md:p-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-ink-soft font-mono text-xs tracking-[0.16em] uppercase">
                  {c.pricing.plan}
                </p>
                <p className="mt-3 text-[clamp(64px,8vw,104px)] leading-none font-medium tracking-[-0.06em]">
                  {price}
                </p>
                <p className="text-ink-soft mt-2">{c.pricing.priceNote}</p>
              </div>
              <BotMark className="size-14 rounded-[16px] text-lg" />
            </div>
            <ul className="mt-8 grid gap-3 border-t border-white/10 pt-8">
              {c.pricing.included.map((item) => (
                <li key={item.text} className="flex items-center gap-3 leading-snug">
                  <span
                    aria-hidden="true"
                    className="bg-signal/15 text-signal grid size-8 shrink-0 place-items-center rounded-[10px]"
                  >
                    <Icon name={item.icon} className="size-4" />
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
            <BuyButton
              href={buy}
              label={fill(c.pricing.buy)}
              comingSoon={c.pricing.comingSoon}
              className="mt-8 w-full"
            />
            <p className="text-ink-soft mt-4 text-sm leading-relaxed">
              {c.pricing.refund.before}
              <Link href="/legal/refund" className="text-[#F3EFE4] underline underline-offset-4">
                {c.pricing.refund.link}
              </Link>
              {c.pricing.refund.after}
            </p>
          </div>
        </div>
      </Section>

      {/* ───────────── Requirements ───────────── */}
      <Section divided labelledBy="cos-requirements">
        <SectionTitle
          id="cos-requirements"
          eyebrow={c.requirements.eyebrow}
          title={c.requirements.title}
        />
        <p className="text-ink-soft mt-5 max-w-[62ch] text-lg leading-relaxed">
          {c.requirements.intro}
        </p>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="rounded-card p-6 ring-1 ring-white/10 md:p-7">
            <h3 className="text-lg font-medium">{c.requirements.needed.title}</h3>
            <ul className="mt-4 grid gap-3">
              {c.requirements.needed.list.map((item) => (
                <li key={item.text} className="flex items-center gap-3 leading-snug">
                  <span
                    aria-hidden="true"
                    className="bg-build/15 text-build grid size-8 shrink-0 place-items-center rounded-[10px]"
                  >
                    <Icon name={item.icon} className="size-4" />
                  </span>
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-card p-6 ring-1 ring-white/10 md:p-7">
            <h3 className="text-lg font-medium">{c.requirements.optional.title}</h3>
            <dl className="mt-4 grid gap-3">
              {c.requirements.optional.list.map((item) => (
                <div key={item.key} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="bg-idea/20 text-idea grid size-8 shrink-0 place-items-center rounded-[10px]"
                  >
                    <Icon name={item.icon} className="size-4" />
                  </span>
                  <dt className="rounded bg-white/10 px-2 py-0.5 font-mono text-[13px]">
                    {item.key}
                  </dt>
                  <dd className="text-ink-soft">{item.unlocks}</dd>
                </div>
              ))}
            </dl>
            <p className="text-ink-soft mt-5 border-t border-white/10 pt-5 text-[15px] leading-relaxed">
              {c.requirements.costs}
            </p>
          </div>
        </div>
      </Section>

      <div id="faq" className="scroll-mt-20">
        <FaqSection
          eyebrow={c.faq.eyebrow}
          title={c.faq.title}
          faq={c.faq.list.map((item) => ({ q: item.q, a: fill(item.a) }))}
        />
      </div>

      {/* ───────────── Final call ───────────── */}
      <section className="pb-20 md:pb-28">
        <Container>
          <div className="relative isolate overflow-hidden rounded-[32px] px-7 py-16 text-center ring-1 ring-white/10 md:px-12 md:py-24">
            <PosterWall />
            <BotMark className="mx-auto size-14 rounded-[16px] text-lg" />
            <h2 className="mx-auto mt-8 max-w-[16ch] text-[clamp(40px,6vw,88px)] leading-[0.95] font-medium tracking-[-0.055em] text-balance">
              {c.final.title}{' '}
              <span className="from-signal via-idea to-build bg-gradient-to-r bg-clip-text text-transparent">
                {c.final.rest}
              </span>
            </h2>
            <div className="mt-10 flex justify-center">
              <BuyButton href={buy} label={fill(c.final.buy)} comingSoon={c.pricing.comingSoon} />
            </div>
            <p className="text-ink-soft mt-5 text-[15px]">{c.final.note}</p>
          </div>
        </Container>
      </section>

      {/* ───────────── Footer ───────────── */}
      <footer className="border-t border-white/10 py-10">
        <Container className="text-ink-soft flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <Wordmark className="h-6" />
          <span>{c.footer.by}</span>
          <Link href="/" className="underline underline-offset-4 hover:text-[#F3EFE4]">
            {c.footer.back}
          </Link>
          <ul className="flex gap-4 md:ml-auto">
            {c.footer.links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-[#F3EFE4]">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </footer>
    </main>
  );
}
