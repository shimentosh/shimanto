'use client';

import type { IntegrationCheck } from '@shimanto/types';
import { ActionButton, CopyButton, Field, Input, StatusBadge } from '@shimanto/ui';
import { type ReactNode, useState } from 'react';

export function Env({ children }: { children: ReactNode }) {
  return (
    <code className="bg-ink/[0.06] rounded px-1.5 py-0.5 font-mono text-[13px] break-all">
      {children}
    </code>
  );
}

/** Active (offered at checkout), Off (switched off) or Needs keys (on, but nothing to use). */
export function ProviderStatus({ enabled, active }: { enabled: boolean; active: boolean }) {
  if (active) return <StatusBadge status="ACTIVE" label="Active at checkout" />;
  if (!enabled) return <StatusBadge status="ARCHIVED" label="Off" />;
  return <StatusBadge status="PENDING" label="Needs keys" />;
}

/** A webhook URL to paste into the provider's dashboard, and the events it must send. */
export function WebhookSetup({ url, events }: { url: string; events: string[] }) {
  return (
    <div className="bg-ink/[0.03] grid gap-3 rounded-[14px] px-4 py-3.5">
      <div>
        <p className="text-ink-soft text-sm">Webhook URL</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Env>{url}</Env>
          <CopyButton value={url} />
        </div>
      </div>
      <div>
        <p className="text-ink-soft text-sm">Events to send</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {events.map((event) => (
            <Env key={event}>{event}</Env>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Runs a connection check and shows its result next to the button. */
export function CheckButton({
  label,
  run,
}: {
  label: string;
  run: () => Promise<IntegrationCheck | undefined>;
}) {
  const [result, setResult] = useState<IntegrationCheck | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ActionButton
        size="sm"
        variant="secondary"
        icon="shield"
        loading={busy}
        onClick={async () => {
          setBusy(true);
          setResult((await run()) ?? null);
          setBusy(false);
        }}
      >
        {label}
      </ActionButton>
      {result && (
        <span
          className={result.ok ? 'text-sm font-medium' : 'text-create text-sm font-medium'}
          role="status"
        >
          {result.ok ? '✓ ' : '✕ '}
          {result.message}
        </span>
      )}
    </div>
  );
}

/**
 * Change to a write-only secret: a string sets it, null removes it, undefined keeps it. Secrets
 * are never sent back by the API; only a hint ("sk_test_…4242") says one is set.
 */
export type SecretChange = string | null | undefined;

/** A write-only secret: shows the hint when set, with Replace / Remove; never the value. */
export function SecretField({
  label,
  hint,
  isSet,
  value,
  onChange,
  disabled,
  placeholder,
  help,
  error,
}: {
  label: string;
  /** e.g. "sk_test_…4242"; null when the API only says whether it's set. */
  hint: string | null;
  isSet: boolean;
  value: SecretChange;
  onChange: (value: SecretChange) => void;
  disabled?: boolean;
  placeholder?: string;
  help?: ReactNode;
  error?: string;
}) {
  const editing = typeof value === 'string' || !isSet;
  return (
    <Field label={label} hint={help} error={error}>
      {(f) =>
        value === null ? (
          <div className="flex flex-wrap items-center gap-3 py-1.5 text-[15px]">
            <span className="text-ink-soft">Removed when you save.</span>
            <ActionButton size="sm" variant="ghost" onClick={() => onChange(undefined)}>
              Undo
            </ActionButton>
          </div>
        ) : editing ? (
          <div className="flex gap-2">
            <Input
              {...f}
              type="password"
              autoComplete="off"
              spellCheck={false}
              disabled={disabled}
              placeholder={placeholder}
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value)}
            />
            {isSet && (
              <ActionButton variant="ghost" onClick={() => onChange(undefined)}>
                Cancel
              </ActionButton>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 py-1">
            <span id={f.id}>
              <StatusBadge status="ACTIVE" label="Set" /> {hint && <Env>{hint}</Env>}
            </span>
            {!disabled && (
              <>
                <ActionButton size="sm" variant="secondary" onClick={() => onChange('')}>
                  Replace
                </ActionButton>
                <ActionButton size="sm" variant="ghost" onClick={() => onChange(null)}>
                  Remove
                </ActionButton>
              </>
            )}
          </div>
        )
      }
    </Field>
  );
}

/** The update value for a secret: empty input means "keep". */
export function secretUpdate(value: SecretChange): string | null | undefined {
  if (value === null) return null;
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
