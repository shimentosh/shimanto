'use client';

import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';
import type { ReactNode, RefObject } from 'react';
import { cn } from '../lib/cn';
import type { NavGroup, NavLink } from './nav-types';

export interface MenuSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Primary links, set huge. */
  primary: NavLink[];
  /** Everything else, grouped (Explore / Create / Proof / Personal). */
  groups: NavGroup[];
  /** Extra controls in the sheet footer (locale switch, theme toggle, CTA). */
  footer?: ReactNode;
  /** Element to refocus on close (the button that opened the sheet). */
  returnFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Full-screen menu on the page background. It's the mobile menu and also the desktop "everything else" menu.
 * Radix Dialog provides the focus trap, Esc to close, scroll lock and focus return.
 * The iris-open animation only runs with motion allowed.
 */
export function MenuSheet({
  open,
  onOpenChange,
  primary,
  groups,
  footer,
  returnFocusRef,
}: MenuSheetProps) {
  const close = () => onOpenChange(false);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            if (!returnFocusRef?.current) return;
            event.preventDefault();
            returnFocusRef.current.focus();
          }}
          className="menu-sheet bg-canvas text-ink fixed inset-0 z-[80] overflow-y-auto"
        >
          <div className="max-w-site mx-auto flex min-h-full flex-col px-5 pt-6 pb-10 md:px-8">
            <div className="flex items-center justify-between">
              <Dialog.Title className="font-mono text-sm tracking-[0.2em] uppercase">
                Menu
              </Dialog.Title>
              <Dialog.Close className="border-ink/15 hover:bg-ink/5 grid size-11 place-items-center rounded-full border">
                <span className="sr-only">Close menu</span>
                <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </Dialog.Close>
            </div>

            <nav aria-label="Main" className="mt-10 grid flex-1 gap-12 lg:grid-cols-[1.3fr_1fr]">
              <ul className="space-y-1">
                {primary.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={close}
                      className="hover:text-ink-soft block py-1 text-4xl leading-tight font-medium tracking-[-0.04em] transition-colors md:text-5xl"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="grid grid-cols-2 gap-x-6 gap-y-10 self-end">
                {groups.map((group) => (
                  <div key={group.title}>
                    <h2 className="text-ink-soft font-mono text-xs tracking-[0.2em] uppercase">
                      {group.title}
                    </h2>
                    <ul className="mt-3 space-y-1.5">
                      {group.links.map((link) => (
                        <li key={link.href}>
                          <Link
                            href={link.href}
                            onClick={close}
                            className="text-xl font-medium underline-offset-4 hover:underline"
                          >
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </nav>

            {footer && (
              <div className={cn('mt-12 flex flex-wrap items-center gap-4')}>{footer}</div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Alias matching the brief's component name. */
export const MobileMenuSheet = MenuSheet;
