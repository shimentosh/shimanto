import { type Accent, Button, Chip, Container, accentBg, cn } from '@shimanto/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ReadingProgress } from '@/components/blog/reading-progress';
import { ShareLinks } from '@/components/blog/share-links';
import { AuthorAvatar, AuthorCard, formatDate } from '@/components/page/article';
import { Breadcrumbs, type Crumb } from '@/components/page/breadcrumbs';
import { Toc } from '@/components/page/toc';
import type { CaseStudyReport } from '@/content/case-study-report';
import { reportReadingMinutes } from '@/lib/case-studies';
import { site } from '@/lib/site';
import { ReportBody, chapterIds } from './report-body';
import { ReportFigure } from './report-figure';

/** formatDate, but a missing or malformed date (a draft mid-edit) prints as-is instead of throwing. */
function displayDate(iso: string): string {
  return Number.isNaN(Date.parse(iso)) ? iso : formatDate(iso);
}

/** Columns at `lg` for the number of key metrics, so short rows don't leave empty cells. */
function metricColumns(count: number): string {
  if (count <= 2) return 'lg:grid-cols-2';
  if (count % 3 === 0 && count % 4 !== 0) return 'lg:grid-cols-3';
  return 'lg:grid-cols-4';
}

function KeyMetrics({ report, tone }: { report: CaseStudyReport; tone: Accent }) {
  if (report.metrics.length === 0) return null;
  return (
    <section aria-label="Key numbers" className="border-ink/10 mt-12 border-y py-8 md:mt-16">
      <dl
        className={cn('grid gap-x-8 gap-y-8 sm:grid-cols-2', metricColumns(report.metrics.length))}
      >
        {report.metrics.map((m, i) => (
          <div key={i} className="flex min-w-0 flex-col">
            {/* The label is the term and the number its value; the number shows first. */}
            <dt className="text-ink-soft mt-3 flex gap-2.5 text-[15px] leading-snug">
              <span
                aria-hidden="true"
                className={cn('mt-[0.45em] size-2 shrink-0 rounded-full', accentBg[tone])}
              />
              <span className="min-w-0 wrap-break-word">
                {m.label}
                {m.period && (
                  <span className="block font-mono text-xs tracking-[0.08em]">{m.period}</span>
                )}
              </span>
            </dt>
            <dd className="order-first text-[clamp(32px,3.6vw,48px)] leading-none font-medium tracking-[-0.04em] wrap-break-word">
              {m.value}
              {m.sources.map((n) => (
                <sup key={n} className="ml-0.5 font-mono text-[0.3em] tracking-normal">
                  <a
                    href={`#source-${n}`}
                    aria-label={`Source ${n}`}
                    className="text-ink-soft hover:text-ink"
                  >
                    [{n}]
                  </a>
                </sup>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function hasSources(report: CaseStudyReport): boolean {
  return report.sources.length > 0 || report.method.trim() !== '';
}

function Sources({ report }: { report: CaseStudyReport }) {
  if (!hasSources(report)) return null;
  return (
    <section aria-labelledby="sources-title" className="border-ink/10 mt-14 border-t pt-10">
      <h2 id="sources-title" className="scroll-mt-28 text-2xl font-medium tracking-[-0.03em]">
        Sources
      </h2>
      {report.method && (
        <p className="text-ink-soft mt-3 text-[16px] leading-relaxed">{report.method}</p>
      )}
      {report.sources.length > 0 && (
        <ol className="mt-6 space-y-3 text-[15px] leading-snug">
          {report.sources.map((s) => (
            <li
              key={s.n}
              id={`source-${s.n}`}
              className="target:bg-ink/[0.05] -mx-3 flex scroll-mt-28 gap-4 rounded-lg px-3 py-1.5"
            >
              <span className="text-ink-soft w-7 shrink-0 font-mono text-xs leading-[1.6]">
                {s.n}.
              </span>
              {/* Titles can be bare URLs: break anywhere rather than widen the page on phones. */}
              <span className="min-w-0 wrap-anywhere">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="decoration-ink/30 hover:decoration-ink underline underline-offset-4"
                >
                  {s.title}
                </a>
                <span className="text-ink-soft">
                  {s.publisher && <> · {s.publisher}</>}
                  {s.published && <> · published {displayDate(s.published)}</>}
                  {s.accessed && <> · accessed {displayDate(s.accessed)}</>}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export interface CaseStudyLayoutProps {
  report: CaseStudyReport;
  crumbs: Crumb[];
  tone: Accent;
  /** Absolute URL for the share links. */
  url: string;
  /** Mono label after the kind, e.g. "Draft". */
  kicker?: string;
  related?: ReactNode;
}

/**
 * Long-form case study page in the blog's editorial layout: masthead with subject and byline,
 * cover, key numbers, chapters between a sticky contents rail and the share rail, then the
 * numbered sources every claim links to. One column below `lg`; the rails appear from `lg` up.
 */
export function CaseStudyLayout({
  report,
  crumbs,
  tone,
  url,
  kicker,
  related,
}: CaseStudyLayoutProps) {
  const ids = chapterIds(report);
  const headings = [
    ...report.chapters.map((c, i) => ({ id: ids[i] ?? c.id, text: c.title })),
    ...(hasSources(report) ? [{ id: 'sources-title', text: 'Sources' }] : []),
  ];
  const sourceCount = report.sources.length;
  return (
    <article className="pb-24 md:pb-32">
      <ReadingProgress targetId="report-body" tone={tone} />
      <header className="pt-28 md:pt-36">
        <Container>
          <Breadcrumbs items={crumbs} align="center" />
          <div className="mx-auto mt-12 max-w-4xl text-center md:mt-16">
            <p className="flex flex-wrap items-center justify-center gap-2.5 font-mono text-xs tracking-[0.14em] uppercase">
              <span aria-hidden="true" className={cn('size-2 rounded-full', accentBg[tone])} />
              Case study · {report.kindLabel}
              {kicker && (
                <>
                  <span aria-hidden="true" className="text-ink-soft">
                    /
                  </span>
                  <span className="text-ink-soft">{kicker}</span>
                </>
              )}
            </p>
            <h1 className="mt-6 text-[clamp(38px,5.6vw,72px)] leading-[1.02] font-medium tracking-[-0.05em] text-balance">
              {report.title}
            </h1>
            <p className="text-ink-soft mx-auto mt-6 max-w-[54ch] text-lg leading-relaxed text-balance md:text-[22px]">
              {report.summary}
            </p>
            <div className="border-ink/10 mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-x-6 gap-y-3 border-y py-4 text-sm">
              <span className="flex items-center gap-3">
                <AuthorAvatar tone={tone} size={36} />
                <span className="font-medium">{site.name}</span>
              </span>
              <time dateTime={report.publishedAt} className="text-ink-soft">
                {displayDate(report.publishedAt)}
              </time>
              <span className="text-ink-soft">{reportReadingMinutes(report)} min read</span>
              {sourceCount > 0 && (
                <span className="text-ink-soft">
                  {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}
                </span>
              )}
              {report.updatedAt && (
                <span className="text-ink-soft">
                  Updated <time dateTime={report.updatedAt}>{displayDate(report.updatedAt)}</time>
                </span>
              )}
            </div>
            {report.subject.name && (
              <p className="text-ink-soft mt-4 text-sm">
                Subject:{' '}
                {report.subject.url ? (
                  <a
                    href={report.subject.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="decoration-ink/30 hover:decoration-ink text-ink underline underline-offset-4"
                  >
                    {report.subject.name}
                  </a>
                ) : (
                  <span className="text-ink">{report.subject.name}</span>
                )}
              </p>
            )}
          </div>
          {report.cover && (
            <div className="mx-auto mt-12 max-w-5xl md:mt-16">
              <ReportFigure
                figure={{
                  type: 'figure',
                  ...report.cover,
                  caption: '',
                  credit: '',
                  kind: 'featured',
                }}
                sizes="(min-width: 1088px) 1024px, 100vw"
                cover
              />
            </div>
          )}
          <div className="mx-auto max-w-5xl">
            <KeyMetrics report={report} tone={tone} />
          </div>
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
          <div id="report-body" className="min-w-0">
            <ReportBody report={report} tone={tone} />
            <div className="max-w-[68ch]">
              <Sources report={report} />
              {report.tags && report.tags.length > 0 && (
                <div className="border-ink/10 mt-14 flex flex-wrap items-center gap-3 border-t pt-8">
                  <span className="text-ink-soft font-mono text-xs tracking-[0.14em] uppercase">
                    Filed under
                  </span>
                  <ul aria-label="Tags" className="flex flex-wrap gap-2">
                    {report.tags.map((tag) => (
                      <li key={tag}>
                        <Chip>#{tag}</Chip>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-10 lg:hidden">
                <ShareLinks url={url} title={report.title} />
              </div>
              <AuthorCard tone={tone} />
            </div>
          </div>
          <aside className="hidden lg:block">
            <div className="sticky top-28">
              <ShareLinks url={url} title={report.title} />
            </div>
          </aside>
        </div>

        {related}

        <div className="mt-16">
          <Button href="/case-studies" variant="text">
            ← All case studies
          </Button>
        </div>
      </Container>
    </article>
  );
}

/** Index row: kind, title, summary, subject and date. */
export function CaseStudyListItem({ report }: { report: CaseStudyReport }) {
  return (
    <Link
      href={`/case-studies/${report.slug}`}
      data-cursor="Read"
      className="group border-ink/10 flex flex-col gap-2 border-t py-6 md:flex-row md:items-baseline md:justify-between md:gap-8"
    >
      <div className="min-w-0">
        <p className="text-ink-soft text-sm">
          {[report.kindLabel, report.subject.name].filter(Boolean).join(' · ')}
        </p>
        <h3 className="mt-1 text-xl leading-snug font-medium tracking-[-0.02em] group-hover:underline md:text-2xl">
          {report.title}
        </h3>
        <p className="text-ink-soft mt-1 line-clamp-2">{report.summary}</p>
      </div>
      <p className="text-ink-soft shrink-0 text-sm">
        <time dateTime={report.publishedAt}>{displayDate(report.publishedAt)}</time> ·{' '}
        {reportReadingMinutes(report)} min
      </p>
    </Link>
  );
}
