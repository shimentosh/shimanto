import { describe, expect, it, vi } from 'vitest';
import type { CaseStudyReport } from '@/content/case-study-report';
import { reportReadingMinutes, reportText } from './case-studies';

// vitest.config.ts has no `@/` alias: point the aliased imports at their files, and skip the
// content catalogs these tests don't read.
vi.mock(
  '@/components/case-study/report-text',
  () => import('../components/case-study/report-text'),
);
vi.mock('@/components/page/inline-text', () => import('../components/page/inline-text'));
vi.mock('@/content/case-study-report', () => ({ caseStudyReports: [] }));
vi.mock('@/lib/blog', () => ({ worldFor: () => 'idea' }));

const report = (blocks: CaseStudyReport['chapters'][number]['blocks']): CaseStudyReport => ({
  slug: 'acme',
  title: 'How Acme grew',
  summary: 'A test report.',
  kind: 'company',
  kindLabel: 'Startup growth',
  subject: { name: 'Acme' },
  category: 'Research',
  publishedAt: '2026-10-01',
  metrics: [],
  chapters: [{ id: 'origins', kind: 'custom', title: 'Origins', blocks }],
  sources: [],
  method: '',
});

describe('reportText', () => {
  it('reads every block type without links or citation markers', () => {
    const text = reportText(
      report([
        { type: 'p', text: 'Acme [launched](https://acme.test)[^1][^2] in 2019.' },
        { type: 'list', items: ['First[^1]', 'Second'] },
        { type: 'table', header: ['Year', 'Users[^2]'], rows: [['2020', '1,000']] },
        {
          type: 'figure',
          src: '/case-studies/acme/chart.png',
          alt: 'Users by year',
          width: 1200,
          height: 675,
          caption: 'Users by year',
          credit: 'Source: Acme',
          kind: 'chart',
        },
      ]),
    );
    expect(text).toBe(
      'Origins Acme launched in 2019. First Second Year Users 2020 1,000 Users by year',
    );
  });
});

describe('reportReadingMinutes', () => {
  it('is at least a minute', () => {
    expect(reportReadingMinutes(report([]))).toBe(1);
  });

  it('counts words at 230 a minute, ignoring citation markers', () => {
    const words = Array.from({ length: 689 }, () => 'word[^1]').join(' ');
    // 689 words plus the chapter title: 690 / 230 = 3.
    expect(reportReadingMinutes(report([{ type: 'p', text: words }]))).toBe(3);
  });
});
