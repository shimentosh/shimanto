/* eslint-disable @next/next/no-img-element -- pre-sized posters and renders from Content OS */
import { Container, Icon, cn } from '@shimanto/ui';
import Link from 'next/link';
import { TrackViewItem } from '@/components/analytics/analytics';
import { JsonLd } from '@/components/page/json-ld';
import { PlatformMark, SocialIcon } from '@/components/page/social-icon';
import { Section } from '@/components/page/section';
import { FaqSection } from '@/components/page/toolbox';
import { CONTENT_OS_MARKETS, type ContentOsCopy, type ContentOsLocale } from '@/content/content-os';
import type { OutputMedia } from '@/content/content-os/types';
import {
  beyondDemos,
  bnCarouselDemos,
  bnGraphicDemos,
  type CarouselDemo,
  carouselDemos as englishCarousels,
  demoGroups,
  formatDemos,
  type GraphicDemo,
  graphicDemos as englishGraphics,
  hostDemo,
  realDemos,
  storyDemo,
  videoDemoCount,
} from '@/content/content-os/demos';
import { absoluteUrl, site } from '@/lib/site';
import { type StoreProduct, majorUnits } from '@/lib/store';
import { BotChat, BotMark, type ChatAttachments } from './bot-chat';
import { BrandMemory, type OutputAsset } from './brand-memory';
import { CarouselViewer } from './carousel-viewer';
import { CommandFlow } from './command-flow';
import { DemoGallery } from './demo-gallery';
import { Clip, ClipGallery, HoverClip, StoryVideo } from './media';
import {
  BuyButton,
  Headline,
  IconTile,
  PointItem,
  PostCard,
  PosterWall,
  Terminal,
  offer,
  platformOf,
  rail,
  tint,
} from './parts';
import { pressDark } from './press';
import { ContentOsShell } from './shell';

const reel = (demo: { video: string; poster: string }): OutputAsset => ({
  kind: 'video',
  video: demo.video,
  poster: demo.poster,
  aspect: '9:16',
});
/** The real work each brand in the memory section points at, from this page's carousels and posts. */
const outputMediaOf = (
  carousels: CarouselDemo[],
  graphics: GraphicDemo[],
): Record<OutputMedia, OutputAsset> => {
  const pickCarousel = carousels.find((d) => d.id.includes('small-team')) ?? carousels[0]!;
  const pickPost = graphics.find((d) => d.id.includes('weak-first-line')) ?? graphics[0]!;
  return {
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
};

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
  lang: ContentOsLocale;
  path: string;
}) {
  const market = CONTENT_OS_MARKETS[lang];
  const { amount, currency, price, fullPrice, purchasable, buy } = offer(product, market);
  // The Bangla page shows Shimanto's Bangla carousels and posts.
  const carouselDemos = lang === 'bn' ? bnCarouselDemos : englishCarousels;
  const graphicDemos = lang === 'bn' ? bnGraphicDemos : englishGraphics;
  const fill = (text: string) =>
    text
      .replaceAll('{price}', price)
      .replaceAll('{videos}', `${videoDemoCount}+`)
      .replaceAll('{carousels}', String(carouselDemos.length))
      .replaceAll('{posts}', String(graphicDemos.length));
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
    <ContentOsShell copy={c} product={product} lang={lang} path={path} sections={c.nav.links}>
      {purchasable && (
        <TrackViewItem
          item={{
            item_id: market.slug,
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

      {/* ───────────── Hero: the bot ───────────── */}
      <section id="top" className="relative isolate overflow-hidden">
        <PosterWall />
        <Container className="relative grid gap-10 pt-6 pb-16 md:gap-12 md:pt-20 md:pb-20 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-16 lg:pb-28">
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
            <div className="mt-8 grid gap-3 sm:mt-9 sm:flex sm:flex-wrap sm:items-center">
              <BuyButton
                href={buy}
                label={fill(c.hero.buy)}
                comingSoon={c.pricing.comingSoon}
                className="w-full sm:w-auto"
              />
              <a
                href="#story"
                className={cn(
                  pressDark,
                  'rounded-pill inline-flex items-center justify-center gap-2 px-6 py-4 text-[17px] font-medium',
                )}
              >
                <Icon name="play" className="size-4" />
                {c.hero.watch}
              </a>
            </div>
            {c.hero.offer && fullPrice && (
              <p className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[15px]">
                <span className="bg-spark rounded-pill px-2.5 py-0.5 text-sm font-semibold text-[#0E0F0C]">
                  {market.discount}%
                </span>
                <s className="text-ink-soft">{fullPrice}</s>
                <span className="font-medium">{price}</span>
                <span className="text-ink-soft">· {c.hero.offer}</span>
              </p>
            )}
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
      <Section className="scroll-mt-8">
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
      <Section divided labelledBy="cos-memory" id="memory" className="scroll-mt-8">
        <Headline
          id="cos-memory"
          eyebrow={c.memory.eyebrow}
          icon="cpu"
          tone="signal"
          title={c.memory.title}
          rest={c.memory.rest}
          intro={c.memory.intro}
        />
        <div className="mt-10">
          <BrandMemory memory={c.memory} media={outputMediaOf(carouselDemos, graphicDemos)} />
        </div>
      </Section>

      {/* ───────────── What it makes ───────────── */}
      <Section divided labelledBy="cos-makes" id="makes" className="scroll-mt-8">
        <Headline
          id="cos-makes"
          eyebrow={c.makes.eyebrow}
          icon="spark"
          tone="spark"
          title={c.makes.title}
          rest={c.makes.rest}
        />
        <ul
          className={cn(
            rail,
            'mt-8 gap-4 md:mt-12 md:grid-cols-2 md:gap-5 xl:grid-cols-3 [&>*]:w-[82%] md:[&>*]:w-auto',
          )}
        >
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
        <Headline
          id="cos-carousels"
          eyebrow={c.carousels.eyebrow}
          icon="grid"
          tone="build"
          title={c.carousels.title}
          rest={c.carousels.rest}
          intro={c.carousels.intro}
        />
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
        <Headline
          id="cos-posts"
          eyebrow={c.posts.eyebrow}
          icon="pen"
          tone="idea"
          title={c.posts.title}
          rest={c.posts.rest}
          intro={c.posts.intro}
        />
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
          {c.posts.points.map((point) => (
            <PointItem key={point.text} point={point} tone="idea" />
          ))}
        </ul>
        {/* 12 posts: full rows at 1, 2, 3 and 4 columns. */}
        <ul
          className={cn(
            rail,
            'mt-8 items-start gap-4 md:mt-12 md:grid-cols-2 md:gap-5 lg:grid-cols-3 xl:grid-cols-4 [&>*]:w-[76%] md:[&>*]:w-auto',
          )}
        >
          {graphicDemos.slice(0, 12).map((post) => (
            <PostCard key={post.id} post={post} readMore={c.posts.readMore} />
          ))}
        </ul>
        <p className="text-ink-soft mt-2 text-sm">{c.posts.note}</p>
      </Section>

      {/* ───────────── Every demo ───────────── */}
      <Section divided labelledBy="cos-demos" id="demos" className="scroll-mt-8">
        <Headline
          id="cos-demos"
          eyebrow={c.gallery.eyebrow}
          icon="video"
          tone="create"
          title={fill(c.gallery.title)}
          rest={c.gallery.rest}
          intro={c.gallery.intro}
        />
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
            <Headline
              id="cos-beyond"
              eyebrow={c.beyond.eyebrow}
              icon="bulb"
              tone="create"
              title={c.beyond.title}
              rest={c.beyond.rest}
              intro={c.beyond.intro}
            />
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
          className={cn(
            rail,
            'mt-8 gap-3 md:mt-12 md:grid-cols-5 md:gap-4 [&>*]:w-[44%] md:[&>*]:w-auto',
          )}
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
              <Headline
                id="cos-real"
                eyebrow={c.real.eyebrow}
                icon="briefcase"
                tone="signal"
                title={c.real.title}
                rest={c.real.rest}
                intro={c.real.intro}
              />
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
        <Headline
          id="cos-abilities"
          eyebrow={c.abilities.eyebrow}
          icon="layers"
          tone="build"
          title={c.abilities.title}
          rest={c.abilities.rest}
        />
        <ul
          className={cn(
            rail,
            'mt-8 gap-4 md:mt-12 md:grid-cols-2 md:gap-5 xl:grid-cols-4 [&>*]:w-[86%] md:[&>*]:w-auto',
          )}
        >
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
      <Section divided labelledBy="cos-how" id="how" className="scroll-mt-8">
        <Headline
          id="cos-how"
          eyebrow={c.how.eyebrow}
          icon="compass"
          tone="spark"
          title={c.how.title}
          rest={c.how.rest}
        />
        <ol
          className={cn(
            rail,
            'mt-8 gap-4 md:mt-12 md:grid-cols-2 md:gap-5 xl:grid-cols-4 [&>*]:w-[82%] md:[&>*]:w-auto',
          )}
        >
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
        <Headline
          id="cos-different"
          eyebrow={c.different.eyebrow}
          icon="target"
          tone="idea"
          title={c.different.title}
          rest={c.different.rest}
        />
        <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 md:mt-12 md:gap-x-8 md:gap-y-10 lg:grid-cols-4">
          {c.different.items.map((item) => (
            <li key={item.title}>
              <IconTile icon={item.icon} tone={item.tone} />
              <h3 className="mt-3 text-[15px] leading-snug font-medium tracking-[-0.02em] md:mt-4 md:text-lg">
                {item.title}
              </h3>
              <p className="text-ink-soft mt-1 text-sm leading-snug md:mt-1.5 md:text-base md:leading-relaxed">
                {item.body}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      {/* ───────────── Commands ───────────── */}
      <section aria-labelledby="cos-commands" className="pb-16 md:pb-24">
        <Container>
          <div className="grid gap-8 rounded-[24px] bg-gradient-to-br from-[#12233a] to-[#0E0F0C] p-5 ring-1 ring-white/10 md:p-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <div className="self-start lg:sticky lg:top-12">
              <Headline
                id="cos-commands"
                eyebrow={c.commands.eyebrow}
                icon="code"
                tone="signal"
                title={c.commands.title}
                rest={c.commands.rest}
                intro={c.commands.intro}
              />
            </div>
            <CommandFlow commands={c.commands} />
          </div>
        </Container>
      </section>

      {/* ───────────── Platforms + audience ───────────── */}
      <Section divided labelledBy="cos-platforms">
        <Headline
          id="cos-platforms"
          eyebrow={c.platforms.eyebrow}
          icon="globe"
          tone="build"
          title={c.platforms.title}
          rest={c.platforms.rest}
        />
        <ul
          className={cn(
            rail,
            'mt-8 gap-3 md:mt-10 md:grid-cols-2 lg:grid-cols-4 [&>*]:w-[70%] md:[&>*]:w-auto',
          )}
        >
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
        <Headline
          id="cos-audience"
          eyebrow={c.audience.eyebrow}
          icon="users"
          tone="create"
          title={c.audience.title}
          rest={c.audience.rest}
        />
        <ul
          className={cn(
            rail,
            'mt-8 gap-4 md:mt-10 md:grid-cols-3 md:gap-5 [&>*]:w-[82%] md:[&>*]:w-auto',
          )}
        >
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
      <Section divided labelledBy="cos-pricing" id="pricing" className="scroll-mt-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
          <Headline
            id="cos-pricing"
            eyebrow={c.pricing.eyebrow}
            icon="tag"
            tone="spark"
            title={c.pricing.title}
            rest={c.pricing.rest}
            className="self-start lg:sticky lg:top-12"
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
                {c.pricing.offer && fullPrice && (
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <s className="text-ink-soft text-lg">{fullPrice}</s>
                    <span className="bg-spark rounded-pill px-2.5 py-0.5 font-semibold text-[#0E0F0C]">
                      {c.pricing.offer}
                    </span>
                  </p>
                )}
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
        <Headline
          id="cos-requirements"
          eyebrow={c.requirements.eyebrow}
          icon="wrench"
          tone="idea"
          title={c.requirements.title}
          rest={c.requirements.rest}
          intro={c.requirements.intro}
        />
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

      <div id="faq" className="scroll-mt-8">
        <FaqSection
          heading={
            <Headline
              id="faq-title"
              eyebrow={c.faq.eyebrow}
              icon="chat"
              tone="signal"
              title={c.faq.title}
              rest={c.faq.rest}
            />
          }
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
    </ContentOsShell>
  );
}
