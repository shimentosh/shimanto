'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { cn } from '../lib/cn';
import { Icon, type IconName } from '../components/art/icon';

export interface AppNavItem {
  label: string;
  href: string;
  icon: IconName;
  /** Small count or word after the label (e.g. open tickets). */
  badge?: string | number | null;
}

export interface AppNavSection {
  title?: string;
  items: AppNavItem[];
}

export interface AppShellProps {
  /** Product name + area, e.g. "Shimanto" / "Admin". */
  brand: { name: string; area: string; href: string };
  nav: AppNavSection[];
  /** Bottom of the sidebar: signed-in user and sign out. */
  account?: ReactNode;
  /** Extra links at the very bottom (e.g. "Back to site"). */
  footer?: ReactNode;
  children: ReactNode;
}

function matches(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The one nav item for this page: the longest matching href (so /account/github ≠ /account). */
export function activeHref(pathname: string, hrefs: string[]): string | undefined {
  return hrefs.filter((href) => matches(pathname, href)).sort((a, b) => b.length - a.length)[0];
}

function Brand({ brand }: { brand: AppShellProps['brand'] }) {
  return (
    <Link href={brand.href} className="flex items-center gap-2.5 rounded-[10px] px-2 py-1.5">
      <span
        aria-hidden="true"
        className="bg-ink text-canvas grid size-8 place-items-center rounded-[10px] text-sm font-semibold"
      >
        {brand.name.charAt(0)}
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-semibold tracking-tight">{brand.name}</span>
        <span className="text-ink-soft block text-xs">{brand.area}</span>
      </span>
    </Link>
  );
}

function NavList({
  nav,
  pathname,
  onNavigate,
}: {
  nav: AppNavSection[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const current = activeHref(
    pathname,
    nav.flatMap((section) => section.items.map((item) => item.href)),
  );
  return (
    <nav aria-label="Main" className="grid gap-6">
      {nav.map((section, i) => (
        <div key={section.title ?? i}>
          {section.title && (
            <p className="text-ink-soft mb-1.5 px-3 text-xs font-medium tracking-wide uppercase">
              {section.title}
            </p>
          )}
          <ul className="grid gap-0.5">
            {section.items.map((item) => {
              const active = item.href === current;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-[10px] px-3 py-2 text-[15px] transition-colors',
                      active
                        ? 'bg-paper text-ink font-medium shadow-[0_1px_0_rgba(44,46,42,0.06)]'
                        : 'text-ink-soft hover:text-ink hover:bg-ink/[0.05]',
                    )}
                  >
                    <Icon name={item.icon} className="size-[18px]" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge !== undefined && item.badge !== null && item.badge !== 0 && (
                      <span className="bg-ink text-canvas rounded-pill min-w-5 px-1.5 text-center text-xs leading-5 font-medium">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/**
 * Admin / portal frame: a quiet sidebar on the cream canvas and the page on a paper sheet
 * (the site's sheet language). On small screens the sidebar becomes a slide-in menu.
 */
export function AppShell({ brand, nav, account, footer, children }: AppShellProps) {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  // Close the mobile menu after navigating (state adjusted during render, not in an effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <div className="bg-canvas text-ink min-h-dvh lg:flex">
      <a
        href="#main"
        className="bg-ink text-canvas sr-only z-50 rounded-[10px] px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col gap-8 px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:overflow-y-auto">
        <Brand brand={brand} />
        <div className="flex-1">
          <NavList nav={nav} pathname={pathname} />
        </div>
        {account && <div className="border-ink/10 border-t pt-4">{account}</div>}
        {footer}
      </aside>

      {/* Mobile top bar */}
      <header className="bg-canvas/90 sticky top-0 z-40 flex items-center justify-between px-4 py-3 backdrop-blur lg:hidden">
        <Brand brand={brand} />
        <RadixDialog.Root open={open} onOpenChange={setOpen}>
          <RadixDialog.Trigger
            aria-label="Open menu"
            className="hover:bg-ink/[0.06] grid size-10 place-items-center rounded-full"
          >
            <Icon name="menu" className="size-6" />
          </RadixDialog.Trigger>
          <RadixDialog.Portal>
            <RadixDialog.Overlay className="overlay-fade bg-night/40 fixed inset-0 z-50" />
            <RadixDialog.Content className="bg-canvas fixed inset-y-0 left-0 z-50 flex w-[min(20rem,85vw)] flex-col gap-8 overflow-y-auto px-4 py-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <RadixDialog.Title className="sr-only">Menu</RadixDialog.Title>
                <RadixDialog.Description className="sr-only">
                  Site navigation
                </RadixDialog.Description>
                <Brand brand={brand} />
                <RadixDialog.Close
                  aria-label="Close menu"
                  className="hover:bg-ink/[0.06] grid size-10 place-items-center rounded-full"
                >
                  <Icon name="x" className="size-5" />
                </RadixDialog.Close>
              </div>
              <div className="flex-1">
                <NavList nav={nav} pathname={pathname} onNavigate={() => setOpen(false)} />
              </div>
              {account && <div className="border-ink/10 border-t pt-4">{account}</div>}
              {footer}
            </RadixDialog.Content>
          </RadixDialog.Portal>
        </RadixDialog.Root>
      </header>

      <main id="main" className="min-w-0 flex-1 px-3 pb-3 lg:py-3 lg:pr-3 lg:pl-0">
        <div className="bg-paper min-h-[calc(100dvh-5rem)] rounded-[24px] px-5 py-7 sm:px-8 lg:min-h-[calc(100dvh-1.5rem)] lg:px-10 lg:py-9">
          <div className="mx-auto max-w-6xl">{children}</div>
        </div>
      </main>
    </div>
  );
}

/** Signed-in user block for the sidebar. */
export function AppAccount({
  name,
  email,
  onSignOut,
  href,
}: {
  name?: string | null;
  email: string;
  onSignOut: () => void;
  href?: string;
}) {
  const initials = (name || email)
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join('');
  const who = (
    <>
      <span
        aria-hidden="true"
        className="bg-idea text-on-world grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold"
      >
        {initials}
      </span>
      <span className="min-w-0 leading-tight">
        {name && <span className="block truncate text-sm font-medium">{name}</span>}
        <span className="text-ink-soft block truncate text-xs">{email}</span>
      </span>
    </>
  );
  return (
    <div className="flex items-center gap-2">
      {href ? (
        <Link
          href={href}
          className="hover:bg-ink/[0.05] flex min-w-0 flex-1 items-center gap-3 rounded-[10px] p-1.5"
        >
          {who}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 p-1.5">{who}</div>
      )}
      <button
        type="button"
        onClick={onSignOut}
        aria-label="Sign out"
        title="Sign out"
        className="text-ink-soft hover:text-ink hover:bg-ink/[0.06] grid size-9 shrink-0 place-items-center rounded-full"
      >
        <Icon name="logout" className="size-[18px]" />
      </button>
    </div>
  );
}
