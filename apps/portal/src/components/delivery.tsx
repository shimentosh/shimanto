'use client';

import { errorMessage } from '@shimanto/sdk';
import type { DeliveryView } from '@shimanto/types';
import { ActionButton, Icon, Notice, StatusBadge, formatBytes } from '@shimanto/ui';
import { useEffect, useState } from 'react';
import { analytics } from '@/lib/analytics';
import { api } from '@/lib/api';
import { API_URL } from '@/lib/config';
import { useSession } from '@/lib/session';

/** Fetches a fresh 5-minute signed link and starts the download. */
export function useDownload() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const download = async (
    deliveryId: string,
    fileId: string,
    meta: { productName: string; fileName: string } = { productName: '', fileName: '' },
  ) => {
    setBusy(fileId);
    setError(null);
    try {
      const { url } = await api.post<{ url: string }>(
        `/v1/account/downloads/${deliveryId}/${fileId}`,
      );
      analytics.trackDownload(meta);
      window.location.assign(url);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };
  return { download, busy, error };
}

const githubCopy: Record<DeliveryView['status'], string> = {
  PENDING: 'We’re preparing your repository access.',
  ACTION_REQUIRED:
    'Connect your GitHub account and we’ll send the repository invitation automatically.',
  READY: 'Ready.',
  INVITATION_SENT:
    'An invitation is waiting on GitHub. Accept it to get access (it expires after 7 days).',
  ACCEPTED: 'Your GitHub account has access to the repository.',
  EXPIRED: 'The invitation expired or was declined. Send a new one whenever you’re ready.',
  FAILED:
    'We couldn’t send the invitation yet. Check your connected GitHub account and try again, or contact support.',
  REVOKED: 'Access to this repository was removed.',
};

/** One delivery (files or repository) with the right next step for its status. */
export function DeliveryBlock({
  delivery,
  onChange,
}: {
  delivery: DeliveryView;
  onChange?: (next: DeliveryView) => void;
}) {
  const { me } = useSession();
  const { download, busy, error } = useDownload();
  const [acting, setActing] = useState<'retry' | 'refresh' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Counted once per delivery, the first time the customer sees access granted.
  useEffect(() => {
    if (delivery.type === 'GITHUB' && delivery.status === 'ACCEPTED') {
      analytics.trackGithubAccessGranted(delivery.id, delivery.productName);
    }
  }, [delivery.id, delivery.type, delivery.status, delivery.productName]);

  const act = async (kind: 'retry' | 'refresh') => {
    setActing(kind);
    setActionError(null);
    try {
      const next = await api.post<DeliveryView>(`/v1/account/deliveries/${delivery.id}/${kind}`);
      onChange?.(next);
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setActing(null);
    }
  };

  if (delivery.type === 'R2') {
    return (
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Icon name="download" className="text-ink-soft size-4" />
          <span className="text-sm font-medium">Files</span>
          <StatusBadge
            status={delivery.status}
            label={delivery.status === 'READY' ? 'Ready to download' : undefined}
          />
        </div>
        {delivery.files.length > 0 ? (
          <ul className="divide-ink/[0.07] mt-3 divide-y">
            {delivery.files.map((file) => (
              <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium break-words">{file.label}</p>
                  <p className="text-ink-soft text-sm">
                    {file.filename} · {formatBytes(file.size)}
                    {file.version && ` · v${file.version}`}
                  </p>
                </div>
                <ActionButton
                  size="sm"
                  variant="secondary"
                  icon="download"
                  loading={busy === file.id}
                  onClick={() =>
                    void download(delivery.id, file.id, {
                      productName: delivery.productName,
                      fileName: file.filename,
                    })
                  }
                  aria-label={`Download ${file.label}`}
                >
                  Download
                </ActionButton>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ink-soft mt-2 text-[15px]">
            {delivery.status === 'REVOKED'
              ? 'Downloads are no longer available for this order.'
              : 'Your files are being prepared.'}
          </p>
        )}
        {error && (
          <Notice tone="danger" className="mt-3">
            {error}
          </Notice>
        )}
      </div>
    );
  }

  const gh = delivery.github;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <Icon name="github" className="text-ink-soft size-4" />
        <span className="text-sm font-medium">GitHub repository</span>
        <StatusBadge status={delivery.status} />
      </div>
      <p className="text-ink-soft mt-2 text-[15px]">
        {githubCopy[delivery.status]}
        {delivery.status === 'INVITATION_SENT' && gh?.login && (
          <>
            {' '}
            Invited: <strong className="text-ink">@{gh.login}</strong>.
          </>
        )}
      </p>
      {gh?.repository && <p className="mt-1 font-mono text-sm">{gh.repository}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {delivery.status === 'ACTION_REQUIRED' &&
          (me?.github.available ? (
            <ActionButton
              size="sm"
              icon="github"
              href={`${API_URL}/v1/account/github/connect`}
              external={false}
            >
              Connect GitHub
            </ActionButton>
          ) : (
            <ActionButton size="sm" variant="secondary" href="/support/new">
              Contact support
            </ActionButton>
          ))}
        {delivery.status === 'INVITATION_SENT' && gh?.url && (
          <>
            <ActionButton size="sm" icon="external" href={gh.url} external>
              Accept on GitHub
            </ActionButton>
            <ActionButton
              size="sm"
              variant="secondary"
              icon="repeat"
              loading={acting === 'refresh'}
              onClick={() => void act('refresh')}
            >
              I’ve accepted it
            </ActionButton>
          </>
        )}
        {delivery.status === 'ACCEPTED' && gh?.url && (
          <ActionButton size="sm" variant="secondary" icon="external" href={gh.url} external>
            Open repository
          </ActionButton>
        )}
        {gh?.canRetry && (
          <ActionButton
            size="sm"
            icon="repeat"
            loading={acting === 'retry'}
            onClick={() => void act('retry')}
          >
            {delivery.status === 'EXPIRED' ? 'Send a new invitation' : 'Try again'}
          </ActionButton>
        )}
      </div>
      {actionError && (
        <Notice tone="danger" className="mt-3">
          {actionError}
        </Notice>
      )}
    </div>
  );
}
