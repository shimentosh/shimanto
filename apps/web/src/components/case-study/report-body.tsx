import { type Accent, accentBg, cn } from '@shimanto/ui';
import type { CaseStudyReport, ReportBlock } from '@/content/case-study-report';
import { ReportFigure } from './report-figure';
import { ReportText, reportPlainText } from './report-text';

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
 * Anchor id per chapter, shared by the chapter headings and the contents rail. Uses the chapter's
 * own id; a missing or repeated one gets a numbered fallback so every anchor resolves.
 */
export function chapterIds(report: CaseStudyReport): string[] {
  const seen = new Set<string>();
  return report.chapters.map((chapter, c) => {
    let id = chapter.id.trim() || `chapter-${c + 1}`;
    if (seen.has(id)) id = `${id}-${c + 1}`;
    seen.add(id);
    return id;
  });
}

function ReportBlockView({
  block,
  tone,
  lead,
  figureNumber,
}: {
  block: ReportBlock;
  tone: Accent;
  lead: boolean;
  figureNumber?: number;
}) {
  switch (block.type) {
    case 'h3':
      return (
        <h3 id={block.id} className="scroll-mt-28 pt-2 text-xl font-medium">
          {block.text}
        </h3>
      );
    case 'list': {
      const ListTag = block.ordered ? 'ol' : 'ul';
      return (
        <ListTag className="space-y-3">
          {block.items.map((item, n) => (
            <li key={n} className="relative pl-10">
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
              <ReportText text={item} />
            </li>
          ))}
        </ListTag>
      );
    }
    case 'quote':
      return (
        <blockquote className="relative py-6 pl-14 md:pl-16">
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
            <ReportText text={block.text} />
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
          className={cn(
            'bg-ink/[0.04] rounded-card border-l-4 px-6 py-5 text-[17px]',
            borderTone[block.tone ?? tone],
          )}
        >
          {block.title && <p className="font-medium">{block.title}</p>}
          <p className={cn('text-ink-soft', block.title && 'mt-1')}>
            <ReportText text={block.text} />
          </p>
        </aside>
      );
    case 'code':
      return (
        <pre className="bg-night text-cream rounded-card overflow-x-auto border border-white/10 p-6 font-mono text-sm leading-relaxed">
          <code data-lang={block.lang}>{block.code}</code>
        </pre>
      );
    case 'figure':
      return <ReportFigure figure={block} number={figureNumber} />;
    case 'table': {
      const columns = block.header.map(reportPlainText).filter(Boolean).join(', ');
      return (
        // Scrolls sideways when the columns don't fit (phones); focusable so keyboards can scroll it.
        <div
          role="region"
          aria-label={columns ? `Table: ${columns}` : 'Table'}
          tabIndex={0}
          className="border-ink/10 rounded-card overflow-x-auto overscroll-x-contain border"
        >
          <table className="w-full border-collapse text-left text-[16px] leading-snug">
            <thead>
              <tr className="bg-ink/[0.04]">
                {block.header.map((h, c) => (
                  <th
                    key={c}
                    scope="col"
                    className="text-ink-soft px-4 py-3 align-bottom font-mono text-xs font-normal tracking-[0.12em] uppercase"
                  >
                    <ReportText text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-ink/10 border-t">
                  {row.map((cell, c) => (
                    <td key={c} className="min-w-[12ch] px-4 py-3 align-top">
                      <ReportText text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    default:
      return (
        <p className={cn(lead && 'text-[21px]')}>
          <ReportText text={block.text} />
        </p>
      );
  }
}

/**
 * The chapters in the blog's 68ch reading column: numbered chapter heads (h2), subsections (h3),
 * the blog's block styles, plus numbered figures, data tables and `[n]` citations that jump to the
 * source list.
 */
export function ReportBody({ report, tone }: { report: CaseStudyReport; tone: Accent }) {
  const ids = chapterIds(report);
  let figures = 0;
  return (
    <div className="max-w-[68ch] space-y-6 text-[19px] leading-[1.8]">
      {report.chapters.map((chapter, c) => {
        const id = ids[c] ?? chapter.id;
        const firstParagraph = c === 0 ? chapter.blocks.findIndex((b) => b.type === 'p') : -1;
        return (
          <section key={id} aria-labelledby={id} className="space-y-6">
            <h2
              id={id}
              className={cn(
                'scroll-mt-28 text-2xl leading-tight font-medium tracking-[-0.03em] md:text-[32px]',
                c > 0 && 'border-ink/10 border-t pt-10',
              )}
            >
              <span
                aria-hidden="true"
                className={cn('mb-3 block font-mono text-xs tracking-[0.14em]', textTone[tone])}
              >
                {String(c + 1).padStart(2, '0')}
              </span>
              {chapter.title}
            </h2>
            {chapter.blocks.map((block, i) => (
              <ReportBlockView
                key={i}
                block={block}
                tone={tone}
                lead={i === firstParagraph}
                figureNumber={block.type === 'figure' ? ++figures : undefined}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}
