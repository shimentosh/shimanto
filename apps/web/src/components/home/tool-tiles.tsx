import { Chip, Icon, accentBg, cn } from '@shimanto/ui';
import Image from 'next/image';
import Link from 'next/link';
import { type Tool, priceLabel } from '@/content/tools';

/** Logo, name and kind, with the price chip pushed to the end. */
function ToolHead({ tool, size }: { tool: Tool; size: 'lg' | 'sm' }) {
  return (
    <div className="flex items-center gap-4">
      <Image
        src={tool.logo.src}
        alt=""
        width={56}
        height={56}
        className={cn('shrink-0 rounded-2xl', size === 'lg' ? 'size-14' : 'size-11 rounded-xl')}
      />
      <div className="min-w-0 flex-1">
        <h3
          className={cn(
            'font-medium',
            size === 'lg'
              ? 'text-2xl tracking-[-0.03em] md:text-3xl'
              : 'text-xl tracking-[-0.02em]',
          )}
        >
          <Link href={`/tools/${tool.slug}`} className="after:absolute after:inset-0">
            {tool.name}
          </Link>
        </h3>
        <p className="text-ink-soft text-sm">{tool.kind}</p>
      </div>
      <Chip variant="status" tone={tool.price ? 'spark' : 'build'}>
        {priceLabel(tool)}
      </Chip>
    </div>
  );
}

function SeeHow() {
  return (
    <p
      aria-hidden="true"
      className="mt-auto pt-6 font-medium underline decoration-1 underline-offset-[6px] group-hover:decoration-2"
    >
      See how it works{' '}
      <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
    </p>
  );
}

/**
 * The newest tool, big: two screenshots fanned on its world colour (the front one bleeds off the
 * bottom edge), then what it is and the first few things it does.
 */
export function ToolSpotlight({ tool }: { tool: Tool }) {
  const [front, back] = tool.screenshots;
  return (
    <article className="group border-ink/10 bg-paper rounded-sheet relative flex h-full flex-col overflow-hidden border">
      <div
        className={cn(
          'relative aspect-[16/10] overflow-hidden px-6 pt-16 sm:px-10 sm:pt-20 lg:flex lg:aspect-auto lg:min-h-80 lg:flex-1 lg:flex-col lg:justify-end',
          accentBg[tool.tone],
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-1/3 -left-1/4 size-2/3 rounded-full bg-white/25 blur-3xl"
        />
        <ul aria-label="Highlights" className="absolute top-5 left-6 z-10 flex gap-2 sm:left-10">
          <li className="bg-paper text-ink rounded-pill flex items-center gap-2 px-3 py-1 text-sm font-medium shadow-sm">
            <span className="relative grid size-1.5 place-items-center" aria-hidden="true">
              <span className="motif-ping bg-build absolute inset-0 rounded-full" />
              <span className="bg-build relative size-1.5 rounded-full" />
            </span>
            Newest
          </li>
          {tool.source && (
            <li className="bg-ink text-canvas rounded-pill flex items-center gap-1.5 px-3 py-1 text-sm font-medium shadow-sm">
              <Icon name="github" className="size-4" />
              Open source
            </li>
          )}
        </ul>
        {back && (
          <Image
            src={back.src}
            alt=""
            width={back.width}
            height={back.height}
            sizes="(min-width: 1024px) 40vw, 70vw"
            className="absolute top-[22%] right-[-12%] w-[68%] rotate-6 rounded-xl opacity-90 shadow-xl ring-1 ring-black/10 transition-transform duration-500 motion-safe:group-hover:translate-x-2 motion-safe:group-hover:rotate-[8deg]"
          />
        )}
        {front && (
          <Image
            src={front.src}
            alt={front.alt}
            width={front.width}
            height={front.height}
            sizes="(min-width: 1024px) 50vw, 90vw"
            className="relative w-[86%] rounded-t-xl shadow-[0_-12px_48px_-12px_rgb(0_0_0/0.45)] ring-1 ring-black/10 transition-transform duration-500 motion-safe:group-hover:-translate-y-2 motion-safe:group-hover:-rotate-1"
          />
        )}
      </div>
      <div className="flex flex-col p-6 md:p-8">
        <ToolHead tool={tool} size="lg" />
        <p className="mt-5 text-lg leading-relaxed">{tool.tagline}</p>
        <ul aria-label="What it does" className="mt-6 flex flex-wrap gap-2">
          {tool.capabilities.slice(0, 5).map((c) => (
            <li
              key={c.title}
              className="border-ink/10 bg-canvas rounded-pill flex items-center gap-2 border py-1 pr-3 pl-1 text-sm font-medium"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'on-world grid size-6 place-items-center rounded-full',
                  accentBg[tool.tone],
                )}
              >
                <Icon name={c.icon} className="size-3.5" />
              </span>
              {c.title}
            </li>
          ))}
        </ul>
        <SeeHow />
      </div>
    </article>
  );
}

/** A smaller tool: a cropped corner of its screenshot on its world colour, then the basics. */
export function ToolTile({ tool }: { tool: Tool }) {
  const cover = tool.screenshots[0];
  return (
    <article className="group border-ink/10 bg-paper rounded-card relative flex h-full flex-col overflow-hidden border">
      <div className={cn('relative h-36 overflow-hidden pt-6 pl-6 md:h-40', accentBg[tool.tone])}>
        {cover && (
          <Image
            src={cover.src}
            alt=""
            width={cover.width}
            height={cover.height}
            sizes="(min-width: 1024px) 30vw, 90vw"
            className="w-[125%] max-w-none origin-top-left rounded-tl-xl shadow-xl ring-1 ring-black/10 transition-transform duration-500 motion-safe:group-hover:-translate-x-1 motion-safe:group-hover:-translate-y-1"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <ToolHead tool={tool} size="sm" />
        <p className="text-ink-soft mt-4 line-clamp-2 leading-relaxed">{tool.tagline}</p>
        <SeeHow />
      </div>
    </article>
  );
}
