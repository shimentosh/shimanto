'use client';

import { useRouter } from 'next/navigation';
import { Suspense, lazy, useEffect, useState } from 'react';
import type { Accent } from '../lib/worlds';
import type { IconName } from './art/icon';

const OPEN_EVENT = 'command-palette:open';

const loadDialog = () => import('./command-palette-dialog');
const CommandPaletteDialog = lazy(loadDialog);

/** Open the palette from anywhere (e.g. the nav's search button). */
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** Start fetching the palette UI early, e.g. on hover or focus of a search button. */
export function preloadCommandPalette() {
  void loadDialog();
}

export interface CommandItem {
  label: string;
  href: string;
  /** One muted line under the label. */
  description?: string;
  /** Extra search terms that aren't in the label. */
  keywords?: string[];
  /** Right-aligned hint, e.g. the section name. */
  hint?: string;
  /** Leading tile: an image (logo) wins over an icon; `tone` colours the icon tile. */
  image?: string;
  icon?: IconName;
  tone?: Accent;
}

export interface CommandGroup {
  heading: string;
  items: CommandItem[];
}

export interface CommandPaletteProps {
  /** Shown before anything is typed (and filtered by the query when there's no `search`). */
  groups: CommandGroup[];
  /**
   * Full-text search. When set, a non-empty query shows its results instead of filtering `groups`.
   * Called on every keystroke; stale responses are ignored.
   */
  search?: (query: string) => Promise<CommandGroup[]>;
  placeholder?: string;
}

/**
 * Site-wide ⌘K / Ctrl+K palette. This shell is only a key listener; the dialog (cmdk + Radix)
 * loads on first open. Lists `groups` until the visitor types, then shows `search` results.
 */
export function CommandPalette({ groups, search, placeholder = 'Jump to…' }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const show = () => {
      setMounted(true);
      setOpen(true);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setMounted(true);
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_EVENT, show);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_EVENT, show);
    };
  }, []);

  if (!mounted) return null;

  return (
    <Suspense fallback={null}>
      <CommandPaletteDialog
        open={open}
        onOpenChange={setOpen}
        groups={groups}
        search={search}
        placeholder={placeholder}
        onSelect={(href) => {
          setOpen(false);
          router.push(href);
        }}
      />
    </Suspense>
  );
}
