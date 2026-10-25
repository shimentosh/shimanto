import type { IconName } from '@shimanto/ui';

/** Which picture a Studio view shows in the tour, built from the real demos. */
export type StudioVisual =
  'dashboard' | 'carousel' | 'library' | 'videos' | 'ideas' | 'context' | 'brand' | 'sync';

export interface FeaturesCopy {
  meta: { title: string; description: string };
  hero: {
    badge: string;
    title: string;
    rest: string;
    intro: string;
    stats: Array<{ value: string; label: string }>;
  };
  sections: Array<{ href: string; label: string; icon: IconName }>;
  studio: {
    eyebrow: string;
    title: string;
    rest: string;
    intro: string;
    address: string;
    views: Array<{ id: StudioVisual; label: string; icon: IconName; body: string; path: string }>;
    pillars: string[];
    ideas: string[];
    sync: Array<{ name: string; role: string }>;
    synced: string;
    labels: { next: string; qa: string; preview: string; pillars: string; play: string };
  };
  formats: { eyebrow: string; title: string; rest: string; intro: string };
  carousels: { eyebrow: string; title: string; rest: string; intro: string };
  posts: { eyebrow: string; title: string; rest: string; intro: string };
  styles: { eyebrow: string; title: string; rest: string; intro: string };
  catalogue: {
    eyebrow: string;
    title: string;
    rest: string;
    contextTitle: string;
    platformsTitle: string;
  };
  final: { title: string; rest: string; guides: string };
}

export const featuresEn: FeaturesCopy = {
  meta: {
    title: 'Content OS features: every demo, every ability',
    description:
      'Every video format, carousel, post and style Content OS makes, the Studio you run it from, and everything it can do.',
  },
  hero: {
    badge: 'Features',
    title: 'Every feature.',
    rest: 'Every demo.',
    intro: 'All of it, in one place. Real renders, real posts, the real Studio.',
    stats: [
      { value: '{videos}', label: 'video demos' },
      { value: '{carousels}', label: 'carousels' },
      { value: '{posts}', label: 'posts' },
      { value: '{styles}', label: 'styles' },
    ],
  },
  sections: [
    { href: '#studio', label: 'Studio', icon: 'monitor' },
    { href: '#formats', label: 'Videos', icon: 'video' },
    { href: '#carousels', label: 'Carousels', icon: 'grid' },
    { href: '#posts', label: 'Posts', icon: 'pen' },
    { href: '#styles', label: 'Styles', icon: 'bulb' },
    { href: '#catalogue', label: 'All features', icon: 'layers' },
  ],
  studio: {
    eyebrow: 'The Studio',
    title: 'Your content desk.',
    rest: 'See everything it made.',
    intro: 'Claude Code does the work. The Studio is where you look, check and export.',
    address: 'localhost:3000/studio/shimanto',
    views: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'chart',
        body: 'Batches, pipeline, pillar balance and what to post next.',
        path: '',
      },
      {
        id: 'carousel',
        label: 'Carousel viewer',
        icon: 'grid',
        body: 'Every slide, the reasoning, the caption and QA notes.',
        path: '/c/small-team',
      },
      {
        id: 'library',
        label: 'Library',
        icon: 'archive',
        body: 'Every post and graphic, by series.',
        path: '/library',
      },
      {
        id: 'videos',
        label: 'Videos',
        icon: 'video',
        body: 'Pick a format, watch the render, get the final cut.',
        path: '/videos',
      },
      {
        id: 'ideas',
        label: 'Ideas',
        icon: 'bulb',
        body: 'A backlog of concepts, each with a reason.',
        path: '/ideas',
      },
      {
        id: 'context',
        label: 'Context',
        icon: 'book',
        body: '13 kinds of context. See exactly what the AI reads.',
        path: '/context',
      },
      {
        id: 'brand',
        label: 'Brand kit',
        icon: 'palette',
        body: 'Logo, colours, fonts and every layout.',
        path: '/brand',
      },
      {
        id: 'sync',
        label: 'Team sync',
        icon: 'cloud',
        body: 'Each teammate sees only their pages.',
        path: '/sync',
      },
    ],
    pillars: ['Business', 'Marketing', 'Building', 'AI + Automation', 'Systems & Scale'],
    ideas: [
      'Why most AI content sounds the same',
      'The one task I will never automate',
      'What 30 days after launch really looks like',
      'Hiring later: how a small team ships more',
    ],
    sync: [
      { name: 'Owner', role: 'Every page' },
      { name: 'Editor', role: 'Their pages' },
      { name: 'Viewer', role: 'Read only' },
    ],
    synced: 'All files in sync',
    labels: {
      next: 'Next up',
      qa: 'QA passed',
      preview: 'What the AI reads',
      pillars: 'Pillar balance',
      play: 'Show the views one by one',
    },
  },
  formats: {
    eyebrow: 'Video formats',
    title: 'Every format.',
    rest: 'Press play on any.',
    intro: 'Reels, Shorts and YouTube. Each one rendered in code.',
  },
  carousels: {
    eyebrow: 'Carousels',
    title: 'Every carousel.',
    rest: 'Swipe them all.',
    intro: 'Real carousels in a real brand kit.',
  },
  posts: {
    eyebrow: 'Posts & graphics',
    title: 'Every post.',
    rest: 'Caption included.',
    intro: 'Graphic, caption and hashtags, in three series.',
  },
  styles: {
    eyebrow: 'Styles',
    title: 'Beyond templates.',
    rest: 'Styles made to order.',
    intro: 'Describe a look. It builds it in code.',
  },
  catalogue: {
    eyebrow: 'All features',
    title: 'The full list.',
    rest: 'Nothing hidden.',
    contextTitle: 'What it remembers, per page',
    platformsTitle: 'Where it posts',
  },
  final: {
    title: 'Seen enough?',
    rest: 'Make it yours.',
    guides: 'Read the guides',
  },
};
