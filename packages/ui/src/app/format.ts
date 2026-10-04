/** Formatting shared by the admin and customer portals. Amounts are minor units (cents). */

export function formatMoney(
  amount: number,
  currency: string,
  opts: { free?: string } = {},
): string {
  if (amount === 0 && opts.free) return opts.free;
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }
}

/** "USD 49 · BDT 1,200": per-currency totals, never added across currencies. */
export function formatTotals(totals: Record<string, number>): string {
  const entries = Object.entries(totals);
  if (entries.length === 0) return formatMoney(0, 'USD');
  return entries.map(([currency, amount]) => formatMoney(amount, currency)).join(' · ');
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value));
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}

/** "3 min ago", "yesterday", or a date for anything older than a week. */
export function formatRelative(value: string | Date | null | undefined, now = Date.now()): string {
  if (!value) return '—';
  const diff = (now - new Date(value).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)} h ago`;
  if (diff < 172_800) return 'yesterday';
  if (diff < 604_800) return `${Math.floor(diff / 86_400)} days ago`;
  return formatDate(value);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

/** "ACTION_REQUIRED" → "Action required". */
export function humanize(value: string): string {
  const text = value.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}
