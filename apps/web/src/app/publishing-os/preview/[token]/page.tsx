import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { PostListItem } from '@/components/blog/post-card';
import { CaseStudyLayout } from '@/components/case-study/report-layout';
import { ArticleLayout } from '@/components/page/article';
import { FollowAlong } from '@/components/page/social-reach';
import type { Entry } from '@/content/catalog';
import type { CaseStudyReport } from '@/content/case-study-report';
import { relatedPosts, worldFor } from '@/lib/blog';
import { reportWorld } from '@/lib/case-studies';
import { absoluteUrl } from '@/lib/site';

/**
 * Draft preview for Publishing OS: renders an unpublished article or long-form case study with the
 * real site components. Off unless PUBLISHING_OS_PREVIEW_SECRET is set, and off in production
 * builds unless explicitly enabled. The signed, expiring token is checked here before the draft is
 * requested.
 */
export const dynamic = 'force-dynamic';

interface DraftMeta {
  version: number;
  status: string;
  dirty: boolean;
  updatedAt: string;
  seo: { title?: string; description?: string; noindex?: boolean };
  errors: string[];
  warnings: string[];
}

type Draft =
  | { kind: 'article'; entry: Entry; meta: DraftMeta }
  | { kind: 'case_study'; caseStudy: CaseStudyReport; meta: DraftMeta };

function enabled(): string | null {
  const secret = process.env.PUBLISHING_OS_PREVIEW_SECRET;
  if (!secret || secret.length < 24) return null;
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.PUBLISHING_OS_PREVIEW_IN_PRODUCTION !== '1'
  )
    return null;
  return secret;
}

function validToken(token: string, secret: string): boolean {
  const [body, sig] = token.split('.');
  if (!body || !sig) return false;
  const expected = createHmac('sha256', secret).update(body).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { exp?: number };
    return typeof exp === 'number' && exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

/** A draft is mid-edit: fill the lists the layout reads so a half-written report still renders. */
function draftReport(report: CaseStudyReport): CaseStudyReport {
  return {
    ...report,
    subject: report.subject ?? { name: '' },
    metrics: Array.isArray(report.metrics) ? report.metrics : [],
    sources: Array.isArray(report.sources) ? report.sources : [],
    method: report.method ?? '',
  };
}

// Deduped per request: generateMetadata and the page share one fetch.
const loadDraft = cache(async (token: string): Promise<Draft | null> => {
  const secret = enabled();
  if (!secret || !validToken(token, secret)) return null;
  const base = process.env.PUBLISHING_OS_URL ?? 'http://127.0.0.1:3200';
  const res = await fetch(`${base}/api/preview/${encodeURIComponent(token)}`, {
    cache: 'no-store',
  }).catch(() => null);
  if (!res?.ok) return null;
  const data = (await res.json().catch(() => ({}))) as Partial<{
    kind: string;
    entry: Entry;
    caseStudy: CaseStudyReport;
    meta: DraftMeta;
  }>;
  if (!data.meta) return null;
  if (data.kind === 'case_study' && data.caseStudy && Array.isArray(data.caseStudy.chapters))
    return { kind: 'case_study', caseStudy: draftReport(data.caseStudy), meta: data.meta };
  if (data.entry && Array.isArray(data.entry.body))
    return { kind: 'article', entry: data.entry, meta: data.meta };
  return null;
});

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const draft = await loadDraft((await params).token);
  if (!draft) return { robots: { index: false, follow: false } };
  // Same as the live pages: the title and summary are the SEO title and description.
  const { title, summary } = draft.kind === 'case_study' ? draft.caseStudy : draft.entry;
  return { title, description: summary, robots: { index: false, follow: false } };
}

function DraftBadge({ meta }: { meta: DraftMeta }) {
  return (
    <div
      role="status"
      className="bg-night text-cream fixed bottom-4 left-4 z-50 max-w-[calc(100vw-2rem)] rounded-full px-4 py-2 font-mono text-xs tracking-[0.08em] shadow-lg"
    >
      Draft preview · v{meta.version}
      {meta.dirty ? ' + unsaved edits' : ''} · {meta.status.replaceAll('_', ' ')} · not published
      {meta.errors?.length > 0 && ` · ${meta.errors.length} issue(s)`}
    </div>
  );
}

export default async function PublishingOsPreview({ params }: Props) {
  const draft = await loadDraft((await params).token);
  if (!draft) notFound();
  if (draft.kind === 'case_study') {
    const report = draft.caseStudy;
    return (
      <main id="main">
        <DraftBadge meta={draft.meta} />
        <CaseStudyLayout
          report={report}
          kicker="Draft"
          tone={reportWorld(report)}
          url={absoluteUrl(`/case-studies/${report.slug}`)}
          crumbs={[
            { label: 'Case studies', href: '/case-studies' },
            { label: report.title, href: `/case-studies/${report.slug}` },
          ]}
        />
      </main>
    );
  }
  const { entry, meta } = draft;
  const related = relatedPosts(entry);
  return (
    <main id="main">
      <DraftBadge meta={meta} />
      <ArticleLayout
        entry={entry}
        eyebrow={entry.category}
        kicker="Draft"
        tone={worldFor(entry)}
        url={absoluteUrl(`/blog/${entry.slug}`)}
        after={<FollowAlong />}
        crumbs={[
          { label: 'Blog', href: '/blog' },
          { label: entry.title, href: `/blog/${entry.slug}` },
        ]}
        related={
          related.length > 0 && (
            <section aria-labelledby="related-title" className="border-ink/10 mt-20 border-t pt-12">
              <p className="text-ink-soft text-sm font-medium">Keep reading</p>
              <h2
                id="related-title"
                className="mt-2 text-2xl font-medium tracking-[-0.03em] md:text-4xl"
              >
                More from the notebook.
              </h2>
              <ol className="border-ink/10 mt-8 border-b">
                {related.map((p) => (
                  <li key={p.slug}>
                    <PostListItem post={p} />
                  </li>
                ))}
              </ol>
            </section>
          )
        }
        backHref="/blog"
        backLabel="All notes"
      />
    </main>
  );
}
