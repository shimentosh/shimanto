/**
 * Homepage seed copy (brief §4, §10), mirrored from the API seed. Phase 4 swaps this for SDK
 * calls with ISR tags. Unknown values stay out of the UI instead of being invented (brief §10).
 */
export const home = {
  hero: {
    /** The online journey began in 2012, at 13 (from Shimanto). */
    journey: { since: 2012, startedAtAge: 13 },
    eyebrow: 'Hi, I’m Shimanto',
    primaryCta: { label: 'Explore my work', href: '/work' },
    secondaryCta: { label: "Let's build together", href: '/collaborate' },
    marquee: [
      'Business',
      'Marketing',
      'Technology',
      'AI',
      'Automation',
      'Content',
      'Design',
      'Music',
    ],
  },
  manifesto: {
    eyebrow: 'Why this site exists',
    body: 'Social media scatters ideas across a hundred feeds. This is the one place where the builds, notes, playbooks and products actually live.',
    pillars: [
      { label: 'Builds', note: 'Ventures and software I’ve shipped', href: '/work' },
      { label: 'Notes', note: 'Founder notes on business, tech and AI', href: '/blog' },
      { label: 'Playbooks', note: 'Frameworks and methods I use', href: '/playbooks' },
      { label: 'Products', note: 'The systems I use, packaged for you', href: '/products' },
    ],
    cta: { label: 'About me', href: '/about' },
  },
  work: {
    eyebrow: 'Selected work',
    cta: { label: 'All builds', href: '/work' },
  },
  tools: {
    eyebrow: 'Free tools',
    cta: { label: 'All tools', href: '/tools' },
    suggest: { label: 'Suggest a tool', href: '/collaborate?intent=OTHER' },
  },
  products: {
    eyebrow: 'Products',
    categories: ['Software', 'Ebooks', 'Templates', 'Source code', 'Courses', 'Services'],
    cta: { label: 'Browse the store', href: '/products' },
  },
  writing: {
    eyebrow: 'From the blog',
    cta: { label: 'Read the blog', href: '/blog' },
  },
  now: {
    updated: { iso: '2026-09', label: 'September 2026' },
    building: [
      {
        label: 'shimanto.xyz',
        note: 'You’re on it right now.',
        href: '/',
        icon: 'globe',
        tone: 'build',
      },
      {
        label: 'Dot Content',
        note: 'The first product in the store.',
        href: '/products/dot-content',
        icon: 'box',
        tone: 'signal',
      },
      {
        label: 'AI video and automation systems',
        note: 'Work in progress.',
        icon: 'video',
        tone: 'idea',
      },
    ],
  },
  creative: {
    eyebrow: 'Creative archive',
    title: 'Before startups, there was a song with 35M+ views.',
    body: 'Music, songwriting, guitar, video and design: the creative side that still shapes how I build.',
    cta: { label: 'Enter the creative archive', href: '/creative' },
  },
  social: {
    eyebrow: 'Social universe',
    cta: { label: 'Find me online', href: '/social' },
  },
} as const;
