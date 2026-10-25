'use client';

import { Icon, type IconName, cn } from '@shimanto/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { pressCream, pressDark } from './press';

type DockLink = { href: string; label: string; icon: IconName };

/**
 * The Content OS navigation once you scroll past the header: a floating dock at the bottom of the
 * screen with raised blocks for the pages and for this page's sections (icons only on small
 * screens; sections from `sm` up), the section you're reading pressed in, and the buy button.
 */
export function Dock({
  label,
  pages,
  links,
  buy,
}: {
  label: string;
  pages: DockLink[];
  links: DockLink[];
  buy: ReactNode;
}) {
  const pathname = usePathname();
  const [active, setActive] = useState<string | null>(null);
  const [shown, setShown] = useState(false);

  // Out of the way while the header is on screen.
  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 360);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // The section crossing the middle of the screen is the one you're reading.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(`#${e.target.id}`);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    for (const link of links) {
      const el = document.getElementById(link.href.slice(1));
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [links]);

  const item = (link: DockLink, on: boolean, extra?: string) => (
    <span
      className={cn(
        'flex h-10 items-center gap-2 rounded-[14px] px-2.5 text-sm font-medium lg:px-3.5',
        on ? pressCream : cn(pressDark, 'text-ink-soft hover:text-[#F3EFE4]'),
        extra,
      )}
    >
      <Icon name={link.icon} className="size-4 shrink-0" />
      <span className="sr-only lg:not-sr-only">{link.label}</span>
    </span>
  );

  return (
    <nav
      aria-label={label}
      inert={!shown}
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-3 transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:bottom-5',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-[140%] opacity-0',
      )}
    >
      <div className="pointer-events-auto flex max-w-full [scrollbar-width:none] items-center gap-1 overflow-x-auto rounded-[22px] bg-[#16130f]/85 p-1.5 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.95),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/10 backdrop-blur-xl">
        <ul className="flex shrink-0 items-center gap-1">
          {pages.map((page) => {
            const here = pathname === page.href;
            return (
              <li key={page.href}>
                <Link href={page.href} aria-current={here ? 'page' : undefined} title={page.label}>
                  {/* The page you're on: a blue line under its block */}
                  {item(
                    page,
                    false,
                    here ? 'text-[#F3EFE4] shadow-[inset_0_-2px_0_#2e9bf7]' : undefined,
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        {links.length > 0 && (
          <>
            <span
              aria-hidden="true"
              className="mx-0.5 hidden h-6 w-px shrink-0 bg-white/10 sm:block"
            />
            <ul className="hidden shrink-0 items-center gap-1 sm:flex">
              {links.map((link) => {
                const on = active === link.href;
                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      aria-current={on ? 'location' : undefined}
                      title={link.label}
                    >
                      {item(link, on)}
                    </a>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <span aria-hidden="true" className="mx-0.5 h-6 w-px shrink-0 bg-white/10" />
        <span className="shrink-0">{buy}</span>
      </div>
    </nav>
  );
}
