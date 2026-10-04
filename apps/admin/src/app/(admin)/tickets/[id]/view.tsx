'use client';

import type { TicketDetail } from '@shimanto/types';
import {
  ActionButton,
  DescriptionList,
  ErrorState,
  Field,
  FileDrop,
  LoadingState,
  Notice,
  PageHeader,
  Select,
  StatusBadge,
  SupportConversation,
  Textarea,
  formatDateTime,
} from '@shimanto/ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/use-action';
import { useApi } from '@/lib/use-api';

type Status = TicketDetail['status'];

export function TicketView() {
  const { id } = useParams<{ id: string }>();
  const {
    data: ticket,
    error,
    loading,
    reload,
    setData,
  } = useApi<TicketDetail>(`/v1/admin/tickets/${id}`);
  const action = useAction();
  const [message, setMessage] = useState('');
  const [replyStatus, setReplyStatus] = useState<Status>('PENDING');
  const [file, setFile] = useState<File | null>(null);

  if (loading && !ticket) return <LoadingState rows={6} />;
  if (error || !ticket)
    return <ErrorState title="Ticket not found" message={error ?? undefined} onRetry={reload} />;

  const reply = async (event: FormEvent) => {
    event.preventDefault();
    const form = new FormData();
    form.set('message', message);
    form.set('status', replyStatus);
    if (file) form.set('file', file);
    const res = await action.run(
      () => api.upload<TicketDetail>(`/v1/admin/tickets/${ticket.id}/messages`, form),
      {
        key: 'reply',
        success: 'Reply sent. The customer was emailed.',
      },
    );
    if (res) {
      setData(res);
      setMessage('');
      setFile(null);
    }
  };

  const setStatus = async (status: Status) => {
    const res = await action.run(
      () => api.patch<TicketDetail>(`/v1/admin/tickets/${ticket.id}`, { status }),
      {
        key: `status:${status}`,
        success:
          status === 'RESOLVED' ? 'Marked resolved. The customer was emailed.' : 'Status updated.',
      },
    );
    if (res) setData(res);
  };

  const openAttachment = async (messageId: string) => {
    const res = await action.run(
      () =>
        api.post<{ url: string }>(
          `/v1/admin/tickets/${ticket.id}/messages/${messageId}/attachment`,
        ),
      { key: 'file' },
    );
    if (res) window.open(res.url, '_blank', 'noopener');
  };

  return (
    <>
      <PageHeader
        back={{ href: '/tickets', label: 'Support' }}
        eyebrow={
          <>
            <StatusBadge status={ticket.status} />
            <span>
              #{ticket.number} · opened {formatDateTime(ticket.createdAt)}
            </span>
          </>
        }
        title={ticket.subject}
        actions={
          <>
            {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
              <ActionButton
                size="sm"
                variant="secondary"
                icon="check"
                loading={action.isBusy('status:RESOLVED')}
                onClick={() => void setStatus('RESOLVED')}
              >
                Mark resolved
              </ActionButton>
            )}
            {ticket.status !== 'CLOSED' ? (
              <ActionButton
                size="sm"
                variant="ghost"
                loading={action.isBusy('status:CLOSED')}
                onClick={() => void setStatus('CLOSED')}
              >
                Close
              </ActionButton>
            ) : (
              <ActionButton
                size="sm"
                variant="ghost"
                loading={action.isBusy('status:OPEN')}
                onClick={() => void setStatus('OPEN')}
              >
                Reopen
              </ActionButton>
            )}
          </>
        }
      />
      <div className="mb-6 grid gap-3">
        {action.error && <Notice tone="danger">{action.error}</Notice>}
        {action.success && <Notice tone="success">{action.success}</Notice>}
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0">
          <SupportConversation
            messages={ticket.messages}
            viewer="ADMIN"
            onOpenAttachment={(m) => void openAttachment(m.id)}
          />
          <form
            onSubmit={reply}
            className="border-ink/10 mt-10 grid gap-4 border-t pt-8"
            noValidate
          >
            <Field label="Reply to the customer" error={action.fields.message}>
              {(f) => (
                <Textarea
                  {...f}
                  rows={6}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              )}
            </Field>
            <FileDrop
              file={file}
              onFile={setFile}
              accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,application/zip"
              hint="Optional: image, PDF or ZIP, up to 10 MB"
            />
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Then set status to" className="w-56">
                {(f) => (
                  <Select
                    {...f}
                    value={replyStatus}
                    onChange={(e) => setReplyStatus(e.target.value as Status)}
                  >
                    <option value="PENDING">Pending (waiting on customer)</option>
                    <option value="OPEN">Open</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </Select>
                )}
              </Field>
              <ActionButton
                type="submit"
                icon="send"
                loading={action.isBusy('reply')}
                disabled={!message.trim()}
              >
                Send reply
              </ActionButton>
            </div>
          </form>
        </div>
        <aside className="lg:border-ink/10 lg:border-l lg:pl-8">
          <DescriptionList
            columns={1}
            items={[
              {
                label: 'Customer',
                value: (
                  <Link
                    href={`/customers/${ticket.customer.id}`}
                    className="font-medium hover:underline"
                  >
                    {ticket.customer.name ?? ticket.customer.email}
                  </Link>
                ),
              },
              { label: 'Email', value: <span className="break-all">{ticket.customer.email}</span> },
              ticket.product
                ? {
                    label: 'Product',
                    value: (
                      <Link href={`/products/${ticket.product.id}`} className="hover:underline">
                        {ticket.product.name}
                      </Link>
                    ),
                  }
                : null,
              ticket.order
                ? {
                    label: 'Order',
                    value: (
                      <Link href={`/orders/${ticket.order.id}`} className="hover:underline">
                        #{ticket.order.number}
                      </Link>
                    ),
                  }
                : null,
              { label: 'Last message', value: formatDateTime(ticket.lastMessageAt) },
            ]}
          />
        </aside>
      </div>
    </>
  );
}
