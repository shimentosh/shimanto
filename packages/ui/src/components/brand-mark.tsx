import { cn } from '../lib/cn';

export interface BrandMarkProps {
  className?: string;
}

/**
 * The mark: a terminal prompt on a night tile. Cream chevron, build-green cursor. The tile stays
 * night in both themes (a hairline keeps its edge on the dark canvas). 32-unit grid, 3-unit
 * strokes; the cursor pulses on hover of the enclosing `group`. Shared with the favicon
 * (apps/web/src/app/icon.svg).
 */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden="true">
      <rect
        x=".5"
        y=".5"
        width="31"
        height="31"
        rx="8.5"
        fill="#1a1c17"
        stroke="#f3efe4"
        strokeOpacity=".12"
      />
      <path
        d="M9.5 10.5 15 16l-5.5 5.5"
        fill="none"
        className="stroke-cream"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.5 21.5h5.5"
        className="stroke-build motion-safe:group-hover:animate-pulse"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export interface LogoProps {
  name: string;
  className?: string;
}

/**
 * Header lockup: tile + lowercase wordmark set in the logo face (`--font-logo`, Unbounded in the
 * web app; falls back to the inherited sans elsewhere), closed with a build-green full stop that
 * echoes the cursor and the hero's "Founder. Builder.". The tile tilts on hover of the enclosing
 * `group`.
 */
export function Logo({ name, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <BrandMark className="size-8 transition-transform duration-300 ease-out motion-safe:group-hover:-rotate-6" />
      <span className="font-logo text-[19px] leading-none font-bold tracking-[-0.045em] lowercase">
        {name}
        <span className="text-build">.</span>
      </span>
    </span>
  );
}
