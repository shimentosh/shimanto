'use client';

import * as RadixDialog from '@radix-ui/react-dialog';
import { type ReactNode, useState } from 'react';
import { cn } from '../lib/cn';
import { Icon } from '../components/art/icon';
import { ActionButton } from './controls';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

/** Accessible modal (focus trap, Esc, labelled) in the site's paper style. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
}: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="overlay-fade bg-night/50 fixed inset-0 z-50 backdrop-blur-[2px]" />
        <RadixDialog.Content
          className={cn(
            'dialog-pop bg-paper text-ink fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[20px] p-6 shadow-[0_24px_80px_-24px_rgba(14,15,12,0.45)]',
            sizes[size],
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <RadixDialog.Title className="text-xl font-medium tracking-tight">
              {title}
            </RadixDialog.Title>
            <RadixDialog.Close
              aria-label="Close"
              className="text-ink-soft hover:text-ink hover:bg-ink/[0.06] -mt-1 -mr-2 grid size-9 place-items-center rounded-full"
            >
              <Icon name="x" className="size-5" />
            </RadixDialog.Close>
          </div>
          {description ? (
            <RadixDialog.Description className="text-ink-soft mt-1.5 text-[15px]">
              {description}
            </RadixDialog.Description>
          ) : (
            <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
          )}
          {children && <div className="mt-5">{children}</div>}
          {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  tone?: 'primary' | 'danger';
  onConfirm: () => Promise<unknown> | unknown;
  children?: ReactNode;
}

/** "Are you sure?" with a busy state; closes itself when the action succeeds. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = 'primary',
  onConfirm,
  children,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !busy && onOpenChange(next)}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </ActionButton>
          <ActionButton
            variant={tone === 'danger' ? 'danger' : 'primary'}
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </ActionButton>
        </>
      }
    >
      {children}
    </Dialog>
  );
}
