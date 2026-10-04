import { Button, Icon, Squiggle } from '@shimanto/ui';
import Link from 'next/link';
import { RelatedPosts } from '@/components/blog/related-posts';
import { CategoryGrid } from '@/components/page/category-grid';
import { Masthead } from '@/components/page/masthead';
import { Section, SectionTitle } from '@/components/page/section';
import { YouTubeLite } from '@/components/page/youtube-lite';
import { type MusicVideo, creativeDisciplines, musicVideos, signatureWin } from '@/content/catalog';
import { socialProfiles } from '@/content/navigation';
import { postsIn } from '@/lib/blog';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Creative Archive',
  description:
    'Music videos, songwriting, guitar, video and design by Shimanto, including a song with 35M+ views.',
  path: '/creative',
});

const WAVE = [
  30, 52, 40, 72, 48, 88, 60, 44, 76, 36, 82, 58, 42, 68, 50, 90, 38, 64, 54, 80, 46, 70, 34, 62,
  56, 84, 42, 74, 48, 66,
];

const youtube = socialProfiles.find((p) => p.label === 'YouTube');
const [featured, ...rest] = musicVideos;

function videoTitle(video: MusicVideo) {
  return `${video.title} — ${video.credit}`;
}

/** Title, original-script title, credit and kind under a video. */
function VideoMeta({ video, large = false }: { video: MusicVideo; large?: boolean }) {
  return (
    <div className="mt-4">
      <p className="text-ink-soft text-xs font-medium tracking-wide uppercase">{video.kind}</p>
      <h3
        className={
          large
            ? 'mt-1.5 text-2xl font-medium tracking-[-0.03em] md:text-3xl'
            : 'mt-1 text-lg font-medium tracking-[-0.02em]'
        }
      >
        {video.title}
        {video.native && (
          <span lang="bn" className="font-bangla text-ink-soft ml-2 font-normal">
            {video.native}
          </span>
        )}
      </h3>
      <p className="text-ink-soft mt-1 text-sm">{video.credit}</p>
    </div>
  );
}

export default function CreativePage() {
  return (
    <main id="main">
      <Masthead
        crumbs={[{ label: 'Creative Archive', href: '/creative' }]}
        kicker="Creative archive / Music · Guitar · Video · Design"
        world="create"
        title={
          <>
            Before startups, there was a <Squiggle world="create">song</Squiggle>.
          </>
        }
        intro="Music, songwriting, guitar, video and design: the creative side that still shapes how I build."
      />

      <Section labelledBy="releases-title">
        <SectionTitle
          id="releases-title"
          eyebrow="Latest releases"
          title={
            <>
              Recent music <Squiggle world="create">videos</Squiggle>.
            </>
          }
          action={
            youtube?.href && (
              <Button href={youtube.href} variant="text">
                All videos on YouTube →
              </Button>
            )
          }
        />
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.65fr_1fr] lg:gap-10">
          {featured && (
            <article>
              <YouTubeLite id={featured.youtubeId} title={videoTitle(featured)} priority />
              <VideoMeta video={featured} large />
            </article>
          )}
          <div className="grid content-start gap-8">
            {rest.map((video) => (
              <article key={video.youtubeId}>
                <YouTubeLite id={video.youtubeId} title={videoTitle(video)} />
                <VideoMeta video={video} />
              </article>
            ))}
          </div>
        </div>
      </Section>

      <Section labelledBy="song-title">
        <div className="bg-create on-world rounded-sheet relative overflow-hidden p-8 md:p-12">
          <div className="grid items-end gap-10 md:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="text-sm font-medium">The signature story</p>
              <h2
                id="song-title"
                className="mt-3 text-3xl leading-tight font-medium tracking-[-0.035em] md:text-5xl"
              >
                One song, {signatureWin.value} views.
              </h2>
              <p className="mt-5 max-w-[44ch] text-lg">
                An older song of mine found its audience on {signatureWin.platform} and kept going.
                It is still the best lesson in distribution I have had.
              </p>
            </div>
            <div aria-hidden="true">
              <p className="text-right text-[clamp(64px,10vw,128px)] leading-none font-medium tracking-[-0.06em]">
                {signatureWin.value}
              </p>
              <div className="mt-6 flex h-20 items-end gap-1">
                {WAVE.map((height, i) => (
                  <span
                    key={i}
                    className="wave-bar bg-on-world/80 flex-1 rounded-full"
                    style={{ height: `${height}%`, animationDelay: `${(i % 9) * -0.13}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section divided labelledBy="disciplines-title">
        <SectionTitle
          id="disciplines-title"
          eyebrow="Disciplines"
          title="Six ways I make things."
        />
        <CategoryGrid label="Creative disciplines" className="mt-8" items={creativeDisciplines} />
      </Section>

      <Section divided className="pb-24 md:pb-32">
        <div
          className="bg-night text-cream rounded-sheet flex flex-col items-start justify-between gap-8 p-8 ring-1 ring-white/10 md:flex-row md:items-center md:p-12"
          style={{
            backgroundImage:
              'radial-gradient(120% 140% at 100% 0%, rgb(255 112 89 / 0.28), transparent 55%)',
          }}
        >
          <div>
            <p className="font-mono text-xs tracking-[0.14em] text-white/60 uppercase">
              Keep listening
            </p>
            <h2 className="mt-3 text-2xl font-medium tracking-[-0.03em] md:text-4xl">
              More music lives on YouTube.
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {youtube?.href && (
              <a
                href={youtube.href}
                target="_blank"
                rel="noopener"
                className="bg-create text-on-world rounded-pill inline-flex items-center gap-2 px-5 py-2.5 font-medium transition-opacity hover:opacity-90"
              >
                {youtube.handle ?? 'YouTube'}
                <Icon name="external" className="size-4" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            )}
            <Link
              href="/personal"
              className="rounded-pill inline-flex items-center px-5 py-2.5 font-medium ring-1 ring-white/20 transition-colors hover:bg-white/10"
            >
              The personal side →
            </Link>
          </div>
        </div>
        <RelatedPosts posts={postsIn(['Marketing'])} title="The lesson behind the 35M+." />
      </Section>
    </main>
  );
}
