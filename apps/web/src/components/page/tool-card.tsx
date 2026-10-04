import { Card, Chip, Icon, accentBg, cn } from '@shimanto/ui';
import Image from 'next/image';
import Link from 'next/link';
import { type Tool, priceLabel } from '@/content/tools';

/** One tool on the /tools hub: cover screenshot, logo, name, what it does. Links to its page. */
export function ToolCard({ tool }: { tool: Tool }) {
  const cover = tool.screenshots[0];
  return (
    <Card
      as="article"
      interactive
      className="group flex h-full flex-col overflow-hidden p-0 md:p-0"
    >
      {cover && (
        <div className="bg-ink/5 relative aspect-[16/10] overflow-hidden">
          <Image
            src={cover.src}
            alt=""
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6 md:p-8">
        <div className="flex items-center gap-4">
          <Image
            src={tool.logo.src}
            alt=""
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-2xl"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-medium tracking-[-0.02em] md:text-2xl">
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
        <p className="text-ink-soft mt-5 text-lg leading-relaxed">{tool.tagline}</p>
        <p
          aria-hidden="true"
          className="mt-auto pt-6 font-medium underline decoration-1 underline-offset-[6px] group-hover:decoration-2"
        >
          See how it works{' '}
          <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
        </p>
      </div>
    </Card>
  );
}

/**
 * A tool as a wide feature row on /tools: its screenshot on a tinted panel on one side; logo,
 * name, price, tagline and its top capabilities on the other. `flip` swaps the sides.
 */
export function ToolFeature({ tool, flip = false }: { tool: Tool; flip?: boolean }) {
  const cover = tool.screenshots[0];
  return (
    <article className="group border-ink/10 bg-paper rounded-sheet relative grid overflow-hidden border md:grid-cols-2">
      <div
        className={cn(
          'relative flex items-center justify-center p-6 md:p-10',
          accentBg[tool.tone],
          flip && 'md:order-2',
        )}
      >
        {cover && (
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/10 transition-transform duration-500 group-hover:scale-[1.02] group-hover:-rotate-1">
            <Image
              src={cover.src}
              alt=""
              fill
              sizes="(min-width: 768px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
        )}
      </div>
      <div className="flex flex-col p-6 md:p-10">
        <div className="flex items-center gap-4">
          <Image
            src={tool.logo.src}
            alt=""
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-2xl"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-2xl font-medium tracking-[-0.03em] md:text-3xl">
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
        <p className="mt-6 text-lg leading-relaxed">{tool.tagline}</p>
        <ul className="mt-6 space-y-3">
          {tool.capabilities.slice(0, 3).map((c) => (
            <li key={c.title} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  'on-world grid size-8 shrink-0 place-items-center rounded-lg',
                  accentBg[tool.tone],
                )}
              >
                <Icon name={c.icon} className="size-4" />
              </span>
              <span>
                <span className="block font-medium">{c.title}</span>
                <span className="text-ink-soft block text-sm leading-snug">{c.body}</span>
              </span>
            </li>
          ))}
        </ul>
        <p
          aria-hidden="true"
          className="mt-auto pt-8 font-medium underline decoration-1 underline-offset-[6px] group-hover:decoration-2"
        >
          See how it works{' '}
          <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
        </p>
      </div>
    </article>
  );
}
