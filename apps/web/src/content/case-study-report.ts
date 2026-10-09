import type { Accent } from '@shimanto/ui';
import type { Block } from './catalog';
import { publishingOsCaseStudies } from './publishing-os/case-studies';

/**
 * Long-form research case studies for /case-studies/[slug]: how other companies grew, ranked,
 * marketed and built, from cited public sources. (Write-ups of my own ventures for /work live in
 * ./case-studies.ts.) Publishing OS writes these into ./publishing-os/case-studies.
 *
 * Paragraph text keeps `[label](href)` links and `[^n]` citation markers; `n` is a source number.
 */
export type ReportBlock =
  | Exclude<Block, { type: 'h2' }>
  | {
      type: 'figure';
      /** Public path (or, in a draft preview, an absolute URL). */
      src: string;
      alt: string;
      width: number;
      height: number;
      caption: string;
      /** Where the data or image comes from. */
      credit: string;
      /** chart, timeline, comparison, diagram, screenshot, illustration… */
      kind: string;
    }
  /** Header and cells are inline text too (links and `[^n]` markers). Scrolls sideways on phones. */
  | { type: 'table'; header: string[]; rows: string[][] };

/** A chapter renders as a numbered h2; its `h3` blocks are the subsections. */
export interface ReportChapter {
  /** Anchor for the heading and the contents rail; unique within the report. */
  id: string;
  /** Chapter role from Publishing OS (e.g. "custom"); not shown on the page. */
  kind: string;
  title: string;
  blocks: ReportBlock[];
}

/** A numbered source; `[^n]` markers and metric citations link to `#source-{n}`. */
export interface ReportSource {
  n: number;
  /** May be the bare URL when the page had no title; the list wraps it. */
  title: string;
  url: string;
  publisher: string;
  /** ISO date the source was read. */
  accessed: string;
  published?: string;
}

export interface CaseStudyReport {
  slug: string;
  title: string;
  summary: string;
  kind: string;
  /** e.g. "Startup growth", "SEO teardown". */
  kindLabel: string;
  subject: { name: string; url?: string };
  category: string;
  /** ISO dates. */
  publishedAt: string;
  updatedAt?: string;
  world?: Accent;
  tags?: string[];
  cover?: { src: string; alt: string; width: number; height: number };
  /** Headline numbers, each with the sources that state it. All are shown; may be empty. */
  metrics: Array<{ value: string; label: string; period?: string; sources: number[] }>;
  chapters: ReportChapter[];
  sources: ReportSource[];
  /** How the research was done, in a sentence or two. */
  method: string;
}

export const caseStudyReports: CaseStudyReport[] = [...publishingOsCaseStudies].sort((a, b) =>
  b.publishedAt.localeCompare(a.publishedAt),
);
