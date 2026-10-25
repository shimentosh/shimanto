/* eslint-disable @next/next/no-img-element -- pre-sized renders from Content OS */
import { Container, Icon, cn } from '@shimanto/ui';
import Link from 'next/link';
import { Section } from '@/components/page/section';
import { SocialIcon } from '@/components/page/social-icon';
import type { ContentOsCopy } from '@/content/content-os';
import {
  beyondDemos,
  carouselDemos,
  demoGroups,
  formatDemos,
  graphicDemos,
  hostDemo,
  videoDemoCount,
} from '@/content/content-os/demos';
import type { FeaturesCopy } from '@/content/content-os/features';
import type { StoreProduct } from '@/lib/store';
import { BotMark } from './bot-chat';
import { CarouselViewer } from './carousel-viewer';
import { DemoGallery } from './demo-gallery';
import { ClipGallery, HoverClip } from './media';
import {
  BuyButton,
  Headline,
  IconTile,
  PointItem,
  PostCard,
  PosterWall,
  offer,
  rail,
  tint,
} from './parts';
import { pressDark } from './press';
import { ContentOsShell } from './shell';
import { StudioTour } from './studio-tour';

/**
 * Content OS features: the Studio, every video format, carousel, post and style, and the full
 * list of what it can do. Same frame and copy conventions as the landing.
 */
export function ContentOsFeatures({
  copy,
  features,
  product,
  lang,
  path,
}: {
  copy: ContentOsCopy;
  features: FeaturesCopy;
  product: StoreProduct | undefined;
  lang: string;
  path: string;
}) {
  const c = copy;
  const f = features;
  const { buy, price } = offer(product);
  const styles = c.beyond.styles.flatMap((style) => {
    const clip = beyondDemos.find((b) => b.id === style.id);
    return clip ? [{ ...clip, title: style.title, body: style.body }] : [];
  });
  const fill = (text: string) =>
    text
      .replaceAll('{price}', price)
      .replaceAll('{videos}', `${videoDemoCount}+`)
      .replaceAll('{carousels}', String(carouselDemos.length))
      .replaceAll('{posts}', String(graphicDemos.length))
      .replaceAll('{styles}', String(styles.length));
  const shimanto = c.memory.brands[0]!;
  const vertical = formatDemos.filter((d) => d.aspect === '9:16');

  return (
    <ContentOsShell copy={c} product={product} lang={lang} path={path} sections={f.sections}>
      {/* ───────────── Hero ───────────── */}
      <section id="top" className="relative isolate overflow-hidden">
        <PosterWall />
        <Container className="relative pt-6 pb-14 md:pt-20 md:pb-24">
          <p className="rounded-pill inline-flex items-center gap-2 bg-white/[0.06] py-1.5 pr-4 pl-1.5 text-sm text-[#F3EFE4] ring-1 ring-white/15 backdrop-blur">
            <BotMark className="size-6 rounded-full text-[9px]" />
            {f.hero.badge}
          </p>
          <h1 className="mt-7 text-[clamp(46px,7.2vw,104px)] leading-[0.92] font-medium tracking-[-0.06em] text-balance">
            <span className="block">{f.hero.title}</span>
            <span className="from-signal via-idea to-build block bg-gradient-to-r bg-clip-text pb-[0.06em] text-transparent">
              {f.hero.rest}
            </span>
          </h1>
          <p className="text-ink-soft mt-6 max-w-[40ch] text-lg leading-snug md:text-xl">
            {f.hero.intro}
          </p>
          <dl className="mt-10 grid max-w-2xl grid-cols-2 gap-4 border-t border-white/10 pt-6 sm:grid-cols-4">
            {f.hero.stats.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse">
                <dt className="text-ink-soft mt-1 text-sm">{stat.label}</dt>
                <dd className="text-3xl font-medium tracking-[-0.04em] md:text-4xl">
                  {fill(stat.value)}
                </dd>
              </div>
            ))}
          </dl>
          {/* Jump to a section */}
          <ul className="cos-rail -mx-5 mt-8 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
            {f.sections.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  className={cn(
                    pressDark,
                    'text-ink-soft inline-flex h-10 shrink-0 items-center gap-2 rounded-[14px] px-3.5 text-sm font-medium whitespace-nowrap hover:text-[#F3EFE4]',
                  )}
                >
                  <Icon name={s.icon} className="size-4" />
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* ───────────── The Studio ───────────── */}
      <Section labelledBy="cos-studio" id="studio" className="scroll-mt-8">
        <Headline
          id="cos-studio"
          eyebrow={f.studio.eyebrow}
          icon="monitor"
          tone="signal"
          title={f.studio.title}
          rest={f.studio.rest}
          intro={f.studio.intro}
        />
        <div className="mt-10">
          <StudioTour
            studio={f.studio}
            media={{
              slides: (
                carouselDemos.find((d) => d.id.includes('small-team')) ?? carouselDemos[0]!
              ).slides.map((s) => s.src),
              posts: graphicDemos.map((g) => ({ src: g.image, hook: g.hook })),
              videos: vertical.slice(0, 6).map((v) => ({ poster: v.poster, name: v.name })),
              categories: c.memory.categories,
              stats: f.hero.stats.map((s) => ({ value: fill(s.value), label: s.label })),
              brand: { colors: shimanto.colors, fonts: shimanto.fonts },
            }}
          />
        </div>
      </Section>

      {/* ───────────── Every video format ───────────── */}
      <Section divided labelledBy="cos-formats" id="formats" className="scroll-mt-8">
        <Headline
          id="cos-formats"
          eyebrow={f.formats.eyebrow}
          icon="video"
          tone="create"
          title={f.formats.title}
          rest={f.formats.rest}
          intro={f.formats.intro}
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

      {/* ───────────── Every carousel ───────────── */}
      <Section divided labelledBy="cos-all-carousels" id="carousels" className="scroll-mt-8">
        <Headline
          id="cos-all-carousels"
          eyebrow={f.carousels.eyebrow}
          icon="grid"
          tone="build"
          title={f.carousels.title}
          rest={f.carousels.rest}
          intro={f.carousels.intro}
        />
        <div className="mt-10">
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
      </Section>

      {/* ───────────── Every post ───────────── */}
      <Section divided labelledBy="cos-all-posts" id="posts" className="scroll-mt-8">
        <Headline
          id="cos-all-posts"
          eyebrow={f.posts.eyebrow}
          icon="pen"
          tone="idea"
          title={f.posts.title}
          rest={f.posts.rest}
          intro={f.posts.intro}
        />
        <ul
          className={cn(
            rail,
            'mt-8 items-start gap-4 md:mt-10 md:grid-cols-2 md:gap-5 lg:grid-cols-3 xl:grid-cols-4 [&>*]:w-[76%] md:[&>*]:w-auto',
          )}
        >
          {graphicDemos.map((post) => (
            <PostCard key={post.id} post={post} readMore={c.posts.readMore} />
          ))}
        </ul>
      </Section>

      {/* ───────────── Styles ───────────── */}
      <Section divided labelledBy="cos-styles" id="styles" className="scroll-mt-8">
        <Headline
          id="cos-styles"
          eyebrow={f.styles.eyebrow}
          icon="bulb"
          tone="create"
          title={f.styles.title}
          rest={f.styles.rest}
          intro={f.styles.intro}
        />
        <ClipGallery
          className={cn(
            rail,
            'mt-8 gap-3 md:mt-10 md:grid-cols-5 md:gap-4 [&>*]:w-[44%] md:[&>*]:w-auto',
          )}
          items={styles}
          labels={{ close: c.gallery.close, prev: c.carousels.prev, next: c.carousels.next }}
        />
        {hostDemo && (
          <div className="mt-8 grid gap-5 rounded-[24px] bg-white/[0.03] p-5 ring-1 ring-white/10 md:grid-cols-[180px_minmax(0,1fr)] md:items-center md:p-7">
            <HoverClip
              video={hostDemo.video}
              poster={hostDemo.poster}
              full={hostDemo.full}
              title={c.beyond.host.title}
              aspect="9:16"
              closeLabel={c.gallery.close}
              className="aspect-[9/16] w-32 rounded-[16px] ring-1 ring-white/10 md:w-full"
            />
            <div>
              <h3 className="text-2xl font-medium tracking-[-0.03em]">{c.beyond.host.title}</h3>
              <p className="text-ink-soft mt-2 max-w-[48ch]">{c.beyond.host.body}</p>
              <img
                src={hostDemo.emotions}
                srcSet={`${hostDemo.emotions} 1280w, ${hostDemo.emotionsFull} 1920w`}
                sizes="(min-width: 1024px) 60vw, 92vw"
                alt={c.beyond.host.emotions}
                width={1280}
                height={720}
                loading="lazy"
                className="mt-5 w-full max-w-2xl rounded-[16px] bg-white ring-1 ring-white/10"
              />
            </div>
          </div>
        )}
      </Section>

      {/* ───────────── Every feature ───────────── */}
      <Section divided labelledBy="cos-catalogue" id="catalogue" className="scroll-mt-8">
        <Headline
          id="cos-catalogue"
          eyebrow={f.catalogue.eyebrow}
          icon="layers"
          tone="build"
          title={f.catalogue.title}
          rest={f.catalogue.rest}
        />
        <ul
          className={cn(
            rail,
            'mt-8 gap-4 md:mt-10 md:grid-cols-2 md:gap-5 xl:grid-cols-4 [&>*]:w-[86%] md:[&>*]:w-auto',
          )}
        >
          {c.abilities.groups.map((group) => (
            <li
              key={group.title}
              className={cn('rounded-[24px] p-6 ring-1 ring-white/10', tint[group.tone])}
            >
              <div className="flex items-center gap-3">
                <IconTile icon={group.icon} tone={group.tone} />
                <h3 className="text-2xl font-medium tracking-[-0.03em]">{group.title}</h3>
              </div>
              <ul className="mt-5 grid gap-2.5 border-t border-white/10 pt-5 text-[15px]">
                {group.items.map((item) => (
                  <PointItem key={item.text} point={item} tone={group.tone} />
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-7 md:mt-12 md:gap-x-8 md:gap-y-8 lg:grid-cols-4">
          {c.different.items.map((item) => (
            <li key={item.title}>
              <IconTile icon={item.icon} tone={item.tone} />
              <h3 className="mt-3 text-[15px] leading-snug font-medium tracking-[-0.02em] md:mt-4 md:text-lg">
                {item.title}
              </h3>
              <p className="text-ink-soft mt-1 text-sm leading-snug md:text-base">{item.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <div className="rounded-[24px] bg-white/[0.03] p-6 ring-1 ring-white/10">
            <h3 className="text-lg font-medium">{f.catalogue.contextTitle}</h3>
            <ul className="mt-4 flex flex-wrap gap-2">
              {c.memory.categories.map((name) => (
                <li
                  key={name}
                  className="rounded-pill bg-signal/10 ring-signal/30 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm ring-1"
                >
                  <Icon name="check" className="text-signal size-3.5" />
                  {name}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[24px] bg-white/[0.03] p-6 ring-1 ring-white/10">
            <h3 className="text-lg font-medium">{f.catalogue.platformsTitle}</h3>
            <ul className="mt-4 flex flex-wrap gap-2">
              {c.platforms.list.map((p) => (
                <li
                  key={p.name}
                  className="rounded-pill inline-flex items-center gap-2 bg-white/[0.06] py-1 pr-3.5 pl-1 text-sm"
                >
                  <SocialIcon platform={p.name} className="size-7 rounded-full" />
                  {p.name}
                </li>
              ))}
            </ul>
            <p className="text-ink-soft mt-4 text-sm">{c.platforms.languageNote}</p>
          </div>
        </div>
      </Section>

      {/* ───────────── Final call ───────────── */}
      <section className="pb-12">
        <Container>
          <div className="relative isolate overflow-hidden rounded-[32px] px-7 py-16 text-center ring-1 ring-white/10 md:py-20">
            <PosterWall />
            <BotMark className="mx-auto size-14 rounded-[16px] text-lg" />
            <h2 className="mx-auto mt-8 max-w-[16ch] text-[clamp(40px,6vw,80px)] leading-[0.95] font-medium tracking-[-0.055em] text-balance">
              {f.final.title}{' '}
              <span className="from-signal via-idea to-build bg-gradient-to-r bg-clip-text text-transparent">
                {f.final.rest}
              </span>
            </h2>
            <div className="mt-10 grid gap-3 sm:flex sm:flex-wrap sm:justify-center">
              <BuyButton
                href={buy ?? '/content-os#pricing'}
                label={fill(c.final.buy)}
                comingSoon={c.pricing.comingSoon}
              />
              <Link
                href="/content-os/guides"
                className={cn(
                  pressDark,
                  'rounded-pill inline-flex items-center gap-2 px-6 py-4 text-[17px] font-medium',
                )}
              >
                <Icon name="book" className="size-4" />
                {f.final.guides}
              </Link>
            </div>
          </div>
        </Container>
      </section>
    </ContentOsShell>
  );
}
