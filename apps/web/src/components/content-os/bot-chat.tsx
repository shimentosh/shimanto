'use client';

/* eslint-disable @next/next/no-img-element -- small pre-sized posters and slides */
import { Icon, cn, usePrefersReducedMotion } from '@shimanto/ui';
import { useEffect, useRef, useState } from 'react';
import type { ContentOsCopy } from '@/content/content-os';
import { SocialIcon } from '@/components/page/social-icon';

export interface ChatAttachments {
  /** First slides of a real carousel (4:5). */
  carousel: string[];
  reel: { video: string; poster: string };
  post: { image: string; caption: string };
  youtube: { video: string; poster: string };
}

type Bot = ContentOsCopy['bot'];
type Chat = Bot['chats'][number];

/** Seconds per phase. Typing is per character. */
const TYPE_MS = 28;
const STEP_MS = 750;
const HOLD_MS = 4200;

/** The Content OS mark on a dark tile: the bot's avatar. */
export function BotMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-9 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-[#14171c] ring-1 ring-white/10',
        className,
      )}
    >
      <img
        src="/content-os/mark.webp"
        alt=""
        width={128}
        height={128}
        className="size-[66%] object-contain"
      />
    </span>
  );
}

function Attachment({ show, files }: { show: Chat['show']; files: ChatAttachments }) {
  if (show === 'carousel') {
    return (
      <div className="grid grid-cols-4 gap-1.5">
        {files.carousel.slice(0, 4).map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            width={180}
            height={225}
            className="cos-rise aspect-[4/5] w-full rounded-[8px] object-cover ring-1 ring-white/10"
            style={{ animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
    );
  }
  if (show === 'reel') {
    return (
      <video
        src={files.reel.video}
        poster={files.reel.poster}
        autoPlay
        muted
        loop
        playsInline
        className="cos-rise aspect-[9/16] w-[46%] rounded-[12px] object-cover ring-1 ring-white/10"
      />
    );
  }
  if (show === 'youtube') {
    return (
      <video
        src={files.youtube.video}
        poster={files.youtube.poster}
        autoPlay
        muted
        loop
        playsInline
        className="cos-rise aspect-video w-full rounded-[12px] object-cover ring-1 ring-white/10"
      />
    );
  }
  return (
    <div className="cos-rise grid grid-cols-[42%_1fr] gap-3 rounded-[12px] bg-white/[0.04] p-2 ring-1 ring-white/10">
      <img
        src={files.post.image}
        alt=""
        width={360}
        height={450}
        className="aspect-[4/5] w-full rounded-[8px] object-cover"
      />
      <p className="line-clamp-6 self-center text-[13px] leading-relaxed text-[#B9B4A7]">
        {files.post.caption}
      </p>
    </div>
  );
}

/**
 * Content OS as a bot: a chat that types a request, shows what it does, and replies with a real
 * output, cycling through carousels, reels, posts and YouTube. Pausable; static under reduced
 * motion, where the chips switch chats by hand.
 */
export function BotChat({ bot, files }: { bot: Bot; files: ChatAttachments }) {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  // Characters typed, then steps shown; past the last step the reply shows.
  const [typed, setTyped] = useState(0);
  const [steps, setSteps] = useState(0);
  const [paused, setPaused] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const chat = bot.chats[index]!;
  const done = reduced || steps > chat.steps.length;
  const shownTyped = reduced ? chat.prompt.length : typed;
  const sent = shownTyped >= chat.prompt.length;

  useEffect(() => {
    if (reduced || paused) return;
    let delay: number;
    let next: () => void;
    if (!sent) {
      delay = TYPE_MS;
      next = () => setTyped((n) => n + 1);
    } else if (steps <= chat.steps.length) {
      delay = steps === 0 ? 450 : STEP_MS;
      next = () => setSteps((n) => n + 1);
    } else {
      delay = HOLD_MS;
      next = () => {
        setIndex((i) => (i + 1) % bot.chats.length);
        setTyped(0);
        setSteps(0);
      };
    }
    const t = setTimeout(next, delay);
    return () => clearTimeout(t);
  }, [reduced, paused, sent, steps, typed, chat.steps.length, bot.chats.length]);

  // Keep the newest line in view inside the chat (never scrolls the page).
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [steps, done, reduced]);

  const choose = (i: number) => {
    setIndex(i);
    setTyped(0);
    setSteps(0);
  };

  return (
    <div
      role="group"
      aria-label={bot.label}
      className="overflow-hidden rounded-[24px] bg-[#16181a]/85 shadow-[0_40px_120px_-30px_rgba(46,155,247,0.45)] ring-1 ring-white/10 backdrop-blur-xl"
    >
      {/* Title bar */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <BotMark />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-[#F3EFE4]">{bot.name}</p>
          <p className="flex items-center gap-1.5 text-xs text-[#B9B4A7]">
            <span aria-hidden="true" className="bg-build size-1.5 rounded-full" />
            {bot.status}
          </p>
        </div>
        {!reduced && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="grid size-8 place-items-center rounded-full text-[#B9B4A7] ring-1 ring-white/15 hover:text-[#F3EFE4]"
            aria-label={paused ? bot.play : bot.pause}
          >
            {paused ? (
              <Icon name="play" className="size-3.5" />
            ) : (
              <span aria-hidden="true" className="flex gap-0.5">
                <span className="h-3 w-[3px] rounded bg-current" />
                <span className="h-3 w-[3px] rounded bg-current" />
              </span>
            )}
          </button>
        )}
      </div>

      {/* Messages (decorative motion; the group label says what it shows) */}
      <div
        ref={scroller}
        aria-hidden="true"
        className="h-[380px] space-y-4 overflow-hidden px-4 py-5 sm:h-[420px]"
      >
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-[16px] rounded-br-[4px] bg-[#2E9BF7] px-4 py-2.5 text-[15px] leading-snug text-[#0E0F0C]">
            {chat.prompt.slice(0, shownTyped)}
            {!sent && <span className="cos-caret">▍</span>}
          </p>
        </div>

        {sent && (
          <div className="flex gap-3">
            <BotMark className="size-7 rounded-[8px] text-[10px]" />
            <div className="min-w-0 flex-1 space-y-2">
              <ul className="space-y-1.5">
                {chat.steps.map((step, i) =>
                  reduced || i < steps ? (
                    <li
                      key={step}
                      className="cos-rise flex items-center gap-2 text-[13px] text-[#B9B4A7]"
                    >
                      {reduced || i < steps - 1 || done ? (
                        <Icon name="check" className="text-build size-3.5 shrink-0" />
                      ) : (
                        <span className="border-signal size-3.5 shrink-0 animate-spin rounded-full border-2 border-t-transparent" />
                      )}
                      {step}
                    </li>
                  ) : null,
                )}
              </ul>
              {done && (
                <div className="cos-rise space-y-3">
                  <p className="text-[15px] leading-snug text-[#F3EFE4]">{chat.reply}</p>
                  <Attachment show={chat.show} files={files} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Prompt chips: switch chats by hand */}
      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex [scrollbar-width:none] gap-2 overflow-x-auto">
          {bot.chats.map((c, i) => (
            <button
              key={c.prompt}
              type="button"
              onClick={() => choose(i)}
              aria-pressed={i === index}
              className={cn(
                'rounded-pill inline-flex shrink-0 items-center gap-1.5 py-1 pr-3 pl-1 text-xs whitespace-nowrap ring-1 transition-colors',
                i === index
                  ? 'bg-[#F3EFE4] text-[#0E0F0C] ring-transparent'
                  : 'text-[#B9B4A7] ring-white/15 hover:text-[#F3EFE4]',
              )}
            >
              {'platform' in c.chipIcon ? (
                <SocialIcon platform={c.chipIcon.platform} className="size-5 rounded-full" />
              ) : (
                <span
                  aria-hidden="true"
                  className={cn(
                    'grid size-5 place-items-center rounded-full',
                    i === index ? 'bg-[#0E0F0C] text-[#F3EFE4]' : 'bg-white/10',
                  )}
                >
                  <Icon name={c.chipIcon.icon} className="size-3" />
                </span>
              )}
              {c.chip}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-white/[0.05] px-4 py-3 text-[14px] text-[#8b877c] ring-1 ring-white/10">
          <span className="flex-1 truncate">{bot.placeholder}</span>
          <span
            aria-hidden="true"
            className="bg-signal grid size-7 place-items-center rounded-full text-[#0E0F0C]"
          >
            <Icon name="send" className="size-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}
