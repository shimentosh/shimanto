import { Icon, Squiggle, accentBg, cn } from '@shimanto/ui';
import Link from 'next/link';
import { RelatedPosts } from '@/components/blog/related-posts';
import { EmptyState } from '@/components/page/empty-state';
import { type FlowStep, FlowSteps } from '@/components/page/flow-steps';
import { CtaBand, Masthead, ctaPrimary, ctaSecondary } from '@/components/page/masthead';
import { Section, SectionTitle } from '@/components/page/section';
import { postsIn } from '@/lib/blog';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Marketing Lab',
  description:
    'Marketing experiments, breakdowns and growth tests by Shimanto: what was tried, what moved the needle.',
  path: '/lab',
});

const tracks = [
  {
    name: 'Positioning',
    note: 'Who it is for, and why them',
    tone: 'build' as const,
    icon: 'target' as const,
  },
  {
    name: 'Distribution',
    note: 'Channels, loops and timing',
    tone: 'create' as const,
    icon: 'megaphone' as const,
  },
  {
    name: 'Content engines',
    note: 'Systems that publish daily',
    tone: 'idea' as const,
    icon: 'repeat' as const,
  },
  {
    name: 'Conversion',
    note: 'Pages, offers and funnels',
    tone: 'signal' as const,
    icon: 'funnel' as const,
  },
];

/** The shape of every lab report: setup, test, numbers, decision. */
const method: FlowStep[] = [
  { label: 'Hypothesis', note: 'What I expect, and why', tone: 'idea', icon: 'bulb' },
  { label: 'Setup', note: 'The test, the audience, the budget', tone: 'signal', icon: 'gear' },
  { label: 'Numbers', note: 'What actually happened', tone: 'spark', icon: 'chart' },
  {
    label: 'The call',
    note: 'Keep, kill or change, and the lesson',
    tone: 'build',
    icon: 'target',
  },
];

export default function LabPage() {
  return (
    <main id="main">
      <Masthead
        crumbs={[{ label: 'Marketing Lab', href: '/lab' }]}
        kicker="Marketing Lab / Growth tests"
        world="create"
        title={
          <>
            Marketing, run like <Squiggle world="create">experiments</Squiggle>.
          </>
        }
        intro="Hypothesis, test, result. The growth work behind the ventures, including the tests that flopped."
      />
      <Section labelledBy="method-title">
        <SectionTitle id="method-title" eyebrow="The method" title="How every lab report works." />
        <div className="mt-12">
          <FlowSteps label="Lab method" steps={method} />
        </div>
      </Section>
      <Section divided labelledBy="tracks-title">
        <SectionTitle id="tracks-title" eyebrow="Tracks" title="What gets tested here." />
        <ul aria-label="Lab tracks" className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tracks.map((track) => (
            <li
              key={track.name}
              className={cn(
                'on-world rounded-card flex min-h-[200px] flex-col p-6',
                accentBg[track.tone],
              )}
            >
              <Icon name={track.icon} className="size-8" strokeWidth={1.6} />
              <span className="mt-auto pt-10 text-2xl font-medium tracking-[-0.03em]">
                {track.name}
              </span>
              <span className="mt-1 text-sm opacity-80">{track.note}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section divided>
        <EmptyState
          art="megaphone"
          tone="create"
          title="The first lab reports are on the bench."
          body="Every report shows the setup, the numbers and the call I made, so you can steal what worked."
          cta={{ href: '/experiments', label: 'See the experiments' }}
        />
        <RelatedPosts
          posts={postsIn(['Marketing', 'Founder notes'])}
          title={'Marketing notes, meanwhile.'}
        />
      </Section>
      <Section className="pb-24 md:pb-32">
        <CtaBand
          eyebrow="Want this for your product?"
          title="Positioning, distribution and funnels, tested on real numbers."
          world="create"
        >
          <Link href="/collaborate" className={ctaPrimary}>
            Work with me →
          </Link>
          <Link href="/experiments" className={ctaSecondary}>
            All experiments
          </Link>
        </CtaBand>
      </Section>
    </main>
  );
}
