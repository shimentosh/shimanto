import type { ExperimentStage, VentureStatus } from '@shimanto/types';
import type { Accent } from '@shimanto/ui';
import type { IconName } from '@shimanto/ui';
import { type CaseStudy, caseStudies } from './case-studies';

/**
 * Code-defined content for every public page, mirrored from the API seed (brief §10).
 * Phase 5 replaces these arrays with SDK reads; the shapes are what the pages consume.
 * Rule: unknown values stay `undefined` and the UI hides them. Nothing here is invented.
 */

// ── Ventures ───────────────────────────────────────────

export interface Venture {
  slug: string;
  name: string;
  status: VentureStatus;
  /** TODO in the CMS for every venture (brief §10). */
  oneLiner?: string;
  role?: string;
  category?: string;
  years?: string;
  links?: Array<{ label: string; href: string }>;
  /** Also sold in the store. */
  productSlug?: string;
  /** Square logo in /public. Falls back to a monogram. */
  logo?: string;
  /** The full story on /work/[slug]. Without one, the page shows the outline instead. */
  caseStudy?: CaseStudy;
}

/** 'sentosh.com', or 'youtube.com/@mentosuncle' when the link has a path. */
function linkLabel(url: string) {
  const { hostname, pathname } = new URL(url);
  return hostname.replace(/^www\./, '') + (pathname === '/' ? '' : pathname);
}

export const ventures: Venture[] = (
  [
    [
      'uContents',
      'https://ucontents.com',
      'PARTIAL',
      { oneLiner: 'Running in-house for our own work. Not open to the public yet.' },
    ],
    [
      'DotMirror',
      'https://dotmirror.com',
      'LIVE',
      { oneLiner: 'White-label link building and digital PR that agencies resell as their own.' },
    ],
    [
      'Routehook',
      'https://routehook.ai',
      'LIVE',
      { oneLiner: 'The AI gateway for builders: one key and one bill for 50+ AI models.' },
    ],
    [
      'ClipMesh',
      'https://clipmesh.ai',
      'BUILDING',
      { oneLiner: 'An AI studio for faceless videos: script, voiceover, b-roll and captions.' },
    ],
    [
      'Sentosh',
      'https://sentosh.com',
      'LIVE',
      { oneLiner: 'AI-powered growth and automation systems that help startups scale.' },
    ],
    [
      'Vibemonk',
      'https://www.vibemonk.com',
      'LIVE',
      {
        oneLiner:
          'Custom software, SaaS, AI automation and integrations, built around how a business works.',
      },
    ],
    [
      'mentosUNCLE',
      'https://www.youtube.com/@mentosuncle',
      'PAUSED',
      {
        role: 'Creator',
        oneLiner:
          'My Bangla comedy and parody song channel on YouTube: 257K subscribers, 46M+ views.',
      },
    ],
  ] as const satisfies ReadonlyArray<
    readonly [string, string, VentureStatus, Pick<Venture, 'role' | 'oneLiner'>?]
  >
).map(([name, website, status, extra]) => {
  const slug = name.toLowerCase().replaceAll(' ', '-');
  const caseStudy = caseStudies[slug];
  return {
    slug,
    name,
    status,
    category: caseStudy?.category,
    years: caseStudy?.years,
    caseStudy,
    logo: `/work/${slug}.png`,
    links: [{ label: linkLabel(website), href: website }],
    ...extra,
  };
});

export const ventureStatusLabel: Record<VentureStatus, string> = {
  LIVE: 'Live',
  PARTIAL: 'Partially live',
  BUILDING: 'Building',
  PAUSED: 'Paused',
  SUNSET: 'Sunset',
  EXITED: 'Exited',
};

export const ventureStatusTone: Record<VentureStatus, Accent> = {
  LIVE: 'build',
  PARTIAL: 'signal',
  BUILDING: 'spark',
  PAUSED: 'idea',
  SUNSET: 'create',
  EXITED: 'signal',
};

/** What every case study will cover (brief §5), shown as the outline while it's being written. */
export const caseStudyOutline = [
  'What it is',
  'Why I built it',
  'The problem it solves',
  'My role',
  'System & tech',
  'Progress & metrics',
  'Screenshots',
  'Lessons',
];

export const accentCycle: Accent[] = ['build', 'create', 'signal', 'idea', 'spark'];

export function toneFor(index: number): Accent {
  return accentCycle[index % accentCycle.length]!;
}

// ── Products ───────────────────────────────────────────

// Products live in ./products.ts (sales copy) and lib/store.ts (merged with API prices).

/** Store departments (brief §3). */
export const productCategories: Array<{ name: string; note: string; icon: IconName }> = [
  { name: 'Software', note: 'Desktop and web apps', icon: 'monitor' },
  { name: 'SaaS', note: 'Hosted tools on a subscription', icon: 'cloud' },
  { name: 'Digital products', note: 'Guides, kits and courses', icon: 'book' },
  { name: 'Templates', note: 'Notion, docs, workflows', icon: 'layers' },
  { name: 'Source code', note: 'Starters you can own', icon: 'code' },
  { name: 'AI systems', note: 'Agents, prompts and pipelines', icon: 'cpu' },
  { name: 'Tools', note: 'Small utilities that save hours', icon: 'wrench' },
  { name: 'Services', note: 'Done-with-you builds', icon: 'briefcase' },
];

// ── Writing, playbooks, resources, experiments ─────────

export const writingCategories = [
  'Founder notes',
  'Business',
  'Marketing',
  'Technology',
  'AI',
  'Automation',
  'Product building',
  'Lessons',
  'Ideas',
  'Research',
];

export const playbookCategories: Array<{ name: string; note: string; icon: IconName }> = [
  { name: 'Frameworks', note: 'Mental models for decisions', icon: 'target' },
  { name: 'Systems', note: 'How the machine runs', icon: 'gear' },
  { name: 'Workflows', note: 'Step-by-step, repeatable', icon: 'repeat' },
  { name: 'SOPs', note: 'Hand-off ready procedures', icon: 'list' },
];

export const resourceCategories: Array<{ name: string; note: string; icon: IconName }> = [
  { name: 'Tools', note: 'Software I actually pay for or rely on.', icon: 'wrench' },
  { name: 'Templates', note: 'Starting points you can copy.', icon: 'layers' },
  { name: 'Guides', note: 'Longer walkthroughs, mine and curated.', icon: 'book' },
];

export const experimentStages: Array<{
  stage: ExperimentStage;
  label: string;
  tone: Accent;
  note: string;
}> = [
  { stage: 'IDEA', label: 'Idea', tone: 'idea', note: 'Written down, not built' },
  { stage: 'PROTOTYPE', label: 'Prototype', tone: 'signal', note: 'Rough, but it runs' },
  { stage: 'TESTING', label: 'Testing', tone: 'spark', note: 'In front of real people' },
  { stage: 'SHIPPED', label: 'Shipped', tone: 'build', note: 'Graduated to a product' },
  { stage: 'FAILED', label: 'Failed', tone: 'create', note: 'Shown proudly, with the lesson' },
];

/** A block-based body so articles, playbooks and experiments share one renderer. */
export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string; id: string }
  | { type: 'h3'; text: string; id: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'quote'; text: string; cite?: string }
  | { type: 'callout'; title?: string; text: string; tone?: Accent }
  | { type: 'code'; code: string; lang?: string };

export interface Entry {
  slug: string;
  title: string;
  summary: string;
  category: string;
  /** ISO date. */
  publishedAt: string;
  updatedAt?: string;
  body: Block[];
  /** Cover colour for the generated cover art. Falls back to the category's colour. */
  world?: Accent;
  tags?: string[];
  featured?: boolean;
}

export interface Experiment extends Entry {
  stage: ExperimentStage;
  lesson?: string;
}

// Blog posts live in ./posts.ts and playbooks in ./playbooks.ts. Experiments stay empty until written:
// never seed these with invented entries (brief §10).
export { posts } from './posts';
export { playbooks } from './playbooks';
export const experiments: Experiment[] = [];

// ── Now ────────────────────────────────────────────────

export interface NowEntry {
  slug: string;
  /** ISO month. */
  date: string;
  label: string;
  building: string[];
  learning?: string[];
  experimenting?: string[];
  goal?: string;
}

/** Newest first. */
export const nowEntries: NowEntry[] = [
  {
    slug: 'now-2026-09',
    date: '2026-09',
    label: 'September 2026',
    building: ['shimanto.xyz', 'Dot Content', 'AI video and automation systems'],
  },
];

// ── Wins, creative, social ─────────────────────────────

export const signatureWin = {
  value: '35M+',
  label: 'views on one song',
  platform: 'YouTube',
} as const;

/** My current music channel and my music videos (the first is featured). Views as of October 2026. */
export const musicChannel = {
  name: 'SHIMANTO',
  handle: '@sh1manto',
  url: 'https://www.youtube.com/@sh1manto',
  videos: [
    {
      id: 'r5wNeCagI1I',
      title: 'Ayy Lo Jaiga',
      bangla: 'আয় ল যাই গা',
      note: 'Shimanto x Nur Nobi · Official music video',
      views: '111K',
      year: '2024',
    },
    {
      id: 'W6ZIhHg1r1o',
      title: 'Maya Lage',
      bangla: 'মায়া লাগে',
      note: 'Nur Nobi x Shimanto · Musical vlog',
      views: '8.8K',
      year: '2025',
    },
    {
      id: '50K6q9_oXR0',
      title: 'Onubhuti',
      bangla: 'অনুভূতি',
      note: 'Official video',
      views: '2.6K',
      year: '2024',
    },
    {
      id: '4m9IGORL3a4',
      title: 'Girgiti',
      bangla: 'গিরগিটি',
      note: 'Lyrical video',
      views: '804',
      year: '2024',
    },
    { id: 'qDxP5PA_OWk', title: 'Kobe', note: 'Official video', views: '1.4K', year: '2024' },
  ],
} as const;

/** The mentosUNCLE YouTube channel. Numbers as shown on the channel page, October 2026. */
export const youtubeChannel = {
  name: 'mentosUNCLE',
  handle: '@mentosuncle',
  url: 'https://www.youtube.com/@mentosuncle',
  years: '2017–2020',
  avatar: '/wins/mentosuncle.jpg',
  summary:
    'Bangla parody and comedy songs about exams, Eid, the heat, Free Fire and everyday life, written, performed and directed by me.',
  stats: [
    { value: '257K', label: 'subscribers' },
    { value: '46M+', label: 'channel views' },
    { value: '30', label: 'videos' },
  ],
  topVideos: [
    {
      id: 'Si0b7qdh11Q',
      title: 'Gorom Er Song',
      note: 'Dilbar Dilbar parody · 2019',
      views: '40M',
    },
    { id: '4AVJt2_kEeE', title: 'Free Fire Song', note: 'Funny gameplay song', views: '1.6M' },
    { id: 'gtXJKLzlsSg', title: 'Kamla Song', note: 'Coca Cola Tu parody · 2019', views: '1.1M' },
  ],
} as const;

export const creativeDisciplines: Array<{
  name: string;
  note: string;
  tone: Accent;
  icon: IconName;
}> = [
  { name: 'Music', note: 'Where the 35M+ story started', tone: 'create', icon: 'music' },
  { name: 'Songwriting', note: 'Words, hooks and structure', tone: 'idea', icon: 'pen' },
  { name: 'Guitar', note: 'The instrument behind the songs', tone: 'spark', icon: 'music' },
  { name: 'Video', note: 'Shooting, editing, telling stories', tone: 'signal', icon: 'video' },
  { name: 'Design', note: 'Brand, layout and visual systems', tone: 'build', icon: 'palette' },
  {
    name: 'Visual experiments',
    note: 'Play with no brief attached',
    tone: 'create',
    icon: 'spark',
  },
];

/** Recent music videos, newest first (links from Shimanto; titles as published on YouTube). */
export interface MusicVideo {
  youtubeId: string;
  title: string;
  /** Original-script title, when the song has one. */
  native?: string;
  credit: string;
  kind: string;
}

export const musicVideos: MusicVideo[] = [
  {
    youtubeId: 'W6ZIhHg1r1o',
    title: 'Maya Lage',
    credit: 'Nur Nobi × Shimanto',
    kind: 'Official musical vlog',
  },
  {
    youtubeId: 'r5wNeCagI1I',
    title: 'Ayy Lo Jaiga',
    native: 'আয় ল যাই গা',
    credit: 'Shimanto × Nur Nobi · Adib',
    kind: 'Official music video · 2024',
  },
  {
    youtubeId: '-y9j6Gij1ec',
    title: 'Obohela',
    credit: 'Nur Nobi × Shimanto',
    kind: 'Official music video',
  },
];

// ── Skills galaxy (brief §5 /skills) ──────────────────

export interface Skill {
  id: string;
  name: string;
  tone: Accent;
  summary: string;
  links: Array<{ label: string; href: string }>;
}

export const skills: Skill[] = [
  {
    id: 'business',
    name: 'Business',
    tone: 'build',
    summary: 'Offers, models and operations: turning an idea into something that pays for itself.',
    links: [
      { label: 'Ventures', href: '/work' },
      { label: 'Business notes', href: '/blog' },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    tone: 'create',
    summary: 'Positioning, distribution and growth loops that get the right people to care.',
    links: [
      { label: 'Marketing Lab', href: '/lab' },
      { label: 'Marketing notes', href: '/blog' },
    ],
  },
  {
    id: 'product',
    name: 'Product',
    tone: 'signal',
    summary: 'Deciding what to build, what to cut, and shipping it before it is perfect.',
    links: [
      { label: 'Products', href: '/products' },
      { label: 'Experiments', href: '/experiments' },
    ],
  },
  {
    id: 'technology',
    name: 'Technology',
    tone: 'idea',
    summary: 'Software as a lever: enough engineering to build, direct and judge the work.',
    links: [
      { label: 'Ventures', href: '/work' },
      { label: 'Technology notes', href: '/blog' },
    ],
  },
  {
    id: 'ai',
    name: 'AI',
    tone: 'spark',
    summary: 'Models and agents used as teammates, not toys: in content, video and operations.',
    links: [
      { label: 'Experiments', href: '/experiments' },
      { label: 'AI notes', href: '/blog' },
    ],
  },
  {
    id: 'automation',
    name: 'Automation',
    tone: 'build',
    summary: 'Systems that run while I sleep: workflows, pipelines and glue code.',
    links: [
      { label: 'Playbooks', href: '/playbooks' },
      { label: 'Tools', href: '/tools' },
    ],
  },
  {
    id: 'content',
    name: 'Content',
    tone: 'create',
    summary: 'Writing, video and publishing systems that compound instead of disappearing.',
    links: [
      { label: 'Dot Content', href: '/products/dot-content' },
      { label: 'Writing', href: '/blog' },
    ],
  },
  {
    id: 'design',
    name: 'Design',
    tone: 'idea',
    summary: 'Brand, interfaces and visual taste: how things look is part of how they work.',
    links: [{ label: 'Creative Archive', href: '/creative' }],
  },
  {
    id: 'music',
    name: 'Music & Creative',
    tone: 'signal',
    summary: 'Songwriting, guitar and video: the creative side where the 35M+ story started.',
    links: [{ label: 'Creative Archive', href: '/creative' }],
  },
];

// ── About ──────────────────────────────────────────────

/**
 * DRAFT chapters. They only state what the brief states; Shimanto should rewrite them in his own
 * words (tracked as a TODO in the CMS).
 */
export const aboutChapters: Array<{ id: string; number: string; title: string; body: string[] }> = [
  {
    id: 'first-hustle',
    number: '01',
    title: 'The first hustle',
    body: [
      'Every business I have built started the same way: something I wanted to exist, and the stubbornness to make it and put it in front of people.',
      'That loop of make, ship, sell and learn is still the whole job. The tools just got better.',
    ],
  },
  {
    id: 'music',
    number: '02',
    title: 'Music & 35M views',
    body: [
      'Before startups, there was music. Songwriting, guitar and video, and one song that went on to pass 35 million views.',
      'It taught me the thing most founders learn late: distribution is part of the product.',
    ],
  },
  {
    id: 'building',
    number: '03',
    title: 'Building businesses',
    body: [
      'Since then: uContents, DotMirror, Routehook, ClipMesh and Sentosh. Some are products, some are experiments, all of them are lessons.',
      'I am not "a developer" and not only "an AI creator". I am a founder who uses whatever the business needs.',
    ],
  },
  {
    id: 'systems',
    number: '04',
    title: 'Systems thinking',
    body: [
      'Business, marketing, technology, AI and automation are one toolkit, not five careers. The leverage is in how they connect.',
      'So I build systems: repeatable ways of making, selling and running things that keep working after the launch post.',
    ],
  },
  {
    id: 'beliefs',
    number: '05',
    title: 'What I believe',
    body: [
      'Own your work. Social media distributes; your own home on the internet owns.',
      'Share the process, including the failures. Every experiment on this site stays up, especially the ones that did not work.',
    ],
  },
];

export const aboutQuotes = [
  'Social media distributes. This site owns.',
  'One toolkit, not five careers.',
];

export const interests: Array<{ name: string; tone: Accent }> = [
  { name: 'Songwriting', tone: 'create' },
  { name: 'Guitar', tone: 'spark' },
  { name: 'Video', tone: 'signal' },
  { name: 'Design', tone: 'idea' },
  { name: 'YouTube', tone: 'create' },
  { name: 'AI', tone: 'build' },
  { name: 'Automation', tone: 'signal' },
  { name: 'Business', tone: 'spark' },
];
