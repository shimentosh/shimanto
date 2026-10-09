import { CaseStudyListItem } from '@/components/case-study/report-layout';
import { EmptyState } from '@/components/page/empty-state';
import { Masthead } from '@/components/page/masthead';
import { Section, SectionTitle } from '@/components/page/section';
import { caseStudyReports } from '@/content/case-study-report';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Case studies',
  description:
    'Long-form case studies on how companies grow, rank and build, from cited public sources, by Shimanto.',
  path: '/case-studies',
});

export default function CaseStudiesPage() {
  return (
    <main id="main">
      <Masthead
        crumbs={[{ label: 'Case studies', href: '/case-studies' }]}
        kicker={`Case studies / ${caseStudyReports.length} published`}
        world="signal"
        title="How it actually happened."
        intro="Long reads on how companies grew, ranked and built. Every number links to the source that states it."
      />
      <Section labelledBy="reports-title" className="pb-24 md:pb-32">
        <SectionTitle id="reports-title" eyebrow="The reports" title="Read the research." />
        <div className="mt-8">
          {caseStudyReports.length > 0 ? (
            <ul aria-label="Case studies" className="border-ink/10 border-b">
              {caseStudyReports.map((r) => (
                <li key={r.slug}>
                  <CaseStudyListItem report={r} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              art="magnifier"
              tone="signal"
              title="The first case study is being researched."
              body="Each one is built from public sources, with every number cited."
              cta={{ href: '/blog', label: 'Read the blog' }}
            />
          )}
        </div>
      </Section>
    </main>
  );
}
