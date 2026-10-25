'use client';

import type {
  AdminEmailEvent,
  EmailTemplateGroup,
  EmailTemplatePreview,
  EmailTemplateSummary,
  IntegrationCheck,
} from '@shimanto/types';
import {
  ActionButton,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  FilterChips,
  Icon,
  Input,
  LoadMore,
  LoadingState,
  Notice,
  PageHeader,
  SearchInput,
  Select,
  StatRow,
  StatusBadge,
  Tabs,
  cn,
  formatDateTime,
  formatRelative,
} from '@shimanto/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAdmin } from '@/lib/session';
import { useAction } from '@/lib/use-action';
import { useApi } from '@/lib/use-api';
import { useDebounced, usePaged } from '@/lib/use-paged';

const GROUPS: Array<{ id: EmailTemplateGroup; label: string; description: string }> = [
  { id: 'account', label: 'Account', description: 'Sign-up, sign-in and security' },
  { id: 'orders', label: 'Orders & payments', description: 'Confirmations, receipts, payments' },
  { id: 'delivery', label: 'Delivery', description: 'Downloads and repository access' },
  { id: 'support', label: 'Support', description: 'Tickets and replies' },
  { id: 'system', label: 'System', description: 'Checks you run yourself' },
];

type Tab = 'templates' | 'sent';
type Audience = EmailTemplateSummary['audience'];

const matches = (t: EmailTemplateSummary, q: string) =>
  [t.name, t.subject, t.trigger, t.key].some((s) => s.toLowerCase().includes(q));

/**
 * Every email the store sends, in two tabs: the templates (grouped, each opens a live preview
 * you can send to yourself) and the emails actually sent, with their delivery status.
 */
export function EmailsView() {
  const params = useSearchParams();
  const router = useRouter();
  const tab: Tab = params.get('tab') === 'sent' ? 'sent' : 'templates';
  const list = useApi<EmailTemplateSummary[]>('/v1/admin/email-templates');
  const templates = useMemo(() => list.data ?? [], [list.data]);
  const open = templates.find((t) => t.key === params.get('t')) ?? null;

  const base = tab === 'sent' ? '/emails?tab=sent' : '/emails';
  const go = (url: string) => router.replace(url, { scroll: false });
  const preview = (key: string) => go(`${base}${base.includes('?') ? '&' : '?'}t=${key}`);

  const sent = templates.reduce((sum, t) => sum + t.sent, 0);
  const failed = templates.reduce((sum, t) => sum + t.failed, 0);
  const last = templates
    .map((t) => t.lastSentAt)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1);

  return (
    <>
      <PageHeader
        title="Emails"
        description="Every email the store sends: what it looks like, when it goes out, and whether it arrived."
        actions={
          <ActionButton href="/settings?tab=emails" variant="secondary" icon="gear">
            Delivery settings
          </ActionButton>
        }
      />

      {list.error && !list.data ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : !list.data ? (
        <LoadingState rows={6} label="Loading emails…" />
      ) : (
        <>
          <StatRow
            className="mb-8"
            stats={[
              {
                label: 'Templates',
                value: templates.length,
                hint: `${templates.filter((t) => t.audience === 'customer').length} to customers · ${templates.filter((t) => t.audience === 'admin').length} to you`,
              },
              { label: 'Emails sent', value: sent, href: '/emails?tab=sent' },
              {
                label: 'Failed',
                value: failed,
                hint: failed ? 'Check the reason in Sent emails' : 'Everything was delivered',
                href: failed ? '/emails?tab=sent&status=FAILED' : undefined,
              },
              { label: 'Last sent', value: last ? formatRelative(last) : '—' },
            ]}
          />
          <Tabs
            items={[
              {
                label: 'Templates',
                href: '/emails',
                active: tab === 'templates',
                count: templates.length,
              },
              { label: 'Sent emails', href: '/emails?tab=sent', active: tab === 'sent' },
            ]}
          />
          {tab === 'templates' ? (
            <TemplatesTable templates={templates} onOpen={preview} />
          ) : (
            <SentEmails templates={templates} onOpen={preview} />
          )}
        </>
      )}

      <Dialog
        open={Boolean(open)}
        onOpenChange={(isOpen) => !isOpen && go(base)}
        title={open?.name ?? 'Email'}
        description={open?.trigger}
        size="xl"
      >
        {open && <TemplatePreview key={open.key} template={open} onSent={list.reload} />}
      </Dialog>
    </>
  );
}

function TemplatesTable({
  templates,
  onOpen,
}: {
  templates: EmailTemplateSummary[];
  onOpen: (key: string) => void;
}) {
  const [audience, setAudience] = useState<Audience | ''>('');
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const visible = templates.filter(
    (t) => (!audience || t.audience === audience) && (!query || matches(t, query)),
  );
  const count = (a: Audience) => templates.filter((t) => t.audience === a).length;

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          label="Who receives it"
          value={audience}
          onChange={setAudience}
          options={[
            { value: '', label: 'All' },
            { value: 'customer', label: `To customers · ${count('customer')}` },
            { value: 'admin', label: `To you · ${count('admin')}` },
          ]}
        />
        <SearchInput
          className="w-full sm:w-80"
          placeholder="Search name, subject or when it’s sent"
          aria-label="Search email templates"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState spot="hello" title="No emails match" />
      ) : (
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full border-collapse text-left text-[15px]">
            <caption className="sr-only">Email templates</caption>
            <thead>
              <tr className="border-ink/10 border-b">
                {['Email', 'Subject', 'Goes to', 'Sent', 'Last sent'].map((h, i) => (
                  <th
                    key={h}
                    scope="col"
                    className={cn(
                      'text-ink-soft px-1 py-2.5 text-[13px] font-medium whitespace-nowrap sm:px-3',
                      i === 1 && 'hidden lg:table-cell',
                      i === 2 && 'hidden sm:table-cell',
                      i === 3 && 'text-right',
                      i === 4 && 'hidden md:table-cell',
                    )}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            {GROUPS.map((group) => {
              const rows = visible.filter((t) => t.group === group.id);
              if (rows.length === 0) return null;
              return (
                <tbody key={group.id}>
                  <tr>
                    <th
                      colSpan={5}
                      scope="colgroup"
                      className="bg-ink/[0.03] px-1 pt-5 pb-2.5 text-left sm:px-3"
                    >
                      <span className="text-[15px] font-semibold">{group.label}</span>
                      <span className="text-ink-soft ml-2 text-[13px] font-normal">
                        {rows.length} · {group.description}
                      </span>
                    </th>
                  </tr>
                  {rows.map((t) => (
                    <tr
                      key={t.key}
                      className="border-ink/[0.07] hover:bg-ink/[0.025] relative border-b last:border-b-0"
                    >
                      <td className="px-1 py-3.5 align-top sm:px-3">
                        <button
                          type="button"
                          onClick={() => onOpen(t.key)}
                          className="text-left font-medium after:absolute after:inset-0 hover:underline"
                        >
                          {t.name}
                        </button>
                        <p className="text-ink-soft mt-0.5 max-w-md text-[13px] leading-snug">
                          {t.trigger}
                        </p>
                      </td>
                      <td className="text-ink-soft hidden max-w-sm px-1 py-3.5 align-top text-sm sm:px-3 lg:table-cell">
                        <span className="line-clamp-2">{t.subject}</span>
                      </td>
                      <td className="hidden px-1 py-3.5 align-top sm:table-cell sm:px-3">
                        <StatusBadge
                          status={t.audience}
                          tone={t.audience === 'admin' ? 'info' : 'neutral'}
                          label={t.audience === 'admin' ? 'You' : 'Customer'}
                        />
                      </td>
                      <td className="px-1 py-3.5 text-right align-top tabular-nums sm:px-3">
                        {t.sent}
                        {t.failed > 0 && (
                          <span className="text-create block text-xs font-medium">
                            {t.failed} failed
                          </span>
                        )}
                      </td>
                      <td className="text-ink-soft hidden px-1 py-3.5 align-top text-sm whitespace-nowrap sm:px-3 md:table-cell">
                        {t.lastSentAt ? formatRelative(t.lastSentAt) : 'Not yet'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              );
            })}
          </table>
        </div>
      )}
    </>
  );
}

type Status = '' | 'QUEUED' | 'SENT' | 'FAILED';

function SentEmails({
  templates,
  onOpen,
}: {
  templates: EmailTemplateSummary[];
  onOpen: (key: string) => void;
}) {
  const params = useSearchParams();
  const initial = params.get('status');
  const [status, setStatus] = useState<Status>(
    initial === 'SENT' || initial === 'QUEUED' || initial === 'FAILED' ? initial : '',
  );
  const [type, setType] = useState('');
  const [q, setQ] = useState('');
  const query = useDebounced(q);
  const filter = useMemo(
    () => ({ status: status || undefined, type: type || undefined, q: query || undefined }),
    [status, type, query],
  );
  const log = usePaged<AdminEmailEvent>('/v1/admin/emails', filter);
  const byKey = new Map(templates.map((t) => [t.key, t]));

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          label="Delivery status"
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'All' },
            { value: 'SENT', label: 'Sent' },
            { value: 'QUEUED', label: 'Queued' },
            { value: 'FAILED', label: 'Failed' },
          ]}
        />
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <Select
            aria-label="Template"
            className="sm:w-56"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">All templates</option>
            {GROUPS.map((group) => (
              <optgroup key={group.id} label={group.label}>
                {templates
                  .filter((t) => t.group === group.id)
                  .map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </Select>
          <SearchInput
            className="w-full sm:w-72"
            placeholder="Search recipient or subject"
            aria-label="Search sent emails"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {log.error ? (
        <ErrorState message={log.error} onRetry={log.reload} />
      ) : log.loading ? (
        <LoadingState rows={6} />
      ) : (
        <>
          <DataTable
            caption="Sent emails"
            rows={log.items}
            rowKey={(m) => m.id}
            empty={
              <EmptyState
                spot="hello"
                title={status || type || query ? 'No emails match' : 'No emails sent yet'}
              />
            }
            columns={[
              {
                key: 'email',
                header: 'Email',
                cell: (m) => {
                  const template = byKey.get(m.type);
                  return (
                    <div className="min-w-0">
                      <p className="break-words">{m.subject}</p>
                      {template ? (
                        <button
                          type="button"
                          onClick={() => onOpen(template.key)}
                          className="text-ink-soft hover:text-ink inline-flex items-center gap-1 text-sm underline-offset-4 hover:underline"
                        >
                          {template.name}
                          <Icon name="eye" className="size-3.5" />
                        </button>
                      ) : (
                        <p className="text-ink-soft text-sm">{m.type}</p>
                      )}
                    </div>
                  );
                },
              },
              {
                key: 'to',
                header: 'To',
                hideOnMobile: true,
                cell: (m) => <span className="break-all">{m.recipient}</span>,
              },
              {
                key: 'status',
                header: 'Status',
                cell: (m) => (
                  <div>
                    <StatusBadge status={m.status} />
                    {m.failureReason && (
                      <p className="text-ink-soft mt-1 max-w-56 text-xs">{m.failureReason}</p>
                    )}
                  </div>
                ),
              },
              {
                key: 'when',
                header: 'When',
                hideOnMobile: true,
                className: 'whitespace-nowrap',
                cell: (m) => (
                  <span title={formatDateTime(m.sentAt ?? m.createdAt)}>
                    {formatRelative(m.sentAt ?? m.createdAt)}
                  </span>
                ),
              },
            ]}
          />
          <LoadMore
            hasMore={log.hasMore}
            loading={log.loadingMore}
            onClick={() => void log.loadMore()}
          />
        </>
      )}
    </>
  );
}

function TemplatePreview({
  template,
  onSent,
}: {
  template: EmailTemplateSummary;
  onSent: () => void;
}) {
  const { user } = useAdmin();
  const preview = useApi<EmailTemplatePreview>(`/v1/admin/email-templates/${template.key}`);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [format, setFormat] = useState<'html' | 'text'>('html');
  const [to, setTo] = useState(user?.email ?? '');
  const [result, setResult] = useState<string | null>(null);
  const action = useAction();
  const group = GROUPS.find((g) => g.id === template.group);

  return (
    <div className="grid gap-5">
      <dl className="border-ink/10 grid gap-x-6 gap-y-2.5 border-y py-4 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-ink-soft">Subject</dt>
        <dd className="font-medium">{preview.data?.subject ?? template.subject}</dd>
        <dt className="text-ink-soft">Group</dt>
        <dd className="flex flex-wrap items-center gap-2">
          {group?.label}
          <StatusBadge
            status={template.audience}
            tone={template.audience === 'admin' ? 'info' : 'neutral'}
            label={template.audience === 'admin' ? 'Sent to you' : 'Sent to the customer'}
          />
        </dd>
        <dt className="text-ink-soft">Sent so far</dt>
        <dd>
          {template.sent > 0
            ? `${template.sent} time${template.sent === 1 ? '' : 's'}, last ${formatRelative(template.lastSentAt)}`
            : 'Not sent yet'}
          {template.failed > 0 && (
            <span className="text-create ml-2 font-medium">{template.failed} failed</span>
          )}
        </dd>
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          label="Preview size"
          value={device}
          onChange={setDevice}
          options={[
            { value: 'desktop', label: 'Desktop' },
            { value: 'mobile', label: 'Mobile' },
          ]}
        />
        <Segmented
          label="Version"
          value={format}
          onChange={setFormat}
          options={[
            { value: 'html', label: 'Designed' },
            { value: 'text', label: 'Plain text' },
          ]}
        />
      </div>

      {/* Email clients render on a light canvas, so the preview keeps one in dark mode too. */}
      <div className="overflow-hidden rounded-2xl bg-[#e9e4d8] p-3 sm:p-5">
        {preview.error ? (
          <ErrorState message={preview.error} onRetry={preview.reload} />
        ) : !preview.data ? (
          <div className="h-[min(640px,60vh)] animate-pulse rounded-xl bg-white/60" />
        ) : format === 'html' ? (
          <iframe
            title={`Preview of ${template.name}`}
            srcDoc={preview.data.html}
            // No scripts, no navigation: the preview is for looking only.
            sandbox=""
            className={cn(
              'mx-auto block h-[min(640px,60vh)] rounded-xl bg-white shadow-sm transition-[width] duration-300',
              device === 'mobile' ? 'w-[375px] max-w-full' : 'w-full',
            )}
          />
        ) : (
          <pre
            className={cn(
              'mx-auto h-[min(640px,60vh)] overflow-auto rounded-xl bg-white p-5 font-mono text-[13px] leading-relaxed whitespace-pre-wrap text-[#2C2E2A]',
              device === 'mobile' ? 'w-[375px] max-w-full' : 'w-full',
            )}
          >
            {preview.data.text}
          </pre>
        )}
      </div>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setResult(null);
          const res = await action.run(() =>
            api.post<IntegrationCheck>(`/v1/admin/email-templates/${template.key}/test`, { to }),
          );
          if (res) {
            setResult(res.message);
            onSent();
          }
        }}
        noValidate
      >
        <Field
          label="Send this email to"
          hint="Uses the sample data shown above."
          className="min-w-60 flex-1"
          error={action.fields.to}
        >
          {(f) => <Input {...f} type="email" value={to} onChange={(e) => setTo(e.target.value)} />}
        </Field>
        <ActionButton
          type="submit"
          variant="secondary"
          icon="send"
          loading={action.isBusy()}
          disabled={!to}
        >
          Send test
        </ActionButton>
      </form>
      {result && <p className="text-sm font-medium">{result}</p>}
      {action.error && <Notice tone="danger">{action.error}</Notice>}
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="bg-ink/[0.05] rounded-pill flex p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-pill h-8 px-3.5 text-sm font-medium transition-colors',
            value === option.value ? 'bg-paper text-ink shadow-sm' : 'text-ink-soft hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
