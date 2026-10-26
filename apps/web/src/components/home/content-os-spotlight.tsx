/* eslint-disable @next/next/no-img-element -- pre-sized renders from Content OS */
import { Container, Icon, type IconName, cn } from '@shimanto/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AutoVideo } from '@/components/content-os/media';
import { pressBlue, pressDark } from '@/components/content-os/press';
import {
  carouselDemos,
  formatDemos,
  graphicDemos,
  videoDemoCount,
} from '@/content/content-os/demos';

const formats: Array<{ icon: IconName; label: string }> = [
  { icon: 'grid', label: 'Carousel' },
  { icon: 'video', label: 'Reel' },
  { icon: 'pen', label: 'Text post' },
  { icon: 'play', label: 'YouTube' },
];

/** A glass label on an output card. */
function Label({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-pill absolute bottom-2 left-2 z-10 bg-black/55 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-[#F3EFE4] ring-1 ring-white/15 backdrop-blur md:bottom-3 md:left-3 md:text-xs">
      {children}
    </span>
  );
}

/**
 * The homepage's pointer to Content OS: what it is beside a "prompt → outputs" stage of real work
 * (a carousel, a reel, a post) and a way in. No price here: `/content-os` sends Bangladesh to the
 * Bangla page and its own offer, everyone else to English.
 */
export function ContentOsSpotlight() {
  const carousel = carouselDemos.find((d) => d.id.includes('small-team')) ?? carouselDemos[0]!;
  const reel =
    formatDemos.find((d) => d.id === 'mx-product-hero') ??
    formatDemos.find((d) => d.aspect === '9:16')!;
  const post = graphicDemos.find((d) => d.id.includes('weak-first-line')) ?? graphicDemos[0]!;
  const stats = [
    { value: `${videoDemoCount}+`, label: 'video demos' },
    { value: String(carouselDemos.length), label: 'carousels' },
    { value: String(graphicDemos.length), label: 'posts' },
  ];

  return (
    <section aria-labelledby="content-os-title" className="pt-10 pb-16 md:pt-16 md:pb-24">
      <Container>
        <div className="relative isolate overflow-hidden rounded-[28px] bg-[#0E0F0C] p-6 text-[#F3EFE4] shadow-[0_50px_120px_-50px_rgba(14,15,12,0.8)] ring-1 ring-white/10 sm:p-8 md:rounded-[36px] md:p-12 lg:p-14">
          {/* Light behind the work, and a faint dot grid that fades out toward the edges */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
            <div className="bg-signal/25 absolute top-1/2 right-[-12%] size-[75%] -translate-y-1/2 rounded-full blur-[120px]" />
            <div className="bg-idea/15 absolute bottom-[-30%] left-[-10%] size-[45%] rounded-full blur-[110px]" />
            <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.09)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_at_72%_50%,black,transparent_65%)] [background-size:22px_22px]" />
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-10">
            <div className="min-w-0">
              <p className="rounded-pill inline-flex items-center gap-2 bg-white/[0.07] py-1 pr-3.5 pl-1 text-sm ring-1 ring-white/15">
                <img
                  src="/content-os/mark.webp"
                  alt=""
                  width={128}
                  height={128}
                  className="size-6 rounded-full"
                />
                New · Content OS
              </p>
              <h2
                id="content-os-title"
                className="font-display mt-6 text-[clamp(40px,5.4vw,76px)] leading-[0.96] font-semibold tracking-[-0.04em] text-balance"
              >
                <span className="block">Tell it what to post.</span>
                <span className="font-accent from-signal via-idea to-build block bg-gradient-to-r bg-clip-text pb-[0.1em] tracking-[-0.015em] text-transparent">
                  It makes it.
                </span>
              </h2>
              <p className="mt-5 max-w-[40ch] text-lg leading-snug text-[#B9B4A7]">
                The content bot I built for my own pages. Carousels, posts, reels and YouTube
                videos, in your brand.
              </p>
              <ul aria-label="What it makes" className="mt-6 flex flex-wrap gap-2">
                {formats.map((f) => (
                  <li
                    key={f.label}
                    className="rounded-pill inline-flex items-center gap-1.5 bg-white/[0.05] px-3 py-1.5 text-sm ring-1 ring-white/10"
                  >
                    <Icon name={f.icon} className="text-signal size-3.5" />
                    {f.label}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/content-os"
                  className={cn(
                    pressBlue,
                    'rounded-pill group inline-flex items-center gap-2 px-6 py-3.5 font-medium',
                  )}
                >
                  See Content OS
                  <span
                    aria-hidden="true"
                    className="transition-transform group-hover:translate-x-0.5"
                  >
                    →
                  </span>
                </Link>
                <Link
                  href="/content-os/features"
                  className={cn(
                    pressDark,
                    'rounded-pill inline-flex items-center gap-2 px-6 py-3.5 font-medium text-[#F3EFE4]',
                  )}
                >
                  <Icon name="grid" className="size-4" />
                  Tour the Studio
                </Link>
              </div>
              <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 border-t border-white/10 pt-6">
                {stats.map((s) => (
                  <div key={s.label} className="flex flex-col-reverse">
                    <dt className="text-sm text-[#B9B4A7]">{s.label}</dt>
                    <dd className="text-3xl font-medium tracking-[-0.04em] tabular-nums md:text-4xl">
                      {s.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* The stage: one ask, three real outputs */}
            <div aria-hidden="true" className="min-w-0">
              <div className="mx-auto flex max-w-md items-center gap-3 rounded-[18px] bg-white/[0.06] p-2 pl-2.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/15 backdrop-blur-xl">
                <img
                  src="/content-os/mark.webp"
                  alt=""
                  width={128}
                  height={128}
                  className="size-8 rounded-[10px]"
                />
                <span className="min-w-0 flex-1 truncate text-[15px]">
                  Write this week&apos;s posts
                  <span className="bg-signal ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 motion-safe:animate-pulse" />
                </span>
                <span className="bg-signal grid size-8 shrink-0 place-items-center rounded-full text-[#06121f]">
                  <Icon name="send" className="size-4" />
                </span>
              </div>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-sm text-[#B9B4A7]">
                <Icon name="check" className="text-build size-4" />3 ready, in your brand
              </p>
              {/* A dashed line from the ask down to the work */}
              <div className="mx-auto h-8 w-px border-l border-dashed border-white/25 md:h-10" />

              <div className="flex items-end justify-center">
                <div className="art-float relative z-0 -mr-5 w-[33%] rotate-[-7deg] md:-mr-7">
                  <div className="relative aspect-[4/5]">
                    {carousel.slides
                      .slice(0, 3)
                      .reverse()
                      .map((slide, i, all) => (
                        <img
                          key={slide.src}
                          src={slide.src}
                          alt=""
                          loading="lazy"
                          className="absolute inset-0 size-full rounded-[12px] object-cover shadow-xl ring-1 ring-white/15"
                          style={{
                            transform: `translate(${(all.length - 1 - i) * -7}px, ${(all.length - 1 - i) * -5}px) rotate(${(all.length - 1 - i) * -4}deg)`,
                            zIndex: i,
                          }}
                        />
                      ))}
                    <Label>Carousel · {carousel.slides.length} slides</Label>
                  </div>
                </div>
                <div
                  className="art-float art-float-slow relative z-10 w-[38%] -translate-y-4"
                  style={{ animationDelay: '-1.2s' }}
                >
                  <div className="relative aspect-[9/16] overflow-hidden rounded-[16px] bg-black shadow-[0_40px_80px_-30px_rgba(46,155,247,0.55)] ring-1 ring-white/20">
                    <AutoVideo src={reel.video} poster={reel.poster} />
                    <Label>Reel · 9:16</Label>
                  </div>
                </div>
                <div
                  className="art-float relative z-0 -ml-5 w-[33%] rotate-[7deg] md:-ml-7"
                  style={{ animationDelay: '-2.6s' }}
                >
                  <div className="relative">
                    <img
                      src={post.image}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/5] w-full rounded-[12px] object-cover shadow-xl ring-1 ring-white/15"
                    />
                    <Label>Post · 4:5</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
