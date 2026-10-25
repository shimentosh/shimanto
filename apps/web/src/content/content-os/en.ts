import type { ContentOsCopy } from './types';

export const en: ContentOsCopy = {
  meta: {
    title: 'Content OS: the content bot that knows your brand',
    description:
      'Tell Content OS what to post. It makes carousels, text posts, graphics, reels and YouTube videos in your brand, checks them, and hands you files ready to post. {price}, one-time, lifetime updates.',
  },

  nav: {
    links: [
      { href: '#makes', label: 'What it makes' },
      { href: '#demos', label: 'Demos' },
      { href: '#how', label: 'How it works' },
      { href: '#pricing', label: 'Pricing' },
      { href: '#faq', label: 'FAQ' },
    ],
    buy: 'Get it · {price}',
  },

  hero: {
    badge: 'Meet Content OS · your content bot',
    title: { line1: 'Tell it what to post.', line2: 'It makes it.' },
    intro:
      'Content OS is a content bot that knows your brand: your voice, your audience, your colours and everything you posted before. Ask for carousels, text posts, reels or a YouTube video, and get finished, checked files ready to post. For every page you run.',
    buy: 'Get Content OS · {price}',
    watch: 'Watch it work',
    points: [
      { text: 'One-time payment', icon: 'tag' },
      { text: 'Lifetime updates', icon: 'repeat' },
      { text: 'Runs on your computer', icon: 'monitor' },
      { text: 'Your files, your data', icon: 'lock' },
    ],
    stats: [
      { value: '{videos}', label: 'video demos', icon: 'video' },
      { value: '39', label: 'design layouts', icon: 'grid' },
      { value: '7', label: 'platforms', icon: 'globe' },
      { value: '28', label: 'quality checks', icon: 'shield' },
    ],
    videoLabel: 'Play the Content OS story (1 min 44 s, no sound)',
    videoCaption: 'The 100-second story: one idea, from the first question to approved posts.',
  },

  bot: {
    name: 'Content OS',
    status: 'knows 3 brands',
    placeholder: 'Ask for a carousel, a post, a reel…',
    you: 'You',
    label:
      'An example chat: you ask Content OS for a carousel, a reel, a text post or a YouTube video, it reads your brand and history, and replies with the finished files.',
    pause: 'Pause the chat',
    play: 'Play the chat',
    chats: [
      {
        chip: 'Carousel',
        prompt: 'Make a carousel about 5 tasks I should never hand to AI',
        steps: [
          'Reading your brand notebook',
          'Checking the last 30 posts so it doesn’t repeat',
          '3 concepts scored, the strongest picked',
          '9 slides designed and checked',
        ],
        reply: 'Done: 9 slides, 2 cover options, caption and hashtags. QA passed.',
        show: 'carousel',
      },
      {
        chip: 'Reel',
        prompt: 'Turn my new offer into a 45-second reel',
        steps: [
          'Script in your voice',
          'Storyboard: 6 scenes',
          'Rendered at 9:16, safe areas checked',
        ],
        reply: 'Your reel is ready. Want a 16:9 cut for YouTube too?',
        show: 'reel',
      },
      {
        chip: 'Text post',
        prompt: 'Write today’s post. Something from my real work',
        steps: [
          'Found it in your experiences log',
          'Hook under 12 words',
          'Graphic in your template, caption with 4 hashtags',
        ],
        reply: 'Post and graphic ready. No invented facts: it’s from your own notes.',
        show: 'post',
      },
      {
        chip: 'YouTube',
        prompt: 'Make a YouTube explainer for my channel',
        steps: ['Format picked from 59 landscape formats', 'Chapters, thumbnail, end screen'],
        reply: 'Rendered at 16:9. Three Shorts cut from it, too.',
        show: 'youtube',
      },
    ],
  },

  makes: {
    eyebrow: 'What it makes',
    title: 'One bot. Every kind of post.',
    rest: 'Here’s exactly what you can ask for.',
    kinds: [
      {
        title: 'Carousels',
        body: 'Swipe posts that teach, list or tell a story: a scroll-stopping cover, 6–10 slides, a clear ask at the end.',
        examples: ['Instagram 4:5', 'LinkedIn document', 'Facebook', '2–3 cover options'],
        icon: 'grid',
        tone: 'build',
      },
      {
        title: 'Text posts',
        body: 'Posts and threads in your voice, with a hook under 12 words, a CTA line and exactly four hashtags.',
        examples: ['LinkedIn post', 'X thread', 'Facebook post', 'Threads'],
        icon: 'pen',
        tone: 'signal',
      },
      {
        title: 'Graphics',
        body: 'Single images in your brand kit, from 30 templates: quotes, stories, announcements, tweet cards and more.',
        examples: ['Image post', 'Quote', 'Story 9:16', 'Announcement'],
        icon: 'palette',
        tone: 'idea',
      },
      {
        title: 'Reels & short videos',
        body: 'Script, voice, scenes and a finished render with motion blur, in 80+ vertical formats.',
        examples: ['Instagram Reel', 'TikTok', 'YouTube Short', 'Facebook Reel'],
        icon: 'video',
        tone: 'create',
      },
      {
        title: 'YouTube videos',
        body: 'Landscape explainers, breakdowns, tutorials and stories in 59 channel formats, with a thumbnail.',
        examples: ['Explainer', 'Tutorial', 'Case study', 'Thumbnail'],
        icon: 'play',
        tone: 'spark',
      },
      {
        title: 'Voice, music & images',
        body: 'Optional: your cloned voice, music beds, transcripts and AI images, used only when they’re needed.',
        examples: ['Voiceover', 'Music bed', 'Transcript', 'AI image'],
        icon: 'mic',
        tone: 'build',
      },
    ],
  },

  carousels: {
    eyebrow: 'Carousels',
    title: 'Swipe through real ones.',
    rest: 'Made by Content OS, in a real brand kit.',
    intro:
      'These carousels were made by Content OS in Shimanto’s brand kit: same fonts, colours and photos, written for an English page. Pick one and swipe.',
    pick: 'Pick a carousel',
    slideOf: 'Slide {n} of {total}',
    prev: 'Previous',
    next: 'Next',
    captionLabel: 'Caption',
    note: 'Each page gets its own language: the same carousels also run in Bangla on Shimanto’s Bangla page.',
    points: [
      { text: 'Hook, promise, pull, payoff, ask', icon: 'target' },
      { text: 'At least 3 layouts, never the same one 3 times in a row', icon: 'layers' },
      { text: '8 headline variants to choose from', icon: 'list' },
    ],
  },

  posts: {
    eyebrow: 'Text posts & graphics',
    title: 'A post a day, in your face and voice.',
    rest: 'Graphic, caption and hashtags, together.',
    intro:
      'Every post comes as a set: the graphic, the caption in your voice, and the hashtags. These come from three series in Shimanto’s brand kit, with his own photos.',
    note: 'Real posts, made with Content OS. Your photos, your brand kit, your series.',
    readMore: 'Read the caption',
    points: [
      { text: 'Your own photos and brand kit', icon: 'user' },
      { text: 'Series that keep a format', icon: 'repeat' },
      { text: 'Caption written for the platform', icon: 'pen' },
    ],
  },

  gallery: {
    eyebrow: 'Every demo',
    title: '{videos} videos. All made in code.',
    rest: 'Pick a style, press play.',
    intro:
      'Every video format Content OS can make, each with a demo for a made-up brand. Yours come out in your logo, colours and voice.',
    all: 'All',
    showMore: 'Show more',
    close: 'Close',
    vertical: '9:16',
    landscape: '16:9',
    wideToo: '16:9 too',
    note: 'Real renders, made-up brands. Hover to preview, click to watch.',
  },

  beyond: {
    eyebrow: 'Beyond the formats',
    title: 'If you can picture it,',
    rest: 'it can make it.',
    intro:
      'The 200+ formats are a starting point, not a limit. Every video is built in code, so Claude Code can build a style that doesn’t exist yet: describe it, show a reel you like, or hand it your logo. These were made that way for Dot Mirror.',
    asks: [
      'Make it look hand-painted, like a storybook',
      'Copy the pacing of this reel, not the content',
      'Turn our logo into a mascot that hosts our videos',
      'Pencil-sketch animation, one line at a time',
      'Make a 3D model from this product photo',
      'Newsroom-style explainer with cut-out collage',
    ],
    styles: [
      {
        id: 'hand-painted',
        title: 'Hand-painted',
        body: 'Brush strokes and paper texture, frame by frame.',
      },
      {
        id: 'collage-broll',
        title: 'Collage b-roll',
        body: 'Halftone cut-outs and sliding paper layers.',
      },
      {
        id: 'film-style',
        title: 'Editorial film',
        body: 'Magazine type and calm, cinematic pacing.',
      },
      {
        id: 'newsroom-explainer',
        title: 'Newsroom explainer',
        body: 'Ransom-note type over moving cut-outs.',
      },
      {
        id: 'handdraw-story',
        title: 'Pencil story',
        body: 'A sketchbook story drawn as it plays.',
      },
      {
        id: 'image-to-3d',
        title: 'Photo to 3D',
        body: 'One product photo becomes a spinning 3D model.',
      },
      {
        id: 'code-animation',
        title: 'UI motion',
        body: 'Product moments animated straight from code.',
      },
      {
        id: 'shot-recipe',
        title: 'Shot recipes',
        body: 'Camera moves from a library of 124 recipes.',
      },
      {
        id: 'anidoodle',
        title: 'Doodle animation',
        body: 'Hand-drawn doodles that bounce to life.',
      },
      { id: 'dream-loop', title: 'Dream loop', body: 'Soft line art that loops forever.' },
    ],
    host: {
      title: 'Your logo, as a host',
      body: 'Content OS drew Mirro from the Dot Mirror logo: a model sheet, every emotion, and a host who presents the videos. Same character, every time.',
      sheet: 'Mirro’s model sheet',
      emotions: 'Every emotion Mirro can show',
    },
    note: 'Advanced styles may need optional tools or API keys; the setup guide says which.',
  },

  real: {
    eyebrow: 'Real work',
    title: 'Reels made for a real brand.',
    intro: 'Made with Content OS for Dot Mirror, posted as-is.',
  },

  memory: {
    eyebrow: 'Brand memory',
    title: 'It knows your brand.',
    rest: 'Every page gets its own brain.',
    intro:
      'Voice, audience, pillars, colours, rules and everything you posted before: Content OS keeps it all per page and reads it before every post. Switch between two real pages and watch the brain change. They never share a thing.',
    switchLabel: 'Pick a page',
    categories: [
      'Brand',
      'Audience',
      'Voice',
      'Language',
      'Positioning',
      'Pillars',
      'Products',
      'Goals',
      'Rules',
      'AI instructions',
      'Visual identity',
      'History',
      'Knowledge',
    ],
    hint: 'Drag to turn it. Click to wake it up.',
    labels: {
      voice: 'Voice',
      audience: 'Audience',
      pillars: 'Pillars',
      rule: 'A rule it follows',
      colours: 'Colours',
      fonts: 'Fonts',
      platform: 'Main platform',
      language: 'Language',
    },
    brands: [
      {
        id: 'shimanto',
        name: 'Shimanto',
        logo: 'shimanto',
        handle: '@sh1manto',
        outputs: [
          { label: 'Carousel', media: 'carousel' },
          { label: 'Post', media: 'post' },
          { label: 'Video', media: 'story' },
        ],
        platform: 'Instagram',
        colors: ['#0A7BE0', '#C6F500', '#FAFAF7', '#0C0C0E'],
        fonts: 'Anek Bangla · Hind Siliguri',
        language: 'English and Bangla',
        voice: 'Practical, honest, direct, builder-first',
        audience: 'Business builders: founders, agency owners, SaaS builders',
        pillars:
          'Business · Marketing · Building · AI + Automation · Systems & Scale · Founder journey',
        rule: 'Show real work: what I built, what broke, how I fixed it, the result.',
      },
      {
        id: 'dotmirror',
        name: 'Dot Mirror',
        logo: 'dotmirror',
        handle: '@dotmirrorltd',
        outputs: [
          { label: 'Reel', media: 'real-1' },
          { label: 'Reel', media: 'real-2' },
          { label: 'Brand host', media: 'host' },
        ],
        platform: 'LinkedIn',
        colors: ['#0057FC', '#FFFFFF', '#0B0B0E'],
        fonts: 'Inter',
        language: 'English, SEO terms kept as people say them',
        voice: 'Intelligent, confident, data-driven, analytical',
        audience: 'SaaS founders, agency owners, SEO managers, growth leads',
        pillars:
          'Competitor intelligence · Search & AI · Digital PR · Link value · Business of visibility',
        rule: 'Investigate, don’t report: data, pattern, insight, then what to do.',
      },
    ],
    note: 'Real context and real work from two pages run with Content OS.',
    visualLabel:
      'An animation of a page’s brand memory: thirteen kinds of context orbit a glowing core and flow into it, and the core sends out carousels, reels and posts in that brand’s colours.',
  },

  abilities: {
    eyebrow: 'Everything it can do',
    title: 'A whole content team.',
    rest: 'In one bot.',
    groups: [
      {
        title: 'Think',
        blurb: 'Strategy that knows what you posted, what worked and what’s missing.',
        icon: 'bulb',
        tone: 'spark',
        items: [
          { text: 'Content strategy with reasons', icon: 'target' },
          { text: 'Pillar balance and repeat checks', icon: 'chart' },
          { text: 'Research with sources', icon: 'search' },
          { text: 'News scan with a business angle', icon: 'megaphone' },
          { text: 'Series, campaigns and playbooks', icon: 'calendar' },
          { text: 'Virality tester for reels you like', icon: 'flask' },
        ],
      },
      {
        title: 'Write',
        blurb: 'In your voice, for each platform, from your real experiences.',
        icon: 'pen',
        tone: 'signal',
        items: [
          { text: 'Hooks, headlines and captions', icon: 'pen' },
          { text: 'LinkedIn posts and X threads', icon: 'list' },
          { text: 'Video scripts and storyboards', icon: 'file' },
          { text: 'Repurpose one idea for every platform', icon: 'repeat' },
          { text: 'Learns your rules with /teach', icon: 'spark' },
          { text: 'English, Bangla and more, per page', icon: 'globe' },
        ],
      },
      {
        title: 'Make',
        blurb: 'Carousels, graphics and video in your brand kit, rendered on your computer.',
        icon: 'palette',
        tone: 'create',
        items: [
          { text: 'Carousels in 39 layouts', icon: 'grid' },
          { text: 'Graphics from 30 templates', icon: 'palette' },
          { text: 'Reels, Shorts and YouTube videos', icon: 'video' },
          { text: 'Voiceover in your cloned voice', icon: 'mic' },
          { text: 'Music, sound effects, transcripts', icon: 'music' },
          { text: 'AI images, 3D models and a brand mascot', icon: 'box' },
        ],
      },
      {
        title: 'Check & ship',
        blurb: 'Nothing reaches you unchecked, and everything leaves ready to post.',
        icon: 'shield',
        tone: 'build',
        items: [
          { text: '28 quality checks, visual review', icon: 'shield' },
          { text: 'Brand guard: colours, fonts, safe areas', icon: 'eye' },
          { text: 'Fact rules: no invented numbers', icon: 'check' },
          { text: 'Export packages: media, caption, hashtags', icon: 'download' },
          { text: 'Tracker for every post on every page', icon: 'list' },
          { text: 'Optional team sync with roles', icon: 'users' },
        ],
      },
    ],
  },

  how: {
    eyebrow: 'How it works',
    title: 'You decide. The bot does the rest.',
    rest: 'Four steps from idea to a ready-to-post file.',
    steps: [
      {
        title: 'Give each page a notebook',
        body: 'Brand, audience, voice, pillars, products, goals and rules: 13 kinds of context, plus a brand kit with your logo, colours and fonts. One page never sees another’s.',
        command: '/new-page "Dot Mirror" en linkedin',
        icon: 'book',
        tone: 'build',
      },
      {
        title: 'Ask, in plain words',
        body: 'Ask in Claude Code, in VS Code. It reads the page’s history and pillar balance, your real experiences and the news, then proposes concepts with the reason for each.',
        command: '/next-post shimanto',
        icon: 'chat',
        tone: 'signal',
      },
      {
        title: 'It builds, then checks its own work',
        body: 'Carousels, posts, graphics and videos rendered on your machine, then reviewed across 28 quality checks: hooks, overflow, brand, facts, timing, audio and more.',
        command: '/carousels shimanto 10',
        icon: 'shield',
        tone: 'idea',
      },
      {
        title: 'Approve, export, post',
        body: 'See every slide, the reasoning and the QA notes in the Studio. Approve, and you get a package with the media, caption and hashtags, ready for any scheduler.',
        command: '/export shimanto <id>',
        icon: 'download',
        tone: 'spark',
      },
    ],
  },

  different: {
    eyebrow: 'Why it’s different',
    title: 'Context first.',
    rest: 'Not another prompt box.',
    items: [
      {
        title: 'Every page keeps its own memory',
        body: 'Voice, history, assets and series stay with their page. Page isolation is rule number one.',
        icon: 'book',
        tone: 'build',
      },
      {
        title: 'It learns what you like',
        body: 'Say “never use question hooks” once with /teach and it becomes a rule for that page, for good.',
        icon: 'spark',
        tone: 'spark',
      },
      {
        title: 'Your work becomes the content',
        body: 'Log what you built, what broke and how you fixed it. Ideas come from your real experiences, not from thin air.',
        icon: 'briefcase',
        tone: 'signal',
      },
      {
        title: 'No invented facts',
        body: 'Numbers, clients and stories must come from your knowledge files or from you. Stats need a real source.',
        icon: 'shield',
        tone: 'idea',
      },
      {
        title: 'Strategy, not random topics',
        body: 'Every concept says why: the pillar that’s been quiet, the pain your audience has, what worked before. Repeats are caught.',
        icon: 'target',
        tone: 'create',
      },
      {
        title: 'Plain files you own',
        body: 'No SaaS, no lock-in. Everything is readable files on your computer: easy to back up, move or version.',
        icon: 'file',
        tone: 'build',
      },
      {
        title: 'Works with the AI you already use',
        body: 'Claude Code is the brain. Codex and Gemini CLIs work too.',
        icon: 'cpu',
        tone: 'signal',
      },
      {
        title: 'Pay for AI only when it’s needed',
        body: 'An existing asset, then code, then a template, and only then a paid API. Every paid generation logs a reason.',
        icon: 'refund',
        tone: 'spark',
      },
    ],
  },

  commands: {
    eyebrow: 'Prefer shortcuts?',
    title: 'One line does a day’s work.',
    intro:
      'Plain words work. These shortcuts do the same, faster, and every button in the Studio copies the matching one for you.',
    list: [
      {
        command: '/next-post shimanto',
        does: 'Concepts for the next post, each with its reasoning',
        icon: 'bulb',
      },
      {
        command: '/carousels shimanto 10',
        does: 'Ten carousels in one batch, checked and rendered',
        icon: 'grid',
      },
      {
        command: '/video shimanto "launch day" 45s reel',
        does: 'Script, voice, scenes and a finished reel',
        icon: 'video',
      },
      {
        command: '/repurpose shimanto <id> --to linkedin-post,x-thread',
        does: 'One idea, rewritten for each platform',
        icon: 'repeat',
      },
      {
        command: '/teach shimanto "never use question hooks"',
        does: 'Feedback that becomes a lasting rule',
        icon: 'spark',
      },
      {
        command: '/experience "shipped X, Y broke, fixed with Z"',
        does: 'Your real work, saved as material',
        icon: 'briefcase',
      },
      { command: '/news', does: 'Relevant news with a business angle', icon: 'megaphone' },
      {
        command: '/qa shimanto --all --fix',
        does: 'Check everything and fix what fails',
        icon: 'shield',
      },
    ],
  },

  platforms: {
    eyebrow: 'Platforms',
    title: 'Sized and safe for every platform.',
    list: [
      {
        name: 'Instagram',
        formats: [
          { label: 'Carousel 4:5', icon: 'grid' },
          { label: 'Reel 9:16', icon: 'video' },
          { label: 'Image post', icon: 'palette' },
          { label: 'Story', icon: 'layers' },
        ],
      },
      {
        name: 'LinkedIn',
        formats: [
          { label: 'Text post', icon: 'pen' },
          { label: 'Document carousel', icon: 'file' },
          { label: 'Video', icon: 'video' },
          { label: 'Image', icon: 'palette' },
        ],
      },
      {
        name: 'X',
        formats: [
          { label: 'Post', icon: 'pen' },
          { label: 'Thread', icon: 'list' },
          { label: 'Video 16:9', icon: 'video' },
        ],
      },
      {
        name: 'Facebook',
        formats: [
          { label: 'Text post', icon: 'pen' },
          { label: 'Reel', icon: 'video' },
          { label: 'Carousel', icon: 'grid' },
        ],
      },
      { name: 'TikTok', formats: [{ label: 'Video 9:16', icon: 'video' }] },
      {
        name: 'YouTube',
        formats: [
          { label: 'Short', icon: 'video' },
          { label: 'Long video', icon: 'play' },
          { label: 'Thumbnail', icon: 'palette' },
        ],
      },
      { name: 'Threads', formats: [{ label: 'Post', icon: 'pen' }] },
    ],
    languageNote: 'Each page has its own language, including Bangla with Bangla-safe type.',
  },

  audience: {
    eyebrow: 'Who it’s for',
    title: 'Made for people who post for more than one brand.',
    list: [
      {
        title: 'Founders & creators',
        body: 'Your personal page and your company page, in two voices, without hiring a team.',
        icon: 'rocket',
        tone: 'build',
      },
      {
        title: 'Agencies & social media managers',
        body: 'Every client gets an isolated workspace with their own brand kit, rules and history.',
        icon: 'users',
        tone: 'signal',
      },
      {
        title: 'Small teams',
        body: 'Optional team sync on your own server: owners, editors and viewers, each seeing only their pages.',
        icon: 'cloud',
        tone: 'idea',
      },
    ],
  },

  pricing: {
    eyebrow: 'Pricing',
    title: 'Pay once. Keep the bot.',
    rest: 'No subscription for Content OS itself.',
    plan: 'Content OS',
    priceNote: 'One-time payment',
    included: [
      { text: 'The full Content OS source code', icon: 'code' },
      { text: 'The Studio, the engine and the cos command line', icon: 'monitor' },
      { text: '43 Claude Code skills and 18 specialist agents', icon: 'cpu' },
      { text: 'Every video format, headline and motion demo', icon: 'video' },
      { text: 'Setup guide and a health check that tells you what’s missing', icon: 'wrench' },
      { text: 'Optional team sync server you can host yourself', icon: 'cloud' },
      { text: 'Every future update, for life', icon: 'repeat' },
      { text: 'Private GitHub repository: update with one git pull', icon: 'github' },
    ],
    buy: 'Get Content OS',
    comingSoon: 'Coming soon',
    refund: {
      before:
        'Doesn’t work as described and we can’t fix it? You get a full refund within 14 days. See the ',
      link: 'refund policy',
      after: '.',
    },
  },

  requirements: {
    eyebrow: 'Before you buy',
    title: 'What you need.',
    intro:
      'Content OS runs on your own computer and uses your own AI accounts, so you know exactly what it costs to run.',
    needed: {
      title: 'Required',
      list: [
        { text: 'A Mac or Windows computer', icon: 'monitor' },
        { text: 'Node.js 22 or newer, pnpm and Git', icon: 'code' },
        {
          text: 'Claude Code in VS Code, with your own Claude plan (Codex or Gemini CLI also work)',
          icon: 'cpu',
        },
        {
          text: 'FFmpeg and Playwright’s Chromium (the setup guide installs both)',
          icon: 'wrench',
        },
        { text: 'About 20 minutes to set up', icon: 'clock' },
      ],
    },
    optional: {
      title: 'Optional: add a key, switch on a power',
      list: [
        { key: 'OpenAI', unlocks: 'AI images', icon: 'palette' },
        { key: 'ElevenLabs', unlocks: 'Voices, music, sound effects and transcripts', icon: 'mic' },
        { key: 'Fish Audio', unlocks: 'Your cloned voice', icon: 'mic' },
        { key: 'SnapGen', unlocks: 'AI video (Veo, Kling, Seedance)', icon: 'video' },
        { key: 'fal.ai', unlocks: 'Image to 3D model', icon: 'box' },
      ],
    },
    costs:
      'Without a key, that ability is simply off. Paid APIs bill your own account, and Content OS asks before it spends credits.',
  },

  faq: {
    eyebrow: 'FAQ',
    title: 'Good questions.',
    list: [
      {
        q: 'Is it a chatbot I log into?',
        a: 'It’s a bot that runs on your own computer. You talk to it in Claude Code (VS Code), and the Studio, a local web app, is where you see, review and export everything. No account, no cloud lock-in.',
      },
      {
        q: 'Do I need to know how to code?',
        a: 'No. You ask in plain words, or use short commands like /carousels or /video. The setup guide walks you through installing everything once. Being comfortable with VS Code helps.',
      },
      {
        q: 'Does it post for me?',
        a: 'No. Content OS stops at export: you get ready-to-post packages with the media, caption and hashtags, which you post yourself or load into your scheduler.',
      },
      {
        q: 'What does it cost to run?',
        a: 'Your Claude plan, plus any optional media APIs you switch on (images, voice, AI video), billed to your own accounts. Content OS itself is a one-time {price}.',
      },
      {
        q: 'How many pages or brands can I run?',
        a: 'As many as you like. Each page gets its own context, brand kit, voice, assets and history, and pages never share them.',
      },
      {
        q: 'How do I get it after buying?',
        a: 'Connect your GitHub account in your customer account and you’re invited to the private repository right away. Updates arrive with git pull.',
      },
      {
        q: 'Does it work in Bangla?',
        a: 'Yes. Each page sets its own language, and Bangla pages get Bangla-safe typography and Bangla transcription. The carousels and posts on this page also run in Bangla on Shimanto’s Bangla page.',
      },
      {
        q: 'Can my team use it?',
        a: 'Yes. An optional sync server, which you host yourself, keeps pages in sync with owner, editor and viewer roles.',
      },
    ],
  },

  final: {
    title: 'Stop asking AI what to post.',
    rest: 'Get a bot that knows.',
    buy: 'Get Content OS · {price}',
    note: 'One-time payment · Lifetime updates · Private GitHub repository',
  },

  footer: {
    by: 'Content OS is made by Shimanto.',
    back: 'Back to shimanto.xyz',
    links: [
      { href: '/legal/terms', label: 'Terms' },
      { href: '/legal/privacy', label: 'Privacy' },
      { href: '/legal/refund', label: 'Refunds' },
    ],
  },
};
