import type { Accent } from '@shimanto/ui';

/**
 * Store content: the sales copy for each product. Commerce data (price, currency, files, published
 * state) comes from the API (`GET /v1/products`) and always wins; see `lib/store.ts`.
 *
 * To sell something new: create the product in the admin (slug, price, files), then optionally add
 * an entry here with the same slug for a richer sales page. Products that exist only in the API
 * still get a generic page.
 */

export type ProductKind =
  | 'software'
  | 'ebook'
  | 'template'
  | 'source-code'
  | 'course'
  | 'saas'
  | 'service'
  | 'system'
  | 'digital';

export const kindLabel: Record<ProductKind, string> = {
  software: 'Software',
  ebook: 'Ebook',
  template: 'Template',
  'source-code': 'Source code',
  course: 'Course',
  saas: 'SaaS',
  service: 'Service',
  system: 'System',
  digital: 'Digital product',
};

/** A pricing option. Each tier is its own product in the API (its own slug and price). */
export interface ProductTier {
  slug: string;
  name: string;
  blurb: string;
  features: string[];
  /** Fallback price in minor units (cents) while the API is unreachable. */
  price?: number;
  currency?: string;
  highlight?: boolean;
}

export interface ProductContent {
  slug: string;
  name: string;
  kind: ProductKind;
  tagline: string;
  summary: string;
  world: Accent;
  /** Fallback price in minor units while the API is unreachable. The API price always wins. */
  price?: number;
  currency?: string;
  tiers?: ProductTier[];
  highlights: string[];
  features?: Array<{ title: string; body: string }>;
  included?: string[];
  specs?: Array<{ label: string; value: string }>;
  faq?: Array<{ q: string; a: string }>;
  ventureSlug?: string;
  featured?: boolean;
  /** Preview-only example: shown in development, never in a production build. */
  sample?: boolean;
}

const realProducts: ProductContent[] = [
  {
    slug: 'clientdesk',
    name: 'Clientdesk',
    kind: 'saas',
    tagline: 'The client portal for agencies that sell productized services.',
    summary:
      'Sell services through order forms, deliver them in a branded client portal and get paid on time, with the CRM, helpdesk and subscriptions an agency needs in one place.',
    world: 'signal',
    highlights: ['Order forms', 'Branded client portal', 'Helpdesk and subscriptions'],
    features: [
      {
        title: 'Order forms',
        body: 'Sell a service like a product: tiers, add-ons and coupons, with the brief collected at checkout.',
      },
      {
        title: 'Client portal',
        body: 'Orders, approvals, invoices and messages under your logo, so clients see progress instead of asking for it.',
      },
      {
        title: 'Delivery and helpdesk',
        body: 'Every deliverable moves through clear stages, and tickets stay tied to the order they are about.',
      },
      {
        title: 'Margin per order',
        body: 'Cost of delivery against price on every line, not just revenue per month.',
      },
    ],
    featured: true,
  },
  {
    slug: 'teamogs',
    name: 'TeamOGs',
    kind: 'saas',
    tagline: 'Time, projects and attendance for your team, in one app.',
    summary:
      'Track who worked on what, how long it took and who showed up, without juggling three tools.',
    world: 'build',
    highlights: ['Time tracking', 'Project management', 'Attendance'],
    features: [
      {
        title: 'Time tracking',
        body: 'Log hours against projects and tasks, so you know where the week actually went.',
      },
      {
        title: 'Projects',
        body: 'Every project with its people, tasks and hours in one place.',
      },
      {
        title: 'Attendance',
        body: 'Check-ins and leave for the whole team, ready when payroll or reviews come around.',
      },
    ],
  },
];

/**
 * Example products that show how each kind of product looks in the store. Opt-in, development
 * only: set `STORE_SAMPLES=1` in `.env.local` to preview them. Never shown in production builds.
 */
const sampleProducts: ProductContent[] = [
  {
    slug: 'founder-systems-handbook',
    name: 'The Founder Systems Handbook',
    kind: 'ebook',
    tagline: 'Turn a messy business into a machine that runs without you.',
    summary:
      'A practical guide to documenting, standardising and automating the work that eats your week.',
    world: 'build',
    price: 1900,
    currency: 'USD',
    highlights: ['PDF + EPUB', 'Checklists included', 'Free updates'],
    features: [
      {
        title: 'The systems ladder',
        body: 'Do, document, standardise, automate: the four rungs, with worked examples.',
      },
      {
        title: 'Copy-paste templates',
        body: 'System cards, SOP outlines and weekly review sheets you can use today.',
      },
      {
        title: 'Automation map',
        body: 'Which tasks to automate first, and which to delete instead.',
      },
    ],
    included: ['Handbook (PDF)', 'Handbook (EPUB)', 'Checklist pack (PDF)'],
    specs: [
      { label: 'Format', value: 'PDF, EPUB' },
      { label: 'Delivery', value: 'Instant download' },
      { label: 'Updates', value: 'Free, forever' },
    ],
    sample: true,
  },
  {
    slug: 'automation-starter-kit',
    name: 'Automation Starter Kit',
    kind: 'template',
    tagline: 'Plug-and-play workflows for leads, content and reporting.',
    summary: 'Ready-made automation templates with setup guides, so you ship in an afternoon.',
    world: 'spark',
    highlights: ['12 workflows', 'Setup videos', 'Works with no-code tools'],
    tiers: [
      {
        slug: 'automation-starter-kit-solo',
        name: 'Solo',
        blurb: 'For one founder running everything.',
        features: ['All 12 workflow templates', 'Setup guides', 'Personal licence'],
        price: 2900,
        currency: 'USD',
      },
      {
        slug: 'automation-starter-kit-team',
        name: 'Team',
        blurb: 'For small teams that want it set up once, used by all.',
        features: [
          'Everything in Solo',
          'Team licence (up to 10)',
          'Handover SOP pack',
          'Priority email support',
        ],
        price: 7900,
        currency: 'USD',
        highlight: true,
      },
    ],
    features: [
      {
        title: 'Lead routing',
        body: 'New enquiries sorted, tagged and followed up automatically.',
      },
      { title: 'Content repurposing', body: 'One long post becomes a week of short ones.' },
      { title: 'Weekly reporting', body: 'The numbers you check every Monday, delivered.' },
      { title: 'Invoice reminders', body: 'Polite nudges that go out on time, every time.' },
    ],
    included: ['12 workflow templates', 'Setup guide (PDF)', 'Video walkthroughs'],
    specs: [
      { label: 'Format', value: 'Template files + PDF guide' },
      { label: 'Tools', value: 'No-code automation platforms' },
      { label: 'Delivery', value: 'Instant download' },
    ],
    sample: true,
  },
  {
    slug: 'launch-page-starter',
    name: 'Launch Page Starter',
    kind: 'source-code',
    tagline: 'A fast, beautiful landing page you own, line by line.',
    summary: 'Production-ready source code for a launch page with waitlist, pricing and FAQ.',
    world: 'idea',
    price: 4900,
    currency: 'USD',
    highlights: ['Full source code', 'Mobile-first', 'Commercial licence'],
    features: [
      { title: 'Own the code', body: 'No page builder lock-in. Edit anything.' },
      { title: 'Built to convert', body: 'Hero, proof, pricing, FAQ and waitlist sections.' },
      { title: 'Fast by default', body: 'Tiny bundle, great scores, accessible markup.' },
    ],
    included: ['Source code (ZIP)', 'Setup README', 'Design tokens'],
    specs: [
      { label: 'Stack', value: 'Next.js, TypeScript, Tailwind' },
      { label: 'Licence', value: 'Unlimited personal & client projects' },
      { label: 'Delivery', value: 'Instant download' },
    ],
    sample: true,
  },
  {
    slug: 'invoice-autopilot',
    name: 'Invoice Autopilot',
    kind: 'software',
    tagline: 'Invoices that send, chase and file themselves.',
    summary: 'A small desktop app that creates invoices, sends reminders and keeps records tidy.',
    world: 'create',
    price: 3900,
    currency: 'USD',
    highlights: ['macOS & Windows', 'One-time payment', 'Offline-first'],
    features: [
      { title: 'Templates', body: 'Brand your invoices once, reuse forever.' },
      { title: 'Auto-reminders', body: 'Friendly follow-ups on the schedule you choose.' },
      { title: 'Clean exports', body: 'CSV exports your accountant will actually like.' },
    ],
    included: ['macOS installer', 'Windows installer', 'Licence key'],
    specs: [
      { label: 'Platform', value: 'macOS 13+, Windows 10+' },
      { label: 'Licence', value: '1 user, 2 devices' },
      { label: 'Updates', value: '12 months included' },
    ],
    sample: true,
  },
  {
    slug: 'ship-in-a-week',
    name: 'Ship in a Week',
    kind: 'course',
    tagline: 'From idea to launched product in seven focused days.',
    summary: 'A short video course with a daily plan, templates and a launch checklist.',
    world: 'signal',
    price: 5900,
    currency: 'USD',
    highlights: ['8 video lessons', 'Daily worksheets', 'Lifetime access'],
    features: [
      { title: 'Shrink the idea', body: 'Cut scope until the core promise is testable.' },
      { title: 'Build the spine', body: 'Boring tools, fast results, fake the rest.' },
      { title: 'Launch & listen', body: 'Where to share it and what to do with the feedback.' },
    ],
    included: ['8 video lessons', 'Worksheets (PDF)', 'Launch checklist'],
    specs: [
      { label: 'Length', value: 'About 2 hours' },
      { label: 'Format', value: 'Video + PDF' },
      { label: 'Access', value: 'Lifetime' },
    ],
    sample: true,
  },
  {
    slug: 'systems-audit',
    name: '1:1 Systems Audit',
    kind: 'service',
    tagline: 'A focused review of your business systems, with a clear plan.',
    summary: 'A 90-minute session plus a written plan of what to fix, automate or drop.',
    world: 'build',
    price: 24900,
    currency: 'USD',
    highlights: ['90-minute call', 'Written action plan', 'Follow-up email'],
    features: [
      { title: 'Before the call', body: 'A short questionnaire so we skip the basics.' },
      { title: 'On the call', body: 'We map your workflows and find the biggest leaks.' },
      { title: 'After the call', body: 'A prioritised plan you can run with or hand off.' },
    ],
    included: ['Pre-call questionnaire', '90-minute video call', 'Written action plan'],
    specs: [
      { label: 'Format', value: 'Video call' },
      { label: 'Scheduling', value: 'Booking link sent after purchase' },
      { label: 'Turnaround', value: 'Plan within 3 working days' },
    ],
    sample: true,
  },
];

export const SHOW_SAMPLES =
  process.env.NODE_ENV !== 'production' && process.env.STORE_SAMPLES === '1';

/** Every product with sales copy, in store order. Samples only outside production. */
export const productContent: ProductContent[] = [
  ...realProducts,
  ...(SHOW_SAMPLES ? sampleProducts : []),
];

/** Slugs of API products that are tiers of another product (not listed on their own). */
export const tierSlugs = new Set(productContent.flatMap((p) => p.tiers?.map((t) => t.slug) ?? []));
