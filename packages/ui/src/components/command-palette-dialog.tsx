'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { Fragment, useEffect, useState } from 'react';
import { cn } from '../lib/cn';
import { accentBg } from '../lib/worlds';
import { Icon } from './art/icon';
import type { CommandGroup, CommandItem } from './command-palette';

export interface CommandPaletteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: CommandGroup[];
  search?: (query: string) => Promise<CommandGroup[]>;
  placeholder: string;
  onSelect: (href: string) => void;
}

/**
 * The palette UI (cmdk + Radix Dialog). It's split out so it only loads on first open,
 * which keeps ~18 KB gzipped off every page's initial JS.
 */
export default function CommandPaletteDialog({
  open,
  onOpenChange,
  ...body
}: CommandPaletteDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay-fade bg-night/50 fixed inset-0 z-[90] backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="dialog-pop bg-paper text-ink rounded-card fixed top-[12vh] left-1/2 z-[91] w-[min(680px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden shadow-2xl"
        >
          <Dialog.Title className="sr-only">Search and jump</Dialog.Title>
          {/* Mounted only while open, so the query starts empty every time. */}
          <PaletteBody {...body} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const groupClass =
  '[&_[cmdk-group-heading]]:text-ink-soft [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-4 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:tracking-[0.16em] [&_[cmdk-group-heading]]:uppercase';

function PaletteBody({
  groups,
  search,
  placeholder,
  onSelect,
}: Omit<CommandPaletteDialogProps, 'open' | 'onOpenChange'>) {
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<{ query: string; groups: CommandGroup[] } | null>(null);
  const searching = Boolean(search && query.trim());

  useEffect(() => {
    if (!search || !query.trim()) return;
    let live = true;
    search(query).then(
      (result) => live && setFound({ query, groups: result }),
      () => live && setFound({ query, groups: [] }),
    );
    return () => {
      live = false;
    };
  }, [query, search]);

  // While the next response is in flight, keep showing the previous one instead of flashing empty.
  const shown = searching ? (found?.groups ?? []) : groups;
  const settled = found?.query === query;
  // Single letters would light up half the label, so only longer terms are highlighted.
  const terms = searching
    ? query
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 1)
    : [];

  return (
    <Command label="Search and jump" loop shouldFilter={!search}>
      <div className="border-ink/10 flex items-center gap-3 border-b px-5">
        <Icon name="search" className="text-ink-soft size-5" />
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder={placeholder}
          className="placeholder:text-ink-soft h-14 w-full bg-transparent text-lg outline-none focus-visible:shadow-none focus-visible:outline-none"
        />
        <kbd className="border-ink/15 text-ink-soft rounded-md border px-1.5 py-0.5 font-mono text-[11px]">
          Esc
        </kbd>
      </div>
      <Command.List className="max-h-[min(62vh,480px)] scroll-py-2 overflow-y-auto p-2">
        <Command.Empty className="px-4 py-12 text-center">
          {searching && !settled ? (
            <span className="text-ink-soft">Searching…</span>
          ) : (
            <>
              <Icon name="search" className="text-ink-soft mx-auto size-8" />
              <p className="mt-3 font-medium">Nothing matches &ldquo;{query}&rdquo;</p>
              <p className="text-ink-soft mt-1 text-sm">Try a product, a topic or a tool name.</p>
            </>
          )}
        </Command.Empty>
        {shown.map((group) => (
          <Command.Group key={group.heading} heading={group.heading} className={groupClass}>
            {group.items.map((item) => (
              <Row
                key={`${item.href} ${item.label}`}
                item={item}
                value={`${group.heading} ${item.label} ${item.href}`}
                terms={terms}
                onSelect={() => onSelect(item.href)}
              />
            ))}
          </Command.Group>
        ))}
      </Command.List>
      <div className="border-ink/10 text-ink-soft flex items-center gap-4 border-t px-5 py-2.5 text-xs">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> to move
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd> to open
        </span>
        <span className="ml-auto hidden items-center gap-1.5 sm:flex">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd> anywhere
        </span>
      </div>
    </Command>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="border-ink/15 bg-canvas grid h-5 min-w-5 place-items-center rounded border px-1 font-mono text-[10px]">
      {children}
    </kbd>
  );
}

function Row({
  item,
  value,
  terms,
  onSelect,
}: {
  item: CommandItem;
  value: string;
  terms: string[];
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value}
      keywords={item.keywords}
      onSelect={onSelect}
      className="group data-[selected=true]:bg-canvas flex cursor-pointer items-center gap-3.5 rounded-2xl px-3 py-2.5"
    >
      <Tile item={item} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          <Highlight text={item.label} terms={terms} />
        </span>
        {item.description && (
          <span className="text-ink-soft block truncate text-sm">{item.description}</span>
        )}
      </span>
      {item.hint && (
        <span className="border-ink/10 text-ink-soft hidden shrink-0 rounded-full border px-2.5 py-0.5 text-xs sm:block">
          {item.hint}
        </span>
      )}
      <Icon
        name="arrowRight"
        className="text-ink-soft size-4 opacity-0 transition-opacity group-data-[selected=true]:opacity-100"
      />
    </Command.Item>
  );
}

function Tile({ item }: { item: CommandItem }) {
  if (item.image) {
    return (
      <img
        src={item.image}
        alt=""
        loading="lazy"
        className="bg-canvas size-10 shrink-0 rounded-xl object-cover"
      />
    );
  }
  if (!item.icon) return null;
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-xl',
        item.tone ? cn(accentBg[item.tone], 'on-world') : 'bg-ink/[0.06] text-ink',
      )}
    >
      <Icon name={item.icon} className="size-[18px]" />
    </span>
  );
}

/** Bolds the parts of the label that match the query, so you can see why a result is here. */
function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (terms.length === 0) return text;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'gi'));
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="bg-spark/35 text-ink rounded-[3px]">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
