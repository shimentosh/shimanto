import { Squiggle } from '@shimanto/ui';
import Link from 'next/link';
import { PageHero } from '@/components/page/page-hero';
import { Section, SectionTitle } from '@/components/page/section';
import { SkillsGalaxy } from '@/components/page/skills-galaxy';
import { skills } from '@/content/catalog';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Skills Galaxy',
  description:
    'The nine skills Shimanto builds with: business, marketing, product, technology, AI, automation, content, design and music.',
  path: '/skills',
});

export default function SkillsPage() {
  return (
    <main id="main">
      <PageHero
        art="orbit"
        eyebrow="Skills galaxy"
        stickers={['9 skills', '1 system']}
        world="build"
        crumbs={[{ label: 'Skills Galaxy', href: '/skills' }]}
        title={
          <>
            Nine skills, one <Squiggle world="build">system</Squiggle>.
          </>
        }
        intro="Pick a planet to see what it means to me and where it shows up in the work."
      />
      <Section>
        <SkillsGalaxy skills={skills} />
      </Section>
      <Section className="pb-32 md:pb-40" labelledBy="all-skills-title">
        <SectionTitle id="all-skills-title" eyebrow="All skills" title="The full list." />
        <dl className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-3">
          {skills.map((skill) => (
            <div key={skill.id}>
              <dt className="text-xl font-medium">{skill.name}</dt>
              <dd className="text-ink-soft mt-1">
                {skill.summary}{' '}
                {skill.links[0] && (
                  <Link
                    href={skill.links[0].href}
                    className="text-ink font-medium underline underline-offset-4"
                  >
                    {skill.links[0].label}
                  </Link>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
    </main>
  );
}
