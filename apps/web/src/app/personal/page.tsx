import { Squiggle, accentBg, cn } from '@shimanto/ui';
import Image from 'next/image';
import Link from 'next/link';
import { EmptyState } from '@/components/page/empty-state';
import { PageHero } from '@/components/page/page-hero';
import { Section, SectionTitle } from '@/components/page/section';
import { interests, musicChannel, signatureWin, youtubeChannel } from '@/content/catalog';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Personal side',
  description: 'The person behind the builds: interests, stories and random things Shimanto loves.',
  path: '/personal',
});

export default function PersonalPage() {
  return (
    <main id="main">
      <PageHero
        art="coffee"
        eyebrow="Personal side"
        stickers={['Interests', 'Stories']}
        world="spark"
        crumbs={[{ label: 'Personal side', href: '/personal' }]}
        title={
          <>
            Off the <Squiggle world="build">clock</Squiggle>.
          </>
        }
        intro="Not everything has to be a business. The interests, stories and random things that keep me curious."
      />
      <Section labelledBy="interests-title">
        <SectionTitle id="interests-title" eyebrow="Interests" title="What fills the gaps." />
        <ul className="mt-8 flex flex-wrap gap-2">
          {interests.map((interest) => (
            <li
              key={interest.name}
              className="border-ink/15 rounded-pill inline-flex items-center gap-2 border px-4 py-2 text-lg"
            >
              <span
                aria-hidden="true"
                className={cn('size-2 rounded-full', accentBg[interest.tone])}
              />
              {interest.name}
            </li>
          ))}
        </ul>
      </Section>
      <Section divided labelledBy="making-title">
        <SectionTitle id="making-title" eyebrow="For fun" title="Off the clock, I make things." />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Link href="/creative" className="group rounded-card relative block overflow-hidden">
            <span className="relative block aspect-video">
              <Image
                src={`/music/${musicChannel.videos[0].id}.jpg`}
                alt=""
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-linear-to-t from-black/85 via-black/20 to-transparent"
              />
            </span>
            <span className="absolute inset-x-0 bottom-0 p-5 text-white md:p-6">
              <span className="text-sm font-medium text-white/75">Music</span>
              <span className="mt-1 block text-2xl font-medium tracking-[-0.03em]">
                I write and release songs →
              </span>
            </span>
          </Link>
          <Link
            href="/work/mentosuncle"
            className="group border-ink/10 bg-paper hover:border-ink/25 rounded-card flex flex-col justify-between gap-8 border p-6 transition-colors md:p-8"
          >
            <span className="flex items-center gap-4">
              <Image
                src={youtubeChannel.avatar}
                alt=""
                width={56}
                height={56}
                className="size-14 rounded-full"
              />
              <span>
                <span className="text-ink-soft block text-sm font-medium">Comedy · YouTube</span>
                <span className="block text-2xl font-medium tracking-[-0.03em]">
                  {youtubeChannel.name}
                </span>
              </span>
            </span>
            <span className="text-ink-soft text-lg leading-relaxed">
              Bangla parody songs about exams, Eid and the summer heat. One of them passed{' '}
              {signatureWin.value} views.
            </span>
            <span className="font-medium underline decoration-1 underline-offset-[6px] group-hover:decoration-2">
              Read the story →
            </span>
          </Link>
        </div>
      </Section>
      <Section className="pb-32 md:pb-40">
        <EmptyState
          art="guitar"
          tone="spark"
          title="Stories coming soon."
          body="Behind-the-scenes moments, favourite things and the occasional completely random post."
          cta={{ href: '/about', label: 'Read the about page' }}
        />
      </Section>
    </main>
  );
}
