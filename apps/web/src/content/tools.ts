import type { Accent, IconName } from '@shimanto/ui';

export type ToolKind = 'Chrome extension' | 'Desktop app' | 'Web app' | 'Script' | 'Template';

export interface ToolImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

/** One tool inside a bigger app, shown with its own screenshot when it has one. */
export interface ToolboxItem {
  name: string;
  body: string;
  icon: IconName;
  /** Two to four specifics, shown as a checklist next to the screenshot. */
  points?: string[];
  shot?: ToolImage;
}

/** A group of tools inside an app (Video, Voice...), each in its own world colour. */
export interface ToolboxGroup {
  id: string;
  title: string;
  blurb: string;
  icon: IconName;
  tone: Accent;
  items: ToolboxItem[];
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
  /** Public source code, for an open-source tool. */
  source?: string;
  /** What it runs on, for search engines. Defaults to 'Chrome'. */
  os?: string;
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
  /** For an app with many tools inside: every one of them, grouped. Replaces the capability grid. */
  toolbox?: ToolboxGroup[];
  /** What runs the AI, on the user's own machine. */
  engines?: Array<{ job: string; name: string; size: string; note: string; icon: IconName }>;
  faq?: Array<{ q: string; a: string }>;
}

/** A 1440×900 DotMate screenshot. */
const dotmateShot = (name: string, alt: string): ToolImage => ({
  src: `/tools/dotmate/${name}.png`,
  alt,
  width: 1440,
  height: 900,
});

export const priceLabel = (tool: Tool) => tool.price ?? 'Free';

/** Newest first. */
export const tools: Tool[] = [
  {
    slug: 'dotmate',
    name: 'DotMate',
    kind: 'Desktop app',
    tagline:
      'A free, offline toolbox for creators: clip, trim and merge videos, make voiceovers, transcribe and write scripts, all on your own PC.',
    intro:
      'Twelve video, voice and AI tools in one small desktop app. No account, no subscription, no cloud: your files never leave your computer, and every tool except the downloader works offline. Open source under the MIT licence.',
    href: 'https://github.com/shimentosh/dotmate/releases/latest',
    cta: 'Download free',
    source: 'https://github.com/shimentosh/dotmate',
    os: 'Windows, macOS',
    logo: {
      src: '/tools/dotmate/icon.png',
      alt: 'DotMate logo',
      width: 256,
      height: 256,
    },
    screenshots: [
      {
        src: '/tools/dotmate/home.png',
        alt: 'DotMate home screen with its video, voice, writing and download tools',
        width: 1440,
        height: 900,
      },
      {
        src: '/tools/dotmate/quick-trim.png',
        alt: 'Quick Trim marking short clips across long recordings for batch export',
        width: 1440,
        height: 900,
      },
      {
        src: '/tools/dotmate/carousel-video.png',
        alt: 'Carousel Video mixing images and clips with cinematic transitions and music',
        width: 1440,
        height: 900,
      },
      {
        src: '/tools/dotmate/text-to-voice.png',
        alt: 'AI Voiceover turning a script into speech with offline Kokoro voices',
        width: 1440,
        height: 900,
      },
      {
        src: '/tools/dotmate/script-writer.png',
        alt: 'Script Writer drafting a video script with a local LLM',
        width: 1440,
        height: 900,
      },
      {
        src: '/tools/dotmate/video-downloader.png',
        alt: 'Video Downloader pulling videos from YouTube, TikTok and more with yt-dlp',
        width: 1440,
        height: 900,
      },
      {
        src: '/tools/dotmate/clip-merger.png',
        alt: 'Clip Merger pairing main clips with B-roll and background music',
        width: 1440,
        height: 900,
      },
    ],
    tone: 'signal',
    tags: ['Open source', 'Video editing', 'Local AI', 'Creators'],
    capabilities: [
      {
        title: 'Batch clips',
        body: 'Mark hundreds of short moments across long recordings and export them all at source quality.',
        icon: 'video',
      },
      {
        title: 'Trim and merge',
        body: 'Batch-trim whole files, or pair main clips with random B-roll and background music.',
        icon: 'layers',
      },
      {
        title: 'Images to video',
        body: 'Slideshows and carousels with 18 cinematic transitions, effects, watermark and music.',
        icon: 'play',
      },
      {
        title: 'AI voiceover',
        body: 'Offline text-to-speech with natural Kokoro voices, one script or hundreds at once.',
        icon: 'mic',
      },
      {
        title: 'Speech to text',
        body: 'Transcribe audio, video or your mic on-device with Whisper.',
        icon: 'file',
      },
      {
        title: 'Script writer',
        body: 'Long and short video scripts from a local LLM, sent straight to the voiceover tool.',
        icon: 'pen',
      },
      {
        title: 'Video downloader',
        body: 'YouTube, TikTok, Instagram, X and 1000+ more sites, including playlists, via yt-dlp.',
        icon: 'download',
      },
      {
        title: 'Audio toolkit',
        body: 'Merge, loop or pull MP3 and WAV audio out of any audio or video file.',
        icon: 'music',
      },
    ],
    features: [
      '12 tools in a ~12 MB installer, built on Tauri 2 and Rust',
      'Hardware-accelerated encoding through WebCodecs where supported',
      'Guided first-run setup for FFmpeg, yt-dlp and AI models',
      'Re-downloads FFmpeg or yt-dlp automatically if one goes missing',
      'Render dock keeps exports visible while you switch tools',
      'A guard that stops you losing a running export',
      'Install, change or remove models any time in Settings',
      'Light and dark themes, minimise to tray',
    ],
    audience: [
      'YouTubers cutting long streams and recordings into Shorts',
      'Faceless channels making scripts and voiceovers at scale',
      'Reels and TikTok creators building carousels and slideshows',
      'Anyone who wants creator tools without subscriptions or uploads',
    ],
    privacy:
      'Everything runs on your own computer. Your videos, audio and scripts are never uploaded, there is no account and no telemetry. The AI models download once, then work offline.',
    facts: [
      { term: 'Works on', value: 'Windows, macOS' },
      { term: 'Licence', value: 'MIT, open source' },
      { term: 'Account needed', value: 'None' },
    ],
    toolbox: [
      {
        id: 'video',
        title: 'Video',
        blurb: 'Cut, combine and build videos in batches, at the quality you recorded them.',
        icon: 'video',
        tone: 'signal',
        items: [
          {
            name: 'Quick Trim',
            icon: 'video',
            body: 'Turn long recordings into hundreds of short clips, or batch-trim whole files with one range.',
            points: [
              'Batch Clips: mark as many 2.5 s moments as you like, then slide, resize or edit any clip',
              'Exports clip_001.mp4 … clip_500.mp4 at the source resolution and frame rate',
              'Trim Files: one draggable range for a whole batch of videos',
              'Your originals are only read, never changed or uploaded',
            ],
            shot: dotmateShot(
              'quick-trim',
              'Quick Trim: import long videos, mark moments, add clips, export them all',
            ),
          },
          {
            name: 'Clip Merger',
            icon: 'layers',
            body: 'Pair your main clips with random B-roll and background music, in batches.',
            points: [
              'Separate drop zones for main clips, B-roll and music',
              'Aspect-ratio presets for Shorts, Reels and YouTube',
              'A merge queue, so many outputs build in one go',
            ],
            shot: dotmateShot(
              'clip-merger',
              'Clip Merger with main clips, B-roll, background music and a merge queue',
            ),
          },
          {
            name: 'Image to Video',
            icon: 'play',
            body: 'Turn a folder of photos into a polished slideshow video.',
            points: [
              'Transitions, effects and colour adjustment',
              'A styled progress bar and your own watermark',
              'Background music, 9:16 or any size, with a live preview',
            ],
            shot: dotmateShot(
              'image-to-video',
              'Image to Video: images, a live 9:16 preview and the styling panel',
            ),
          },
          {
            name: 'Carousel Video',
            icon: 'grid',
            body: 'Mix images and clips into carousels made for Reels, Shorts and TikTok.',
            points: [
              '18 cinematic transitions and a dozen layout styles',
              'Transition sound effects and background audio',
              'Colour adjustment and slide templates',
            ],
            shot: dotmateShot(
              'carousel-video',
              'Carousel Video with its layout styles: full screen, 3D carousel, polaroid and more',
            ),
          },
          {
            name: 'File Shuffler',
            icon: 'repeat',
            body: 'Randomise the names, order and dates of video files, then export them as a ZIP or into a folder.',
          },
        ],
      },
      {
        id: 'voice',
        title: 'Audio & voice',
        blurb: 'Voiceovers and transcripts from AI that runs on your own computer.',
        icon: 'mic',
        tone: 'create',
        items: [
          {
            name: 'AI Voiceover',
            icon: 'mic',
            body: 'Text-to-speech on your PC, with no credits and no character limits.',
            points: [
              '10 natural Kokoro voices, plus 10 optional Supertonic voices',
              'Speed control, one script or many, saved as WAV',
              'Runs offline once the voices are downloaded',
            ],
            shot: dotmateShot(
              'text-to-voice',
              'AI Voiceover: pick a Kokoro voice, paste a script, generate speech',
            ),
          },
          {
            name: 'Speech to Text',
            icon: 'file',
            body: 'Transcribe audio, video or a microphone recording, privately, on-device.',
            points: [
              'Whisper tiny, base or small: pick speed or accuracy',
              'Auto-detects the language, or record straight from the mic',
              'MP3, WAV, M4A, FLAC, MP4 and more',
            ],
            shot: dotmateShot(
              'speech-to-text',
              'Speech to Text with the on-device Whisper engine and a record button',
            ),
          },
          {
            name: 'Bulk Voice',
            icon: 'list',
            body: 'Turn many scripts into many voice files in a single run.',
          },
          {
            name: 'Audio Toolkit',
            icon: 'music',
            body: 'Merge, loop or extract MP3 and WAV audio from any audio or video file.',
          },
        ],
      },
      {
        id: 'writing',
        title: 'Writing',
        blurb: 'Scripts and prompts from a local LLM, with nothing sent to the cloud.',
        icon: 'pen',
        tone: 'idea',
        items: [
          {
            name: 'Script Writer',
            icon: 'pen',
            body: 'Long-form YouTube and short-form video scripts, streamed as they’re written.',
            points: [
              'Tone, point of view, duration and structure controls',
              '“Viral mode” for open loops and curiosity gaps',
              'Sends the script straight to AI Voiceover',
            ],
            shot: dotmateShot(
              'script-writer',
              'Script Writer with tone, point of view, duration and structure controls',
            ),
          },
          {
            name: 'Script to Image Prompts',
            icon: 'spark',
            body: 'Split a script into scenes and write a matching image-generation prompt for each one.',
          },
        ],
      },
      {
        id: 'download',
        title: 'Download',
        blurb: 'Grab your source material from almost anywhere.',
        icon: 'download',
        tone: 'build',
        items: [
          {
            name: 'Video Downloader',
            icon: 'download',
            body: 'Download video or audio from YouTube, TikTok, Instagram, X and 1000+ more sites.',
            points: [
              'Up to 4K, as MP4, WebM or MKV, or audio only',
              'Paste many links at once, playlists included',
              'Download just a section of a long video',
              'Optional cookies.txt for sites that need a login',
            ],
            shot: dotmateShot(
              'video-downloader',
              'Video Downloader with format, quality, file type and clip section options',
            ),
          },
        ],
      },
    ],
    engines: [
      {
        job: 'Speech to text',
        name: 'Whisper',
        size: '75–466 MB',
        note: 'whisper.cpp, in tiny, base or small',
        icon: 'file',
      },
      {
        job: 'Text to speech',
        name: 'Kokoro-82M',
        size: '~330 MB',
        note: 'Through sherpa-onnx, with optional Supertonic voices',
        icon: 'mic',
      },
      {
        job: 'Script writing',
        name: 'Ollama',
        size: 'Your choice',
        note: 'Llama 3.2, Qwen 2.5 or any chat model',
        icon: 'cpu',
      },
      {
        job: 'Script writing',
        name: 'Claude Code, Codex, Gemini',
        size: 'Already installed',
        note: 'Detected automatically and run read-only in a scratch folder',
        icon: 'code',
      },
    ],
    faq: [
      {
        q: 'Is it really free?',
        a: 'Yes. It’s open source under the MIT licence: no credits, watermarks, accounts or paid tiers.',
      },
      {
        q: 'Does it work offline?',
        a: 'Yes. After the first-run download of FFmpeg and the models you choose, every tool except the Video Downloader works without internet.',
      },
      {
        q: 'Do I need a powerful GPU?',
        a: 'No. Whisper and Kokoro run on a normal CPU. Ollama is faster with a GPU, but small models like Llama 3.2 3B work on most modern laptops.',
      },
      {
        q: 'Is it a CapCut, Descript or ElevenLabs alternative?',
        a: 'For everyday jobs like batch trimming, slideshows, carousels, voiceovers and transcripts, yes, and it runs offline. It isn’t a full timeline editor.',
      },
      {
        q: 'Windows says “Windows protected your PC”. Is it safe?',
        a: 'Releases aren’t code-signed yet, so SmartScreen warns about every new version. Click More info, then Run anyway. Or build it yourself from the source.',
      },
      {
        q: 'Does it run on Linux or Intel Macs?',
        a: 'Not yet. Windows 10/11 and Apple Silicon Macs have downloads today; Intel Mac and Linux builds are on the roadmap.',
      },
    ],
  },
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
