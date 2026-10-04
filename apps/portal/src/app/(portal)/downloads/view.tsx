'use client';

import type { DownloadItem } from '@shimanto/types';
import {
  ActionButton,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
  formatBytes,
} from '@shimanto/ui';
import Link from 'next/link';
import { useDownload } from '@/components/delivery';
import { SITE_URL } from '@/lib/config';
import { useApi } from '@/lib/use-api';

export function DownloadsView() {
  const { data, error, loading, reload } = useApi<DownloadItem[]>('/v1/account/downloads');
  const { download, busy, error: downloadError } = useDownload();

  return (
    <>
      <PageHeader
        title="Downloads"
        description="Every file you own. Each click creates a fresh, private link that works for 5 minutes."
      />
      {downloadError && (
        <Notice tone="danger" className="mb-6">
          {downloadError}
        </Notice>
      )}
      {loading && !data ? (
        <LoadingState rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : (
        <DataTable
          caption="Your downloads"
          rows={data ?? []}
          rowKey={(f) => `${f.deliveryId}:${f.id}`}
          empty={
            <EmptyState
              spot="package"
              title="No downloads yet"
              description="Files from your products appear here once an order is confirmed."
              action={<ActionButton href={`${SITE_URL}/products`}>Browse the store</ActionButton>}
            />
          }
          columns={[
            {
              key: 'file',
              header: 'File',
              cell: (f) => (
                <div className="min-w-0">
                  <p className="font-medium break-words">{f.label}</p>
                  <p className="text-ink-soft text-sm break-all">{f.filename}</p>
                </div>
              ),
            },
            {
              key: 'product',
              header: 'Product',
              hideOnMobile: true,
              cell: (f) => (
                <Link href={`/orders/${f.orderNumber}`} className="hover:underline">
                  {f.productName}
                </Link>
              ),
            },
            {
              key: 'version',
              header: 'Version',
              hideOnMobile: true,
              cell: (f) => f.version ?? '—',
            },
            {
              key: 'size',
              header: 'Size',
              align: 'right',
              hideOnMobile: true,
              cell: (f) => <span className="whitespace-nowrap">{formatBytes(f.size)}</span>,
            },
            {
              key: 'action',
              header: <span className="sr-only">Download</span>,
              align: 'right',
              cell: (f) => (
                <ActionButton
                  size="sm"
                  variant="secondary"
                  icon="download"
                  loading={busy === f.id}
                  onClick={() => void download(f.deliveryId, f.id)}
                  aria-label={`Download ${f.label}`}
                >
                  Download
                </ActionButton>
              ),
            },
          ]}
        />
      )}
    </>
  );
}
