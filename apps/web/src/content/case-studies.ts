import type { IconName } from '@shimanto/ui';

/**
 * Case studies for /work/[slug]. Everything here comes from each product's own site or the
 * Vibemonk case study that documents it. Numbers are the ones those pages publish.
 */
export interface CaseStudy {
  category: string;
  years?: string;
  /** What it is, in a short paragraph. */
  summary: string;
  problem: string;
  built: string;
  /** Where it stands today. */
  outcome: string;
  /** Only when the reason is on record. */
  why?: string;
  numbers?: Array<{ value: string; label: string }>;
  highlights: Array<{ title: string; body: string; icon: IconName }>;
  audience?: string[];
  stack?: string[];
  /** Other ventures it's connected to, and how. */
  related?: Array<{ slug: string; note: string }>;
  sources: Array<{ label: string; href: string }>;
}

export const caseStudies: Record<string, CaseStudy> = {
  ucontents: {
    category: 'Social media publishing · SaaS',
    years: '2026 · v2 rewrite',
    summary:
      'A publishing system for social media. Upload content once, set the rules, and it keeps publishing across Facebook, Instagram, Threads, YouTube, TikTok, X, LinkedIn, Pinterest and Bluesky, then reads the analytics back.',
    why: 'We had the same problem. We had the content, we just weren’t publishing it consistently. So we started batching it: upload, set the format, set the tone, schedule, then let the system keep publishing.',
    problem:
      'Creators and agencies make plenty of content. What eats the week is everything after: writing a caption for each platform, picking the page, choosing the date, re-uploading the same file nine times, then doing it again tomorrow.',
    built:
      'A multi-network publishing platform with bulk campaigns from a folder or CSV, recurring schedules and automatic reposts, AI captions drafted from the media itself, a visual builder for comment auto-replies, and brand workspaces with roles and 2FA.',
    outcome:
      'Version two replaced the original Laravel app with a multi-tenant NestJS and Next.js platform built for many brands and background publishing at scale. Right now it runs our own publishing in-house. Public access comes later.',
    numbers: [
      { value: '9', label: 'networks it publishes to, with analytics read back' },
      { value: '16', label: 'background queues across five worker groups' },
      { value: '36', label: 'tools behind the AI agent and MCP server' },
      { value: '12', label: 'AI chat providers, with failover' },
    ],
    highlights: [
      {
        title: 'Batch campaigns',
        body: 'Drop in a folder or a CSV and turn 50 pieces of content into a publishing queue.',
        icon: 'layers',
      },
      {
        title: 'Schedules that keep going',
        body: 'Time slots in the campaign’s timezone, catch-up rules and automatic re-publishing.',
        icon: 'calendar',
      },
      {
        title: 'Captions from the content',
        body: 'AI looks at the image or sampled video frames before it writes a word.',
        icon: 'eye',
      },
      {
        title: 'Saved brand voice',
        body: 'Tone and caption format are set once and applied to every post.',
        icon: 'pen',
      },
      {
        title: 'Comment workflows',
        body: 'A visual builder that answers comments in brand voice, with risky ones sent to a person.',
        icon: 'chat',
      },
      {
        title: 'Nothing runs unapproved',
        body: 'The AI agent stops at anything that costs credits or changes data.',
        icon: 'shield',
      },
    ],
    audience: ['Agencies', 'Marketing teams', 'Social media managers', 'Founders and creators'],
    stack: ['Next.js', 'NestJS', 'PostgreSQL', 'Redis', 'BullMQ', 'Drizzle', 'Stripe', 'Docker'],
    related: [
      { slug: 'vibemonk', note: 'Designed and built with Vibemonk' },
      { slug: 'sentosh', note: 'Part of the Sentosh portfolio' },
    ],
    sources: [
      { label: 'ucontents.com', href: 'https://ucontents.com' },
      { label: 'Vibemonk case study', href: 'https://www.vibemonk.com/work/ucontents' },
    ],
  },

  dotmirror: {
    category: 'Link building · Digital PR · White-label SEO',
    years: 'Since 2019',
    summary:
      'White-label link building and digital PR. Agencies resell it under their own name at wholesale rates, and brands buy it direct, to rank in Google and get named in AI answers.',
    problem:
      'It isn’t a backlink problem, it’s an authority problem. Agencies sell SEO they can’t staff, and most link inventory on the market (marketplaces, PBNs, link farms) puts the client’s domain at risk.',
    built:
      'A delivery operation across four pillars: link building, digital PR, local SEO and AI SEO. Every placement is hand-pitched to real editors, approved by the client before outreach and reported with live URL, anchor and index status, unbranded or in the agency’s own identity.',
    outcome:
      'Running since 2019 for 20+ agencies and their clients, plus brands buying direct. Plans are month to month with a 90-day money-back guarantee, and every link stays the client’s.',
    numbers: [
      { value: '12,400+', label: 'links placed since 2019' },
      { value: 'DR 70+', label: 'average publication authority' },
      { value: '98%', label: 'on-time delivery' },
      { value: '0', label: 'penalized client domains' },
    ],
    highlights: [
      {
        title: 'Link building',
        body: 'Guest posts and niche edits on DR 40–90 publications with real traffic.',
        icon: 'globe',
      },
      {
        title: 'Digital PR',
        body: 'Campaigns and distribution to 400+ newsrooms, live in 5–7 days.',
        icon: 'megaphone',
      },
      {
        title: 'Local SEO',
        body: 'Citations, Google Business Profile and local links for the Map Pack.',
        icon: 'map',
      },
      {
        title: 'AI SEO',
        body: 'Getting named when buyers ask ChatGPT, Perplexity, Gemini and AI Overviews.',
        icon: 'spark',
      },
      {
        title: 'Truly white-label',
        body: 'Unbranded reports, NDA on request, and no contact with the end client.',
        icon: 'shield',
      },
      {
        title: 'You approve everything',
        body: 'Site, anchor and draft signed off before outreach. Live in 14–21 days.',
        icon: 'check',
      },
    ],
    audience: [
      'SEO and marketing agencies',
      'Web design agencies',
      'Resellers',
      'SaaS companies and startups',
    ],
    related: [{ slug: 'sentosh', note: 'Part of the Sentosh portfolio' }],
    sources: [{ label: 'dotmirror.com', href: 'https://dotmirror.com' }],
  },

  routehook: {
    category: 'AI API gateway',
    years: '2026',
    summary:
      'One API, one key and one prepaid balance for text, image, video, audio and embedding models from every major provider, priced below what the providers charge.',
    problem:
      'Using several AI providers means several integrations, keys and invoices, and switching models usually means rewriting code. Image and video models add another problem: a generation can run for minutes, fail halfway, and still has to be billed correctly.',
    built:
      'A gateway that speaks the OpenAI and Anthropic wire formats, with provider adapters behind it, async jobs for image and video, per-key rate limits, routing and failover between providers, a hold-then-settle billing ledger, a customer dashboard with a live playground, and an admin console.',
    outcome:
      'Live at routehook.ai with a public model catalogue and published per-request pricing. No monthly fee: add $5 of credit and pay per request.',
    numbers: [
      { value: '50+', label: 'models behind one key' },
      { value: '11', label: 'provider adapters behind one endpoint' },
      { value: '3', label: 'wire formats: Chat Completions, Responses, Anthropic Messages' },
      { value: '5', label: 'routing strategies per model' },
    ],
    highlights: [
      {
        title: 'Drop-in compatible',
        body: 'Keep the OpenAI library you use. Change the address and the key, and that’s it.',
        icon: 'code',
      },
      {
        title: 'Below list price',
        body: 'Every model priced next to the provider’s own rate, so the savings are checkable.',
        icon: 'tag',
      },
      {
        title: 'Every kind of model',
        body: 'Text, image, video, audio and embeddings from OpenAI, Anthropic, Google, xAI and more.',
        icon: 'grid',
      },
      {
        title: 'Long jobs, handled',
        body: 'Image and video run as queued jobs with webhooks and failover.',
        icon: 'repeat',
      },
      {
        title: 'Spend caps per key',
        body: 'A runaway bug stops at your limit, not on your bill. Never billed twice.',
        icon: 'receipt',
      },
      {
        title: 'Private by default',
        body: 'Provider keys sealed with AES-256-GCM. Prompts are never used for training.',
        icon: 'lock',
      },
    ],
    audience: ['Developers building AI products', 'Teams using several AI providers'],
    stack: [
      'Next.js',
      'NestJS',
      'PostgreSQL',
      'Redis',
      'Drizzle',
      'Stripe',
      'better-auth',
      'Docker',
    ],
    related: [{ slug: 'vibemonk', note: 'Designed and built with Vibemonk' }],
    sources: [
      { label: 'routehook.ai', href: 'https://routehook.ai' },
      { label: 'Vibemonk case study', href: 'https://www.vibemonk.com/work/routehook' },
    ],
  },

  clipmesh: {
    category: 'AI video studio · Desktop app',
    years: '2026',
    summary:
      'A desktop studio that turns an idea into a post-ready faceless video. AI writes the script and the voiceover, matches footage to every line and adds word-timed captions, and it all renders on your own PC.',
    problem:
      'Faceless channels run on volume: a script, a voiceover, matching footage, captions and an export for every video, on every channel. Doing that by hand is slow, and cloud tools add watermarks, render queues and monthly render limits.',
    built:
      'A Tauri desktop app with a native Rust GPU renderer, AI script writing, text-to-speech voiceovers, automatic footage matching from the voiceover, semantic clip search and a multi-track timeline, backed by a cloud API for accounts, credits and payments.',
    outcome:
      'Released for Windows and Apple Silicon Macs, with downloads at clipmesh.ai. Free to start, with new tools shipping every month.',
    numbers: [
      { value: '7', label: 'voice engines: three on the device, four in the cloud' },
      { value: '31', label: 'caption style presets' },
      { value: '12', label: 'language-model providers, including a local one' },
      { value: '21', label: 'tools on the MCP server' },
    ],
    highlights: [
      {
        title: 'AI script writer',
        body: 'Hook-first scripts in 34 types, with the hook graded before anything is recorded.',
        icon: 'pen',
      },
      {
        title: 'AI voiceover',
        body: 'Lifelike voices in 30+ languages. No mic, no retakes.',
        icon: 'mic',
      },
      {
        title: 'AI footage director',
        body: 'Reads the voiceover and drops matching b-roll onto the timeline for every line.',
        icon: 'video',
      },
      {
        title: 'Word-by-word captions',
        body: 'Transcribed on the device and frame-synced, in bold animated styles.',
        icon: 'chat',
      },
      {
        title: 'Renders on your PC',
        body: 'Your GPU does the work: no uploads, no render queue, unlimited exports.',
        icon: 'cpu',
      },
      {
        title: 'Bring your own AI',
        body: 'Use credits, your own API keys, or local models through Ollama for free.',
        icon: 'key',
      },
    ],
    audience: [
      'Faceless creators on YouTube, TikTok and Reels',
      'People running several niche channels',
      'Small content teams',
    ],
    stack: ['Tauri', 'Rust', 'Next.js', 'NestJS', 'PostgreSQL', 'Qdrant', 'Whisper', 'Stripe'],
    related: [{ slug: 'vibemonk', note: 'Designed and built with Vibemonk' }],
    sources: [
      { label: 'clipmesh.ai', href: 'https://clipmesh.ai' },
      { label: 'Vibemonk case study', href: 'https://www.vibemonk.com/work/clipmesh' },
    ],
  },

  sentosh: {
    category: 'AI growth studio',
    years: 'Since 2021',
    summary:
      'A studio that designs AI-powered systems to help startups grow: SEO and content that bring in traffic, automations that remove repetitive work, and the infrastructure that keeps operations running.',
    problem:
      'Startups usually run marketing, operations and execution as separate tasks. Founders end up managing the chaos between them instead of making the decisions that matter.',
    built:
      'One connected system across three service lines: Growth (AI SEO, link building, content), Automation (AI tools, internal tools, workflows) and Infrastructure (business systems, data, integrations). Each engagement runs Discover, Design, then Scale, and ends with a documented handover.',
    outcome:
      'Running since 2021 with 27 projects in the index, including DotMirror, Automatosh and uContents. Now taking projects for Q3–Q4 2026.',
    numbers: [
      { value: '2021', label: 'running since' },
      { value: '27', label: 'projects in the index' },
      { value: '3', label: 'service lines: growth, automation, infrastructure' },
      { value: '24h', label: 'average reply time' },
    ],
    highlights: [
      {
        title: 'Growth',
        body: 'AI-powered SEO, content and link building that turn traffic into leads.',
        icon: 'chart',
      },
      {
        title: 'Automation',
        body: 'Workflows and AI tools that save the team time and cut repetitive tasks.',
        icon: 'bolt',
      },
      {
        title: 'Infrastructure',
        body: 'Business systems, data and integrations, built once to run for years.',
        icon: 'layers',
      },
      {
        title: 'Build once, run for years',
        body: 'Everything is documented and designed to keep working after the project ends.',
        icon: 'book',
      },
      {
        title: 'Automation done right',
        body: 'Every step in a workflow has a clear purpose, or it gets removed.',
        icon: 'target',
      },
      {
        title: 'A clear process',
        body: 'Discover in weeks 1–2, design in weeks 3–6, then launch and scale from week 7.',
        icon: 'compass',
      },
    ],
    audience: ['Startups', 'Software companies', 'Fast-growing digital teams'],
    related: [
      { slug: 'dotmirror', note: 'AI-powered link building, from the Sentosh portfolio' },
      { slug: 'ucontents', note: 'Content and social operations, from the Sentosh portfolio' },
    ],
    sources: [{ label: 'sentosh.com', href: 'https://sentosh.com' }],
  },

  vibemonk: {
    category: 'Product studio · Software, automation & AI',
    summary:
      'A studio that turns business problems into working software: custom apps, SaaS, AI automation, integrations and upgrades, scoped, built and supported by one team.',
    problem:
      'Most businesses run on messy workflows held together by people copying data between tools. Freelancers usually cover one specialism, and agencies put several people between you and the code.',
    built:
      'Five ways to help: Discover what should be built, Build it, Automate the repetitive work, Connect the systems, and Evolve existing software. Every project gets a written scope and a fixed quote, ships in small visible releases, and is deployed to accounts the client owns.',
    outcome:
      'Six products of its own run in production, including uContents, ClipMesh and Routehook. It works with agencies and SMBs across Europe, North America and APAC.',
    numbers: [
      { value: '6', label: 'products of its own running in production' },
      { value: '5', label: 'steps, from understanding to improving' },
      { value: '1 day', label: 'to reply to a new brief' },
      { value: 'Fixed', label: 'quote for the agreed scope' },
    ],
    highlights: [
      {
        title: 'Custom software',
        body: 'Web apps, portals and APIs built around how the team actually works.',
        icon: 'monitor',
      },
      {
        title: 'AI automation',
        body: 'Agents that read, decide and write, with unclear cases sent to a person.',
        icon: 'bolt',
      },
      {
        title: 'Integrations',
        body: 'CRMs, helpdesks, billing and databases made to work as one system.',
        icon: 'repeat',
      },
      {
        title: 'Talk to the builder',
        body: 'The engineer on the first call scopes it, writes the code and supports it.',
        icon: 'user',
      },
      {
        title: 'Your code, your accounts',
        body: 'Repository, credentials and docs all live on accounts in the client’s name.',
        icon: 'key',
      },
      {
        title: 'Fixed price',
        body: 'A written scope and a fixed quote before work starts. Starting prices are public.',
        icon: 'receipt',
      },
    ],
    audience: ['Agencies', 'Small and mid-sized businesses', 'Teams replacing manual workflows'],
    stack: [
      'TypeScript',
      'Next.js',
      'NestJS',
      'PostgreSQL',
      'Redis',
      'Tauri',
      'Rust',
      'Docker',
      'Stripe',
      'Anthropic',
      'OpenAI',
      'MCP',
    ],
    related: [
      { slug: 'ucontents', note: 'Social media publishing platform' },
      { slug: 'clipmesh', note: 'AI video studio' },
      { slug: 'routehook', note: 'AI API gateway' },
    ],
    sources: [{ label: 'vibemonk.com', href: 'https://www.vibemonk.com' }],
  },

  mentosuncle: {
    category: 'YouTube channel · Bangla comedy & parody songs',
    years: '2017–2020',
    summary:
      'My YouTube channel of Bangla comedy songs: parodies of popular tracks, original funny songs and rap about exams, results, the summer heat, Eid, gaming and everyday life.',
    problem:
      'The idea was simple: take the everyday things everyone in Bangladesh complains about (exams and results, the heat, Eid salami, Free Fire, a girlfriend who doesn’t exist) and turn them into songs people want to share.',
    built:
      '30 videos: parodies of tracks like Dilbar Dilbar and Coca Cola Tu, original comedy songs about school life and festivals, a few rap tracks, and short films.',
    outcome:
      'I ran the channel from 2017 to 2020. It’s still up and still watched: 257K subscribers and over 46 million views, with Gorom Er Song alone past 40 million.',
    numbers: [
      { value: '257K', label: 'subscribers' },
      { value: '46M+', label: 'total channel views' },
      { value: '40M', label: 'views on Gorom Er Song' },
      { value: '30', label: 'videos' },
    ],
    highlights: [
      {
        title: 'Gorom Er Song · 40M views',
        body: 'A Dilbar Dilbar parody about the Bangladeshi summer heat. The channel’s biggest hit.',
        icon: 'music',
      },
      {
        title: 'Free Fire Song · 1.6M views',
        body: 'A funny song about Free Fire gameplay.',
        icon: 'play',
      },
      {
        title: 'Kamla Song · 1.1M views',
        body: 'A Coca Cola Tu parody.',
        icon: 'mic',
      },
      {
        title: 'Kipta Song · 678K views',
        body: 'A comedy song about the stingy friend everybody has.',
        icon: 'heart',
      },
      {
        title: 'HSC Exam Song · 588K views',
        body: 'One of several songs about exams and results.',
        icon: 'book',
      },
      {
        title: 'Rap and short films',
        body: 'Original rap like O Meye and TikTok Diss Track, plus a few short awareness videos.',
        icon: 'video',
      },
    ],
    audience: [
      'Students in Bangladesh',
      'Young Bangla-speaking audiences',
      'Anyone who needs a laugh',
    ],
    sources: [{ label: 'youtube.com/@mentosuncle', href: 'https://www.youtube.com/@mentosuncle' }],
  },
};
