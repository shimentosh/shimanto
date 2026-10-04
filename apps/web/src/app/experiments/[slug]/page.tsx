import { Chip } from '@shimanto/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RelatedPosts } from '@/components/blog/related-posts';
import { ArticleLayout } from '@/components/page/article';
import { experimentStages, experiments } from '@/content/catalog';
import { postsIn } from '@/lib/blog';
import { pageMetadata } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return experiments.map((e) => ({ slug: e.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const experiment = experiments.find((e) => e.slug === slug);
  if (!experiment) return {};
  return pageMetadata({
    title: experiment.title,
    description: experiment.summary,
    path: `/experiments/${experiment.slug}`,
  });
}

export default async function ExperimentPage({ params }: Props) {
  const { slug } = await params;
  const index = experiments.findIndex((e) => e.slug === slug);
  const experiment = experiments[index];
  if (!experiment) notFound();
  const stage = experimentStages.find((s) => s.stage === experiment.stage);
  const prev = experiments[index - 1];
  const next = experiments[index + 1];

  return (
    <main id="main">
      <ArticleLayout
        entry={experiment}
        eyebrow="Experiment"
        tone={stage?.tone ?? 'create'}
        url={absoluteUrl(`/experiments/${experiment.slug}`)}
        badges={
          stage && (
            <Chip variant="status" tone={stage.tone}>
              {stage.label}
            </Chip>
          )
        }
        crumbs={[
          { label: 'Experiments', href: '/experiments' },
          { label: experiment.title, href: `/experiments/${experiment.slug}` },
        ]}
        after={
          experiment.lesson && (
            <aside className="bg-create on-world rounded-card p-8">
              <p className="font-mono text-xs tracking-[0.2em] uppercase">What I learned</p>
              <p className="mt-3 text-2xl leading-snug font-medium">{experiment.lesson}</p>
            </aside>
          )
        }
        related={<RelatedPosts posts={postsIn(['AI', 'Product building'])} />}
        prev={prev && { href: `/experiments/${prev.slug}`, title: prev.title }}
        next={next && { href: `/experiments/${next.slug}`, title: next.title }}
        backHref="/experiments"
        backLabel="All experiments"
      />
    </main>
  );
}
