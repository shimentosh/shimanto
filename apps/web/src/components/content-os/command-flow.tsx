'use client';

import { Icon, type IconName, cn, useInView, usePrefersReducedMotion } from '@shimanto/ui';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import type { ContentOsCopy } from '@/content/content-os';

type Commands = ContentOsCopy['commands'];
type Command = Commands['list'][number];

const TICK = 40;
const TYPE_MS = 32;
const WRITE_MS = 24;

/** When each beat of one run starts (ms), from the lengths of its lines. */
function timeline(item: Command, contextCount: number) {
  const context = item.command.length * TYPE_MS + 300;
  const humanize = context + contextCount * 180 + 600;
  const write = humanize + 900;
  const output = write + item.human.length * WRITE_MS + 400;
  return { context, humanize, write, output, end: output + 3200 };
}

/** One stage of the run: a node on the rail, a title and what happens there. */
function Stage({
  icon,
  title,
  on,
  done,
  last = false,
  children,
}: {
  icon: IconName;
  title: string;
  on: boolean;
  done: boolean;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <li className="relative grid grid-cols-[40px_minmax(0,1fr)] gap-4">
      {/* The rail: fills as the run moves past this stage */}
      {!last && (
        <span
          aria-hidden="true"
          className="absolute top-11 bottom-[-12px] left-[19px] w-0.5 bg-white/10"
        >
          <span
            className={cn(
              'from-signal to-idea block h-full origin-top bg-gradient-to-b transition-transform duration-700',
              done ? 'scale-y-100' : 'scale-y-0',
            )}
          />
        </span>
      )}
      <span
        aria-hidden="true"
        className={cn(
          'relative grid size-10 place-items-center rounded-full ring-1 transition duration-500',
          on
            ? 'bg-signal text-[#0E0F0C] shadow-[0_0_28px_rgba(46,155,247,0.65)] ring-transparent'
            : 'text-ink-soft bg-white/[0.04] ring-white/15',
        )}
      >
        <Icon name={done ? 'check' : icon} className="size-4" />
      </span>
      <div
        className={cn(
          'rounded-[16px] p-4 ring-1 transition duration-500',
          on ? 'bg-white/[0.05] ring-white/15' : 'bg-white/[0.02] opacity-50 ring-white/5',
        )}
      >
        <p className="text-sm font-medium">{title}</p>
        <div className="mt-2.5">{children}</div>
      </div>
    </li>
  );
}

/** One run of a shortcut, start to finish. Remounted per command, so its clock starts at zero. */
function Run({
  item,
  flow,
  playing,
  still,
  onDone,
}: {
  item: Command;
  flow: Commands['flow'];
  playing: boolean;
  still: boolean;
  onDone: () => void;
}) {
  const beats = timeline(item, flow.contextItems.length);
  const [tick, setT] = useState(0);
  const clock = useRef(0);
  // Reduced motion: the finished run, no clock.
  const t = still ? beats.end : tick;

  useEffect(() => {
    if (!playing || still) return;
    const id = window.setInterval(() => {
      clock.current += TICK;
      setT(clock.current);
      if (clock.current >= beats.end) {
        window.clearInterval(id);
        onDone();
      }
    }, TICK);
    return () => window.clearInterval(id);
  }, [playing, still, onDone, beats.end]);

  const typed = Math.min(item.command.length, Math.floor(t / TYPE_MS));
  const written = Math.max(
    0,
    Math.min(item.human.length, Math.floor((t - beats.write) / WRITE_MS)),
  );
  const stage = t >= beats.output ? 3 : t >= beats.humanize ? 2 : t >= beats.context ? 1 : 0;

  return (
    <>
      {/* The terminal: the shortcut being typed */}
      <div className="rounded-[16px] bg-black/50 px-4 py-3.5 font-mono text-[13px] ring-1 ring-white/10 md:text-[14px]">
        <div aria-hidden="true" className="mb-2.5 flex gap-1.5">
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
        </div>
        <p className="break-words">
          <span className="text-signal">❯ </span>
          {item.command.slice(0, typed)}
          {stage === 0 && (
            <span className="cos-caret bg-signal ml-0.5 inline-block h-[1.1em] w-[7px] align-middle" />
          )}
        </p>
        <p
          className={cn(
            'text-ink-soft mt-1.5 font-sans text-sm transition-opacity',
            stage > 0 ? 'opacity-100' : 'opacity-0',
          )}
        >
          {item.does}
        </p>
      </div>

      <ol className="mt-4 grid gap-3">
        <Stage icon="book" title={flow.context} on={stage >= 1} done={stage > 1}>
          <ul className="flex flex-wrap gap-1.5">
            {flow.contextItems.map((name, i) => {
              const in_ = t >= beats.context + i * 180;
              return (
                <li
                  key={name}
                  className={cn(
                    'rounded-pill inline-flex items-center gap-1.5 px-2.5 py-1 text-[13px] ring-1 transition duration-300',
                    in_
                      ? 'bg-signal/15 ring-signal/40 translate-y-0 text-[#F3EFE4] opacity-100'
                      : 'translate-y-1 opacity-0 ring-white/10',
                  )}
                >
                  <Icon name="check" className="text-signal size-3" />
                  {name}
                </li>
              );
            })}
          </ul>
        </Stage>

        <Stage icon="pen" title={flow.humanize} on={stage >= 2} done={stage > 2}>
          <p className="text-[13px]">
            <span className="text-ink-soft mr-2 font-mono text-[11px] tracking-wider uppercase">
              {flow.draft}
            </span>
            <span
              className={cn(
                'decoration-create/90 decoration-2 transition-colors duration-500',
                t >= beats.humanize + 500 ? 'text-ink-soft/60 line-through' : 'text-[#F3EFE4]',
              )}
            >
              {item.draft}
            </span>
          </p>
          <p className="mt-2 text-[15px] leading-snug md:text-base">
            <span className="text-build mr-2 font-mono text-[11px] tracking-wider uppercase">
              {flow.yours}
            </span>
            <span className="font-medium">{item.human.slice(0, written)}</span>
            {stage === 2 && (
              <span className="cos-caret bg-build ml-0.5 inline-block h-[1em] w-[2px] align-middle" />
            )}
          </p>
        </Stage>

        <Stage icon="spark" title={flow.output} on={stage >= 3} done={false} last>
          <p className="flex items-center gap-2 text-[15px] font-medium">
            <Icon name={item.icon} className="text-signal size-4" />
            {item.result}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <span
                className={cn(
                  'from-build to-signal block h-full origin-left bg-gradient-to-r transition-transform duration-[1400ms] ease-out',
                  stage >= 3 ? 'scale-x-100' : 'scale-x-0',
                )}
              />
            </span>
            <span className="text-ink-soft inline-flex items-center gap-1.5 text-xs">
              <Icon name="shield" className="text-build size-3.5" />
              {flow.checks}
            </span>
          </div>
        </Stage>
      </ol>
    </>
  );
}

/**
 * Shortcuts, shown working: pick one (or let it cycle) and watch the command typed, the page's
 * context pulled in, a generic AI line rewritten in the page's voice, and the checked result.
 * Plays only on screen; shows the finished run under reduced motion.
 */
export function CommandFlow({ commands }: { commands: Commands }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { once: false, rootMargin: '0px' });
  const still = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const next = useCallback(
    () => setActive((a) => (a + 1) % commands.list.length),
    [commands.list.length],
  );
  const item = commands.list[active]!;

  return (
    <div ref={ref}>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={commands.flow.label}>
        {commands.list.map((c, i) => (
          <button
            key={c.command}
            type="button"
            aria-pressed={i === active}
            title={c.command}
            onClick={() => setActive(i)}
            className={cn(
              'rounded-pill inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[12px] ring-1 transition',
              i === active
                ? 'bg-[#F3EFE4] text-[#0E0F0C] ring-transparent'
                : 'text-ink-soft ring-white/10 hover:text-[#F3EFE4] hover:ring-white/25',
            )}
          >
            <Icon name={c.icon} className="size-3.5" />
            {c.command.split(' ')[0]}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <Run
          key={active}
          item={item}
          flow={commands.flow}
          playing={visible}
          still={still}
          onDone={next}
        />
      </div>
    </div>
  );
}
