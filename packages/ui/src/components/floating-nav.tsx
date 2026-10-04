'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  type ReactNode,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { cn } from '../lib/cn';
import { usePrefersReducedMotion } from '../lib/hooks';
import { Icon, type IconName } from './art/icon';
import { openCommandPalette, preloadCommandPalette } from './command-palette';
import { LocaleSwitch } from './locale-switch';
import { type NavGroup, type NavLink, isActivePath } from './nav-types';
import { ThemeToggle } from './theme';

// Radix Dialog + the sheet only load when the menu is first wanted.
const loadMenuSheet = () => import('./menu-sheet');
const MenuSheet = lazy(() => loadMenuSheet().then((m) => ({ default: m.MenuSheet })));

const noop = () => () => {};
/** "⌘" on Apple devices, "Ctrl" elsewhere (and on the server, until hydration). */
function useModKey(): string {
  return useSyncExternalStore(
    noop,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'),
    () => 'Ctrl',
  );
}

export interface FloatingNavProps {
  /** Wordmark / home link content. */
  logo: ReactNode;
  homeHref?: string;
  links: NavLink[];
  groups: NavGroup[];
  cta: { href: string; label: string };
  /** Sign-in link (e.g. the customer portal), shown as an icon + label before the CTA. */
  account?: { href: string; label: string };
  /** Show `account` in the bar. When false it only appears in the menu. */
  showAccount?: boolean;
  /** Hide on scroll-down, return on scroll-up. Off by default: the nav stays in view. */
  autoHide?: boolean;
  /**
   * Phone tab bar: up to four destinations, plus a fifth "More" tab that opens the menu. When set,
   * the header's own menu button is hidden below md (the tab bar replaces it).
   */
  tabs?: Array<{ href: string; label: string; icon: IconName }>;
  /** Show the EN / বাংলা switch in the menu. Turn off until the /bn pages exist. */
  showLocaleSwitch?: boolean;
}

export type NavVisibility = { hidden: boolean; compact: boolean };

/**
 * Pure scroll → nav state. Compact past 24px. Hides when scrolling down past 160px and shows
 * again on any scroll up. Moves under 6px are ignored as jitter.
 */
export function nextNavState(prevY: number, y: number, prev: NavVisibility): NavVisibility {
  const compact = y > 24;
  const delta = y - prevY;
  if (Math.abs(delta) < 6) return { ...prev, compact };
  return { compact, hidden: delta > 0 && y > 160 };
}

/**
 * Site header: a full-width bar with the logo, primary links, search, theme, the menu button and a
 * small CTA. It gains a hairline and a translucent background once the page scrolls, and always
 * stays in view. With `autoHide` it hides on scroll-down and returns on scroll-up (never under
 * reduced motion or while it has focus).
 */
export function FloatingNav({
  logo,
  homeHref = '/',
  links,
  groups,
  cta,
  account,
  showAccount = true,
  autoHide = false,
  tabs,
  showLocaleSwitch = true,
}: FloatingNavProps) {
  const pathname = usePathname() ?? '/';
  const reduced = usePrefersReducedMotion();
  const [state, setState] = useState<NavVisibility>({ hidden: false, compact: false });
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const lastY = useRef(0);
  const menuButton = useRef<HTMLButtonElement>(null);
  const moreButton = useRef<HTMLButtonElement>(null);
  const [openedFromTabs, setOpenedFromTabs] = useState(false);
  const modKey = useModKey();

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        setState((prev) => nextNavState(lastY.current, y, prev));
        lastY.current = y;
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const hidden = autoHide && state.hidden && !reduced && !focusWithin && !menuOpen;

  return (
    <>
      <header
        onFocus={() => setFocusWithin(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
        }}
        className={cn(
          // Frosted glass: the page shows through, blurred. A touch more solid once scrolled.
          'fixed inset-x-0 top-0 z-50 border-b backdrop-blur-xl backdrop-saturate-150 transition-[transform,background-color,border-color,box-shadow] duration-300',
          state.compact
            ? 'bg-canvas/70 border-ink/10 shadow-[0_10px_30px_-18px_rgb(0_0_0/0.45)]'
            : 'bg-canvas/40 border-transparent',
          hidden && '-translate-y-full',
        )}
      >
        <div className="max-w-site mx-auto flex h-16 items-center justify-between gap-6 px-5 md:px-8">
          <Link
            href={homeHref}
            className="group flex items-center text-lg font-semibold tracking-tight"
          >
            {logo}
          </Link>

          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-7">
              {links.map((link) => {
                const active = isActivePath(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'text-[15px] font-medium underline-offset-[6px] transition-colors',
                        active ? 'text-ink underline decoration-2' : 'text-ink-soft hover:text-ink',
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-1">
            {/* Wide screens: a search pill that shows the shortcut. */}
            <button
              type="button"
              onClick={openCommandPalette}
              onPointerEnter={preloadCommandPalette}
              onFocus={preloadCommandPalette}
              className="group border-ink/10 bg-ink/[0.04] text-ink-soft hover:border-ink/20 hover:text-ink rounded-pill mr-1 hidden h-10 items-center gap-2 border pr-1.5 pl-3.5 text-sm transition-colors lg:inline-flex"
            >
              <Icon name="search" className="size-4" />
              <span className="pr-6">Search…</span>
              <kbd className="border-ink/10 bg-canvas/70 text-ink-soft group-hover:text-ink rounded-pill flex h-7 items-center gap-0.5 border px-2 font-mono text-[11px]">
                <span className={modKey === '⌘' ? 'text-sm' : undefined}>{modKey}</span>K
              </kbd>
              <span className="sr-only">(Ctrl or Command + K)</span>
            </button>
            <button
              type="button"
              onClick={openCommandPalette}
              onPointerEnter={preloadCommandPalette}
              onFocus={preloadCommandPalette}
              className="hover:bg-ink/5 grid size-10 place-items-center rounded-full lg:hidden"
            >
              <span className="sr-only">Search (Ctrl or Command + K)</span>
              <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="m16 16 4 4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <ThemeToggle className="hover:bg-ink/5 hidden sm:grid" />
            <button
              ref={menuButton}
              type="button"
              onClick={() => {
                setOpenedFromTabs(false);
                setMenuMounted(true);
                setMenuOpen(true);
              }}
              onPointerEnter={() => void loadMenuSheet()}
              onFocus={() => void loadMenuSheet()}
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              className={cn(
                'hover:bg-ink/5 size-10 place-items-center rounded-full',
                tabs ? 'hidden md:grid' : 'grid',
              )}
            >
              <span className="sr-only">Open menu</span>
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                <path
                  d="M4 8h16M4 16h16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            {account && showAccount && (
              <a
                href={account.href}
                className="hover:bg-ink/5 rounded-pill ml-1 inline-flex h-10 items-center gap-2 px-2.5 text-[15px] font-medium lg:px-3.5"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                  <path
                    d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="sr-only lg:not-sr-only">{account.label}</span>
              </a>
            )}
            <Link
              href={cta.href}
              className="bg-ink text-canvas rounded-pill ml-2 hidden px-4 py-2 text-sm font-medium transition-opacity hover:opacity-85 sm:inline-flex"
            >
              {cta.label}
            </Link>
          </div>
        </div>

        {menuMounted && (
          <Suspense fallback={null}>
            <MenuSheet
              open={menuOpen}
              onOpenChange={setMenuOpen}
              returnFocusRef={openedFromTabs ? moreButton : menuButton}
              primary={[
                ...links,
                { href: cta.href, label: cta.label },
                ...(account ? [account] : []),
              ]}
              groups={groups}
              footer={
                <>
                  {showLocaleSwitch && <LocaleSwitch />}
                  <ThemeToggle className="border-ink/15 border" />
                </>
              }
            />
          </Suspense>
        )}
      </header>

      {/* Outside the header: its backdrop-filter would otherwise trap position:fixed. */}
      {tabs && tabs.length > 0 && (
        <nav
          aria-label="Quick links"
          className="fixed inset-x-0 bottom-0 z-50 md:hidden print:hidden"
        >
          <div className="bg-canvas/85 border-ink/10 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
            <ul className="mx-auto grid max-w-md grid-cols-5 px-2">
              {tabs.slice(0, 4).map((tab) => {
                const active = isActivePath(pathname, tab.href);
                return (
                  <li key={tab.href}>
                    <Link
                      href={tab.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex flex-col items-center gap-1 py-2 text-[11px] font-medium transition-[color,transform] duration-200 active:scale-95',
                        active ? 'text-ink' : 'text-ink-soft',
                      )}
                    >
                      <span
                        className={cn(
                          'rounded-pill grid h-7 w-12 place-items-center transition-colors duration-200',
                          active && 'bg-ink/10',
                        )}
                      >
                        <Icon name={tab.icon} className="size-5" />
                      </span>
                      {tab.label}
                    </Link>
                  </li>
                );
              })}
              <li>
                <button
                  ref={moreButton}
                  type="button"
                  onClick={() => {
                    setOpenedFromTabs(true);
                    setMenuMounted(true);
                    setMenuOpen(true);
                  }}
                  onPointerDown={() => void loadMenuSheet()}
                  aria-haspopup="dialog"
                  aria-expanded={menuOpen}
                  className={cn(
                    'flex w-full flex-col items-center gap-1 py-2 text-[11px] font-medium transition-[color,transform] duration-200 active:scale-95',
                    menuOpen ? 'text-ink' : 'text-ink-soft',
                  )}
                >
                  <span
                    className={cn(
                      'rounded-pill grid h-7 w-12 place-items-center transition-colors duration-200',
                      menuOpen && 'bg-ink/10',
                    )}
                  >
                    <Icon name="menu" className="size-5" />
                  </span>
                  More
                </button>
              </li>
            </ul>
          </div>
        </nav>
      )}
    </>
  );
}
