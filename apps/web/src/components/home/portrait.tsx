import { Icon, Tilt } from '@shimanto/ui';
import Image from 'next/image';
import { home } from '@/content/home';
import { site } from '@/lib/site';
import photo from '../../../public/me/shimanto.png';

/** A four-point sparkle, filled with a world colour. */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M12 1c.6 5.2 2.8 7.4 11 11-8.2 3.6-10.4 5.8-11 11-.6-5.2-2.8-7.4-11-11 8.2-3.6 10.4-5.8 11-11Z" />
    </svg>
  );
}

/** "Online since 2012": where the journey started. */
export function OnlineSinceChip() {
  return (
    <div className="bg-paper/60 flex items-center gap-3 rounded-2xl p-2.5 pr-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_24px_40px_-22px_rgb(0_0_0/0.65)] ring-1 ring-white/15 backdrop-blur-xl">
      <span className="relative grid size-11 shrink-0 place-items-center">
        <span aria-hidden="true" className="bg-signal/60 absolute inset-0 rounded-xl blur-md" />
        <span className="bg-signal on-world relative grid size-11 place-items-center rounded-xl">
          <Icon name="globe" className="size-5" />
          {/* A slow orbit around the globe. */}
          <span
            aria-hidden="true"
            className="motif-spin absolute inset-1 rounded-full border border-dashed border-current opacity-45"
          />
        </span>
      </span>
      <span className="leading-tight">
        <span className="block text-lg font-semibold tracking-tight">
          Online since {home.hero.journey.since}
        </span>
        <span className="text-ink-soft block text-xs">
          Started at {home.hero.journey.startedAtAge} years old
        </span>
      </span>
    </div>
  );
}

/** What's being built right now, with a work-in-progress shimmer. */
export function NowBuildingChip() {
  return (
    <div className="bg-night/70 text-cream flex items-center gap-3 rounded-2xl p-2.5 pr-4 shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_24px_40px_-22px_rgb(0_0_0/0.7)] ring-1 ring-white/15 backdrop-blur-xl">
      <span className="relative grid size-10 shrink-0 place-items-center">
        <span aria-hidden="true" className="bg-build/60 absolute inset-0 rounded-xl blur-md" />
        <span className="bg-build on-world relative grid size-10 place-items-center rounded-xl">
          <Icon name="rocket" className="size-[18px]" />
        </span>
      </span>
      <span className="min-w-[7.5rem] leading-tight">
        <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-white/60 uppercase">
          <span aria-hidden="true" className="relative grid size-1.5 place-items-center">
            <span className="motif-ping bg-build absolute inset-0 rounded-full" />
            <span className="bg-build relative size-1.5 rounded-full" />
          </span>
          Now building
        </span>
        <span className="mt-0.5 block text-sm font-medium">{home.now.building[1]?.label}</span>
        {/* Work in progress: a light sweeping along a track. */}
        <span
          aria-hidden="true"
          className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/10"
        >
          <span className="motif-shimmer via-build block h-full w-1/2 rounded-full bg-linear-to-r from-transparent to-transparent" />
        </span>
      </span>
    </div>
  );
}

/**
 * Home hero portrait: the cutout (graded punchy: more contrast and saturation) stands in a
 * build-green arch and breaks out of its top edge.
 * Orbit rings behind, floating chips with on-record facts, sparkles and a hand-drawn "that's me".
 * The whole composition tilts toward the cursor on desktop; floats stop under reduced motion.
 */
/** The arch behind the cutout: frosted glass over a green/blue glow, or the original solid green. */
const ARCH: 'glass' | 'solid' = 'glass';

export function HeroPortrait() {
  return (
    <Tilt max={5} className="relative mx-auto aspect-[4/5] w-full max-w-[460px]">
      {/* Orbit rings, centred on the head */}
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        data-hero-orbit
        className="text-ink/15 absolute inset-x-0 top-[6%] w-full"
      >
        <circle cx="50" cy="38" r="30" fill="none" stroke="currentColor" strokeWidth=".3" />
        <circle
          cx="50"
          cy="38"
          r="44"
          fill="none"
          stroke="currentColor"
          strokeWidth=".3"
          strokeDasharray="1 1.6"
        />
        <circle cx="80" cy="38" r="1.2" className="fill-build" />
        <circle cx="13" cy="62" r="1" className="fill-create" />
      </svg>

      {/* Arch + cutout. The clip keeps the sides and bottom inside the arch, but not the top. */}
      <div className="absolute inset-x-[8%] bottom-0 h-[62%]">
        {ARCH === 'glass' ? (
          <>
            {/* Colour for the glass to blur: build green low left, signal blue high right. */}
            <div aria-hidden="true" className="absolute -inset-[12%] -z-10">
              <div className="bg-build absolute bottom-[4%] -left-[4%] size-[62%] rounded-full opacity-70 blur-3xl" />
              <div className="bg-signal absolute top-[2%] -right-[6%] size-[52%] rounded-full opacity-55 blur-3xl" />
            </div>
            {/* Frosted arch: blur, a green-to-blue tint and a bright top edge. */}
            <div className="absolute inset-0 overflow-hidden rounded-t-full rounded-b-[28px] border border-white/25 bg-white/[0.06] shadow-[inset_0_1px_0_rgb(255_255_255/0.45),0_30px_60px_-30px_rgb(0_0_0/0.6)] backdrop-blur-2xl">
              <div className="from-build/45 via-build/15 to-signal/30 absolute inset-0 bg-linear-to-b" />
              <div className="absolute inset-x-0 top-0 h-1/3 bg-linear-to-b from-white/20 to-transparent" />
            </div>
            {/* Inner arch and a soft light behind the shoulders, so the cutout's edges stay crisp. */}
            <div
              className="absolute inset-x-[14%] top-[10%] bottom-0 rounded-t-full bg-white/[0.07] ring-1 ring-white/10"
              aria-hidden="true"
            />
            <div
              className="bg-build/50 absolute inset-x-[18%] top-[22%] bottom-[10%] rounded-full blur-3xl"
              aria-hidden="true"
            />
          </>
        ) : (
          <>
            <div className="bg-build absolute inset-0 rounded-t-full rounded-b-[28px]" />
            <div
              className="bg-on-world/10 absolute inset-x-[14%] top-[10%] bottom-0 rounded-t-full"
              aria-hidden="true"
            />
          </>
        )}
        <div
          className="absolute inset-0"
          style={{ clipPath: 'inset(-100% 0 0 0 round 0 0 28px 28px)' }}
        >
          <Image
            src={photo}
            alt={`${site.name}, smiling with arms crossed`}
            priority
            sizes="(min-width: 1024px) 420px, 80vw"
            className="absolute bottom-0 left-1/2 w-[108%] max-w-none -translate-x-1/2 brightness-[1.03] contrast-[1.18] saturate-[1.45]"
          />
        </div>
      </div>

      {/* Where it started. On phones there's no room beside the arch, so it sits above the head. */}
      <div className="art-float absolute top-[2%] left-0 sm:top-[30%] sm:-left-[10%]">
        <OnlineSinceChip />
      </div>

      {/* Now building */}
      <div
        className="art-float absolute right-0 bottom-[14%] sm:-right-[8%]"
        style={{ animationDelay: '-2.5s' }}
      >
        <NowBuildingChip />
      </div>

      {/* Hand-drawn note */}
      <div
        className="absolute top-[9%] right-[12%] hidden rotate-[8deg] sm:block"
        aria-hidden="true"
      >
        <span className="text-ink-soft font-mono text-xs tracking-wide">that&apos;s me</span>
        <svg viewBox="0 0 60 50" className="text-ink-soft mt-1 -ml-6 h-12 w-14" fill="none">
          <path
            d="M50 4C40 8 22 10 18 26c-2 7 2 12 6 14"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="m18 35 6 5-7 3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <Sparkle className="art-float fill-spark absolute top-[18%] left-[10%] size-6" />
      <Sparkle className="art-float art-float-slow fill-idea absolute top-[44%] right-[4%] size-4" />
      <Sparkle className="art-float fill-signal absolute bottom-[4%] -left-[2%] size-3.5" />
    </Tilt>
  );
}
