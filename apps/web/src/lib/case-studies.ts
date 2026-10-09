import type { Accent } from '@shimanto/ui';
import { reportPlainText } from '@/components/case-study/report-text';
import { worldFor } from '@/lib/blog';
import { type CaseStudyReport, caseStudyReports } from '@/content/case-study-report';

const WORDS_PER_MINUTE = 230;

export function findCaseStudy(slug: string): CaseStudyReport | undefined {
  return caseStudyReports.find((r) => r.slug === slug);
}

/** Plain text of a report's chapters, for reading time and search. */
export function reportText(report: CaseStudyReport): string {
  return report.chapters
    .flatMap((c) => [
      c.title,
      ...c.blocks.map((b) => {
        switch (b.type) {
          case 'list':
            return b.items.map(reportPlainText).join(' ');
          case 'code':
            return b.code;
          case 'figure':
            return b.caption;
          case 'table':
            return [...b.header, ...b.rows.flat()].map(reportPlainText).join(' ');
          case 'callout':
            return `${b.title ?? ''} ${reportPlainText(b.text)}`;
          default:
            return reportPlainText(b.text);
        }
      }),
    ])
    .join(' ');
}

export function reportReadingMinutes(report: CaseStudyReport): number {
  const words = reportText(report).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function reportWorld(report: CaseStudyReport): Accent {
  return worldFor(report);
}

/** Other case studies, same kind first. */
export function relatedCaseStudies(report: CaseStudyReport, limit = 3): CaseStudyReport[] {
  return caseStudyReports
    .filter((r) => r.slug !== report.slug)
    .sort((a, b) => Number(b.kind === report.kind) - Number(a.kind === report.kind))
    .slice(0, limit);
}
