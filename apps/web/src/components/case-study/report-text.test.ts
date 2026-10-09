import { describe, expect, it, vi } from 'vitest';
import { reportPlainText } from './report-text';

// vitest.config.ts has no `@/` alias: point the one aliased import at its file.
vi.mock('@/components/page/inline-text', () => import('../page/inline-text'));

describe('reportPlainText', () => {
  it('drops citation markers, including adjacent ones', () => {
    expect(reportPlainText('Revenue doubled[^1][^12] in 2024.')).toBe('Revenue doubled in 2024.');
  });

  it('keeps link labels and drops their URLs', () => {
    expect(reportPlainText('See [the filing](https://www.sec.gov/x)[^3].')).toBe('See the filing.');
  });

  it('drops unlinked draft markers', () => {
    expect(reportPlainText('Churn fell[^?claim-7] sharply.')).toBe('Churn fell sharply.');
  });

  it('never reads a marker followed by parentheses as a link', () => {
    expect(reportPlainText('Grew 40%[^1](2023).')).toBe('Grew 40%(2023).');
  });
});
