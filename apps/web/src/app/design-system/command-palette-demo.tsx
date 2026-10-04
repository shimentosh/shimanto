'use client';

import { Button, openCommandPalette } from '@shimanto/ui';

/** Opens the site-wide ⌘K palette mounted in the root layout. */
export function CommandPaletteDemo() {
  return <Button onClick={openCommandPalette}>Open command palette (⌘K / Ctrl+K)</Button>;
}
