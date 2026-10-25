import type { IconName } from '@shimanto/ui';

/** A numbered callout on a Studio screenshot: where it points (% of the image) and why it matters. */
export interface StudioPoint {
  x: number;
  y: number;
  title: string;
  body: string;
}

/** One real Studio screen, captured from Content OS at 1440×900 (2×). */
export interface StudioScreen {
  id: string;
  label: string;
  icon: IconName;
  /** Path after localhost:3000, shown in the window bar. */
  path: string;
  title: string;
  body: string;
  /** Under /public, 2000×1250. */
  image: string;
  points: StudioPoint[];
}

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
    screens: StudioScreen[];
  };
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
    title: 'Content OS features: a tour of the Studio',
    description:
      'A tour of the Content OS Studio, screen by screen: what each one does for you, and everything it can do.',
  },
  hero: {
    badge: 'Features',
    title: 'Every screen.',
    rest: 'Every feature.',
    intro: 'A tour of the Studio, one screen at a time.',
    stats: [
      { value: '13', label: 'kinds of context' },
      { value: '28', label: 'quality checks' },
      { value: '7', label: 'platforms' },
      { value: '3', label: 'AI brains' },
    ],
  },
  sections: [
    { href: '#studio', label: 'Studio tour', icon: 'monitor' },
    { href: '#catalogue', label: 'All features', icon: 'layers' },
  ],
  studio: {
    eyebrow: 'The Studio',
    title: 'Your content desk.',
    rest: 'Every screen, explained.',
    intro:
      'Claude Code does the work. The Studio is where you look, check and export. These are the real screens.',
    screens: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: 'grid',
        path: '/studio',
        title: 'Every brand, one dashboard.',
        body: 'All your pages side by side: what was made, what was posted and what needs you.',
        image: '/content-os/studio/dashboard.webp',
        points: [
          {
            x: 8,
            y: 17,
            title: 'One page per brand',
            body: 'Each brand keeps its own voice, context and history, so nothing mixes.',
          },
          {
            x: 26,
            y: 32,
            title: 'The whole pipeline in numbers',
            body: 'Made, posted, in production, waiting for review and ready to ship.',
          },
          {
            x: 43,
            y: 62,
            title: 'Growth per brand',
            body: 'How much each page makes, week by week.',
          },
          {
            x: 83,
            y: 62,
            title: 'Needs your attention',
            body: 'Missing context and posts waiting for your review, in one list.',
          },
        ],
      },
      {
        id: 'overview',
        label: 'Page overview',
        icon: 'chart',
        path: '/studio/shimanto',
        title: 'Know what to post next.',
        body: 'One brand’s desk: what Claude is doing, what’s in production and which topics are falling behind.',
        image: '/content-os/studio/overview.webp',
        points: [
          {
            x: 71,
            y: 19,
            title: 'One-click commands',
            body: 'Each button copies the command for Claude Code: what to post next, 10 carousels, a reel.',
          },
          {
            x: 29,
            y: 31,
            title: 'Content, backlog and rules',
            body: 'What exists, what’s being made, the ideas waiting and the rules it has learned.',
          },
          {
            x: 35,
            y: 40,
            title: 'Live progress',
            body: 'What Claude is working on right now, and what hasn’t started yet.',
          },
          {
            x: 85,
            y: 67,
            title: 'Pillar balance',
            body: 'What you post against what you planned, so no topic gets forgotten.',
          },
        ],
      },
      {
        id: 'carousel',
        label: 'Carousel editor',
        icon: 'layers',
        path: '/studio/shimanto/c/5-tasks-not-to-give-ai',
        title: 'Check every slide before it ships.',
        body: 'Copy, design and quality for each carousel, side by side.',
        image: '/content-os/studio/carousel.webp',
        points: [
          {
            x: 26,
            y: 10,
            title: 'Quality score',
            body: 'Every carousel is checked (text fit, safe areas, contrast) and scored before export.',
          },
          {
            x: 29,
            y: 37,
            title: 'Headline options',
            body: 'Pick one of its headlines or write your own, slide by slide.',
          },
          {
            x: 56,
            y: 52,
            title: 'Every aspect ratio',
            body: 'Preview 4:5, 3:4, 1:1 or 9:16, as a slider or a grid.',
          },
          {
            x: 86,
            y: 78,
            title: 'Restyle in a click',
            body: 'Change one slide or all of them: tone, background image, layout.',
          },
          { x: 94, y: 17, title: 'Export', body: 'PNG or JPG files, ready to post.' },
        ],
      },
      {
        id: 'videos',
        label: 'Videos',
        icon: 'video',
        path: '/studio/shimanto/projects',
        title: 'From one line to a finished video.',
        body: 'Every video production with its format, length and progress.',
        image: '/content-os/studio/videos.webp',
        points: [
          {
            x: 93,
            y: 20,
            title: 'Start from a script',
            body: 'Write one line; it plans the script, the voice and the scenes.',
          },
          {
            x: 64,
            y: 52,
            title: 'Reels and YouTube',
            body: '9:16 vertical for reels and shorts, 16:9 for YouTube.',
          },
          {
            x: 83,
            y: 38,
            title: 'Step-by-step progress',
            body: 'Script, voice, scenes, render: see which step each video is on.',
          },
        ],
      },
      {
        id: 'ideas',
        label: 'Ideas',
        icon: 'bulb',
        path: '/studio/shimanto/ideas',
        title: 'Never stare at a blank page.',
        body: 'A backlog of ideas, each with the reason it’s worth posting.',
        image: '/content-os/studio/ideas.webp',
        points: [
          {
            x: 91,
            y: 20,
            title: 'What should I post next?',
            body: 'Ask, and it picks from your history, your pillars and fresh news.',
          },
          {
            x: 35,
            y: 26,
            title: 'Hundreds of ideas, sorted',
            body: 'New, planned and used, so you never post the same thing twice.',
          },
          {
            x: 68,
            y: 42,
            title: 'Format and priority',
            body: 'Every idea comes with a format (carousel, post, reel) and a priority.',
          },
          {
            x: 85,
            y: 44,
            title: 'The reason behind it',
            body: 'Why this idea, why now: the pillar it fills and what the audience needs.',
          },
        ],
      },
      {
        id: 'scheduler',
        label: 'Scheduler',
        icon: 'calendar',
        path: '/studio/shimanto/scheduler',
        title: 'A posting plan that fills itself.',
        body: 'Your posting times, the posts going out this week and a queue ready behind them.',
        image: '/content-os/studio/scheduler.webp',
        points: [
          {
            x: 25,
            y: 25,
            title: 'Your posting times',
            body: 'Set the days and times once; the queue fills them in order.',
          },
          {
            x: 45,
            y: 62,
            title: 'Checked before it goes out',
            body: 'Each post shows its hashtags and warns about anything missing.',
          },
          {
            x: 86,
            y: 56,
            title: 'A ready queue',
            body: 'Posts waiting their turn. Ask Claude to fill in missing headlines or hashtags.',
          },
        ],
      },
      {
        id: 'research',
        label: 'Research',
        icon: 'search',
        path: '/studio/shimanto/research',
        title: 'Posts backed by real sources.',
        body: 'Research sessions with the question, the sources read and what was found.',
        image: '/content-os/studio/research.webp',
        points: [
          {
            x: 31,
            y: 49,
            title: 'Research sessions',
            body: 'Every question it researched, open or done, with its sources and findings.',
          },
          {
            x: 71,
            y: 45,
            title: 'The next step',
            body: 'It tells you what’s left: read more sources or write up the findings.',
          },
          {
            x: 71,
            y: 84,
            title: 'Every source kept',
            body: 'Each source is saved with what was taken from it and when.',
          },
        ],
      },
      {
        id: 'context',
        label: 'Context',
        icon: 'book',
        path: '/studio/shimanto/context',
        title: 'See exactly what the AI knows.',
        body: 'Knowledge, experiences, rules and sources: everything Claude can use for this brand.',
        image: '/content-os/studio/context.webp',
        points: [
          {
            x: 66,
            y: 30,
            title: 'Context health',
            body: 'It tells you what’s missing, like a profile photo or product details.',
          },
          {
            x: 66,
            y: 51,
            title: 'Everything it can use',
            body: 'Knowledge, experiences, series, assets, rules, sources and ideas, counted.',
          },
          {
            x: 84,
            y: 20,
            title: 'Preview the context',
            body: 'Read the exact context the AI gets before it writes a word.',
          },
          {
            x: 42,
            y: 70,
            title: 'Yours to take',
            body: 'Export all of it as a .zip, without secrets.',
          },
        ],
      },
      {
        id: 'brand',
        label: 'Brand kit',
        icon: 'palette',
        path: '/studio/shimanto/brand',
        title: 'On brand, every time.',
        body: 'The colours, fonts, tones and layouts every post is rendered with.',
        image: '/content-os/studio/brand.webp',
        points: [
          {
            x: 39,
            y: 28,
            title: 'One brand kit',
            body: 'Colours, fonts, corner radius, shadows and aspect ratio, set once.',
          },
          {
            x: 79,
            y: 34,
            title: 'Three tones',
            body: 'Dark, light and brand slides, for rhythm across a carousel.',
          },
          {
            x: 39,
            y: 67,
            title: 'Written style rules',
            body: 'How illustrations and images should look, in plain words the AI follows.',
          },
          {
            x: 59,
            y: 93,
            title: '41 layouts',
            body: 'Claude picks a layout and fills it; the engine renders it in your brand.',
          },
        ],
      },
      {
        id: 'assets',
        label: 'Assets',
        icon: 'archive',
        path: '/studio/dotmirror/assets',
        title: 'Every file, in its place.',
        body: 'Logos, photos, screenshots, audio and clips, sorted per brand and ready to reuse.',
        image: '/content-os/studio/assets.webp',
        points: [
          {
            x: 30,
            y: 20,
            title: 'This brand, or every brand',
            body: 'Each page keeps its own files; a shared library holds the rest.',
          },
          {
            x: 27,
            y: 52,
            title: 'Sorted by kind',
            body: 'Headshots, logos, screenshots, clips and audio, each in its own shelf.',
          },
          {
            x: 64,
            y: 50,
            title: 'On or off in one switch',
            body: 'Turn a file off and Claude stops using it.',
          },
          {
            x: 92,
            y: 20,
            title: 'Drop files in',
            body: 'Upload straight into a brand’s library.',
          },
        ],
      },
      {
        id: 'sync',
        label: 'Team sync',
        icon: 'cloud',
        path: '/studio/sync',
        title: 'Your team, on the same files.',
        body: 'Two-way sync between this computer and your server, page by page.',
        image: '/content-os/studio/sync.webp',
        points: [
          {
            x: 59,
            y: 34,
            title: 'Two-way sync',
            body: 'Your changes go up and your teammates’ changes come down.',
          },
          {
            x: 59,
            y: 66,
            title: 'Status per page',
            body: 'What’s on this computer, what’s on the server, what’s sending or receiving.',
          },
          {
            x: 78,
            y: 16,
            title: 'Sync now or pause',
            body: 'Big videos wait on the server until you open them, so your disk stays light.',
          },
        ],
      },
    ],
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
