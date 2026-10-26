import type { GuidesCopy } from './guides';

export const guidesBn: GuidesCopy = {
  meta: {
    title: 'Content OS গাইড: install থেকে প্রথম পোস্ট পর্যন্ত',
    description:
      'Content OS install করুন, প্রথম page সেট আপ করুন, carousel, পোস্ট আর ভিডিও বানান, টিমে কাজ করুন, ছোট ছোট, ধাপে ধাপে গাইড',
  },
  hero: {
    badge: 'গাইড',
    title: 'Install থেকে',
    rest: 'প্রথম পোস্ট পর্যন্ত',
    intro: 'ছোট গাইড, কপি, পেস্ট, হয়ে গেল',
    time: 'সেট আপ করতে মোটামুটি ২০ মিনিট',
  },
  sections: [
    { href: '#ai-setup', label: 'AI সেটআপ', icon: 'spark' },
    { href: '#first-page', label: 'প্রথম page', icon: 'book' },
    { href: '#daily', label: 'রোজকার কাজ', icon: 'calendar' },
    { href: '#shortcuts', label: 'শর্টকাট', icon: 'code' },
    { href: '#troubleshooting', label: 'সাহায্য', icon: 'alert' },
  ],
  toc: 'এই পেজে',
  copy: 'কপি',
  copied: 'কপি হয়েছে',
  promptFor: 'Claude Code, Codex বা Gemini-তে পেস্ট করুন',
  guides: [
    {
      id: 'ai-setup',
      title: 'সহজ উপায়: AI-কে দিয়েই সেট আপ করান',
      icon: 'spark',
      tone: 'spark',
      lead: 'Folder খুলুন, AI চালু করুন, একটা prompt পেস্ট করুন',
      blocks: [
        {
          kind: 'steps',
          items: [
            'GitHub invite accept করুন, তারপর যে repository দেখায় সেটা clone করুন',
            'contentos folder খুলুন: VS Code-এ File → Open Folder',
            'ওখানেই AI চালু করুন: VS Code-এ Claude Code panel, অথবা terminal-এ claude, codex বা gemini',
            'নিচের prompt পেস্ট করুন, আর ও যা জিজ্ঞেস করে তার উত্তর দিন',
          ],
        },
        { kind: 'code', code: 'cd contentos\nclaude' },
        {
          kind: 'prompt',
          label: 'সেটআপ prompt',
          text: 'এই কম্পিউটারে Content OS সেট আপ করে দাও, Project হলো এই folder টা\n\n১. Node.js 22+, pnpm, Git আর FFmpeg আছে কিনা চেক করো, কোনোটা না থাকলে আমাকে command টা বলো, আমি হ্যাঁ বললে তারপর install করো\n২. pnpm install চালাও, তারপর pnpm exec playwright install chromium\n৩. .env.example কপি করে .env.local বানাও, Key গুলো খালি রাখো, আমি নিজেরগুলো বসাব\n৪. pnpm cos doctor চালাও, যত ✗ দেখায় সব ঠিক করো\n৫. pnpm dev দিয়ে Studio চালু করো, আর link টা দাও\n\nপ্রতিটা ধাপ এক লাইনে বলো, আমার password লাগে বা টাকা খরচ হয়, এমন কিছুর আগে থামো আর আমাকে জিজ্ঞেস করো',
        },
        {
          kind: 'tip',
          text: 'Content OS-এর সাথেই CLAUDE.md, AGENTS.md আর GEMINI.md আছে, তাই Claude Code, Codex আর Gemini সবাই একই নিয়ম মেনে চলে',
        },
      ],
    },
    {
      id: 'quick-start',
      title: 'ঝটপট শুরু',
      icon: 'rocket',
      tone: 'signal',
      lead: 'নিজে করতে চান? ছয় লাইন',
      blocks: [
        {
          kind: 'code',
          code: 'cd contentos\npnpm install\npnpm exec playwright install chromium\ncp .env.example .env.local\npnpm cos doctor\npnpm dev',
        },
        {
          kind: 'p',
          text: 'তারপর localhost:3000/studio খুলুন, আর VS Code-এ Claude Code দিয়ে folder টা খুলুন',
        },
        { kind: 'tip', text: 'পরের চারটা গাইডে প্রতিটা লাইন ধরে ধরে বোঝানো আছে' },
      ],
    },
    {
      id: 'access',
      title: 'কোড হাতে নিন',
      icon: 'github',
      tone: 'idea',
      lead: 'একটা private GitHub repository, আজীবন আপনার',
      blocks: [
        {
          kind: 'steps',
          items: [
            'Content OS কিনুন',
            'আপনার account-এ গিয়ে GitHub connect করুন',
            'GitHub যে invite email পাঠাবে, সেটা accept করুন',
            'যে repository খুলবে সেটা clone করুন, তারপর folder টা খুলুন',
          ],
        },
      ],
    },
    {
      id: 'tools',
      title: 'Tool গুলো install করুন',
      icon: 'wrench',
      tone: 'build',
      lead: 'প্রতি কম্পিউটারে একবারই, শেষে নতুন একটা terminal খুলুন',
      blocks: [
        {
          kind: 'table',
          head: ['Tool', 'কীভাবে পাবেন'],
          rows: [
            ['Node.js 22+', 'nodejs.org, বা brew install node'],
            ['pnpm', 'corepack enable'],
            ['Git', 'git-scm.com, বা xcode-select --install'],
            ['FFmpeg', 'brew install ffmpeg, বা winget install Gyan.FFmpeg'],
            ['Claude Code', 'VS Code → Extensions → “Claude Code”'],
          ],
        },
        {
          kind: 'tip',
          text: 'চাইলে: ভিডিও রিসার্চের জন্য yt-dlp, লোকাল transcript-এর জন্য Whisper',
        },
      ],
    },
    {
      id: 'keys',
      title: 'API key বসান',
      icon: 'key',
      tone: 'spark',
      lead: 'সবই optional, Key না দিলে সেই ফিচার বন্ধ থাকবে',
      blocks: [
        { kind: 'code', code: 'cp .env.example .env.local' },
        {
          kind: 'table',
          head: ['Key', 'যা চালু হয়'],
          rows: [
            ['OPENAI_API_KEY', 'AI ছবি'],
            ['ELEVENLABS_API_KEY', 'ভয়েস, মিউজিক, সাউন্ড ইফেক্ট, transcript'],
            ['FISH_AUDIO_API_KEY', 'আপনার clone করা ভয়েস'],
            ['SNAPGEN_API_KEY', 'AI ভিডিও'],
            ['FAL_KEY', 'ছবি থেকে 3D মডেল'],
          ],
        },
        {
          kind: 'tip',
          text: 'অথবা পরে Studio → Settings-এ বসিয়ে নিন, Key কখনো git-এ যায় না',
        },
      ],
    },
    {
      id: 'start',
      title: 'চেক করুন, চালু করুন',
      icon: 'play',
      tone: 'create',
      lead: 'একটা command-ই বলে দেবে কী কী বাকি',
      blocks: [
        { kind: 'code', code: 'pnpm cos doctor' },
        { kind: 'p', text: 'যত ✗ দেখায় সব ঠিক করুন, তারপর Studio চালু করুন:' },
        { kind: 'code', code: 'pnpm dev' },
        {
          kind: 'p',
          text: 'Studio: localhost:3000/studio, Claude Code: VS Code-এ folder টা খুলুন, নিয়মগুলো ও নিজেই পড়ে নেয়',
        },
      ],
    },
    {
      id: 'first-page',
      title: 'আপনার প্রথম page',
      icon: 'book',
      tone: 'signal',
      lead: 'প্রতি brand-এর জন্য একটা page, এক page আরেকটার সাথে মেশে না',
      blocks: [
        { kind: 'code', code: '/new-page "My Brand" en instagram' },
        {
          kind: 'steps',
          items: [
            'ওর প্রশ্নের উত্তর দিন: আপনি কে, কাদের সাথে কথা বলেন, আপনার কথার ধরন কেমন',
            '/brand দিয়ে logo, রং আর font যোগ করুন',
            'পরে যেকোনো একটা অংশ ঠিক করতে /context, যেমন /context my-brand voice: …',
            'AI ঠিক কী পড়ছে দেখতে Studio → Context খুলুন',
          ],
        },
        {
          kind: 'prompt',
          label: 'প্রথম page-এর prompt',
          text: 'আমার brand-এর জন্য নতুন একটা Content OS page বানাও\n\nনাম: <আপনার brand>\nভাষা: <বাংলা বা English>\nমূল platform: Instagram\nLogo আর ছবি: <আপনার ফাইলের folder>\n\nআমার audience, আমার voice, আমি কী বিক্রি করি আর আমার নিয়ম নিয়ে একবারে একটা করে প্রশ্ন করো, তারপর brand kit সেট আপ করো, আর Studio-তে page টা দেখাও',
        },
      ],
    },
    {
      id: 'daily',
      title: 'Content OS-এর সাথে একটা দিন',
      icon: 'calendar',
      tone: 'build',
      lead: 'চান, চেক করুন, export করুন, ব্যস',
      blocks: [
        {
          kind: 'steps',
          items: [
            '/next-post my-brand: আইডিয়া পান, প্রতিটার সাথে কারণসহ',
            '/carousels my-brand from-idea <id>: যেটা পছন্দ, সেটা বানান',
            'Studio-তে চেক করুন, ঠিক হয়নি? /improve my-brand <id> --fix-qa',
            '/export my-brand <id>: মিডিয়া, caption আর hashtag, পোস্টের জন্য রেডি',
          ],
        },
        {
          kind: 'tip',
          text: 'আসল কাজের কথা /experience দিয়ে লিখে রাখুন, কোনো নিয়ম একবার শিখিয়ে দিন /teach দিয়ে',
        },
        {
          kind: 'prompt',
          label: 'রোজকার prompt',
          text: 'আজ <my-brand> কী পোস্ট করবে? কারণসহ তিনটা আইডিয়া দাও, তারপর আমি যেটা বাছব সেটা থেকে একটা carousel বানাও, QA চালাও, আর export করো',
        },
      ],
    },
    {
      id: 'videos',
      title: 'ভিডিও বানান',
      icon: 'video',
      tone: 'create',
      lead: 'Script, ভয়েস, scene, render, এক লাইনে',
      blocks: [
        { kind: 'code', code: '/video my-brand "launch day" 45s reel' },
        {
          kind: 'steps',
          items: [
            'আপনার ঢঙে script লিখে দেয়',
            'একটা format বেছে নিয়ে scene গুলো বানায়',
            'আপনার কম্পিউটারেই render করে, timing আর audio চেক করে',
            'Studio → Videos-এ দেখে নিন, তারপর Render final',
          ],
        },
        {
          kind: 'tip',
          text: 'Format-এর demo গুলো নিজের মেশিনে চান? pnpm cos demos render (প্রায় এক ঘণ্টা লাগে)',
        },
      ],
    },
    {
      id: 'shortcuts',
      title: 'সব শর্টকাট',
      icon: 'code',
      tone: 'idea',
      lead: 'সাধারণ কথায় বললেও চলে, এগুলো শুধু দ্রুত',
      blocks: [
        {
          kind: 'table',
          head: ['যা লিখবেন', 'যা পাবেন'],
          rows: [
            ['/next-post <page>', 'আইডিয়া, প্রতিটার সাথে কারণ'],
            ['/carousels <page> 10', 'দশটা carousel, চেক করা আর render করা'],
            ['/post <page> linkedin-post "<topic>"', 'একটা text পোস্ট বা একটা graphic'],
            ['/video <page> "<topic>" 45s reel', 'একটা রেডি ভিডিও'],
            ['/repurpose <page> <id> --to x-thread', 'এক আইডিয়া, অন্য platform-এর জন্য'],
            ['/improve <page> <id> --fix-qa', 'QA যা পেয়েছে, তা ঠিক করে'],
            ['/teach <page> "<rule>"', 'একটা নিয়ম, যা ও সবসময় মনে রাখে'],
            ['/experience "<what happened>"', 'আপনার আসল কাজ, material হিসেবে সেভ'],
            ['/news', 'Business angle সহ খবর'],
            ['/research <page> "<question>"', 'সোর্সসহ উত্তর'],
            ['/qa <page> --all --fix', 'সব চেক করে, যা fail করে তা ঠিক করে'],
            ['/export <page> <id>', 'পোস্ট করার জন্য রেডি প্যাকেজ'],
          ],
        },
      ],
    },
    {
      id: 'team',
      title: 'টিমে কাজ করুন',
      icon: 'users',
      tone: 'spark',
      lead: 'Optional, নিজের server, নিজের নিয়ম',
      blocks: [
        {
          kind: 'steps',
          items: [
            'Sync server (repo-তেই আছে) নিজের server-এ host করুন',
            'প্রথমে নিজের কম্পিউটার connect করুন: তাতে আপনি owner হবেন',
            'Page ধরে ধরে মানুষকে editor বা viewer হিসেবে invite করুন',
          ],
        },
        {
          kind: 'tip',
          text: 'শুধু ফাইল sync হয়, Key যার যার কম্পিউটারেই থাকে, Conflict হলে দুটোই রাখা হয়, কখনো overwrite হয় না',
        },
      ],
    },
    {
      id: 'updates',
      title: 'আপডেট নিন',
      icon: 'repeat',
      tone: 'signal',
      lead: 'সব আপডেট, আজীবন',
      blocks: [{ kind: 'code', code: 'git pull\npnpm install' }],
    },
    {
      id: 'troubleshooting',
      title: 'কিছু কাজ না করলে',
      icon: 'alert',
      tone: 'create',
      lead: 'সাধারণ সমাধানগুলো',
      blocks: [
        {
          kind: 'table',
          head: ['সমস্যা', 'সমাধান'],
          rows: [
            ['ffmpeg not found', 'Install করুন, তারপর নতুন terminal খুলুন'],
            ['Render-এ “Browser not found”', 'pnpm exec playwright install chromium'],
            ['Studio পুরনো page দেখাচ্ছে', 'pnpm dev বন্ধ করুন, .next/ মুছুন, আবার চালু করুন'],
            ['Format card-এ ভিডিওর বদলে লেখা দেখাচ্ছে', 'pnpm cos demos render'],
            ['কোনো ability-তে [OFF] লেখা', 'ওটার key নেই, অথবা Settings-এ বন্ধ করা'],
          ],
        },
      ],
    },
  ],
  help: {
    title: 'আটকে গেছেন?',
    body: 'আগে pnpm cos doctor চালান, তাও আটকে আছেন? Claude Code-কে জিজ্ঞেস করুন: পুরো project ও চেনে',
  },
};
