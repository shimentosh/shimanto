import { Icon, accentBg, cn } from '@shimanto/ui';
import Link from 'next/link';
import { formatDate, readingMinutes } from '@/components/page/article';
import type { Entry } from '@/content/catalog';
import { iconFor, issueNumber, worldFor } from '@/lib/blog';
import { PostCover } from './post-cover';

export const postHref = (post: Entry) => `/blog/${post.slug}`;

function Meta({ post, className }: { post: Entry; className?: string }) {
  return (
    <p className={cn('text-ink-soft flex flex-wrap items-center gap-x-2 text-sm', className)}>
      <span>{post.category}</span>
      <span aria-hidden="true">·</span>
      <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
      <span aria-hidden="true">·</span>
      <span>{readingMinutes(post.body)} min read</span>
    </p>
  );
}

/** Mono kicker: issue number and category, with the category's colour dot. */
export function Kicker({ post, extra }: { post: Entry; extra?: string }) {
  return (
    <p className="text-ink-soft flex flex-wrap items-center gap-x-2.5 font-mono text-xs tracking-[0.14em] uppercase">
      <span aria-hidden="true" className={cn('size-2 rounded-full', accentBg[worldFor(post)])} />
      <span>Nº {issueNumber(post.slug)}</span>
      <span aria-hidden="true">/</span>
      <span>{post.category}</span>
      {extra && (
        <>
          <span aria-hidden="true">/</span>
          <span className="text-ink">{extra}</span>
        </>
      )}
    </p>
  );
}

export interface PostCardProps {
  post: Entry;
  headingLevel?: 'h2' | 'h3';
}

/** Blog card (home page, related grids): cover on top, then meta, title and summary. */
export function PostCard({ post, headingLevel: Heading = 'h3' }: PostCardProps) {
  return (
    <Link href={postHref(post)} data-cursor="Read" className="group flex h-full flex-col">
      <div className="rounded-card overflow-hidden">
        <PostCover
          post={post}
          className="aspect-16/10 transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <Meta post={post} className="mt-4" />
      <Heading className="mt-2 text-xl leading-snug font-medium tracking-[-0.02em] text-balance group-hover:underline">
        {post.title}
      </Heading>
      <p className="text-ink-soft mt-2 line-clamp-2">{post.summary}</p>
    </Link>
  );
}

/** The lead story on /blog: a big headline and dek beside a tall cover. */
export function PostLead({ post }: { post: Entry }) {
  return (
    <Link
      href={postHref(post)}
      data-cursor="Read"
      className="group border-ink/10 hover:border-ink/25 rounded-sheet bg-ink/[0.02] grid items-center gap-8 border p-5 transition-colors md:grid-cols-[1fr_300px] md:gap-12 md:p-10"
    >
      <div className="order-2 md:order-1">
        <Kicker post={post} extra={post.featured ? 'Featured' : 'Latest'} />
        <h2 className="mt-5 text-[clamp(32px,3.8vw,54px)] leading-[1.04] font-medium tracking-[-0.045em] text-balance">
          <span className="decoration-2 underline-offset-[6px] group-hover:underline">
            {post.title}
          </span>
        </h2>
        <p className="text-ink-soft mt-5 max-w-[52ch] text-lg leading-relaxed md:text-xl">
          {post.summary}
        </p>
        <p className="mt-7 inline-flex items-center gap-3 text-sm font-medium">
          Read the note
          <span
            aria-hidden="true"
            className="transition-transform duration-300 group-hover:translate-x-1"
          >
            →
          </span>
          <span className="text-ink-soft font-normal">
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time> ·{' '}
            {readingMinutes(post.body)} min read
          </span>
        </p>
      </div>
      <div className="rounded-card order-1 overflow-hidden md:order-2">
        <PostCover
          post={post}
          className="aspect-16/10 transition-transform duration-500 group-hover:scale-[1.03] md:aspect-square"
        />
      </div>
    </Link>
  );
}

/**
 * Editorial list row: issue and date in the margin, a big title and dek, and a small category
 * tile that tilts on hover.
 */
export function PostListItem({
  post,
  headingLevel: Heading = 'h3',
}: {
  post: Entry;
  headingLevel?: 'h2' | 'h3';
}) {
  const world = worldFor(post);
  return (
    <Link
      href={postHref(post)}
      data-cursor="Read"
      className="group border-ink/10 grid grid-cols-[1fr_auto] gap-x-5 gap-y-2 border-t py-8 md:grid-cols-[8rem_1fr_8rem] md:gap-x-10"
    >
      <div className="hidden md:block">
        <p className="font-mono text-sm">Nº {issueNumber(post.slug)}</p>
        <p className="text-ink-soft mt-1 text-sm">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        </p>
      </div>
      <div className="min-w-0">
        <p className="text-ink-soft flex items-center gap-2 text-sm">
          <span aria-hidden="true" className={cn('size-2 rounded-full', accentBg[world])} />
          {post.category}
          <span aria-hidden="true">·</span>
          <span>{readingMinutes(post.body)} min read</span>
          <span aria-hidden="true" className="md:hidden">
            ·
          </span>
          <time dateTime={post.publishedAt} className="md:hidden">
            {formatDate(post.publishedAt)}
          </time>
        </p>
        <Heading className="mt-2 text-2xl leading-[1.15] font-medium tracking-[-0.03em] text-balance md:text-[30px]">
          <span className="decoration-2 underline-offset-[5px] group-hover:underline">
            {post.title}
          </span>
        </Heading>
        <p className="text-ink-soft mt-3 line-clamp-2 max-w-[62ch] leading-relaxed">
          {post.summary}
        </p>
      </div>
      <div className="flex items-start justify-end">
        <span
          aria-hidden="true"
          className={cn(
            'on-world grid size-16 place-items-center rounded-2xl transition-transform duration-300 group-hover:-rotate-6 md:size-28',
            accentBg[world],
          )}
        >
          <Icon name={iconFor(post)} strokeWidth={1.4} className="size-7 md:size-11" />
        </span>
      </div>
    </Link>
  );
}
