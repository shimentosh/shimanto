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
  cn,
} from '@shimanto/ui';
import { type FormEvent, type ReactNode, useState } from 'react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/use-action';
import { type Pair, PairList, filledPairs } from './pair-list';
import { type GalleryImage, ProductGallery } from './product-gallery';
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

const TYPES: Array<{ value: AdminProduct['type']; label: string }> = [
  { value: 'DIGITAL_PRODUCT', label: 'Digital product' },
  { value: 'SOFTWARE', label: 'Software' },
  { value: 'SOURCE_CODE', label: 'Source code' },
  { value: 'TEMPLATE', label: 'Template' },
  { value: 'EBOOK', label: 'Ebook' },
  { value: 'COURSE', label: 'Course' },
];

/** One of two choices, as a card with a native radio (keyboard and screen-reader friendly). */
function Choice({
  name,
  checked,
  onSelect,
  title,
  children,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors',
        checked ? 'border-ink bg-ink/[0.03]' : 'border-ink/15 hover:border-ink/30',
      )}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        className="accent-ink mt-1 size-4 shrink-0"
      />
      <span className="text-[15px] leading-snug">
        <span className="block font-medium">{title}</span>
        <span className="text-ink-soft mt-0.5 block">{children}</span>
      </span>
    </label>
  );
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
    visibility: product?.visibility ?? 'LISTED',
    featured: product?.featured ?? false,
    tagline: product?.tagline ?? '',
    badge: product?.badge ?? '',
    highlights: (product?.highlights ?? []).join('\n'),
    demoUrl: product?.demoUrl ?? '',
    videoUrl: product?.videoUrl ?? '',
  });
  const [benefits, setBenefits] = useState<Pair[]>(
    (product?.benefits ?? []).map((b) => ({ first: b.title, second: b.body })),
  );
  const [faq, setFaq] = useState<Pair[]>(
    (product?.faq ?? []).map((item) => ({ first: item.q, second: item.a })),
  );
  const [gallery, setGallery] = useState<GalleryImage[]>(
    (product?.gallery ?? []).map((m) => ({ id: m.id, url: m.url, alt: m.alt })),
  );
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
      visibility: form.visibility,
      featured: form.featured,
      tagline: form.tagline.trim() || null,
      badge: form.badge.trim() || null,
      highlights: lines(form.highlights),
      benefits: filledPairs(benefits).map((b) => ({ title: b.first, body: b.second })),
      faq: filledPairs(faq).map((item) => ({ q: item.first, a: item.second })),
      demoUrl: form.demoUrl.trim() || null,
      videoUrl: form.videoUrl.trim() || null,
      galleryIds: gallery.map((image) => image.id),
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
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
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
            label="Tagline"
            optional
            error={f.tagline}
            hint="The headline under the name on the product page. Falls back to the summary."
          >
            {(p) => (
              <Input
                {...p}
                maxLength={160}
                value={form.tagline}
                onChange={(e) => set('tagline')(e.target.value)}
                placeholder="e.g. Everything you need to launch in a weekend."
              />
            )}
          </Field>
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
          <Field
            label="Description"
            optional
            error={f.description}
            hint="The longer story on the product page. Blank lines start new paragraphs."
          >
            {(p) => (
              <Textarea
                {...p}
                rows={6}
                value={form.description}
                onChange={(e) => set('description')(e.target.value)}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section
        title="Store listing"
        description="Where the product shows up. Unlisted products can still be bought from their link."
      >
        <div className="grid gap-5">
          <fieldset className="grid gap-3 sm:grid-cols-2">
            <legend className="sr-only">Visibility</legend>
            <Choice
              name="visibility"
              title="Listed in the store"
              checked={form.visibility === 'LISTED'}
              onSelect={() => set('visibility')('LISTED')}
            >
              On /products, in search and the sitemap.
            </Choice>
            <Choice
              name="visibility"
              title="Unlisted"
              checked={form.visibility === 'UNLISTED'}
              onSelect={() => set('visibility')('UNLISTED')}
            >
              Only people with the link can see and buy it. Hidden from search engines.
            </Choice>
          </fieldset>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Badge"
              optional
              error={f.badge}
              hint="A short label on the card and page, e.g. New or Bestseller."
            >
              {(p) => (
                <Input
                  {...p}
                  maxLength={24}
                  value={form.badge}
                  onChange={(e) => set('badge')(e.target.value)}
                  placeholder="New"
                />
              )}
            </Field>
            <div className="sm:pt-8">
              <Checkbox
                label="Featured"
                description="Shown first in the store."
                checked={form.featured}
                onChange={(e) => set('featured')(e.target.checked)}
              />
            </div>
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

      <Section
        title="Sales page"
        description="Everything that makes the product page convincing. Leave anything empty to hide it."
      >
        <div className="grid gap-6">
          <Field
            label="Highlights"
            optional
            error={f.highlights}
            hint="Up to 4 short points beside the price, one per line."
          >
            {(p) => (
              <Textarea
                {...p}
                rows={4}
                value={form.highlights}
                onChange={(e) => set('highlights')(e.target.value)}
                placeholder={'40 ready-made templates\nWorks in Notion and Figma'}
              />
            )}
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="What’s included"
              optional
              error={f.features}
              hint="One per line. Also the list on the order card."
            >
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
          <div className="grid gap-2">
            <p className="text-[15px] font-medium">
              Feature blocks <span className="text-ink-soft font-normal">(optional)</span>
            </p>
            <p className="text-ink-soft -mt-1 text-sm">
              A title and a sentence each, shown as a grid. 3 or 4 look best.
            </p>
            {f.benefits && <p className="text-create text-sm font-medium">{f.benefits}</p>}
            <PairList
              items={benefits}
              onChange={setBenefits}
              firstLabel="Title"
              secondLabel="Description"
              addLabel="Add a feature block"
              max={8}
              firstMax={80}
              secondMax={400}
            />
          </div>
          <div className="grid gap-2">
            <p className="text-[15px] font-medium">
              Questions <span className="text-ink-soft font-normal">(optional)</span>
            </p>
            <p className="text-ink-soft -mt-1 text-sm">
              Shown first in the FAQ, before the store-wide questions (delivery, payment, refunds).
            </p>
            {f.faq && <p className="text-create text-sm font-medium">{f.faq}</p>}
            <PairList
              items={faq}
              onChange={setFaq}
              firstLabel="Question"
              secondLabel="Answer"
              addLabel="Add a question"
              max={12}
              firstMax={200}
              secondMax={1500}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Live demo link"
              optional
              error={f.demoUrl}
              hint="Adds a “Live demo” button next to Buy."
            >
              {(p) => (
                <Input
                  {...p}
                  type="url"
                  value={form.demoUrl}
                  onChange={(e) => set('demoUrl')(e.target.value)}
                  placeholder="https://demo.example.com"
                />
              )}
            </Field>
            <Field
              label="Video"
              optional
              error={f.videoUrl}
              hint="A YouTube link. It plays over the first gallery image."
            >
              {(p) => (
                <Input
                  {...p}
                  type="url"
                  value={form.videoUrl}
                  onChange={(e) => set('videoUrl')(e.target.value)}
                  placeholder="https://youtu.be/…"
                />
              )}
            </Field>
          </div>
        </div>
      </Section>

      <Section
        title="Gallery"
        description="Screenshots or previews, shown as a slider on the product page. The first one is the video poster."
      >
        {f.galleryIds && (
          <Notice tone="danger" className="mb-4">
            {f.galleryIds}
          </Notice>
        )}
        <ProductGallery images={gallery} onChange={setGallery} productName={form.name} />
      </Section>

      <Section
        title="Cover image"
        description="The card image in the store and the main image on the product page."
      >
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
