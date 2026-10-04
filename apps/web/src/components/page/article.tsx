import { type Accent, Button, Chip, Container, accentBg, cn } from '@shimanto/ui';
import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ReadingProgress } from '@/components/blog/reading-progress';
import { ShareLinks } from '@/components/blog/share-links';
import type { Block, Entry } from '@/content/catalog';
import { site } from '@/lib/site';
import authorPhoto from '../../../public/me/shimanto.png';
import { Breadcrumbs, type Crumb } from './breadcrumbs';
import { Toc } from './toc';

const WORDS_PER_MINUTE = 230;

/** Plain text of a body, for reading time and search. */
export function blocksToText(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'list':
          return b.items.join(' ');
        case 'code':
          return b.code;
        case 'callout':
          return `${b.title ?? ''} ${b.text}`;
        default:
          return b.text;
      }
    })
    .join(' ');
}

export function readingMinutes(blocks: Block[]): number {
  const words = blocksToText(blocks).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'long',
    day: iso.length > 7 ? 'numeric' : undefined,
    timeZone: 'UTC',
  }).format(new Date(iso));
}

const borderTone: Record<Accent, string> = {
  build: 'border-build',
  create: 'border-create',
  signal: 'border-signal',
  idea: 'border-idea',
  spark: 'border-spark',
};

const textTone: Record<Accent, string> = {
  build: 'text-build',
  create: 'text-create',
  signal: 'text-signal',
  idea: 'text-idea',
  spark: 'text-spark',
};

/**
 * Renders the block body in a 68ch reading column: a drop cap on the opening paragraph, numbered
 * section heads, pull-quotes and accented lists and callouts.
 */
export function ArticleBody({ blocks, tone = 'build' }: { blocks: Block[]; tone?: Accent }) {
  const firstParagraph = blocks.findIndex((b) => b.type === 'p');
  // Section numbers for the h2s, by block index: 01, 02…
  const sectionOf = new Map(
    blocks.flatMap((b, i) => (b.type === 'h2' ? [i] : [])).map((index, n) => [index, n + 1]),
  );
  return (
    <div className="max-w-[68ch] space-y-6 text-[19px] leading-[1.8]">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'h2':
            return (
              <h2
                key={i}
                id={block.id}
                className="border-ink/10 scroll-mt-28 border-t pt-10 text-2xl leading-tight font-medium tracking-[-0.03em] md:text-[32px]"
              >
                <span
                  aria-hidden="true"
                  className={cn('mb-3 block font-mono text-xs tracking-[0.14em]', textTone[tone])}
                >
                  {String(sectionOf.get(i)).padStart(2, '0')}
                </span>
                {block.text}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={i} id={block.id} className="scroll-mt-28 pt-2 text-xl font-medium">
                {block.text}
              </h3>
            );
          case 'list': {
            const ListTag = block.ordered ? 'ol' : 'ul';
            return (
              <ListTag key={i} className="space-y-3">
                {block.items.map((item, n) => (
                  <li key={item} className="relative pl-10">
                    {block.ordered ? (
                      <span
                        aria-hidden="true"
                        className="text-ink-soft absolute top-0 left-0 font-mono text-sm leading-[inherit]"
                      >
                        {String(n + 1).padStart(2, '0')}
                      </span>
                    ) : (
                      <span
                        aria-hidden="true"
                        className={cn(
                          'absolute top-[0.75em] left-1.5 size-2 rounded-full',
                          accentBg[tone],
                        )}
                      />
                    )}
                    {item}
                  </li>
                ))}
              </ListTag>
            );
          }
          case 'quote':
            return (
              <blockquote key={i} className="relative py-6 pl-14 md:pl-16">
                <span
                  aria-hidden="true"
                  className={cn(
                    'absolute top-0 left-0 font-serif text-[88px] leading-none',
                    textTone[tone],
                  )}
                >
                  “
                </span>
                <p className="text-[clamp(24px,2.6vw,30px)] leading-snug font-medium tracking-[-0.025em] text-balance">
                  {block.text}
                </p>
                {block.cite && (
                  <footer className="text-ink-soft mt-4 font-mono text-xs tracking-[0.14em] uppercase">
                    — {block.cite}
                  </footer>
                )}
              </blockquote>
            );
          case 'callout':
            return (
              <aside
                key={i}
                className={cn(
                  'bg-ink/[0.04] rounded-card border-l-4 px-6 py-5 text-[17px]',
                  borderTone[block.tone ?? tone],
                )}
              >
                {block.title && <p className="font-medium">{block.title}</p>}
                <p className={cn('text-ink-soft', block.title && 'mt-1')}>{block.text}</p>
              </aside>
            );
          case 'code':
            return (
              <pre
                key={i}
                className="bg-night text-cream rounded-card overflow-x-auto border border-white/10 p-6 font-mono text-sm leading-relaxed"
              >
                <code data-lang={block.lang}>{block.code}</code>
              </pre>
            );
          default:
            return (
              <p key={i} className={cn(i === firstParagraph && 'text-[21px]')}>
                {block.text}
              </p>
            );
        }
      })}
    </div>
  );
}

/** The author's photo, cropped to the face, in a circle on the accent colour. */
export function AuthorAvatar({ tone, size }: { tone: Accent; size: number }) {
  return (
    <span
      aria-hidden="true"
      style={{ width: size, height: size }}
      className={cn('relative shrink-0 overflow-hidden rounded-full', accentBg[tone])}
    >
      <Image
        src={authorPhoto}
        alt=""
        sizes={`${size * 4}px`}
        className="absolute top-[4%] left-1/2 w-[190%] max-w-none -translate-x-1/2"
      />
    </span>
  );
}

export function AuthorCard({ tone }: { tone: Accent }) {
  return (
    <aside className="bg-ink/[0.03] border-ink/10 rounded-sheet mt-12 flex flex-wrap items-start gap-5 border p-6 md:p-8">
      <AuthorAvatar tone={tone} size={64} />
      <div className="min-w-0 flex-1">
        <p className="text-ink-soft font-mono text-xs tracking-[0.14em] uppercase">Written by</p>
        <p className="mt-1 text-xl font-medium">{site.name}</p>
        <p className="text-ink-soft mt-2 max-w-[52ch]">
          {site.tagline} {site.description}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-5">
          <Button href="/collaborate" variant="secondary">
            Build with me
          </Button>
          <Button href="/about" variant="text">
            More about me
          </Button>
        </div>
      </div>
    </aside>
  );
}

export interface ArticleLayoutProps {
  entry: Entry;
  crumbs: Crumb[];
  eyebrow: string;
  /** Mono label after the eyebrow, e.g. an issue number. */
  kicker?: string;
  tone: Accent;
  /** Absolute URL for the share links. */
  url: string;
  /** Wide image under the header (a cover). */
  cover?: ReactNode;
  /** Chips next to the eyebrow: status, stage… */
  badges?: ReactNode;
  /** Extra content after the body (lesson, CTA). */
  after?: ReactNode;
  /** Section rendered at the bottom: related entries. */
  related?: ReactNode;
  prev?: { href: string; title: string };
  next?: { href: string; title: string };
  backHref: string;
  backLabel: string;
}

function NeighbourLink({
  href,
  title,
  label,
  align = 'left',
}: {
  href: string;
  title: string;
  label: string;
  align?: 'left' | 'right';
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group border-ink/10 hover:border-ink/25 rounded-card block border p-6 transition-colors',
        align === 'right' && 'md:text-right',
      )}
    >
      <span className="text-ink-soft font-mono text-xs tracking-[0.14em] uppercase">{label}</span>
      <span className="mt-3 block text-xl leading-snug font-medium tracking-[-0.02em] group-hover:underline">
        {title}
      </span>
    </Link>
  );
}

/**
 * Shared editorial reading layout for blog posts and experiments: a centred masthead (kicker,
 * headline, dek, byline), an optional wide cover, the body between a sticky contents rail and a
 * sticky share rail, then tags, the author card and prev/next cards.
 */
export function ArticleLayout({
  entry,
  crumbs,
  eyebrow,
  kicker,
  tone,
  url,
  cover,
  badges,
  after,
  related,
  prev,
  next,
  backHref,
  backLabel,
}: ArticleLayoutProps) {
  const headings = entry.body.flatMap((b) => (b.type === 'h2' ? [{ id: b.id, text: b.text }] : []));
  return (
    <article className="pb-24 md:pb-32">
      <ReadingProgress targetId="article-body" tone={tone} />
      <header className="pt-28 md:pt-36">
        <Container>
          <Breadcrumbs items={crumbs} align="center" />
          <div className="mx-auto mt-12 max-w-4xl text-center md:mt-16">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <p className="flex items-center gap-2.5 font-mono text-xs tracking-[0.14em] uppercase">
                <span aria-hidden="true" className={cn('size-2 rounded-full', accentBg[tone])} />
                {eyebrow}
                {kicker && (
                  <>
                    <span aria-hidden="true" className="text-ink-soft">
                      /
                    </span>
                    <span className="text-ink-soft">{kicker}</span>
                  </>
                )}
              </p>
              {badges}
            </div>
            <h1 className="mt-6 text-[clamp(38px,5.6vw,72px)] leading-[1.02] font-medium tracking-[-0.05em] text-balance">
              {entry.title}
            </h1>
            <p className="text-ink-soft mx-auto mt-6 max-w-[54ch] text-lg leading-relaxed text-balance md:text-[22px]">
              {entry.summary}
            </p>
            <div className="border-ink/10 mx-auto mt-10 flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-3 border-y py-4 text-sm">
              <span className="flex items-center gap-3">
                <AuthorAvatar tone={tone} size={36} />
                <span className="font-medium">{site.name}</span>
              </span>
              <time dateTime={entry.publishedAt} className="text-ink-soft">
                {formatDate(entry.publishedAt)}
              </time>
              <span className="text-ink-soft">{readingMinutes(entry.body)} min read</span>
              {entry.updatedAt && (
                <span className="text-ink-soft">
                  Updated <time dateTime={entry.updatedAt}>{formatDate(entry.updatedAt)}</time>
                </span>
              )}
            </div>
          </div>
          {cover && <div className="mt-12 md:mt-16">{cover}</div>}
        </Container>
      </header>

      <Container className="mt-14 md:mt-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,68ch)_minmax(0,1fr)] lg:gap-14">
          <aside className="hidden lg:block">
            {headings.length > 1 && (
              <div className="sticky top-28">
                <Toc headings={headings} />
              </div>
            )}
          </aside>
          <div id="article-body" className="min-w-0">
            <ArticleBody blocks={entry.body} tone={tone} />
            {after && <div className="mt-12 max-w-[68ch]">{after}</div>}
            {entry.tags && entry.tags.length > 0 && (
              <div className="border-ink/10 mt-14 flex flex-wrap items-center gap-3 border-t pt-8">
                <span className="text-ink-soft font-mono text-xs tracking-[0.14em] uppercase">
                  Filed under
                </span>
                <ul aria-label="Tags" className="flex flex-wrap gap-2">
                  {entry.tags.map((tag) => (
                    <li key={tag}>
                      <Chip>#{tag}</Chip>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-10 lg:hidden">
              <ShareLinks url={url} title={entry.title} />
            </div>
            <AuthorCard tone={tone} />
          </div>
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <ShareLinks url={url} title={entry.title} />
            </div>
          </aside>
        </div>

        {(prev || next) && (
          <nav aria-label="More entries" className="mt-20 grid gap-4 md:grid-cols-2">
            {prev ? (
              <NeighbourLink href={prev.href} title={prev.title} label="← Older" />
            ) : (
              <span className="hidden md:block" />
            )}
            {next && (
              <NeighbourLink href={next.href} title={next.title} label="Newer →" align="right" />
            )}
          </nav>
        )}

        {related}

        <div className="mt-16">
          <Button href={backHref} variant="text">
            ← {backLabel}
          </Button>
        </div>
      </Container>
    </article>
  );
}

/** Simple list for index pages (experiments). */
export function EntryList({
  entries,
  basePath,
  label,
}: {
  entries: Array<Entry & { badge?: ReactNode }>;
  basePath: string;
  label: string;
}) {
  return (
    <ul aria-label={label} className="border-ink/10 border-b">
      {entries.map((entry) => (
        <li key={entry.slug}>
          <Link
            href={`${basePath}/${entry.slug}`}
            data-cursor="Read"
            className="group border-ink/10 flex flex-col gap-2 border-t py-6 md:flex-row md:items-baseline md:justify-between md:gap-8"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-ink-soft text-sm">{entry.category}</span>
                {entry.badge}
              </div>
              <h3 className="mt-1 text-xl leading-snug font-medium tracking-[-0.02em] group-hover:underline md:text-2xl">
                {entry.title}
              </h3>
              <p className="text-ink-soft mt-1 line-clamp-2">{entry.summary}</p>
            </div>
            <p className="text-ink-soft shrink-0 text-sm">
              <time dateTime={entry.publishedAt}>{formatDate(entry.publishedAt)}</time> ·{' '}
              {readingMinutes(entry.body)} min
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
