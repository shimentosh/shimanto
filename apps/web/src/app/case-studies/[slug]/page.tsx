import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CaseStudyLayout, CaseStudyListItem } from '@/components/case-study/report-layout';
import { JsonLd } from '@/components/page/json-ld';
import { caseStudyReports } from '@/content/case-study-report';
import { findCaseStudy, relatedCaseStudies, reportWorld } from '@/lib/case-studies';
import { pageMetadata } from '@/lib/seo';
import { absoluteUrl, site } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return caseStudyReports.map((r) => ({ slug: r.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const report = findCaseStudy((await params).slug);
  if (!report) return {};
  const path = `/case-studies/${report.slug}`;
  return {
    ...pageMetadata({ title: report.title, description: report.summary, path }),
    openGraph: {
      type: 'article',
      title: report.title,
      description: report.summary,
      url: path,
      publishedTime: report.publishedAt,
      modifiedTime: report.updatedAt,
      authors: [site.name],
      tags: report.tags,
      ...(report.cover && {
        images: [
          {
            url: report.cover.src,
            width: report.cover.width,
            height: report.cover.height,
            alt: report.cover.alt,
          },
        ],
      }),
    },
  };
}

export default async function CaseStudyPage({ params }: Props) {
  const report = findCaseStudy((await params).slug);
  if (!report) notFound();
  const url = absoluteUrl(`/case-studies/${report.slug}`);
  const related = relatedCaseStudies(report);
  return (
    <main id="main">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: report.title,
          description: report.summary,
          datePublished: report.publishedAt,
          dateModified: report.updatedAt ?? report.publishedAt,
          articleSection: 'Case studies',
          keywords: report.tags?.join(', '),
          ...(report.cover && { image: absoluteUrl(report.cover.src) }),
          author: { '@type': 'Person', name: site.name, url: absoluteUrl('/about') },
          about: {
            '@type': 'Organization',
            name: report.subject.name,
            ...(report.subject.url && { url: report.subject.url }),
          },
          citation: report.sources.map((s) => ({
            '@type': 'CreativeWork',
            name: s.title,
            url: s.url,
            ...(s.publisher && { publisher: { '@type': 'Organization', name: s.publisher } }),
            ...(s.published && { datePublished: s.published }),
          })),
          mainEntityOfPage: url,
        }}
      />
      <CaseStudyLayout
        report={report}
        tone={reportWorld(report)}
        url={url}
        crumbs={[
          { label: 'Case studies', href: '/case-studies' },
          { label: report.title, href: `/case-studies/${report.slug}` },
        ]}
        related={
          related.length > 0 && (
            <section aria-labelledby="related-title" className="border-ink/10 mt-20 border-t pt-12">
              <p className="text-ink-soft text-sm font-medium">Keep reading</p>
              <h2
                id="related-title"
                className="mt-2 text-2xl font-medium tracking-[-0.03em] md:text-4xl"
              >
                More case studies.
              </h2>
              <ul className="border-ink/10 mt-8 border-b">
                {related.map((r) => (
                  <li key={r.slug}>
                    <CaseStudyListItem report={r} />
                  </li>
                ))}
              </ul>
            </section>
          )
        }
      />
    </main>
  );
}
