'use client';

import type { AdminFile, AdminProduct } from '@shimanto/types';
import {
  ActionButton,
  ConfirmDialog,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  FileDrop,
  FilterChips,
  Input,
  LoadMore,
  LoadingState,
  Notice,
  PageHeader,
  SearchInput,
  Select,
  formatBytes,
  formatDate,
} from '@shimanto/ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/use-action';
import { useApi } from '@/lib/use-api';
import { useDebounced, usePaged } from '@/lib/use-paged';

type Dialogs =
  | { kind: 'upload' }
  | { kind: 'rename'; file: AdminFile }
  | { kind: 'attach'; file: AdminFile }
  | { kind: 'delete'; file: AdminFile }
  | null;

export function FilesView() {
  const [q, setQ] = useState('');
  const [attached, setAttached] = useState<'' | 'yes' | 'no'>('');
  const query = useDebounced(q);
  const filter = useMemo(() => ({ q: query, attached }), [query, attached]);
  const list = usePaged<AdminFile>('/v1/admin/files', filter);
  const products = useApi<AdminProduct[]>('/v1/admin/products');
  const action = useAction();
  const [dialog, setDialog] = useState<Dialogs>(null);
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [version, setVersion] = useState('');
  const [productId, setProductId] = useState('');

  const openDialog = (next: Dialogs) => {
    action.clear();
    setFile(null);
    setVersion('');
    setProductId('');
    setText(next && 'file' in next ? (next.kind === 'rename' ? next.file.filename : '') : '');
    setDialog(next);
  };

  const done = (message: string) => {
    setDialog(null);
    list.reload();
    return message;
  };

  const preview = async (f: AdminFile) => {
    const res = await action.run(
      () => api.post<{ url: string }>(`/v1/admin/files/${f.id}/download`),
      { key: `dl:${f.id}` },
    );
    if (res) window.open(res.url, '_blank', 'noopener');
  };

  return (
    <>
      <PageHeader
        title="Files"
        description="Private product files in storage. They are never public: buyers get 5-minute signed links after an ownership check."
        actions={
          <ActionButton icon="upload" onClick={() => openDialog({ kind: 'upload' })}>
            Upload file
          </ActionButton>
        }
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          label="Attachment"
          value={attached}
          onChange={setAttached}
          options={[
            { value: '', label: 'All files' },
            { value: 'yes', label: 'Attached to a product' },
            { value: 'no', label: 'Unattached' },
          ]}
        />
        <SearchInput
          className="w-full sm:w-80"
          placeholder="Search file, label or product"
          aria-label="Search files"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {action.error && !dialog && (
        <Notice tone="danger" className="mb-6">
          {action.error}
        </Notice>
      )}
      {action.success && !dialog && (
        <Notice tone="success" className="mb-6">
          {action.success}
        </Notice>
      )}

      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.loading ? (
        <LoadingState rows={8} />
      ) : (
        <>
          <DataTable
            caption="Files"
            rows={list.items}
            rowKey={(f) => f.id}
            empty={
              <EmptyState
                spot="package"
                title="No files"
                description="Upload software builds, ebooks, templates or archives, then attach them to products."
                action={
                  <ActionButton onClick={() => openDialog({ kind: 'upload' })}>
                    Upload file
                  </ActionButton>
                }
              />
            }
            columns={[
              {
                key: 'file',
                header: 'File',
                cell: (f) => (
                  <div className="min-w-0">
                    <p className="font-medium break-all">{f.filename}</p>
                    <p className="text-ink-soft text-sm">
                      {f.mimeType} · uploaded {formatDate(f.createdAt)}
                      {f.uploadedBy && ` by ${f.uploadedBy}`}
                    </p>
                  </div>
                ),
              },
              {
                key: 'products',
                header: 'Delivered by',
                hideOnMobile: true,
                cell: (f) =>
                  f.products.length ? (
                    <ul className="grid gap-0.5 text-sm">
                      {f.products.map((p) => (
                        <li key={p.productFileId}>
                          <Link href={`/products/${p.productId}`} className="hover:underline">
                            {p.productName}
                          </Link>
                          <span className="text-ink-soft">
                            {' '}
                            · {p.label}
                            {p.version && ` v${p.version}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-ink-soft text-sm">Not attached</span>
                  ),
              },
              {
                key: 'size',
                header: 'Size',
                align: 'right',
                hideOnMobile: true,
                cell: (f) => <span className="whitespace-nowrap">{formatBytes(f.size)}</span>,
              },
              {
                key: 'actions',
                header: <span className="sr-only">Actions</span>,
                align: 'right',
                cell: (f) => (
                  <div className="flex flex-wrap justify-end gap-1">
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      loading={action.isBusy(`dl:${f.id}`)}
                      onClick={() => void preview(f)}
                    >
                      Download
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      onClick={() => openDialog({ kind: 'attach', file: f })}
                    >
                      Attach
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      onClick={() => openDialog({ kind: 'rename', file: f })}
                    >
                      Rename
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      disabled={f.products.length > 0}
                      title={f.products.length ? 'Detach it from products first' : undefined}
                      onClick={() => openDialog({ kind: 'delete', file: f })}
                    >
                      Delete
                    </ActionButton>
                  </div>
                ),
              },
            ]}
          />
          <LoadMore
            hasMore={list.hasMore}
            loading={list.loadingMore}
            onClick={() => void list.loadMore()}
          />
        </>
      )}

      <Dialog
        open={dialog?.kind === 'upload'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Upload a file"
        description="Streamed through the API into private storage. Optionally attach it to a product right away."
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setDialog(null)}>
              Cancel
            </ActionButton>
            <ActionButton
              loading={action.isBusy('upload')}
              disabled={!file}
              onClick={async () => {
                if (!file) return;
                const form = new FormData();
                form.set('file', file);
                if (productId) form.set('productId', productId);
                if (text.trim()) form.set('label', text.trim());
                if (version.trim()) form.set('version', version.trim());
                const res = await action.run(() => api.upload<AdminFile>('/v1/admin/files', form), {
                  key: 'upload',
                  success: 'File uploaded.',
                });
                if (res) done('File uploaded.');
              }}
            >
              Upload
            </ActionButton>
          </>
        }
      >
        <div className="grid gap-4">
          {action.error && <Notice tone="danger">{action.error}</Notice>}
          <FileDrop
            file={file}
            onFile={setFile}
            disabled={action.isBusy('upload')}
            hint="Any file type"
          />
          <Field label="Attach to product" optional>
            {(p) => (
              <Select {...p} value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">Don’t attach yet</option>
                {products.data?.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {productId && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Label" optional>
                {(p) => <Input {...p} value={text} onChange={(e) => setText(e.target.value)} />}
              </Field>
              <Field label="Version" optional>
                {(p) => (
                  <Input {...p} value={version} onChange={(e) => setVersion(e.target.value)} />
                )}
              </Field>
            </div>
          )}
        </div>
      </Dialog>

      <Dialog
        open={dialog?.kind === 'rename'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Rename file"
        description="The name buyers see when the file downloads."
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setDialog(null)}>
              Cancel
            </ActionButton>
            <ActionButton
              loading={action.isBusy('rename')}
              onClick={async () => {
                if (dialog?.kind !== 'rename') return;
                const res = await action.run(
                  () => api.patch(`/v1/admin/files/${dialog.file.id}`, { filename: text }),
                  { key: 'rename', success: 'Renamed.' },
                );
                if (res) done('Renamed.');
              }}
            >
              Save
            </ActionButton>
          </>
        }
      >
        {action.error && (
          <Notice tone="danger" className="mb-4">
            {action.error}
          </Notice>
        )}
        <Field label="Filename">
          {(p) => <Input {...p} value={text} onChange={(e) => setText(e.target.value)} />}
        </Field>
      </Dialog>

      <Dialog
        open={dialog?.kind === 'attach'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Attach to a product"
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setDialog(null)}>
              Cancel
            </ActionButton>
            <ActionButton
              loading={action.isBusy('attach')}
              disabled={!productId}
              onClick={async () => {
                if (dialog?.kind !== 'attach') return;
                const res = await action.run(
                  () =>
                    api.post(`/v1/admin/files/${dialog.file.id}/attach`, {
                      productId,
                      label: text.trim() || undefined,
                      version: version.trim() || undefined,
                    }),
                  { key: 'attach', success: 'Attached.' },
                );
                if (res) done('Attached.');
              }}
            >
              Attach
            </ActionButton>
          </>
        }
      >
        <div className="grid gap-4">
          {action.error && <Notice tone="danger">{action.error}</Notice>}
          <Field label="Product">
            {(p) => (
              <Select {...p} value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">Choose a product…</option>
                {products.data?.map((pr) => (
                  <option key={pr.id} value={pr.id}>
                    {pr.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Label" optional>
              {(p) => <Input {...p} value={text} onChange={(e) => setText(e.target.value)} />}
            </Field>
            <Field label="Version" optional>
              {(p) => <Input {...p} value={version} onChange={(e) => setVersion(e.target.value)} />}
            </Field>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        onOpenChange={(o) => !o && setDialog(null)}
        title="Delete this file?"
        description="It’s removed from storage permanently."
        confirmLabel="Delete file"
        tone="danger"
        onConfirm={async () => {
          if (dialog?.kind !== 'delete') return;
          const ok = await action.run(
            () => api.delete(`/v1/admin/files/${dialog.file.id}`).then(() => true),
            { key: 'delete', success: 'File deleted.' },
          );
          if (ok) done('File deleted.');
        }}
      />
    </>
  );
}
