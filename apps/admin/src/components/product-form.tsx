'use client';

import type { AdminProduct, IntegrationCheck } from '@shimanto/types';
import {
  ActionButton,
  Checkbox,
  Field,
  FileDrop,
  Input,
  Notice,
  Section,
  Select,
  Textarea,
} from '@shimanto/ui';
import { type FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/use-action';
import { ProductFiles } from './product-files';

const toMinor = (value: string) => (value.trim() === '' ? null : Math.round(Number(value) * 100));
const toMajor = (value: number | null | undefined) =>
  value == null ? '' : (value / 100).toFixed(2);
const lines = (value: string) =>
  value
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

interface MediaUpload {
  id: string;
  url: string;
}

/**
 * Create / edit a product: sales details, price, cover, and delivery configuration. Files are
 * managed once the product exists (they attach to it); the repository is admin-set only.
 */
export function ProductForm({
  product,
  onSaved,
  onFilesChanged,
}: {
  product?: AdminProduct;
  onSaved: (product: AdminProduct) => void;
  onFilesChanged?: () => void;
}) {
  const editing = Boolean(product);
  const [form, setForm] = useState({
    name: product?.name ?? '',
    slug: product?.slug ?? '',
    type: product?.type ?? 'DIGITAL_PRODUCT',
    summary: product?.summary ?? '',
    description: product?.description ?? '',
    version: product?.version ?? '',
    features: (product?.features ?? []).join('\n'),
    requirements: (product?.requirements ?? []).join('\n'),
    price: toMajor(product?.price ?? 0),
    compareAtPrice: toMajor(product?.compareAtPrice),
    currency: product?.currency ?? 'USD',
    deliverFiles: product?.deliverFiles ?? true,
    deliverGithub: product?.deliverGithub ?? false,
    githubOwner: product?.githubOwner ?? '',
    githubRepo: product?.githubRepo ?? '',
  });
  const [slugTouched, setSlugTouched] = useState(editing);
  const [cover, setCover] = useState<{ id: string | null; url: string | null }>({
    id: product?.cover?.id ?? null,
    url: product?.cover?.url ?? null,
  });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverAlt, setCoverAlt] = useState('');
  const [repoCheck, setRepoCheck] = useState<IntegrationCheck | null>(null);
  const action = useAction();

  const set =
    <K extends keyof typeof form>(key: K) =>
    (value: (typeof form)[K]) =>
      setForm((f) => ({ ...f, [key]: value }));

  const uploadCover = async () => {
    if (!coverFile) return;
    const data = new FormData();
    data.set('file', coverFile);
    data.set('alt', coverAlt || form.name);
    data.set('visibility', 'public');
    const res = await action.run(() => api.upload<MediaUpload>('/v1/admin/media', data), {
      key: 'cover',
    });
    if (res) {
      setCover({ id: res.id, url: res.url });
      setCoverFile(null);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const body = {
      name: form.name,
      slug: form.slug,
      type: form.type,
      summary: form.summary.trim() || null,
      description: form.description.trim() || null,
      version: form.version.trim() || null,
      features: lines(form.features),
      requirements: lines(form.requirements),
      price: toMinor(form.price) ?? 0,
      compareAtPrice: toMinor(form.compareAtPrice),
      currency: form.currency,
      coverId: cover.id,
      deliverFiles: form.deliverFiles,
      deliverGithub: form.deliverGithub,
      githubOwner: form.githubOwner.trim() || null,
      githubRepo: form.githubRepo.trim() || null,
    };
    const saved = await action.run(
      () =>
        product
          ? api.patch<AdminProduct>(`/v1/admin/products/${product.id}`, body)
          : api.post<AdminProduct>('/v1/admin/products', body),
      { key: 'save', success: editing ? 'Product saved.' : undefined },
    );
    if (saved) onSaved(saved);
  };

  const f = action.fields;

  return (
    <form onSubmit={onSubmit} noValidate>
      {action.error && (
        <Notice tone="danger" className="mb-6">
          {action.error}
        </Notice>
      )}
      {action.success && (
        <Notice tone="success" className="mb-6">
          {action.success}
        </Notice>
      )}

      <Section title="Details" description="What buyers see on the product page and at checkout.">
        <div className="grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name" error={f.name}>
              {(p) => (
                <Input
                  {...p}
                  required
                  value={form.name}
                  onChange={(e) => {
                    set('name')(e.target.value);
                    if (!slugTouched) set('slug')(slugify(e.target.value));
                  }}
                />
              )}
            </Field>
            <Field
              label="URL slug"
              error={f.slug}
              hint={`/products/${form.slug || 'your-product'}`}
            >
              {(p) => (
                <Input
                  {...p}
                  required
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set('slug')(slugify(e.target.value));
                  }}
                />
              )}
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Type" error={f.type}>
              {(p) => (
                <Select
                  {...p}
                  value={form.type}
                  onChange={(e) => set('type')(e.target.value as typeof form.type)}
                >
                  <option value="SOFTWARE">Software</option>
                  <option value="DIGITAL_PRODUCT">Digital product</option>
                  <option value="SOURCE_CODE">Source code</option>
                </Select>
              )}
            </Field>
            <Field label="Version" optional error={f.version}>
              {(p) => (
                <Input
                  {...p}
                  value={form.version}
                  onChange={(e) => set('version')(e.target.value)}
                  placeholder="e.g. 2.1.0"
                />
              )}
            </Field>
          </div>
          <Field
            label="Summary"
            optional
            error={f.summary}
            hint="One or two sentences for cards, checkout and receipts."
          >
            {(p) => (
              <Textarea
                {...p}
                rows={2}
                maxLength={300}
                value={form.summary}
                onChange={(e) => set('summary')(e.target.value)}
              />
            )}
          </Field>
          <Field label="Description" optional error={f.description}>
            {(p) => (
              <Textarea
                {...p}
                rows={6}
                value={form.description}
                onChange={(e) => set('description')(e.target.value)}
              />
            )}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Features" optional error={f.features} hint="One per line.">
              {(p) => (
                <Textarea
                  {...p}
                  rows={5}
                  value={form.features}
                  onChange={(e) => set('features')(e.target.value)}
                />
              )}
            </Field>
            <Field
              label="Requirements"
              optional
              error={f.requirements}
              hint="One per line (e.g. Node 20+)."
            >
              {(p) => (
                <Textarea
                  {...p}
                  rows={5}
                  value={form.requirements}
                  onChange={(e) => set('requirements')(e.target.value)}
                />
              )}
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Price">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Price" error={f.price} hint="0 = free (still a normal order).">
            {(p) => (
              <Input
                {...p}
                inputMode="decimal"
                value={form.price}
                onChange={(e) => set('price')(e.target.value.replace(/[^\d.]/g, ''))}
              />
            )}
          </Field>
          <Field
            label="Compare-at price"
            optional
            error={f.compareAtPrice}
            hint="Shown struck through."
          >
            {(p) => (
              <Input
                {...p}
                inputMode="decimal"
                value={form.compareAtPrice}
                onChange={(e) => set('compareAtPrice')(e.target.value.replace(/[^\d.]/g, ''))}
              />
            )}
          </Field>
          <Field label="Currency" error={f.currency}>
            {(p) => (
              <Select
                {...p}
                value={form.currency}
                onChange={(e) => set('currency')(e.target.value)}
              >
                {['USD', 'EUR', 'GBP', 'BDT', 'INR'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </Section>

      <Section title="Cover image" description="A public image from the media library.">
        <div className="grid gap-4 sm:grid-cols-[12rem_minmax(0,1fr)]">
          <div className="bg-canvas aspect-[4/3] overflow-hidden rounded-[14px]">
            {cover.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover.url} alt="" className="size-full object-cover" />
            ) : (
              <div className="text-ink-soft grid size-full place-items-center text-sm">
                No cover
              </div>
            )}
          </div>
          <div className="grid content-start gap-3">
            <FileDrop
              file={coverFile}
              onFile={setCoverFile}
              accept="image/png,image/jpeg,image/webp,image/avif"
              hint="PNG, JPEG, WebP or AVIF"
            />
            {coverFile && (
              <div className="flex flex-wrap items-end gap-2">
                <Field label="Alt text" className="min-w-56 flex-1">
                  {(p) => (
                    <Input
                      {...p}
                      value={coverAlt}
                      onChange={(e) => setCoverAlt(e.target.value)}
                      placeholder={form.name}
                    />
                  )}
                </Field>
                <ActionButton
                  size="md"
                  loading={action.isBusy('cover')}
                  onClick={() => void uploadCover()}
                >
                  Upload cover
                </ActionButton>
              </div>
            )}
            {cover.id && !coverFile && (
              <div>
                <ActionButton
                  size="sm"
                  variant="ghost"
                  onClick={() => setCover({ id: null, url: null })}
                >
                  Remove cover
                </ActionButton>
              </div>
            )}
          </div>
        </div>
      </Section>

      <Section
        title="Delivery"
        description="How buyers receive the product after a paid or $0 order. Choose one or both."
      >
        <div className="grid gap-6">
          <div>
            <Checkbox
              label="Private files (R2)"
              description="Buyers download from their portal through short-lived signed links."
              checked={form.deliverFiles}
              onChange={(e) => set('deliverFiles')(e.target.checked)}
            />
            {form.deliverFiles && (
              <div className="border-ink/10 mt-4 ml-7 border-l pl-5">
                {product ? (
                  <ProductFiles product={product} onChange={() => onFilesChanged?.()} />
                ) : (
                  <p className="text-ink-soft text-[15px]">
                    Save the product first, then upload or attach its files.
                  </p>
                )}
              </div>
            )}
          </div>
          <div>
            <Checkbox
              label="GitHub repository access"
              description="Buyers connect their GitHub account and get invited to this private repository (read access)."
              checked={form.deliverGithub}
              onChange={(e) => set('deliverGithub')(e.target.checked)}
            />
            {form.deliverGithub && (
              <div className="border-ink/10 mt-4 ml-7 grid gap-4 border-l pl-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Owner (user or organisation)" error={f.githubOwner}>
                    {(p) => (
                      <Input
                        {...p}
                        value={form.githubOwner}
                        onChange={(e) => set('githubOwner')(e.target.value.trim())}
                        placeholder="acme"
                      />
                    )}
                  </Field>
                  <Field label="Repository" error={f.githubRepo}>
                    {(p) => (
                      <Input
                        {...p}
                        value={form.githubRepo}
                        onChange={(e) => set('githubRepo')(e.target.value.trim())}
                        placeholder="saas-starter"
                      />
                    )}
                  </Field>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <ActionButton
                    size="sm"
                    variant="secondary"
                    icon="shield"
                    disabled={!form.githubOwner || !form.githubRepo}
                    loading={action.isBusy('repo')}
                    onClick={async () => {
                      setRepoCheck(null);
                      const res = await action.run(
                        () =>
                          api.post<IntegrationCheck>('/v1/admin/settings/check/github', {
                            owner: form.githubOwner,
                            repo: form.githubRepo,
                          }),
                        { key: 'repo' },
                      );
                      if (res) setRepoCheck(res);
                    }}
                  >
                    Check access
                  </ActionButton>
                  {repoCheck && (
                    <span
                      className={
                        repoCheck.ok ? 'text-sm font-medium' : 'text-create text-sm font-medium'
                      }
                    >
                      {repoCheck.ok ? '✓ ' : ''}
                      {repoCheck.message}
                    </span>
                  )}
                </div>
                <p className="text-ink-soft text-sm">
                  Customers never choose the repository; only this setting is used.
                </p>
              </div>
            )}
          </div>
        </div>
      </Section>

      <div className="border-ink/10 flex flex-wrap gap-2 border-t pt-6">
        <ActionButton type="submit" loading={action.isBusy('save')}>
          {editing ? 'Save product' : 'Create product'}
        </ActionButton>
        <ActionButton variant="secondary" href="/products">
          {editing ? 'Back to products' : 'Cancel'}
        </ActionButton>
      </div>
    </form>
  );
}
