import { type Accent, Chip, accentBg, cn } from '@shimanto/ui';
import Image from 'next/image';
import Link from 'next/link';
import { type Venture, toneFor, ventureStatusLabel, ventureStatusTone } from '@/content/catalog';

/** The venture's logo as a rounded square, or a coloured monogram when there's no logo yet. */
export function VentureLogo({
  venture,
  tone,
  size,
  className,
}: {
  venture: Venture;
  tone: Accent;
  /** Rendered size in px. */
  size: number;
  className?: string;
}) {
  if (venture.logo) {
    return (
      <Image
        src={venture.logo}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={cn('ring-ink/10 shrink-0 rounded-[28%] ring-1', className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cn(
        'text-on-world grid shrink-0 place-items-center rounded-full font-semibold',
        accentBg[tone],
        className,
      )}
    >
      {venture.name.slice(0, 1)}
    </span>
  );
}

/** One venture as a list row: logo, name (+ one-liner), status and an arrow. */
export function VentureRow({ venture, index }: { venture: Venture; index: number }) {
  return (
    <Link
      href={`/work/${venture.slug}`}
      data-cursor="View"
      className="group border-ink/10 grid grid-cols-[auto_1fr_auto] items-center gap-4 border-t py-5 md:grid-cols-[auto_1fr_10rem_auto] md:gap-6"
    >
      <VentureLogo
        venture={venture}
        tone={toneFor(index)}
        size={44}
        className="text-sm transition-transform duration-300 group-hover:scale-105"
      />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xl font-medium tracking-[-0.02em] md:text-2xl">{venture.name}</span>
          {venture.role && <Chip>{venture.role}</Chip>}
        </span>
        {venture.oneLiner && (
          <span className="text-ink-soft block truncate">{venture.oneLiner}</span>
        )}
        {venture.productSlug && (
          <span className="text-ink-soft block text-sm">Also in the store</span>
        )}
      </span>
      <span className="hidden md:block">
        <Chip variant="status" tone={ventureStatusTone[venture.status]}>
          {ventureStatusLabel[venture.status]}
        </Chip>
      </span>
      <span
        aria-hidden="true"
        className="text-ink-soft group-hover:text-ink text-xl transition-transform group-hover:translate-x-1"
      >
        →
      </span>
    </Link>
  );
}

/** Closes a venture list: the ones shown are the ones that made it. */
export function MoreBuildsNote() {
  return (
    <p className="text-ink-soft mt-8 flex items-start gap-3 text-lg">
      <span aria-hidden="true" className="bg-spark mt-2.5 size-2 shrink-0 rounded-full" />
      <span>
        These are the ones that made it. I&apos;ve built a lot more, and plenty of them failed.{' '}
        <span className="text-ink font-medium">Still building.</span>
      </span>
    </p>
  );
}

/**
 * One venture as a showcase card: logo and status, name and one-liner, category and years, the
 * first few highlights from its case study, and the domain. The whole card links to the venture.
 */
export function VentureCard({ venture, index }: { venture: Venture; index: number }) {
  const tone = toneFor(index);
  const highlights = venture.caseStudy?.highlights.slice(0, 3) ?? [];
  const meta = [venture.category, venture.years].filter(Boolean).join(' · ');
  return (
    <Link
      href={`/work/${venture.slug}`}
      data-cursor="View"
      className="group border-ink/10 bg-paper hover:border-ink/25 rounded-sheet relative flex h-full flex-col overflow-hidden border p-6 transition-[transform,border-color] duration-300 motion-safe:hover:-translate-y-1 md:p-8"
    >
      <span
        aria-hidden="true"
        className={cn(
          'absolute -top-16 -right-16 size-48 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-25',
          accentBg[tone],
        )}
      />
      <span className="relative flex items-start justify-between gap-4">
        <VentureLogo
          venture={venture}
          tone={tone}
          size={56}
          className="text-lg transition-transform duration-300 group-hover:-rotate-6"
        />
        <Chip variant="status" tone={ventureStatusTone[venture.status]}>
          {ventureStatusLabel[venture.status]}
        </Chip>
      </span>
      <span className="relative mt-8 block">
        <span className="block text-3xl font-medium tracking-[-0.04em]">{venture.name}</span>
        {meta && <span className="text-ink-soft mt-1 block text-sm">{meta}</span>}
        {venture.oneLiner && (
          <span className="text-ink-soft mt-4 block text-lg leading-relaxed">
            {venture.oneLiner}
          </span>
        )}
      </span>
      {highlights.length > 0 && (
        <span className="relative mt-6 flex flex-wrap gap-2">
          {highlights.map((h) => (
            <span
              key={h.title}
              className="border-ink/10 rounded-pill inline-flex items-center gap-1.5 border px-3 py-1 text-sm"
            >
              <span aria-hidden="true" className={cn('size-1.5 rounded-full', accentBg[tone])} />
              {h.title}
            </span>
          ))}
        </span>
      )}
      <span className="border-ink/10 relative mt-auto flex items-center justify-between gap-4 border-t pt-5 text-sm">
        <span className="text-ink-soft font-mono">{venture.links?.[0]?.label}</span>
        <span className="inline-flex items-center gap-2 font-medium">
          Case study
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </span>
      </span>
    </Link>
  );
}
