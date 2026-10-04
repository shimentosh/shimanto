import type { CSSProperties } from 'react';
import { SocialIcon, platformColor } from '@/components/page/social-icon';
import { audienceAsOf, formatAudience, socialProfiles } from '@/content/navigation';

const counted = socialProfiles.filter((p) => p.audience);
/** Everyone across every platform with a known number. A floor: each count rounds down. */
const reach = counted.reduce((sum, p) => sum + (p.audience ?? 0), 0);

/**
 * The combined audience, each platform's share as one bar, and a card per profile.
 * On the home page and /blog.
 */
export function SocialReach({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <p className="flex items-baseline gap-3">
          <span className="text-5xl font-medium tracking-[-0.05em] md:text-6xl">
            {formatAudience(reach)}+
          </span>
          <span className="text-ink-soft text-lg">
            people follow along, across {counted.length} platforms
          </span>
        </p>
        <p className="text-ink-soft text-sm">
          As of <time dateTime={audienceAsOf.iso}>{audienceAsOf.label}</time>
        </p>
      </div>
      {/* Each platform's share of the combined audience. */}
      <div
        aria-hidden="true"
        className="bg-ink/[0.06] mt-5 flex h-3 gap-1 overflow-hidden rounded-full"
      >
        {counted.map((p) => (
          <span
            key={p.label}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${((p.audience ?? 0) / reach) * 100}%`,
              background: platformColor[p.label],
            }}
          />
        ))}
      </div>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {socialProfiles.map((profile) => {
          const color = platformColor[profile.label] ?? 'var(--ink)';
          const share = profile.audience ? (profile.audience / reach) * 100 : 0;
          const body = (
            <>
              {/* Brand-coloured glow, brighter on hover. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-20 -right-20 size-48 rounded-full opacity-15 blur-3xl transition-opacity duration-500 group-hover:opacity-35"
                style={{ background: color }}
              />
              <span className="relative flex items-start justify-between">
                <SocialIcon platform={profile.label} />
                <span
                  aria-hidden="true"
                  className="text-ink-soft group-hover:text-ink text-lg transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                >
                  ↗
                </span>
              </span>
              <span className="relative mt-8 block">
                {profile.audience ? (
                  <>
                    <span className="block text-4xl font-medium tracking-[-0.04em] tabular-nums">
                      {formatAudience(profile.audience)}
                    </span>
                    <span className="text-ink-soft mt-1 block text-sm">
                      {profile.audienceLabel} on {profile.label}
                    </span>
                  </>
                ) : (
                  <span className="block text-2xl font-medium tracking-[-0.03em]">
                    {profile.label}
                  </span>
                )}
                <span className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="text-ink-soft font-mono text-xs">{profile.handle}</span>
                  {profile.extra && (
                    <span className="border-ink/10 rounded-full border px-2 py-0.5 text-xs font-medium">
                      {formatAudience(profile.extra.value)} {profile.extra.label}
                    </span>
                  )}
                </span>
                {share > 0 && (
                  <span aria-hidden="true" className="mt-5 block">
                    <span className="bg-ink/[0.07] block h-1 overflow-hidden rounded-full">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${share}%`, background: color }}
                      />
                    </span>
                    <span className="text-ink-soft mt-1.5 block text-xs">
                      {Math.round(share)}% of the audience
                    </span>
                  </span>
                )}
              </span>
            </>
          );
          const card =
            'group relative overflow-hidden border-ink/10 bg-paper rounded-card flex h-full flex-col justify-between border p-5 transition-[transform,border-color] duration-300';
          return (
            <li key={profile.label}>
              {profile.href ? (
                <a
                  href={profile.href}
                  rel="me noopener"
                  target="_blank"
                  className={`${card} hover:border-ink/25 motion-safe:hover:-translate-y-1`}
                >
                  {body}
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              ) : (
                <div className={card}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Compact "follow along" card for the end of a post: the total plus a pill per platform. */
export function FollowAlong() {
  return (
    <aside
      aria-labelledby="follow-title"
      className="border-ink/10 bg-paper rounded-card relative overflow-hidden border p-6 md:p-8"
    >
      <div
        aria-hidden="true"
        className="bg-spark/20 pointer-events-none absolute -top-20 -right-16 size-56 rounded-full blur-3xl"
      />
      <p className="text-ink-soft relative text-sm font-medium">Enjoyed this note?</p>
      <h2
        id="follow-title"
        className="relative mt-2 text-2xl leading-tight font-medium tracking-[-0.03em] md:text-3xl"
      >
        Join {formatAudience(reach)}+ people who follow along.
      </h2>
      <div
        aria-hidden="true"
        className="bg-ink/[0.06] relative mt-5 flex h-2 gap-1 overflow-hidden rounded-full"
      >
        {counted.map((p) => (
          <span
            key={p.label}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{
              width: `${((p.audience ?? 0) / reach) * 100}%`,
              background: platformColor[p.label],
            }}
          />
        ))}
      </div>
      <ul className="relative mt-6 grid gap-2 sm:grid-cols-2">
        {socialProfiles.map((profile) =>
          profile.href ? (
            <li key={profile.label}>
              <a
                href={profile.href}
                rel="me noopener"
                target="_blank"
                className="group border-ink/10 hover:border-ink/25 flex items-center gap-3 rounded-2xl border p-2.5 pr-4 transition-[transform,border-color] duration-300 motion-safe:hover:-translate-y-0.5"
              >
                <SocialIcon platform={profile.label} className="size-10" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{profile.label}</span>
                  {profile.audience && (
                    <span className="text-ink-soft block text-sm">
                      {formatAudience(profile.audience)} {profile.audienceLabel}
                    </span>
                  )}
                </span>
                <span
                  aria-hidden="true"
                  className="text-ink-soft group-hover:text-ink transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                >
                  ↗
                </span>
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ) : null,
        )}
      </ul>
      <p className="text-ink-soft relative mt-4 text-xs">
        As of <time dateTime={audienceAsOf.iso}>{audienceAsOf.label}</time>
      </p>
    </aside>
  );
}

/** Text colour on each platform's brand fill (TikTok's cyan needs dark text). */
const brandInk: Record<string, string> = { TikTok: '#0e0f0c' };

/**
 * The blog's take: a dark banner with the headline and total on the left, and big follow
 * buttons on the right whose "Follow" pill fills with the platform's colour on hover.
 */
export function SocialBanner({ titleId }: { titleId: string }) {
  return (
    <div className="bg-night text-cream rounded-sheet relative isolate overflow-hidden p-6 sm:p-8 md:p-12">
      {/* A soft blob of each platform's colour behind everything. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-30 blur-3xl">
        {counted.map((p, i) => (
          <span
            key={p.label}
            className="absolute size-56 rounded-full"
            style={{
              background: platformColor[p.label],
              top: i < 2 ? '-25%' : undefined,
              bottom: i >= 2 ? '-25%' : undefined,
              left: i % 2 === 0 ? `${-8 + i * 12}%` : undefined,
              right: i % 2 === 1 ? `${-8 + i * 6}%` : undefined,
            }}
          />
        ))}
      </div>
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
        <div>
          <p className="font-mono text-[11px] tracking-[0.16em] text-white/60 uppercase">
            Follow along
          </p>
          <h2
            id={titleId}
            className="mt-4 text-[clamp(36px,4.4vw,60px)] leading-[0.98] font-medium tracking-[-0.05em]"
          >
            <span className="block">Read it first.</span>
            <span className="block text-white/55">Notes go out everywhere.</span>
          </h2>
          <p className="mt-8 flex items-baseline gap-3">
            <span className="text-6xl font-medium tracking-[-0.05em] tabular-nums">
              {formatAudience(reach)}
              <span className="text-spark">+</span>
            </span>
            <span className="text-white/70">people across {counted.length} platforms</span>
          </p>
          <p className="mt-2 text-xs text-white/50">
            As of <time dateTime={audienceAsOf.iso}>{audienceAsOf.label}</time>
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {socialProfiles.map((profile) =>
            profile.href ? (
              <li key={profile.label}>
                <a
                  href={profile.href}
                  rel="me noopener"
                  target="_blank"
                  style={
                    {
                      '--brand': platformColor[profile.label] ?? '#ffffff',
                      '--brand-ink': brandInk[profile.label] ?? '#ffffff',
                    } as CSSProperties
                  }
                  className="group flex items-center gap-3.5 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10 transition-[transform,box-shadow,background-color] duration-300 hover:bg-white/[0.09] hover:shadow-[0_0_0_1px_var(--brand),0_18px_40px_-16px_var(--brand)] motion-safe:hover:-translate-y-1"
                >
                  <SocialIcon platform={profile.label} className="size-12 rounded-2xl" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-2xl leading-none font-medium tracking-[-0.03em] tabular-nums">
                      {profile.audience ? formatAudience(profile.audience) : profile.label}
                    </span>
                    <span className="mt-1 block truncate text-sm text-white/60">
                      {profile.audience
                        ? `${profile.audienceLabel} · ${profile.label}`
                        : profile.handle}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium transition-colors duration-300 group-hover:bg-[var(--brand)] group-hover:text-[var(--brand-ink)]">
                    Follow
                  </span>
                  <span className="sr-only">(opens {profile.label} in a new tab)</span>
                </a>
              </li>
            ) : null,
          )}
        </ul>
      </div>
    </div>
  );
}
