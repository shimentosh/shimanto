import { type Accent, Icon, accentBg, cn } from '@shimanto/ui';
import Image from 'next/image';
import { Section, SectionTitle } from '@/components/page/section';
import type { Tool, ToolboxGroup, ToolboxItem } from '@/content/tools';

/** Soft world-colour washes; literal strings so Tailwind generates them. */
const tint: Record<Accent, string> = {
  build: 'bg-build/15',
  create: 'bg-create/15',
  spark: 'bg-spark/15',
  signal: 'bg-signal/15',
  idea: 'bg-idea/15',
};

const ring: Record<Accent, string> = {
  build: 'ring-build/30',
  create: 'ring-create/30',
  spark: 'ring-spark/30',
  signal: 'ring-signal/30',
  idea: 'ring-idea/30',
};

function IconTile({
  icon,
  tone,
  size = 'md',
}: {
  icon: Tool['capabilities'][number]['icon'];
  tone: Accent;
  size?: 'md' | 'lg';
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'on-world grid shrink-0 place-items-center',
        size === 'lg' ? 'size-14 rounded-2xl' : 'size-10 rounded-xl',
        accentBg[tone],
      )}
    >
      <Icon name={icon} className={size === 'lg' ? 'size-6' : 'size-5'} />
    </span>
  );
}

/** A tool with a screenshot: the shot in an app-window frame on its world wash, text beside it. */
function Showcase({
  item,
  tone,
  index,
  flip,
}: {
  item: ToolboxItem & { shot: NonNullable<ToolboxItem['shot']> };
  tone: Accent;
  index: number;
  flip: boolean;
}) {
  return (
    <article className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-14">
      <div
        className={cn(
          'group rounded-sheet relative overflow-hidden p-3 sm:p-6',
          tint[tone],
          flip && 'lg:order-2',
        )}
      >
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute -right-1/4 -bottom-1/3 size-2/3 rounded-full opacity-40 blur-3xl',
            accentBg[tone],
          )}
        />
        <figure
          className={cn(
            'relative overflow-hidden rounded-xl bg-[#0b1220] shadow-[0_24px_48px_-24px_rgb(0_0_0/0.6)] ring-1 transition-transform duration-500 motion-safe:group-hover:-translate-y-1',
            ring[tone],
          )}
        >
          <div
            aria-hidden="true"
            className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2"
          >
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 truncate font-mono text-[11px] text-white/50">
              DotMate · {item.name}
            </span>
          </div>
          <Image
            src={item.shot.src}
            alt={item.shot.alt}
            width={item.shot.width}
            height={item.shot.height}
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="h-auto w-full cursor-zoom-in"
          />
        </figure>
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-4">
          <IconTile icon={item.icon} tone={tone} />
          <span className="text-ink-soft font-mono text-sm tracking-[0.14em]">
            {String(index).padStart(2, '0')}
          </span>
        </div>
        <h4 className="mt-5 text-2xl font-medium tracking-[-0.03em] md:text-3xl">{item.name}</h4>
        <p className="text-ink-soft mt-3 text-lg leading-relaxed">{item.body}</p>
        {item.points && (
          <ul className="mt-6 space-y-3">
            {item.points.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    'on-world mt-0.5 grid size-5 shrink-0 place-items-center rounded-full',
                    accentBg[tone],
                  )}
                >
                  <Icon name="check" className="size-3" strokeWidth={2.5} />
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

/** A tool without a screenshot, as a compact card. */
function Mini({ item, tone, index }: { item: ToolboxItem; tone: Accent; index: number }) {
  return (
    <article className="border-ink/10 bg-paper rounded-card hover:border-ink/25 flex h-full flex-col gap-5 border p-6 transition-[transform,border-color] duration-300 motion-safe:hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <IconTile icon={item.icon} tone={tone} />
        <span className="text-ink-soft font-mono text-sm tracking-[0.14em]">
          {String(index).padStart(2, '0')}
        </span>
      </div>
      <div>
        <h4 className="text-xl font-medium tracking-[-0.02em]">{item.name}</h4>
        <p className="text-ink-soft mt-2 leading-relaxed">{item.body}</p>
      </div>
    </article>
  );
}

function Group({ group, start }: { group: ToolboxGroup; start: number }) {
  const shown = group.items.filter(
    (item): item is ToolboxItem & { shot: NonNullable<ToolboxItem['shot']> } => !!item.shot,
  );
  const minis = group.items.filter((item) => !item.shot);
  const number = (item: ToolboxItem) => start + group.items.indexOf(item);
  return (
    <section
      id={`toolbox-${group.id}`}
      aria-labelledby={`toolbox-${group.id}-title`}
      className="scroll-mt-40"
    >
      <header className="border-ink/10 flex flex-col gap-5 border-t pt-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-5">
          <IconTile icon={group.icon} tone={group.tone} size="lg" />
          <div>
            <p className="text-ink-soft text-sm font-medium">
              {group.items.length} {group.items.length === 1 ? 'tool' : 'tools'}
            </p>
            <h3
              id={`toolbox-${group.id}-title`}
              className="text-3xl font-medium tracking-[-0.04em] md:text-4xl"
            >
              {group.title}
            </h3>
          </div>
        </div>
        <p className="text-ink-soft max-w-[42ch] text-lg leading-relaxed sm:text-right">
          {group.blurb}
        </p>
      </header>
      <ul className="mt-12 space-y-16 md:space-y-24">
        {shown.map((item, i) => (
          <li key={item.name}>
            <Showcase item={item} tone={group.tone} index={number(item)} flip={i % 2 === 1} />
          </li>
        ))}
      </ul>
      {minis.length > 0 && (
        <ul className={cn('grid gap-6 sm:grid-cols-2', shown.length > 0 && 'mt-16 md:mt-20')}>
          {minis.map((item) => (
            <li key={item.name}>
              <Mini item={item} tone={group.tone} index={number(item)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Every tool inside an app, grouped, with a sticky jump bar between the groups. */
export function ToolboxSection({ tool, groups }: { tool: Tool; groups: ToolboxGroup[] }) {
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const starts = groups.map(
    (_, i) => 1 + groups.slice(0, i).reduce((n, g) => n + g.items.length, 0),
  );
  return (
    <Section divided labelledBy="toolbox-title">
      <SectionTitle
        id="toolbox-title"
        eyebrow="What’s inside"
        title={`${total} tools.`}
        rest="One app."
        action={
          <p className="text-ink-soft max-w-[36ch] text-lg">
            Everything {tool.name} does, grouped the way it is in the app.
          </p>
        }
      />
      <nav
        aria-label="Tool groups"
        className="bg-canvas/80 border-ink/10 sticky top-16 z-20 -mx-4 mt-10 overflow-x-auto border-y px-4 py-3 backdrop-blur-md md:top-20"
      >
        <ul className="flex gap-2">
          {groups.map((group) => (
            <li key={group.id} className="shrink-0">
              <a
                href={`#toolbox-${group.id}`}
                className="border-ink/10 bg-paper hover:border-ink/30 rounded-pill flex items-center gap-2 border py-1.5 pr-4 pl-1.5 text-sm font-medium transition-colors"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'on-world grid size-6 place-items-center rounded-full',
                    accentBg[group.tone],
                  )}
                >
                  <Icon name={group.icon} className="size-3.5" />
                </span>
                {group.title}
                <span className="text-ink-soft">{group.items.length}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-16 space-y-24 md:space-y-32">
        {groups.map((group, i) => (
          <Group key={group.id} group={group} start={starts[i] ?? 1} />
        ))}
      </div>
    </Section>
  );
}

/** The AI engines an app runs locally, as a row of cards. */
export function EnginesSection({
  engines,
  tone,
}: {
  engines: NonNullable<Tool['engines']>;
  tone: Accent;
}) {
  return (
    <Section divided labelledBy="engines-title">
      <div className="bg-night text-cream rounded-sheet relative overflow-hidden border border-white/10 p-6 sm:p-10 md:p-14">
        <div
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute -top-1/3 -right-1/4 size-2/3 rounded-full opacity-30 blur-3xl',
            accentBg[tone],
          )}
        />
        <div className="relative">
          <p className="flex items-center gap-2 text-sm font-medium text-white/60">
            <Icon name="cpu" className="size-4" />
            Local AI
          </p>
          <h2
            id="engines-title"
            className="mt-4 max-w-[18ch] text-[clamp(32px,4.4vw,56px)] leading-[1.02] font-medium tracking-[-0.045em]"
          >
            The AI runs on your hardware.
          </h2>
          <p className="mt-4 max-w-[56ch] text-lg leading-relaxed text-white/65">
            Models download once from their official sources, then work offline. No API keys, no
            credits, no uploads.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {engines.map((engine) => (
              <li
                key={engine.name}
                className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5"
              >
                <span className="flex items-center justify-between">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'on-world grid size-10 place-items-center rounded-xl',
                      accentBg[tone],
                    )}
                  >
                    <Icon name={engine.icon} className="size-5" />
                  </span>
                  <span className="rounded-pill border border-white/15 px-2.5 py-0.5 font-mono text-[11px] text-white/70">
                    {engine.size}
                  </span>
                </span>
                <span className="mt-6 text-xs font-medium tracking-[0.12em] text-white/50 uppercase">
                  {engine.job}
                </span>
                <span className="mt-1 text-xl font-medium tracking-[-0.02em]">{engine.name}</span>
                <span className="mt-2 text-sm leading-snug text-white/60">{engine.note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

/** Questions and answers, as native disclosure rows. */
export function FaqSection({ faq }: { faq: NonNullable<Tool['faq']> }) {
  return (
    <Section divided labelledBy="faq-title">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <SectionTitle
          id="faq-title"
          eyebrow="FAQ"
          title="Good questions."
          className="self-start lg:sticky lg:top-28"
        />
        <ul className="border-ink/10 border-b">
          {faq.map((item) => (
            <li key={item.q} className="border-ink/10 border-t">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-lg font-medium md:text-xl [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span
                    aria-hidden="true"
                    className="border-ink/15 grid size-9 shrink-0 place-items-center rounded-full border transition-transform duration-300 group-open:rotate-45"
                  >
                    <Icon name="plus" className="size-4" />
                  </span>
                </summary>
                <p className="text-ink-soft -mt-2 max-w-[62ch] pb-6 text-lg leading-relaxed">
                  {item.a}
                </p>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
