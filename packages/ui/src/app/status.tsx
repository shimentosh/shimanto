import { cn } from '../lib/cn';
import { humanize } from './format';

export type StatusTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

const TONES: Record<string, StatusTone> = {
  // Orders, payments, fulfillment
  COMPLETED: 'success',
  PAID: 'success',
  DELIVERED: 'success',
  PROCESSING: 'info',
  PARTIALLY_DELIVERED: 'info',
  PENDING: 'warning',
  FAILED: 'danger',
  CANCELLED: 'danger',
  REFUNDED: 'neutral',
  NOT_REQUIRED: 'neutral',
  // Deliveries
  READY: 'success',
  ACCEPTED: 'success',
  INVITATION_SENT: 'info',
  ACTION_REQUIRED: 'warning',
  EXPIRED: 'warning',
  REVOKED: 'neutral',
  // Tickets
  OPEN: 'info',
  RESOLVED: 'success',
  CLOSED: 'neutral',
  // Other
  ACTIVE: 'success',
  DISABLED: 'danger',
  PUBLISHED: 'success',
  DRAFT: 'warning',
  ARCHIVED: 'neutral',
  SENT: 'success',
  QUEUED: 'info',
};

/** Friendlier words where the raw enum reads oddly to customers. */
const LABELS: Record<string, string> = {
  READY: 'Ready',
  ACCEPTED: 'Access granted',
  INVITATION_SENT: 'Invitation sent',
  NOT_REQUIRED: 'Free',
  PARTIALLY_DELIVERED: 'Partly delivered',
  PENDING_TICKET: 'Waiting on you',
};

const toneStyles: Record<StatusTone, { dot: string; chip: string }> = {
  success: { dot: 'bg-build', chip: 'bg-build/20 text-ink' },
  info: { dot: 'bg-signal', chip: 'bg-signal/15 text-ink' },
  warning: { dot: 'bg-spark', chip: 'bg-spark/30 text-ink' },
  danger: { dot: 'bg-create', chip: 'bg-create/20 text-ink' },
  neutral: { dot: 'bg-ink-soft', chip: 'bg-ink/[0.07] text-ink-soft' },
};

export function statusTone(status: string): StatusTone {
  return TONES[status] ?? 'neutral';
}

export function statusLabel(status: string): string {
  return LABELS[status] ?? humanize(status);
}

export interface StatusBadgeProps {
  status: string;
  /** Override the label (e.g. customer-facing wording). */
  label?: string;
  tone?: StatusTone;
  className?: string;
}

/** Small pill with a coloured dot. Colour is never the only signal: the label always shows. */
export function StatusBadge({ status, label, tone, className }: StatusBadgeProps) {
  const style = toneStyles[tone ?? statusTone(status)];
  return (
    <span
      className={cn(
        'rounded-pill inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[13px] leading-5 font-medium whitespace-nowrap',
        style.chip,
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', style.dot)} />
      {label ?? statusLabel(status)}
    </span>
  );
}
