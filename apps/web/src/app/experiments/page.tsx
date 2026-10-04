import { Chip, type IconName, Squiggle } from '@shimanto/ui';
import type { ExperimentStage } from '@shimanto/types';
import Link from 'next/link';
import { EntryList } from '@/components/page/article';
import { RelatedPosts } from '@/components/blog/related-posts';
import { EmptyState } from '@/components/page/empty-state';
import { FlowSteps } from '@/components/page/flow-steps';
import { CtaBand, Masthead, ctaPrimary, ctaSecondary } from '@/components/page/masthead';
import { Section, SectionTitle } from '@/components/page/section';
import { experimentStages, experiments } from '@/content/catalog';
import { postsIn } from '@/lib/blog';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Experiments',
  description:
    'Prototypes, AI and tech experiments, and failed experiments with what they taught, by Shimanto.',
  path: '/experiments',
});

const stageIcon: Record<ExperimentStage, IconName> = {
  IDEA: 'bulb',
  PROTOTYPE: 'wrench',
  TESTING: 'flask',
  SHIPPED: 'rocket',
  FAILED: 'book',
};

export default function ExperimentsPage() {
  const stageOf = Object.fromEntries(experimentStages.map((s) => [s.stage, s]));
  return (
    <main id="main">
      <Masthead
        crumbs={[{ label: 'Experiments', href: '/experiments' }]}
        kicker={`Experiments / ${experiments.length} logged`}
        world="create"
        title={
          <>
            Testing in <Squiggle world="create">public</Squiggle>.
          </>
        }
        intro="Prototypes, AI experiments and the things that didn't work. Failures stay up, with what they taught me."
      />
      <Section labelledBy="stages-title">
        <SectionTitle
          id="stages-title"
          eyebrow="The pipeline"
          title="Every experiment has a stage."
        />
        <div className="mt-12">
          <FlowSteps
            label="Experiment stages"
            steps={experimentStages.map((stage) => ({
              label: stage.label,
              note: stage.note,
              tone: stage.tone,
              icon: stageIcon[stage.stage],
              count: experiments.filter((e) => e.stage === stage.stage).length,
            }))}
          />
        </div>
      </Section>
      <Section divided labelledBy="log-title">
        <SectionTitle id="log-title" eyebrow="The log" title="What’s on the bench." />
        <div className="mt-8">
          {experiments.length > 0 ? (
            <EntryList
              basePath="/experiments"
              label="Experiments"
              entries={experiments.map((e) => ({
                ...e,
                badge: (
                  <Chip variant="status" tone={stageOf[e.stage]?.tone}>
                    {stageOf[e.stage]?.label}
                  </Chip>
                ),
              }))}
            />
          ) : (
            <EmptyState
              art="flask"
              tone="create"
              title="The lab notebook opens soon."
              body="Experiments get logged here from the idea stage, so you can follow along before anything is polished."
              cta={{ href: '/tools', label: 'Try my free tools' }}
            />
          )}
        </div>
        <RelatedPosts posts={postsIn(['AI', 'Product building'])} />
      </Section>
      <Section className="pb-24 md:pb-32">
        <CtaBand
          eyebrow="Got an idea worth testing?"
          title="Some of the best experiments start as someone else’s question."
          world="create"
        >
          <Link href="/collaborate?intent=OTHER" className={ctaPrimary}>
            Send an idea →
          </Link>
          <Link href="/lab" className={ctaSecondary}>
            Marketing Lab
          </Link>
        </CtaBand>
      </Section>
    </main>
  );
}
