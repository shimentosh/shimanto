import { Squiggle } from '@shimanto/ui';
import Link from 'next/link';
import { CtaBand, Masthead, ctaPrimary, ctaSecondary } from '@/components/page/masthead';
import { Section } from '@/components/page/section';
import { VentureGrid } from '@/components/page/venture-grid';
import { MoreBuildsNote } from '@/components/page/venture-card';
import { ventures } from '@/content/catalog';
import { home } from '@/content/home';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Work',
  description: `Ventures and builds by Shimanto: ${new Intl.ListFormat('en', { type: 'conjunction' }).format(ventures.map((v) => v.name))}.`,
  path: '/work',
});

export default function WorkPage() {
  const { journey } = home.hero;
  const byStatus = (status: string) => ventures.filter((v) => v.status === status).length;
  const stats = [
    { value: String(ventures.length), label: 'ventures and builds' },
    { value: String(byStatus('LIVE')), label: 'live right now' },
    { value: String(byStatus('BUILDING') + byStatus('PARTIAL')), label: 'in progress' },
    { value: `${new Date().getFullYear() - journey.since}+`, label: 'years building online' },
  ];

  return (
    <main id="main">
      <Masthead
        crumbs={[{ label: 'Work', href: '/work' }]}
        kicker={`Builds & ventures / ${ventures.length} ventures`}
        world="build"
        title={
          <>
            Things I&apos;ve <Squiggle world="build">built</Squiggle>.
          </>
        }
        intro="Companies, products and systems. Each one gets a full case study: why it exists, how it works, what it taught me."
      >
        <dl className="grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="border-ink/10 flex flex-col-reverse border-l pl-5">
              <dt className="text-ink-soft mt-1 text-sm">{stat.label}</dt>
              <dd className="text-4xl font-medium tracking-[-0.045em] md:text-5xl">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </Masthead>

      <Section labelledBy="ventures-title">
        <h2 id="ventures-title" className="sr-only">
          All ventures
        </h2>
        <VentureGrid ventures={ventures} />
        <MoreBuildsNote />
      </Section>

      <Section className="pb-24 md:pb-32">
        <CtaBand
          eyebrow="Got something to build?"
          title="Let’s make the next one together."
          world="build"
        >
          <Link href="/collaborate?intent=BUILD_SOMETHING" className={ctaPrimary}>
            Start a project →
          </Link>
          <Link href="/experiments" className={ctaSecondary}>
            See the experiments
          </Link>
        </CtaBand>
      </Section>
    </main>
  );
}
