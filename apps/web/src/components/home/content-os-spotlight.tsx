/* eslint-disable @next/next/no-img-element -- pre-sized renders from Content OS */
import { Container, Icon, cn } from '@shimanto/ui';
import Link from 'next/link';
import { AutoVideo } from '@/components/content-os/media';
import { pressBlue, pressDark } from '@/components/content-os/press';
import { carouselDemos, formatDemos, graphicDemos } from '@/content/content-os/demos';

/**
 * The homepage's pointer to Content OS: a dark card with what it is, three real outputs (a
 * carousel, a reel, a post) and a way in. No price here: `/content-os` sends Bangladesh to the
 * Bangla page and its own offer, everyone else to English.
 */
export function ContentOsSpotlight() {
  const carousel = carouselDemos.find((d) => d.id.includes('small-team')) ?? carouselDemos[0]!;
  const reel =
    formatDemos.find((d) => d.id === 'mx-product-hero') ??
    formatDemos.find((d) => d.aspect === '9:16')!;
  const post = graphicDemos.find((d) => d.id.includes('weak-first-line')) ?? graphicDemos[0]!;

  return (
    <section aria-labelledby="content-os-title" className="pb-16 md:pb-24">
      <Container>
        <div className="relative isolate overflow-hidden rounded-[28px] bg-[#0E0F0C] p-6 text-[#F3EFE4] shadow-[0_50px_120px_-50px_rgba(14,15,12,0.8)] md:rounded-[36px] md:p-12">
          {/* A blue glow behind the work */}
          <div
            aria-hidden="true"
            className="absolute -top-1/3 right-[-10%] -z-10 size-[70%] rounded-full bg-[radial-gradient(circle,rgba(46,155,247,0.35),transparent_65%)]"
          />
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
            <div>
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
                className="mt-6 text-[clamp(38px,5vw,68px)] leading-[0.95] font-medium tracking-[-0.055em] text-balance"
              >
                <span className="block">Tell it what to post.</span>
                <span className="from-signal via-idea to-build block bg-gradient-to-r bg-clip-text pb-[0.06em] text-transparent">
                  It makes it.
                </span>
              </h2>
              <p className="mt-5 max-w-[40ch] text-lg leading-snug text-[#B9B4A7]">
                The content bot I built for my own pages. Carousels, posts, reels and YouTube
                videos, in your brand.
              </p>
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
            </div>

            {/* Three real outputs */}
            <div aria-hidden="true" className="grid grid-cols-3 items-end gap-3 md:gap-4">
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
                        transform: `translateX(${(all.length - 1 - i) * 8}px) rotate(${(all.length - 1 - i) * -5}deg)`,
                        zIndex: i,
                      }}
                    />
                  ))}
              </div>
              <div className="relative aspect-[9/16] overflow-hidden rounded-[14px] bg-black shadow-2xl ring-1 ring-white/15">
                <AutoVideo src={reel.video} poster={reel.poster} />
              </div>
              <img
                src={post.image}
                alt=""
                loading="lazy"
                className="aspect-[4/5] w-full rounded-[12px] object-cover shadow-xl ring-1 ring-white/15"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
