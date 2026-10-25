'use client';

import type {
  ManualMethod,
  ManualMethodField,
  ManualMethodKind,
  PaymentSettingsView,
  ProofRequirement,
} from '@shimanto/types';
import {
  ActionButton,
  Checkbox,
  ConfirmDialog,
  CopyButton,
  Dialog,
  EmptyState,
  Field,
  Icon,
  Input,
  Notice,
  Section,
  Select,
  StatusBadge,
  Textarea,
  cn,
} from '@shimanto/ui';
import { type FormEvent, useId, useState } from 'react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/use-action';

/** A method as the admin edits it: the stored method plus image previews. */
type Method = PaymentSettingsView['manual']['methods'][number];

const KIND_LABEL: Record<ManualMethodKind, string> = {
  MOBILE_WALLET: 'Mobile wallet',
  BANK_TRANSFER: 'Bank transfer',
  OTHER: 'Other',
};

const PROOF_LABEL: Record<ProofRequirement, string> = {
  OFF: 'No screenshot',
  OPTIONAL: 'Screenshot optional',
  REQUIRED: 'Screenshot required',
};

const MAX_FIELDS = 10;

const blank: Method = {
  id: '',
  kind: 'OTHER',
  name: '',
  enabled: true,
  description: null,
  logoId: null,
  qrId: null,
  logoUrl: null,
  qrUrl: null,
  fields: [],
  instructions: '',
  referenceLabel: 'Transaction ID',
  senderLabel: null,
  proof: 'OPTIONAL',
  currencies: [],
};

/** Mobile wallet "Send Money" preset (bKash, Nagad, Rocket all work the same way). */
function wallet(id: string, name: string, open: string, reference: string): Method {
  return {
    ...blank,
    id,
    kind: 'MOBILE_WALLET',
    name,
    description: `Send Money from any ${name} account`,
    fields: [
      { label: `${name} number`, value: '' },
      { label: 'Account type', value: 'Personal' },
    ],
    instructions: [
      `${open} and choose Send Money.`,
      `Enter our ${name} number above and the exact amount.`,
      'Write your order number in the reference.',
      `Confirm with your PIN, then copy the ${reference} from the confirmation message.`,
      'Paste it below with the number you sent from.',
    ].join('\n'),
    referenceLabel: reference,
    senderLabel: `${name} number you sent from`,
    proof: 'OPTIONAL',
    currencies: ['BDT'],
  };
}

const PRESETS: Array<{ key: string; label: string; hint: string; method: Method }> = [
  {
    key: 'bkash',
    label: 'bKash',
    hint: 'Send Money to a personal or merchant number',
    method: wallet(
      'bkash',
      'bKash',
      'Open the bKash app (or dial *247#)',
      'Transaction ID (TrxID)',
    ),
  },
  {
    key: 'nagad',
    label: 'Nagad',
    hint: 'Send Money from the Nagad app or *167#',
    method: wallet(
      'nagad',
      'Nagad',
      'Open the Nagad app (or dial *167#)',
      'Transaction ID (TxnID)',
    ),
  },
  {
    key: 'rocket',
    label: 'Rocket',
    hint: 'Dutch-Bangla Rocket, app or *322#',
    method: wallet(
      'rocket',
      'Rocket',
      'Open the Rocket app (or dial *322#)',
      'Transaction ID (TxnId)',
    ),
  },
  {
    key: 'bank',
    label: 'Bank transfer',
    hint: 'BEFTN, NPSB, RTGS or an international wire',
    method: {
      ...blank,
      id: 'bank-transfer',
      kind: 'BANK_TRANSFER',
      name: 'Bank transfer',
      description: 'Transfer from your bank account or banking app',
      fields: [
        { label: 'Bank', value: '' },
        { label: 'Account name', value: '' },
        { label: 'Account number', value: '' },
        { label: 'Branch', value: '' },
        { label: 'Routing number', value: '' },
      ],
      instructions: [
        'Transfer the exact amount to the account above (BEFTN, NPSB or RTGS).',
        'Use your order number as the payment reference.',
        'Keep the transfer receipt, then send us the transaction ID below.',
      ].join('\n'),
      referenceLabel: 'Transaction ID / reference',
      senderLabel: 'Account you paid from',
      proof: 'OPTIONAL',
    },
  },
  {
    key: 'custom',
    label: 'Custom',
    hint: 'Anything else you confirm by hand',
    method: blank,
  },
];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function uniqueId(base: string, taken: string[]) {
  const root = slugify(base) || 'method';
  if (!taken.includes(root)) return root;
  let n = 2;
  while (taken.includes(`${root}-${n}`)) n += 1;
  return `${root}-${n}`;
}

/** What the API stores: the method without image previews. */
function stored({ logoUrl: _logo, qrUrl: _qr, ...method }: Method): ManualMethod {
  return method;
}

function currencyText(currencies: string[]) {
  return currencies.length ? `${currencies.join(', ')} only` : 'All currencies';
}

// ───────────── List ─────────────

export function ManualMethods({
  view,
  canEdit,
  onSaved,
}: {
  view: PaymentSettingsView;
  canEdit: boolean;
  onSaved: (view: PaymentSettingsView) => void;
}) {
  const { methods, windowHours } = view.manual;
  const action = useAction();
  const [hours, setHours] = useState(String(windowHours));
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState<{ method: Method; index: number | null } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  /** Saves the whole manual setup; every change is saved right away. */
  const persist = async (next: Method[], window = windowHours, success?: string, key?: string) => {
    const res = await action.run(
      () =>
        api.put<PaymentSettingsView>('/v1/admin/settings/payments', {
          manual: { windowHours: window, methods: next.map(stored) },
        }),
      { success, key },
    );
    if (res) onSaved(res);
    return res;
  };

  const move = (index: number, by: -1 | 1) => {
    const next = [...methods];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item!);
    void persist(next, windowHours, undefined, `move-${index}`);
  };

  const onHours = async (event: FormEvent) => {
    event.preventDefault();
    const value = Number(hours);
    if (!Number.isInteger(value) || value < 1 || value > 720) {
      action.clear();
      return;
    }
    await persist(methods, value, 'Payment window saved.', 'hours');
  };

  const enabledCount = methods.filter((m) => m.enabled).length;

  return (
    <Section
      title={
        <span className="flex flex-wrap items-center gap-2">
          Manual payments
          {enabledCount ? (
            <StatusBadge
              status="ACTIVE"
              label={`${enabledCount} method${enabledCount === 1 ? '' : 's'} on`}
            />
          ) : (
            <StatusBadge status="ARCHIVED" label="Off" />
          )}
        </span>
      }
      description="bKash, Nagad, bank transfer… The buyer places the order, pays by hand and sends the transaction ID (and a screenshot). You check it arrived, then confirm the payment on the order and it’s delivered."
      actions={
        canEdit && (
          <ActionButton size="sm" icon="plus" onClick={() => setPicking(true)}>
            Add method
          </ActionButton>
        )
      }
    >
      <div className="grid gap-5">
        {action.error && !editing && <Notice tone="danger">{action.error}</Notice>}
        {action.success && !editing && <Notice tone="success">{action.success}</Notice>}

        {methods.length === 0 ? (
          <EmptyState
            spot="package"
            title="No manual methods yet"
            description="Add bKash, Nagad, Rocket or a bank account so buyers can pay without a card."
            action={
              canEdit && (
                <ActionButton icon="plus" onClick={() => setPicking(true)}>
                  Add a method
                </ActionButton>
              )
            }
          />
        ) : (
          <ul className="grid gap-3">
            {methods.map((m, i) => (
              <li
                key={m.id}
                className={cn(
                  'border-ink/10 flex flex-wrap items-start gap-4 rounded-[16px] border px-4 py-3.5',
                  !m.enabled && 'opacity-70',
                )}
              >
                <MethodMark method={m} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {m.name}
                    <StatusBadge status="NEUTRAL" tone="neutral" label={KIND_LABEL[m.kind]} />
                    {!m.enabled && <StatusBadge status="ARCHIVED" label="Off" />}
                  </p>
                  {m.description && <p className="text-ink-soft text-sm">{m.description}</p>}
                  <p className="text-ink-soft mt-1 text-sm">
                    {currencyText(m.currencies)} · {PROOF_LABEL[m.proof]}
                    {m.senderLabel ? ' · asks sender' : ''}
                    {m.qrUrl ? ' · QR code' : ''}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex flex-wrap items-center gap-1">
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      aria-label={`Move ${m.name} up`}
                      disabled={i === 0 || action.busy !== null}
                      onClick={() => move(i, -1)}
                    >
                      <Icon name="chevronDown" className="size-4 rotate-180" />
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      aria-label={`Move ${m.name} down`}
                      disabled={i === methods.length - 1 || action.busy !== null}
                      onClick={() => move(i, 1)}
                    >
                      <Icon name="chevronDown" className="size-4" />
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="secondary"
                      loading={action.isBusy(`toggle-${m.id}`)}
                      onClick={() =>
                        void persist(
                          methods.map((x, j) => (j === i ? { ...x, enabled: !x.enabled } : x)),
                          windowHours,
                          `${m.name} turned ${m.enabled ? 'off' : 'on'}.`,
                          `toggle-${m.id}`,
                        )
                      }
                    >
                      {m.enabled ? 'Turn off' : 'Turn on'}
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="secondary"
                      icon="pen"
                      onClick={() => {
                        action.clear();
                        setEditing({ method: m, index: i });
                      }}
                    >
                      Edit
                    </ActionButton>
                    <ActionButton
                      size="sm"
                      variant="ghost"
                      aria-label={`Delete ${m.name}`}
                      onClick={() => setDeleting(i)}
                    >
                      <Icon name="trash" className="size-4" />
                    </ActionButton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={onHours} className="flex max-w-lg flex-wrap items-end gap-3" noValidate>
          <Field
            label="Time to pay (hours)"
            className="w-48"
            error={
              action.fields['manual.windowHours'] ??
              (hours &&
              (Number(hours) < 1 || Number(hours) > 720 || !Number.isInteger(Number(hours)))
                ? 'Between 1 and 720 hours'
                : undefined)
            }
          >
            {(f) => (
              <Input
                {...f}
                type="number"
                inputMode="numeric"
                min={1}
                max={720}
                disabled={!canEdit}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            )}
          </Field>
          {canEdit && (
            <ActionButton
              type="submit"
              variant="secondary"
              loading={action.isBusy('hours')}
              disabled={Number(hours) === windowHours}
            >
              Save
            </ActionButton>
          )}
          <p className="text-ink-soft w-full text-sm">
            Buyers get a reminder halfway through and unpaid orders are cancelled after it. Orders
            whose proof is waiting for your review are never cancelled.
          </p>
        </form>
      </div>

      <Dialog
        open={picking}
        onOpenChange={setPicking}
        title="Add a payment method"
        description="Start from a preset; you can change everything before saving."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className="border-ink/10 hover:border-ink/40 rounded-[14px] border px-4 py-3 text-left transition-colors"
              onClick={() => {
                action.clear();
                const taken = methods.map((m) => m.id);
                setEditing({
                  method: {
                    ...preset.method,
                    id: preset.method.id ? uniqueId(preset.method.id, taken) : '',
                  },
                  index: null,
                });
                setPicking(false);
              }}
            >
              <span className="block font-medium">{preset.label}</span>
              <span className="text-ink-soft block text-sm">{preset.hint}</span>
            </button>
          ))}
        </div>
      </Dialog>

      {editing && (
        <MethodEditor
          key={`${editing.index ?? 'new'}-${editing.method.id}`}
          initial={editing.method}
          isNew={editing.index === null}
          takenIds={methods.filter((_, j) => j !== editing.index).map((m) => m.id)}
          error={action.error}
          busy={action.isBusy('method')}
          onClose={() => setEditing(null)}
          onSave={async (method) => {
            const next =
              editing.index === null
                ? [...methods, method]
                : methods.map((m, j) => (j === editing.index ? method : m));
            const res = await persist(next, windowHours, `${method.name} saved.`, 'method');
            if (res) setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting !== null ? (methods[deleting]?.name ?? '') : ''}?`}
        description="Buyers can’t choose it anymore. Orders already placed with it keep their payment details. To pause it instead, turn it off."
        confirmLabel="Delete method"
        tone="danger"
        onConfirm={async () => {
          if (deleting === null) return;
          const name = methods[deleting]?.name;
          await persist(
            methods.filter((_, j) => j !== deleting),
            windowHours,
            `${name} deleted.`,
          );
        }}
      />
    </Section>
  );
}

function MethodMark({ method, size = 'md' }: { method: Method; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'size-9' : 'size-11';
  if (method.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- media library URL, already sized
      <img
        src={method.logoUrl}
        alt=""
        className={cn(box, 'bg-paper shrink-0 rounded-[12px] object-contain')}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(box, 'bg-ink/[0.06] grid shrink-0 place-items-center rounded-[12px]')}
    >
      <Icon
        name={
          method.kind === 'BANK_TRANSFER'
            ? 'briefcase'
            : method.kind === 'MOBILE_WALLET'
              ? 'monitor'
              : 'receipt'
        }
        className="size-5"
      />
    </span>
  );
}

// ───────────── Editor ─────────────

interface MediaUpload {
  id: string;
  url: string;
}

function MethodEditor({
  initial,
  isNew,
  takenIds,
  error,
  busy,
  onClose,
  onSave,
}: {
  initial: Method;
  isNew: boolean;
  takenIds: string[];
  error: string | null;
  busy: boolean;
  onClose: () => void;
  onSave: (method: Method) => Promise<void>;
}) {
  const [m, setM] = useState<Method>(initial);
  const [idTouched, setIdTouched] = useState(!isNew || Boolean(initial.id && initial.name));
  const [currencies, setCurrencies] = useState(initial.currencies.join(', '));
  const [askSender, setAskSender] = useState(initial.senderLabel !== null);
  const [problems, setProblems] = useState<Record<string, string>>({});

  const set = <K extends keyof Method>(key: K, value: Method[K]) =>
    setM((prev) => ({ ...prev, [key]: value }));

  const setField = (index: number, patch: Partial<ManualMethodField>) =>
    set(
      'fields',
      m.fields.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    );

  const build = (): Method | null => {
    const found: Record<string, string> = {};
    const codes = currencies
      .split(/[\s,]+/)
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    if (!m.name.trim()) found.name = 'Give the method a name';
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(m.id))
      found.id = 'Lowercase letters, numbers and dashes';
    else if (takenIds.includes(m.id)) found.id = 'Another method already uses this id';
    if (m.fields.some((f) => !f.label.trim() || !f.value.trim())) {
      found.fields = 'Fill in every line (or remove the empty ones)';
    }
    if (!m.instructions.trim()) found.instructions = 'Tell buyers how to pay';
    if (!m.referenceLabel.trim()) found.referenceLabel = 'Name what buyers send as proof';
    if (askSender && !(m.senderLabel ?? '').trim()) found.senderLabel = 'Say what to ask for';
    if (codes.some((c) => !/^[A-Z]{3}$/.test(c)))
      found.currencies = 'Three-letter codes, e.g. BDT, USD';
    setProblems(found);
    if (Object.keys(found).length) return null;
    return {
      ...m,
      name: m.name.trim(),
      description: m.description?.trim() || null,
      fields: m.fields.map((f) => ({ label: f.label.trim(), value: f.value.trim() })),
      instructions: m.instructions.trim(),
      referenceLabel: m.referenceLabel.trim(),
      senderLabel: askSender ? (m.senderLabel ?? '').trim() : null,
      currencies: [...new Set(codes)],
    };
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const method = build();
    if (method) await onSave(method);
  };

  const formId = useId();

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && !busy && onClose()}
      title={isNew ? `Add ${initial.name || 'a payment method'}` : `Edit ${initial.name}`}
      description="Buyers see this at checkout, on their order page and in the order email."
      size="lg"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </ActionButton>
          <ActionButton type="submit" form={formId} loading={busy}>
            {isNew ? 'Add method' : 'Save method'}
          </ActionButton>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="grid gap-5" noValidate>
        {error && <Notice tone="danger">{error}</Notice>}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" error={problems.name}>
            {(f) => (
              <Input
                {...f}
                maxLength={60}
                placeholder="bKash"
                value={m.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setM((prev) => ({
                    ...prev,
                    name,
                    ...(idTouched ? {} : { id: uniqueId(name, takenIds) }),
                  }));
                }}
              />
            )}
          </Field>
          <Field
            label="Id"
            error={problems.id}
            hint={
              isNew ? 'Used in links and reports. Can’t be changed later.' : 'Can’t be changed.'
            }
          >
            {(f) => (
              <Input
                {...f}
                maxLength={40}
                disabled={!isNew}
                value={m.id}
                onChange={(e) => {
                  setIdTouched(true);
                  set('id', e.target.value.toLowerCase());
                }}
              />
            )}
          </Field>
          <Field label="Type">
            {(f) => (
              <Select
                {...f}
                value={m.kind}
                onChange={(e) => set('kind', e.target.value as ManualMethodKind)}
              >
                {(Object.keys(KIND_LABEL) as ManualMethodKind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label="Currencies"
            optional
            error={problems.currencies}
            hint="Offered only for carts in these, e.g. BDT. Empty = every currency."
          >
            {(f) => (
              <Input
                {...f}
                placeholder="BDT"
                value={currencies}
                onChange={(e) => setCurrencies(e.target.value.toUpperCase())}
              />
            )}
          </Field>
        </div>

        <Field label="Short description" optional hint="One line under the name at checkout.">
          {(f) => (
            <Input
              {...f}
              maxLength={160}
              value={m.description ?? ''}
              onChange={(e) => set('description', e.target.value)}
            />
          )}
        </Field>

        <fieldset className="grid gap-3">
          <legend className="mb-1 text-[15px] font-medium">Account details</legend>
          <p className="text-ink-soft -mt-2 text-sm">
            Where to send the money. Buyers get a copy button for each value.
          </p>
          {m.fields.map((field, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2">
              <Field label="Label" className="min-w-36 flex-1">
                {(f) => (
                  <Input
                    {...f}
                    maxLength={60}
                    placeholder="bKash number"
                    value={field.label}
                    onChange={(e) => setField(i, { label: e.target.value })}
                  />
                )}
              </Field>
              <Field label="Value" className="min-w-44 flex-[1.4]">
                {(f) => (
                  <Input
                    {...f}
                    maxLength={200}
                    placeholder="01XXXXXXXXX"
                    value={field.value}
                    onChange={(e) => setField(i, { value: e.target.value })}
                  />
                )}
              </Field>
              <ActionButton
                variant="ghost"
                aria-label={`Remove ${field.label || 'this line'}`}
                onClick={() =>
                  set(
                    'fields',
                    m.fields.filter((_, j) => j !== i),
                  )
                }
              >
                <Icon name="x" className="size-4" />
              </ActionButton>
            </div>
          ))}
          {problems.fields && <p className="text-create text-sm font-medium">{problems.fields}</p>}
          {m.fields.length < MAX_FIELDS && (
            <div>
              <ActionButton
                size="sm"
                variant="secondary"
                icon="plus"
                onClick={() => set('fields', [...m.fields, { label: '', value: '' }])}
              >
                Add a line
              </ActionButton>
            </div>
          )}
        </fieldset>

        <Field
          label="How to pay"
          error={problems.instructions}
          hint="One step per line; shown as a numbered list."
        >
          {(f) => (
            <Textarea
              {...f}
              rows={5}
              maxLength={2000}
              value={m.instructions}
              onChange={(e) => set('instructions', e.target.value)}
            />
          )}
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Proof buyers send"
            error={problems.referenceLabel}
            hint="e.g. Transaction ID (TrxID)"
          >
            {(f) => (
              <Input
                {...f}
                maxLength={60}
                value={m.referenceLabel}
                onChange={(e) => set('referenceLabel', e.target.value)}
              />
            )}
          </Field>
          <Field label="Payment screenshot">
            {(f) => (
              <Select
                {...f}
                value={m.proof}
                onChange={(e) => set('proof', e.target.value as ProofRequirement)}
              >
                <option value="OFF">Don’t ask</option>
                <option value="OPTIONAL">Optional</option>
                <option value="REQUIRED">Required</option>
              </Select>
            )}
          </Field>
        </div>

        <div className="grid gap-3">
          <Checkbox
            label="Ask which account they paid from"
            description="Makes matching easier, e.g. the bKash number the money came from."
            checked={askSender}
            onChange={(e) => {
              setAskSender(e.target.checked);
              if (e.target.checked && !m.senderLabel) set('senderLabel', 'Number you sent from');
            }}
          />
          {askSender && (
            <Field label="Ask for" error={problems.senderLabel} className="sm:max-w-sm">
              {(f) => (
                <Input
                  {...f}
                  maxLength={60}
                  value={m.senderLabel ?? ''}
                  onChange={(e) => set('senderLabel', e.target.value)}
                />
              )}
            </Field>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <ImagePicker
            label="Logo"
            hint="Square PNG or SVG-like image, shown next to the name."
            alt={`${m.name || 'Payment method'} logo`}
            url={m.logoUrl}
            onChange={(image) =>
              setM((prev) => ({ ...prev, logoId: image?.id ?? null, logoUrl: image?.url ?? null }))
            }
          />
          <ImagePicker
            label="QR code"
            hint="Optional: a payment QR buyers can scan from the app."
            alt={`${m.name || 'Payment method'} payment QR code`}
            url={m.qrUrl}
            onChange={(image) =>
              setM((prev) => ({ ...prev, qrId: image?.id ?? null, qrUrl: image?.url ?? null }))
            }
          />
        </div>

        <div>
          <p className="text-ink-soft mb-2 text-sm font-medium">Buyer preview</p>
          <BuyerPreview method={{ ...m, senderLabel: askSender ? m.senderLabel : null }} />
        </div>
      </form>
    </Dialog>
  );
}

/** Uploads a public image to the media library right away; returns its id and URL. */
function ImagePicker({
  label,
  hint,
  alt,
  url,
  onChange,
}: {
  label: string;
  hint: string;
  alt: string;
  url: string | null;
  onChange: (image: MediaUpload | null) => void;
}) {
  const id = useId();
  const action = useAction();

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const data = new FormData();
    data.set('file', file);
    data.set('alt', alt);
    data.set('visibility', 'public');
    const res = await action.run(() => api.upload<MediaUpload>('/v1/admin/media', data));
    if (res) onChange({ id: res.id, url: res.url });
  };

  return (
    <div>
      <p className="text-[15px] font-medium">{label}</p>
      <p className="text-ink-soft text-sm">{hint}</p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        {url && (
          // eslint-disable-next-line @next/next/no-img-element -- media library URL
          <img
            src={url}
            alt=""
            className="border-ink/10 bg-paper size-16 rounded-[12px] border object-contain"
          />
        )}
        <label
          htmlFor={id}
          className={cn(
            'rounded-pill border-ink/15 hover:border-ink/40 inline-flex h-8 cursor-pointer items-center gap-2 border px-3.5 text-sm font-medium',
            action.busy && 'pointer-events-none opacity-60',
          )}
        >
          <Icon name="upload" className="size-4" />
          {action.busy ? 'Uploading…' : url ? 'Replace' : 'Upload image'}
        </label>
        <input
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {url && (
          <ActionButton size="sm" variant="ghost" onClick={() => onChange(null)}>
            Remove
          </ActionButton>
        )}
      </div>
      {action.error && <p className="text-create mt-1 text-sm font-medium">{action.error}</p>}
    </div>
  );
}

/** Roughly how the method reads to a buyer at checkout and on the order page. */
function BuyerPreview({ method }: { method: Method }) {
  const steps = method.instructions
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <div className="border-ink/10 bg-canvas grid gap-4 rounded-[16px] border p-4">
      <div className="flex items-center gap-3">
        <MethodMark method={method} size="sm" />
        <div className="min-w-0">
          <p className="font-medium">{method.name || 'Method name'}</p>
          {method.description && <p className="text-ink-soft text-sm">{method.description}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-start gap-4">
        {method.fields.length > 0 && (
          <dl className="grid min-w-0 flex-1 gap-2">
            {method.fields.map((f, i) => (
              <div key={i} className="flex flex-wrap items-center justify-between gap-2">
                <dt className="text-ink-soft text-sm">{f.label || 'Label'}</dt>
                <dd className="flex items-center gap-2 font-mono text-[15px]">
                  {f.value || '—'}
                  {f.value && <CopyButton value={f.value} />}
                </dd>
              </div>
            ))}
          </dl>
        )}
        {method.qrUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- media library URL
          <img
            src={method.qrUrl}
            alt=""
            className="size-24 rounded-[10px] bg-white object-contain p-1"
          />
        )}
      </div>
      {steps.length > 0 && (
        <ol className="text-ink-soft list-decimal space-y-1 pl-5 text-[15px]">
          {steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium">{method.referenceLabel || 'Transaction ID'}</p>
          <div className="border-ink/15 rounded-button mt-1 h-10 border" />
        </div>
        {method.senderLabel && (
          <div>
            <p className="text-sm font-medium">{method.senderLabel}</p>
            <div className="border-ink/15 rounded-button mt-1 h-10 border" />
          </div>
        )}
      </div>
      {method.proof !== 'OFF' && (
        <p className="text-ink-soft text-sm">
          Screenshot of the payment{method.proof === 'OPTIONAL' ? ' (optional)' : ''}
        </p>
      )}
    </div>
  );
}
