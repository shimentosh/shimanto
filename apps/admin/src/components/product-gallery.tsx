'use client';

import { ActionButton, Field, FileDrop, Input, Notice } from '@shimanto/ui';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/use-action';

export interface GalleryImage {
  id: string;
  url: string;
  alt: string | null;
}

export const GALLERY_MAX = 12;

/**
 * Screenshots for the sales page, in order: upload (public, with alt text), reorder, remove.
 * Changes are kept in the form and saved with the product.
 */
export function ProductGallery({
  images,
  onChange,
  productName,
}: {
  images: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
  productName: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const action = useAction();

  const upload = async () => {
    if (!file) return;
    const data = new FormData();
    data.set('file', file);
    data.set('alt', alt.trim() || `${productName || 'Product'} screenshot ${images.length + 1}`);
    data.set('visibility', 'public');
    const res = await action.run(() =>
      api.upload<{ id: string; url: string; alt: string | null }>('/v1/admin/media', data),
    );
    if (res) {
      onChange([...images, { id: res.id, url: res.url, alt: res.alt }]);
      setFile(null);
      setAlt('');
    }
  };

  const move = (from: number, to: number) => {
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    onChange(next);
  };

  return (
    <div className="grid gap-4">
      {images.length > 0 && (
        <ol className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {images.map((image, i) => (
            <li key={image.id} className="border-ink/10 overflow-hidden rounded-2xl border">
              <div className="bg-canvas relative aspect-[16/10]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" className="size-full object-cover" />
                <span className="bg-night/70 absolute top-2 left-2 rounded-full px-2 py-0.5 font-mono text-[11px] text-white tabular-nums">
                  {i === 0 ? '01 · first' : String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <div className="flex items-center gap-1 p-2">
                <p
                  className="text-ink-soft min-w-0 flex-1 truncate px-1 text-xs"
                  title={image.alt ?? ''}
                >
                  {image.alt}
                </p>
                <ActionButton
                  size="sm"
                  variant="ghost"
                  icon="arrowLeft"
                  aria-label={`Move image ${i + 1} earlier`}
                  disabled={i === 0}
                  onClick={() => move(i, i - 1)}
                />
                <ActionButton
                  size="sm"
                  variant="ghost"
                  icon="arrowRight"
                  aria-label={`Move image ${i + 1} later`}
                  disabled={i === images.length - 1}
                  onClick={() => move(i, i + 1)}
                />
                <ActionButton
                  size="sm"
                  variant="ghost"
                  icon="trash"
                  aria-label={`Remove image ${i + 1}`}
                  onClick={() => onChange(images.filter((_, j) => j !== i))}
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      {images.length < GALLERY_MAX ? (
        <div className="grid gap-3">
          <FileDrop
            file={file}
            onFile={setFile}
            accept="image/png,image/jpeg,image/webp,image/avif"
            hint={`PNG, JPEG, WebP or AVIF · ${images.length} of ${GALLERY_MAX}`}
          />
          {file && (
            <div className="flex flex-wrap items-end gap-2">
              <Field
                label="Alt text"
                hint="Also the caption under the image."
                className="min-w-56 flex-1"
              >
                {(p) => (
                  <Input
                    {...p}
                    value={alt}
                    maxLength={200}
                    onChange={(e) => setAlt(e.target.value)}
                    placeholder="e.g. The dashboard with a month of orders"
                  />
                )}
              </Field>
              <ActionButton loading={action.isBusy()} onClick={() => void upload()}>
                Add to gallery
              </ActionButton>
            </div>
          )}
        </div>
      ) : (
        <p className="text-ink-soft text-sm">The gallery is full ({GALLERY_MAX} images).</p>
      )}
      {action.error && <Notice tone="danger">{action.error}</Notice>}
    </div>
  );
}
