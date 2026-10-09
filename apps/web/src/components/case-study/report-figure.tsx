import Image from 'next/image';
import type { ReportBlock } from '@/content/case-study-report';

type Figure = Extract<ReportBlock, { type: 'figure' }>;

const kindLabel: Record<string, string> = {
  chart: 'Chart',
  timeline: 'Timeline',
  comparison: 'Comparison',
  diagram: 'Diagram',
  screenshot: 'Screenshot',
  illustration: 'Illustration',
  mockup: 'Mockup',
  featured: 'Cover',
};

/**
 * A figure with its caption and credit. Charts and timelines are drawn from the cited data;
 * screenshots carry the page and capture date; illustrations and mockups say so in the label.
 */
export function ReportFigure({
  figure,
  number,
  sizes = '(min-width: 1024px) 760px, 100vw',
  cover = false,
}: {
  figure: Figure;
  number?: number;
  sizes?: string;
  /** The cover above the fold: fetched first instead of lazily. */
  cover?: boolean;
}) {
  // Draft previews load figures from Publishing OS by absolute URL (http://127.0.0.1:3200/…), which
  // the image optimizer would refuse; published figures are local files and are optimized.
  const remote = /^(https?:)?\/\//.test(figure.src);
  const label = Object.hasOwn(kindLabel, figure.kind) ? kindLabel[figure.kind] : 'Figure';
  return (
    <figure className="my-10">
      <div className="border-ink/10 rounded-card overflow-hidden border">
        <Image
          src={figure.src}
          // Publishing OS requires alt text before publishing; a draft may not have it yet.
          alt={figure.alt.trim() || figure.caption}
          width={figure.width}
          height={figure.height}
          unoptimized={remote}
          sizes={sizes}
          loading={cover ? 'eager' : undefined}
          fetchPriority={cover ? 'high' : undefined}
          className="h-auto w-full"
        />
      </div>
      {(figure.caption || figure.credit) && (
        <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[15px] leading-snug">
          <span className="text-ink-soft font-mono text-xs tracking-[0.14em] uppercase">
            {label}
            {number !== undefined && ` ${number}`}
          </span>
          <span className="min-w-0 flex-1 wrap-break-word">{figure.caption}</span>
          {figure.credit && (
            <span className="text-ink-soft min-w-0 basis-full font-mono text-xs wrap-anywhere">
              {figure.credit}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
