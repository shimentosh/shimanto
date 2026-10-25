/* eslint-disable @next/next/no-img-element -- pre-sized posters and renders from Content OS */
import { Icon, type IconName, accentBg, cn } from '@shimanto/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { CONTENT_OS_FALLBACK, CONTENT_OS_SLUG } from '@/content/content-os';
import { type GraphicDemo, formatDemos } from '@/content/content-os/demos';
import { type StoreProduct, formatPrice } from '@/lib/store';
import { pressBlue } from './press';

/** Shared pieces of the Content OS pages (landing, features, guides). */

/** Price and whether it can be bought yet; until it's published in the admin, nothing is sold. */
export function offer(product: StoreProduct | undefined) {
  const amount = product?.amount ?? CONTENT_OS_FALLBACK.amount;
  const currency = product?.amount !== undefined ? product.currency : CONTENT_OS_FALLBACK.currency;
  const purchasable = product?.status === 'available';
  return {
    amount,
    currency,
    price: formatPrice(amount, currency),
    purchasable,
    buy: purchasable ? `/checkout?items=${CONTENT_OS_SLUG}` : null,
  };
}

/** Soft card tint per accent. */
export const tint = {
  build: 'bg-build/15',
  create: 'bg-create/15',
  spark: 'bg-spark/15',
  signal: 'bg-signal/15',
  idea: 'bg-idea/20',
} as const;

/** Gradient for a headline's second line, per accent. */
export const gradient = {
  build: 'from-build via-spark to-signal',
  create: 'from-create via-spark to-idea',
  spark: 'from-spark via-build to-signal',
  signal: 'from-signal via-idea to-build',
  idea: 'from-idea via-signal to-build',
} as const;
export const toneText = {
  build: 'text-build',
  create: 'text-create',
  spark: 'text-spark',
  signal: 'text-signal',
  idea: 'text-idea',
} as const;

/**
 * Section headline: an icon eyebrow pill, a bright first line, a gradient second line and one
 * short line of intro.
 */
export function Headline({
  id,
  eyebrow,
  icon,
  tone = 'signal',
  title,
  rest,
  intro,
  className,
}: {
  id: string;
  eyebrow: string;
  icon: IconName;
  tone?: keyof typeof tint;
  title: string;
  rest?: string;
  intro?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="rounded-pill inline-flex items-center gap-2 bg-white/[0.05] py-1 pr-3.5 pl-1 text-[13px] font-medium text-[#F3EFE4] ring-1 ring-white/10">
        <span
          aria-hidden="true"
          className={cn('grid size-6 place-items-center rounded-full', tint[tone], toneText[tone])}
        >
          <Icon name={icon} className="size-3.5" />
        </span>
        {eyebrow}
      </p>
      <h2
        id={id}
        className="mt-5 text-[clamp(38px,5.2vw,76px)] leading-[0.95] font-medium tracking-[-0.055em] text-balance"
      >
        <span className="block">{title}</span>
        {rest && (
          <span
            className={cn(
              'block bg-gradient-to-r bg-clip-text pb-[0.08em] text-transparent',
              gradient[tone],
            )}
          >
            {rest}
          </span>
        )}
      </h2>
      {intro && (
        <p className="text-ink-soft mt-5 max-w-[42ch] text-lg leading-snug md:text-xl">{intro}</p>
      )}
    </div>
  );
}

export function IconTile({
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

export function Terminal({ children, className }: { children: ReactNode; className?: string }) {
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
export function PointItem({
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
export const PLATFORMS = ['Instagram', 'LinkedIn', 'Facebook', 'TikTok', 'YouTube', 'Threads', 'X'];
export const platformOf = (label: string) => PLATFORMS.find((p) => label.startsWith(`${p} `));

/** The Content OS logo (mark + name), cropped and compressed for the web. */
export function Wordmark({ className }: { className?: string }) {
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
export function BuyButton({
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
    <Link href={href} className={cn(base, 'group', pressBlue)}>
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
export function PosterWall() {
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

export function PostCard({ post, readMore }: { post: GraphicDemo; readMore: string }) {
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
