'use client';

import type { AdminFile, AdminProduct, Page } from '@shimanto/types';
import {
  ActionButton,
  ConfirmDialog,
  Dialog,
  Field,
  FileDrop,
  Input,
  Notice,
  Select,
  formatBytes,
} from '@shimanto/ui';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/use-action';
import { useApi } from '@/lib/use-api';

type ProductFile = AdminProduct['files'][number];

/**
 * The private files a product delivers: upload (streamed to R2 through the API), attach an
 * existing file, edit label/version, replace with a new version, detach.
 */
export function ProductFiles({
  product,
  onChange,
}: {
  product: AdminProduct;
  onChange: () => void;
}) {
  const action = useAction();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [editing, setEditing] = useState<ProductFile | null>(null);
  const [replacing, setReplacing] = useState<ProductFile | null>(null);
  const [detaching, setDetaching] = useState<ProductFile | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState('');
  const [version, setVersion] = useState('');
  const [attachId, setAttachId] = useState('');
  const unattached = useApi<Page<AdminFile>>(
    attachOpen ? '/v1/admin/files?attached=no&limit=100' : null,
  );

  const reset = () => {
    setFile(null);
    setLabel('');
    setVersion('');
    setAttachId('');
  };

  const upload = async () => {
    if (!file) return;
    const form = new FormData();
    form.set('file', file);
    form.set('productId', product.id);
    if (label.trim()) form.set('label', label.trim());
    if (version.trim()) form.set('version', version.trim());
    const res = await action.run(() => api.upload<AdminFile>('/v1/admin/files', form), {
      key: 'upload',
      success: 'File uploaded and attached.',
    });
    if (res) {
      setUploadOpen(false);
      reset();
      onChange();
    }
  };

  const replace = async () => {
    if (!file || !replacing) return;
    const form = new FormData();
    form.set('file', file);
    if (version.trim()) form.set('version', version.trim());
    const res = await action.run(
      () => api.upload<AdminFile>(`/v1/admin/files/attachments/${replacing.id}/replace`, form),
      {
        key: 'replace',
        success: 'New version uploaded. Customers get it on their next download.',
      },
    );
    if (res) {
      setReplacing(null);
      reset();
      onChange();
    }
  };

  return (
    <div>
      {action.error && (
        <Notice tone="danger" className="mb-4">
          {action.error}
        </Notice>
      )}
      {action.success && (
        <Notice tone="success" className="mb-4">
          {action.success}
        </Notice>
      )}

      {product.files.length === 0 ? (
        <p className="text-ink-soft text-[15px]">
          No files attached yet. Buyers download what you attach here.
        </p>
      ) : (
        <ul className="divide-ink/[0.07] divide-y">
          {product.files.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-medium break-words">
                  {f.label}
                  {f.version && <span className="text-ink-soft font-normal"> · v{f.version}</span>}
                </p>
                <p className="text-ink-soft text-sm break-all">
                  {f.filename} · {formatBytes(f.size)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <ActionButton
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditing(f);
                    setLabel(f.label);
                    setVersion(f.version ?? '');
                  }}
                >
                  Edit
                </ActionButton>
                <ActionButton
                  size="sm"
                  variant="ghost"
                  icon="upload"
                  onClick={() => {
                    reset();
                    setReplacing(f);
                  }}
                >
                  New version
                </ActionButton>
                <ActionButton
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    const res = await action.run(
                      () => api.post<{ url: string }>(`/v1/admin/files/${f.mediaId}/download`),
                      { key: `dl:${f.id}` },
                    );
                    if (res) window.open(res.url, '_blank', 'noopener');
                  }}
                >
                  Download
                </ActionButton>
                <ActionButton size="sm" variant="ghost" onClick={() => setDetaching(f)}>
                  Detach
                </ActionButton>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <ActionButton
          size="sm"
          icon="upload"
          onClick={() => {
            reset();
            setUploadOpen(true);
          }}
        >
          Upload file
        </ActionButton>
        <ActionButton
          size="sm"
          variant="secondary"
          icon="plus"
          onClick={() => {
            reset();
            setAttachOpen(true);
          }}
        >
          Attach existing file
        </ActionButton>
      </div>

      <Dialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        title="Upload a file"
        description="Stored privately. Buyers only ever get short-lived signed links after an ownership check."
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setUploadOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton
              loading={action.isBusy('upload')}
              disabled={!file}
              onClick={() => void upload()}
            >
              Upload
            </ActionButton>
          </>
        }
      >
        <div className="grid gap-4">
          <FileDrop
            file={file}
            onFile={setFile}
            disabled={action.isBusy('upload')}
            hint="ZIP, PDF, installers, archives… any file type"
          />
          <Field label="Label" optional hint="Shown to buyers. Defaults to the filename.">
            {(f) => <Input {...f} value={label} onChange={(e) => setLabel(e.target.value)} />}
          </Field>
          <Field label="Version" optional>
            {(f) => (
              <Input
                {...f}
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. 1.2.0"
              />
            )}
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={attachOpen}
        onOpenChange={setAttachOpen}
        title="Attach an existing file"
        description="Files already uploaded to storage that no product delivers yet."
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setAttachOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton
              loading={action.isBusy('attach')}
              disabled={!attachId}
              onClick={async () => {
                const res = await action.run(
                  () =>
                    api.post(`/v1/admin/files/${attachId}/attach`, {
                      productId: product.id,
                      label: label.trim() || undefined,
                      version: version.trim() || undefined,
                    }),
                  { key: 'attach', success: 'File attached.' },
                );
                if (res) {
                  setAttachOpen(false);
                  onChange();
                }
              }}
            >
              Attach
            </ActionButton>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="File">
            {(f) => (
              <Select {...f} value={attachId} onChange={(e) => setAttachId(e.target.value)}>
                <option value="">
                  {unattached.loading
                    ? 'Loading…'
                    : unattached.data?.items.length
                      ? 'Choose a file…'
                      : 'No unattached files'}
                </option>
                {unattached.data?.items.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.filename} ({formatBytes(m.size)})
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Label" optional>
            {(f) => <Input {...f} value={label} onChange={(e) => setLabel(e.target.value)} />}
          </Field>
          <Field label="Version" optional>
            {(f) => <Input {...f} value={version} onChange={(e) => setVersion(e.target.value)} />}
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title="Edit file details"
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </ActionButton>
            <ActionButton
              loading={action.isBusy('edit')}
              onClick={async () => {
                if (!editing) return;
                const res = await action.run(
                  () =>
                    api.patch(`/v1/admin/files/attachments/${editing.id}`, {
                      label: label.trim() || editing.label,
                      version: version.trim() || null,
                    }),
                  { key: 'edit', success: 'Saved.' },
                );
                if (res) {
                  setEditing(null);
                  onChange();
                }
              }}
            >
              Save
            </ActionButton>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Label">
            {(f) => <Input {...f} value={label} onChange={(e) => setLabel(e.target.value)} />}
          </Field>
          <Field label="Version" optional>
            {(f) => <Input {...f} value={version} onChange={(e) => setVersion(e.target.value)} />}
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(replacing)}
        onOpenChange={(open) => !open && setReplacing(null)}
        title={`New version of “${replacing?.label ?? ''}”`}
        description="Buyers get the new file from their next download. The old file is deleted if nothing else uses it."
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setReplacing(null)}>
              Cancel
            </ActionButton>
            <ActionButton
              loading={action.isBusy('replace')}
              disabled={!file}
              onClick={() => void replace()}
            >
              Upload new version
            </ActionButton>
          </>
        }
      >
        <div className="grid gap-4">
          <FileDrop file={file} onFile={setFile} disabled={action.isBusy('replace')} />
          <Field label="Version" optional>
            {(f) => (
              <Input
                {...f}
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder={replacing?.version ?? 'e.g. 1.3.0'}
              />
            )}
          </Field>
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(detaching)}
        onOpenChange={(open) => !open && setDetaching(null)}
        title="Detach this file?"
        description="Buyers of this product will no longer see it. The file stays in storage (delete it from Files)."
        confirmLabel="Detach"
        tone="danger"
        onConfirm={async () => {
          if (!detaching) return;
          const ok = await action.run(
            () => api.delete(`/v1/admin/files/attachments/${detaching.id}`).then(() => true),
            {
              key: 'detach',
              success: 'File detached.',
            },
          );
          if (ok) onChange();
        }}
      />
    </div>
  );
}
