'use client';

import { errorMessage } from '@shimanto/sdk';
import type { CustomerMe } from '@shimanto/types';
import {
  ActionButton,
  ConfirmDialog,
  DescriptionList,
  Icon,
  Notice,
  PageHeader,
  Section,
  StatusBadge,
  formatDate,
} from '@shimanto/ui';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { useSession } from '@/lib/session';
import { AccountTabs } from '../view';

const results: Record<string, { tone: 'success' | 'warning' | 'danger' | 'info'; text: string }> = {
  connected: {
    tone: 'success',
    text: 'GitHub connected. Any repository access that was waiting has been sent.',
  },
  taken: {
    tone: 'danger',
    text: 'That GitHub account is already linked to another customer account. Use a different GitHub account, or contact support.',
  },
  cancelled: { tone: 'info', text: 'GitHub connection was cancelled.' },
  invalid: { tone: 'warning', text: 'The connection expired or didn’t match. Please try again.' },
  failed: { tone: 'danger', text: 'GitHub didn’t confirm the connection. Please try again.' },
  unavailable: {
    tone: 'warning',
    text: 'Connecting GitHub isn’t available right now. Please contact support.',
  },
};

export function GithubView() {
  const { me, setMe } = useSession();
  const result = useSearchParams().get('github');
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!me) return null;
  const notice = result ? results[result] : undefined;

  return (
    <>
      <PageHeader title="Account" description="Your details and how we contact you." />
      <AccountTabs active="github" />

      {notice && (
        <Notice tone={notice.tone} className="mb-6">
          {notice.text}
        </Notice>
      )}
      {error && (
        <Notice tone="danger" className="mb-6">
          {error}
        </Notice>
      )}

      <Section
        title="GitHub account"
        description="Products delivered as a private repository are shared with the GitHub account you connect here. We only read your GitHub username and id; we never get access to your repositories."
      >
        {me.github.connected ? (
          <>
            <DescriptionList
              items={[
                {
                  label: 'Connected account',
                  value: (
                    <span className="inline-flex items-center gap-2 font-medium">
                      <Icon name="github" className="size-4" />@{me.github.login}
                    </span>
                  ),
                },
                { label: 'Connected on', value: formatDate(me.github.connectedAt) },
                { label: 'Status', value: <StatusBadge status="ACTIVE" label="Connected" /> },
              ]}
            />
            <div className="mt-6 flex flex-wrap gap-2">
              <ActionButton
                variant="secondary"
                icon="repeat"
                href={`${API_URL}/v1/account/github/connect`}
              >
                Switch account
              </ActionButton>
              <ActionButton variant="ghost" onClick={() => setConfirm(true)}>
                Disconnect
              </ActionButton>
            </div>
          </>
        ) : me.github.available ? (
          <div className="flex flex-wrap items-center gap-4">
            <ActionButton icon="github" href={`${API_URL}/v1/account/github/connect`}>
              Connect GitHub
            </ActionButton>
            <p className="text-ink-soft text-sm">
              You’ll approve the connection on github.com and come right back.
            </p>
          </div>
        ) : (
          <Notice tone="info">
            Connecting GitHub isn’t available yet. If you bought a repository product, contact
            support and we’ll sort it out.
          </Notice>
        )}
      </Section>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Disconnect GitHub?"
        description="Repository access you already have stays. New repository deliveries will wait until you connect an account again."
        confirmLabel="Disconnect"
        tone="danger"
        onConfirm={async () => {
          try {
            setMe(await api.delete<CustomerMe>('/v1/account/github'));
          } catch (e) {
            setError(errorMessage(e));
          }
        }}
      />
    </>
  );
}
