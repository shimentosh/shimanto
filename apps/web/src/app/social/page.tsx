import { Button, Icon, Squiggle } from '@shimanto/ui';
import Image from 'next/image';
import Link from 'next/link';
import { PageHero } from '@/components/page/page-hero';
import { Section, SectionTitle } from '@/components/page/section';
import { SocialIcon } from '@/components/page/social-icon';
import { musicChannel, youtubeChannel } from '@/content/catalog';
import { formatAudience, socialProfiles } from '@/content/navigation';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Social Universe',
  description: 'Where to find Shimanto online: YouTube, Instagram, Facebook and TikTok.',
  path: '/social',
});

export default function SocialPage() {
  const profiles = socialProfiles.filter((p) => p.href);
  return (
    <main id="main">
      <PageHero
        art="megaphone"
        eyebrow="Social universe"
        stickers={profiles.map((p) => p.label)}
        world="build"
        crumbs={[{ label: 'Social Universe', href: '/social' }]}
        title={
          <>
            Distributed everywhere. <Squiggle world="build">Owned</Squiggle> here.
          </>
        }
        intro="Social media is where ideas travel. This site is where they live. Follow along wherever you already are."
      />

      <Section labelledBy="platforms-title">
        <SectionTitle id="platforms-title" eyebrow="Platforms" title="Pick your feed." />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {profiles.map((profile) => (
            <li key={profile.label}>
              <a
                href={profile.href!}
                rel="me noopener"
                target="_blank"
                className="group border-ink/10 bg-paper hover:border-ink/25 rounded-card flex h-full items-center gap-5 border p-5 transition-[transform,border-color] duration-300 motion-safe:hover:-translate-y-0.5 md:p-6"
              >
                <SocialIcon platform={profile.label} className="size-14 rounded-2xl" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xl font-medium tracking-[-0.02em]">
                    {profile.label}
                  </span>
                  <span className="text-ink-soft block truncate">{profile.handle}</span>
                  {profile.audience && (
                    <span className="mt-1 block text-sm font-medium">
                      {formatAudience(profile.audience)}{' '}
                      <span className="text-ink-soft font-normal">{profile.audienceLabel}</span>
                    </span>
                  )}
                </span>
                <span className="border-ink/15 group-hover:bg-ink group-hover:text-canvas grid size-11 shrink-0 place-items-center rounded-full border transition-colors">
                  <Icon name="external" className="size-4" />
                </span>
                <span className="sr-only">(follow on {profile.label}, opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section divided className="pb-32 md:pb-40" labelledBy="channels-title">
        <SectionTitle
          id="channels-title"
          eyebrow="On YouTube"
          title={
            <>
              Where the <Squiggle world="create">music</Squiggle> lives.
            </>
          }
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <a
            href={musicChannel.url}
            target="_blank"
            rel="noopener"
            className="group rounded-card relative block overflow-hidden"
          >
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
              <span className="text-sm font-medium text-white/75">Now · {musicChannel.handle}</span>
              <span className="mt-1 block text-2xl font-medium tracking-[-0.03em]">
                {musicChannel.videos.length} music videos and counting
              </span>
            </span>
            <span className="sr-only">(opens on YouTube)</span>
          </a>
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
                <span className="text-ink-soft block text-sm font-medium">
                  Before · {youtubeChannel.years}
                </span>
                <span className="block text-2xl font-medium tracking-[-0.03em]">
                  {youtubeChannel.name}
                </span>
              </span>
            </span>
            <span className="grid grid-cols-3 gap-4">
              {youtubeChannel.stats.map((stat) => (
                <span key={stat.label}>
                  <span className="block text-3xl font-medium tracking-tighter">{stat.value}</span>
                  <span className="text-ink-soft block text-sm">{stat.label}</span>
                </span>
              ))}
            </span>
            <span className="font-medium underline decoration-1 underline-offset-[6px] group-hover:decoration-2">
              Read the story →
            </span>
          </Link>
        </div>
        <div className="mt-10">
          <Button href="/creative" variant="text">
            Watch the music in the creative archive →
          </Button>
        </div>
      </Section>
    </main>
  );
}
