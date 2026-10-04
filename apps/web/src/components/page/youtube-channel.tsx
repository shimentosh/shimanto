import { Card, Icon } from '@shimanto/ui';
import Image from 'next/image';
import { youtubeChannel } from '@/content/catalog';

/** The mentosUNCLE channel: avatar, headline numbers and the three most-watched videos. */
export function YouTubeChannel() {
  const channel = youtubeChannel;
  return (
    <Card as="article" className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-5">
        <Image
          src={channel.avatar}
          alt={`${channel.name} channel picture`}
          width={80}
          height={80}
          className="size-16 rounded-full md:size-20"
        />
        <div className="min-w-0 flex-1">
          <p className="text-ink-soft text-sm font-medium">
            YouTube · {channel.handle} · {channel.years}
          </p>
          <h3 className="mt-1 text-3xl font-medium tracking-[-0.035em] md:text-4xl">
            {channel.name}
          </h3>
        </div>
        <a
          href={channel.url}
          target="_blank"
          rel="noopener"
          className="group bg-ink text-canvas rounded-pill inline-flex items-center gap-2 px-5 py-2.5 font-medium transition-opacity hover:opacity-85"
        >
          <span>Visit the channel</span>
          <Icon name="external" className="size-4" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </div>

      <p className="text-ink-soft mt-6 max-w-[60ch] text-lg leading-relaxed">{channel.summary}</p>

      <dl className="border-ink/10 mt-8 grid grid-cols-3 gap-4 border-y py-6">
        {channel.stats.map((stat) => (
          <div key={stat.label} className="flex flex-col-reverse">
            <dt className="text-ink-soft mt-1">{stat.label}</dt>
            <dd className="text-4xl font-medium tracking-tighter md:text-6xl">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-ink-soft mt-8 text-sm font-medium">Most watched</p>
      <ul className="mt-4 grid gap-6 md:grid-cols-3">
        {channel.topVideos.map((video) => (
          <li key={video.id}>
            <a
              href={`https://www.youtube.com/watch?v=${video.id}`}
              target="_blank"
              rel="noopener"
              className="group block"
            >
              <span className="bg-ink/5 relative block aspect-video overflow-hidden rounded-2xl">
                <Image
                  src={`/wins/${video.id}.jpg`}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 30vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <span className="bg-canvas/90 text-ink rounded-pill absolute bottom-3 left-3 px-3 py-1 text-sm font-semibold">
                  {video.views} views
                </span>
              </span>
              <span className="mt-3 block text-lg font-medium group-hover:underline">
                {video.title}
                <span className="sr-only"> (opens on YouTube)</span>
              </span>
              <span className="text-ink-soft block text-sm">{video.note}</span>
            </a>
          </li>
        ))}
      </ul>
    </Card>
  );
}
