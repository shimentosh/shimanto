import type { Accent, IconName } from '@shimanto/ui';

export type ToolKind = 'Chrome extension' | 'Web app' | 'Script' | 'Template';

export interface ToolImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

/** A tool I built and share. Listed on /tools, with its own page at /tools/[slug]. */
export interface Tool {
  slug: string;
  name: string;
  kind: ToolKind;
  /** One line: what it does for you. Used on the card and as the meta description. */
  tagline: string;
  /** A short paragraph for the top of the tool's page. */
  intro: string;
  /** Leave out for a free tool. Set it (e.g. '$9' or '$5/mo') when a tool becomes paid. */
  price?: string;
  /** Where people get it (store listing, live app, repo). */
  href: string;
  cta: string;
  /** The tool's own logo. */
  logo: ToolImage;
  screenshots: ToolImage[];
  tone: Accent;
  tags: string[];
  /** The main things it does, shown as a grid. */
  capabilities: Array<{ title: string; body: string; icon: IconName }>;
  /** Smaller details, shown as a checklist. */
  features: string[];
  audience: string[];
  privacy?: string;
  disclaimer?: string;
  facts: Array<{ term: string; value: string }>;
}

export const priceLabel = (tool: Tool) => tool.price ?? 'Free';

/** Newest first. */
export const tools: Tool[] = [
  {
    slug: 'chatgpt-auto-chat',
    name: 'ChatGPT Auto Chat',
    kind: 'Chrome extension',
    tagline:
      'Queue up prompts and let ChatGPT answer them one by one, automatically. Then collect the replies.',
    intro:
      'Paste a list of prompts, hit start and walk away. It waits for ChatGPT to finish each reply before sending the next one: no clicking, no waiting, no copy-pasting.',
    href: 'https://chromewebstore.google.com/detail/chatgpt-auto-chat/fpbogjahcaeiojmjnocfgdogammodjli',
    cta: 'Add to Chrome',
    logo: {
      src: '/tools/chatgpt-auto-chat/icon.png',
      alt: 'ChatGPT Auto Chat logo',
      width: 128,
      height: 128,
    },
    screenshots: [
      {
        src: '/tools/chatgpt-auto-chat/overview.png',
        alt: 'ChatGPT Auto Chat sidebar running a queue of five prompts over two cycles',
        width: 1280,
        height: 800,
      },
    ],
    tone: 'build',
    tags: ['ChatGPT', 'AI', 'Automation'],
    capabilities: [
      {
        title: 'Bulk prompt queue',
        body: 'Paste 10, 50 or 100 prompts, one per line, and let them run.',
        icon: 'list',
      },
      {
        title: 'Multi-cycle loops',
        body: 'Repeat the whole list as many times as you want.',
        icon: 'repeat',
      },
      {
        title: 'Smart wait',
        body: 'Detects when ChatGPT has finished replying before it sends the next prompt.',
        icon: 'clock',
      },
      {
        title: 'Stop and resume',
        body: 'Pause any time and pick up right where you left off.',
        icon: 'play',
      },
      {
        title: 'Response collector',
        body: 'Pull full replies, code blocks, paragraphs, list items or headers off the page.',
        icon: 'inbox',
      },
      {
        title: 'Live pick',
        body: 'Click any element on the page and it writes the CSS selector for you.',
        icon: 'target',
      },
      {
        title: 'Copy or download',
        body: 'Copy everything you collected to the clipboard, or save it as a .txt file.',
        icon: 'download',
      },
      {
        title: 'Live progress',
        body: 'Progress bar, live status and elapsed time while it runs.',
        icon: 'chart',
      },
    ],
    features: [
      'Prompts go in the sidebar, one per line',
      'Set how many cycles to run',
      'Optional delay (ms) before each send for extra reliability',
      'Waits for each reply to finish before moving on',
      'Activity log panel',
      'Light and dark theme',
      'Works on chatgpt.com',
    ],
    audience: [
      'Generating content in bulk: blog posts, product descriptions, emails',
      'Running the same set of prompts across many topics',
      'Prompt experiments and automated testing',
      'Collecting and exporting ChatGPT responses',
    ],
    facts: [
      { term: 'Works in', value: 'Google Chrome' },
      { term: 'Works on', value: 'chatgpt.com' },
      { term: 'Exports', value: 'Clipboard, TXT' },
    ],
  },
  {
    slug: 'instagram-scraper',
    name: 'Instagram Scraper',
    kind: 'Chrome extension',
    tagline:
      'Export Instagram profiles, posts, followers, hashtags and comments to CSV or JSON in a click.',
    intro:
      'Collect public Instagram data straight from your browser. No API key, no third-party server, no signup: install it, open Instagram and start scraping.',
    href: 'https://chromewebstore.google.com/detail/instagram-scraper-posts-h/ppkljldebhpengdgcpbghkckgdnkfadm',
    cta: 'Add to Chrome',
    logo: {
      src: '/tools/instagram-scraper/icon.png',
      alt: 'Instagram Scraper logo',
      width: 128,
      height: 128,
    },
    screenshots: [
      {
        src: '/tools/instagram-scraper/overview.png',
        alt: 'Instagram Scraper popup with the seven scrape types and the Start Scraping button',
        width: 1280,
        height: 800,
      },
      {
        src: '/tools/instagram-scraper/posts.png',
        alt: 'Scraping posts: likes, comments, captions, views, dates and URLs collected into a table',
        width: 1280,
        height: 800,
      },
      {
        src: '/tools/instagram-scraper/hashtags-comments.png',
        alt: 'Scraping a hashtag and a post’s comments side by side',
        width: 1280,
        height: 800,
      },
      {
        src: '/tools/instagram-scraper/export.png',
        alt: 'Exporting scraped data to CSV, JSON, HTML or TXT',
        width: 1280,
        height: 800,
      },
    ],
    tone: 'create',
    tags: ['Instagram', 'Data export', 'Marketing research'],
    capabilities: [
      {
        title: 'Profiles',
        body: 'Bio, follower, following and post counts, verification, business category, website and user ID.',
        icon: 'user',
      },
      {
        title: 'Posts',
        body: 'URLs, captions, hashtags, mentions, likes, comments, views, timestamps, media type and location.',
        icon: 'grid',
      },
      {
        title: 'Followers',
        body: 'Full list with usernames, names, verification and privacy status, counts and profile URLs.',
        icon: 'users',
      },
      {
        title: 'Following',
        body: 'The same detail as followers, for any account’s following list.',
        icon: 'users',
      },
      {
        title: 'Hashtags',
        body: 'Top posts under any hashtag, with engagement, captions, media type and owner details.',
        icon: 'tag',
      },
      {
        title: 'Comments',
        body: 'Every comment on a public post, with nested replies. Sort by popular or most recent.',
        icon: 'chat',
      },
      {
        title: 'Likers',
        body: 'Who liked a public post: up to 500 accounts with verification and follower counts.',
        icon: 'heart',
      },
      {
        title: 'Export anywhere',
        body: 'CSV for Excel and Sheets, JSON for code and automations, HTML to share, TXT for anything else.',
        icon: 'download',
      },
    ],
    features: [
      'Up to 5,000 items per session',
      'Pick exactly which fields to collect',
      'Verified-only and skip-private filters',
      'Filter posts by image, video or carousel',
      'Include or skip comment replies',
      'Live progress bar and activity log',
      'Stop at any time with one click',
      'Detects the Instagram page you’re on',
      'Files auto-named with the date',
      'Light and dark mode',
    ],
    audience: [
      'Social media managers tracking competitors',
      'Marketers researching influencers and engagement',
      'Recruiters looking for creators and brand ambassadors',
      'Analysts and researchers building Instagram datasets',
      'Agencies putting together client reports',
    ],
    privacy:
      'It runs entirely in your browser using your existing Instagram session. Nothing is sent to an external server and no credentials are stored. It only reads public accounts and content you can already see.',
    disclaimer:
      'For publicly available Instagram data only. Use it responsibly and within Instagram’s Terms of Service.',
    facts: [
      { term: 'Works in', value: 'Google Chrome' },
      { term: 'Exports', value: 'CSV, JSON, HTML, TXT' },
      { term: 'Account needed', value: 'Your Instagram login' },
    ],
  },
];
