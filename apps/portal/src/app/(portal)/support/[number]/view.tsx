'use client';

import { errorMessage, fieldErrors } from '@shimanto/sdk';
import type { TicketDetail } from '@shimanto/types';
import {
  ActionButton,
  ErrorState,
  Field,
  FileDrop,
  LoadingState,
  Notice,
  PageHeader,
  StatusBadge,
  SupportConversation,
  Textarea,
  formatDateTime,
} from '@shimanto/ui';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';

export function TicketView() {
  const { number } = useParams<{ number: string }>();
  const created = useSearchParams().get('created') === '1';
  const {
    data: ticket,
    error,
    loading,
    reload,
    setData,
  } = useApi<TicketDetail>(`/v1/account/tickets/${number}`);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const reply = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setSendError(null);
    const form = new FormData();
    form.set('message', message);
    if (file) form.set('file', file);
    try {
      setData(await api.upload<TicketDetail>(`/v1/account/tickets/${number}/messages`, form));
      setMessage('');
      setFile(null);
    } catch (e) {
      const byField = fieldErrors(e);
      setSendError(byField.message ?? byField.file ?? errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const openAttachment = async (messageId: string) => {
    try {
      const { url } = await api.post<{ url: string }>(
        `/v1/account/tickets/${number}/messages/${messageId}/attachment`,
      );
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      setSendError(errorMessage(e));
    }
  };

  if (loading && !ticket) return <LoadingState rows={5} />;
  if (error || !ticket)
    return (
      <ErrorState
        title="Ticket not found"
        message={error ?? undefined}
        onRetry={() => void reload()}
      />
    );

  return (
    <>
      <PageHeader
        back={{ href: '/support', label: 'Support' }}
        eyebrow={
          <>
            <StatusBadge
              status={ticket.status}
              label={ticket.status === 'PENDING' ? 'Waiting on you' : undefined}
            />
            <span>
              #{ticket.number} · opened {formatDateTime(ticket.createdAt)}
            </span>
          </>
        }
        title={ticket.subject}
        description={
          (ticket.product || ticket.order) && (
            <>
              About{' '}
              {ticket.product && (
                <strong className="text-ink font-medium">{ticket.product.name}</strong>
              )}
              {ticket.product && ticket.order && ' · '}
              {ticket.order && (
                <Link
                  href={`/orders/${ticket.order.number}`}
                  className="text-ink underline underline-offset-4"
                >
                  order #{ticket.order.number}
                </Link>
              )}
            </>
          )
        }
      />
      {created && (
        <Notice tone="success" className="mb-6">
          Thanks, we got your message. You’ll get an email when we reply.
        </Notice>
      )}

      <div className="max-w-3xl">
        <SupportConversation
          messages={ticket.messages}
          viewer="CUSTOMER"
          onOpenAttachment={(m) => void openAttachment(m.id)}
        />

        <div className="border-ink/10 mt-10 border-t pt-8">
          {ticket.status === 'CLOSED' ? (
            <Notice
              tone="info"
              action={
                <ActionButton size="sm" href="/support/new">
                  New ticket
                </ActionButton>
              }
            >
              This ticket is closed. Open a new one if you need anything else.
            </Notice>
          ) : (
            <form onSubmit={reply} className="grid gap-4" noValidate>
              {sendError && <Notice tone="danger">{sendError}</Notice>}
              {ticket.status === 'RESOLVED' && (
                <p className="text-ink-soft text-sm">
                  This ticket is marked resolved. Replying reopens it.
                </p>
              )}
              <Field label="Your reply">
                {(f) => (
                  <Textarea
                    {...f}
                    rows={5}
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
              <div>
                <ActionButton type="submit" loading={busy} icon="send" disabled={!message.trim()}>
                  Send reply
                </ActionButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
