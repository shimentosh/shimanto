import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import type { Accent } from '../lib/worlds';
import { Blob } from './blob';
import { Chip } from './chip';

export interface MediaCardProps {
  href: string;
  title: string;
  /** Short line under the title. */
  summary?: string;
  /** Mono metadata line: date, reading time, status… */
  meta?: ReactNode;
  tags?: string[];
  image?: { src: string; alt: string };
  /** World colour for the placeholder art when there is no image yet. */
  world?: Accent;
  /** `feature` = tall hero tile in a BentoGrid. */
  size?: 'default' | 'feature';
  /** Label shown by the custom cursor ("Read", "View", "Play"). */
  cursorLabel?: string;
  /** Heading level for the title, to keep page outlines logical. */
  headingLevel?: 'h2' | 'h3' | 'h4';
  priority?: boolean;
}

/**
 * Image (or placeholder blob art) with tag chips on top, and the title below.
 * The whole card is one link; hovering zooms the image to 1.04.
 */
export function MediaCard({
  href,
  title,
  summary,
  meta,
  tags = [],
  image,
  world = 'idea',
  size = 'default',
  cursorLabel = 'Read',
  headingLevel: Heading = 'h3',
  priority = false,
}: MediaCardProps) {
  return (
    <Link href={href} data-cursor={cursorLabel} className="group block h-full">
      <article className="flex h-full flex-col">
        <div
          className={cn(
            'rounded-card bg-canvas-2 relative overflow-hidden',
            size === 'feature'
              ? 'aspect-[4/3] lg:aspect-auto lg:min-h-[420px] lg:flex-1'
              : 'aspect-[4/3]',
          )}
        >
          {image ? (
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority={priority}
              sizes={
                size === 'feature'
                  ? '(min-width: 1024px) 50vw, 100vw'
                  : '(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw'
              }
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            />
          ) : (
            <div
              aria-hidden="true"
              className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]"
            >
              <Blob world={world} className="absolute -right-[10%] -bottom-[20%] w-[80%]" />
              <Blob world="spark" seed={1} className="absolute top-[12%] left-[10%] w-[22%]" />
            </div>
          )}
          {tags.length > 0 && (
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Chip key={tag}>{tag}</Chip>
              ))}
            </div>
          )}
        </div>
        <div className="pt-4">
          {meta && (
            <p className="text-ink-soft font-mono text-xs tracking-[0.12em] uppercase">{meta}</p>
          )}
          <Heading
            className={cn(
              'mt-1 font-medium tracking-tight text-balance',
              size === 'feature' ? 'text-3xl md:text-4xl' : 'text-xl',
            )}
          >
            <span className="bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_2px] bg-left-bottom bg-no-repeat transition-[background-size] duration-300 group-hover:bg-[length:100%_2px]">
              {title}
            </span>
          </Heading>
          {summary && <p className="text-ink-soft mt-2 line-clamp-2">{summary}</p>}
        </div>
      </article>
    </Link>
  );
}
