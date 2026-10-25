import type { Accent, IconName } from '@shimanto/ui';

/** One piece of a guide. */
export type GuideBlock =
  | { kind: 'p'; text: string }
  | { kind: 'code'; code: string }
  | { kind: 'steps'; items: string[] }
  | { kind: 'table'; head: [string, string]; rows: Array<[string, string]> }
  | { kind: 'tip'; text: string };

export interface Guide {
  id: string;
  title: string;
  icon: IconName;
  tone: Accent;
  /** One short line under the title. */
  lead: string;
  blocks: GuideBlock[];
}

export interface GuidesCopy {
  meta: { title: string; description: string };
  hero: { badge: string; title: string; rest: string; intro: string; time: string };
  sections: Array<{ href: string; label: string; icon: IconName }>;
  toc: string;
  copy: string;
  copied: string;
  guides: Guide[];
  help: { title: string; body: string };
}

export const guidesEn: GuidesCopy = {
  meta: {
    title: 'Content OS guides: from install to your first post',
    description:
      'Install Content OS, set up your first page, make carousels, posts and videos, and work as a team. Short, step-by-step guides.',
  },
  hero: {
    badge: 'Guides',
    title: 'From install',
    rest: 'to your first post.',
    intro: 'Short guides. Copy, paste, done.',
    time: 'About 20 minutes to set up',
  },
  sections: [
    { href: '#quick-start', label: 'Quick start', icon: 'rocket' },
    { href: '#first-page', label: 'First page', icon: 'book' },
    { href: '#daily', label: 'Daily use', icon: 'calendar' },
    { href: '#shortcuts', label: 'Shortcuts', icon: 'code' },
    { href: '#troubleshooting', label: 'Help', icon: 'alert' },
  ],
  toc: 'On this page',
  copy: 'Copy',
  copied: 'Copied',
  guides: [
    {
      id: 'quick-start',
      title: 'Quick start',
      icon: 'rocket',
      tone: 'signal',
      lead: 'The whole setup, in six lines.',
      blocks: [
        {
          kind: 'code',
          code: 'cd contentos\npnpm install\npnpm exec playwright install chromium\ncp .env.example .env.local\npnpm cos doctor\npnpm dev',
        },
        {
          kind: 'p',
          text: 'Then open localhost:3000/studio, and open the folder in VS Code with Claude Code.',
        },
        { kind: 'tip', text: 'New here? The next four guides walk through each line.' },
      ],
    },
    {
      id: 'access',
      title: 'Get the code',
      icon: 'github',
      tone: 'idea',
      lead: 'A private GitHub repository, yours for life.',
      blocks: [
        {
          kind: 'steps',
          items: [
            'Buy Content OS.',
            'In your account, connect your GitHub.',
            'Accept the invite GitHub emails you.',
            'Clone the repository it opens, then open the folder.',
          ],
        },
      ],
    },
    {
      id: 'tools',
      title: 'Install the tools',
      icon: 'wrench',
      tone: 'build',
      lead: 'Once per computer. Open a new terminal after.',
      blocks: [
        {
          kind: 'table',
          head: ['Tool', 'How to get it'],
          rows: [
            ['Node.js 22+', 'nodejs.org, or brew install node'],
            ['pnpm', 'corepack enable'],
            ['Git', 'git-scm.com, or xcode-select --install'],
            ['FFmpeg', 'brew install ffmpeg, or winget install Gyan.FFmpeg'],
            ['Claude Code', 'VS Code → Extensions → “Claude Code”'],
          ],
        },
        {
          kind: 'tip',
          text: 'Optional: yt-dlp for video research, Whisper for local transcripts.',
        },
      ],
    },
    {
      id: 'keys',
      title: 'Add API keys',
      icon: 'key',
      tone: 'spark',
      lead: 'All optional. No key, that power stays off.',
      blocks: [
        { kind: 'code', code: 'cp .env.example .env.local' },
        {
          kind: 'table',
          head: ['Key', 'Switches on'],
          rows: [
            ['OPENAI_API_KEY', 'AI images'],
            ['ELEVENLABS_API_KEY', 'Voices, music, sound effects, transcripts'],
            ['FISH_AUDIO_API_KEY', 'Your cloned voice'],
            ['SNAPGEN_API_KEY', 'AI video'],
            ['FAL_KEY', 'Photo to 3D model'],
          ],
        },
        {
          kind: 'tip',
          text: 'Or add them later in Studio → Settings. Keys never go into git.',
        },
      ],
    },
    {
      id: 'start',
      title: 'Check and start',
      icon: 'play',
      tone: 'create',
      lead: 'One command tells you what’s missing.',
      blocks: [
        { kind: 'code', code: 'pnpm cos doctor' },
        { kind: 'p', text: 'Fix every ✗ it shows. Then start the Studio:' },
        { kind: 'code', code: 'pnpm dev' },
        {
          kind: 'p',
          text: 'Studio: localhost:3000/studio. Claude Code: open the folder in VS Code. It reads the rules on its own.',
        },
      ],
    },
    {
      id: 'first-page',
      title: 'Your first page',
      icon: 'book',
      tone: 'signal',
      lead: 'One page per brand. Pages never mix.',
      blocks: [
        { kind: 'code', code: '/new-page "My Brand" en instagram' },
        {
          kind: 'steps',
          items: [
            'Answer its questions: who you are, who you talk to, how you sound.',
            'Add your logo, colours and fonts with /brand.',
            'Fix any one part later with /context, like /context my-brand voice: …',
            'Open Studio → Context to see exactly what the AI reads.',
          ],
        },
      ],
    },
    {
      id: 'daily',
      title: 'A day with Content OS',
      icon: 'calendar',
      tone: 'build',
      lead: 'Ask, check, export. That’s it.',
      blocks: [
        {
          kind: 'steps',
          items: [
            '/next-post my-brand: get ideas, each with a reason.',
            '/carousels my-brand from-idea <id>: make the one you like.',
            'Check it in the Studio. Not right? /improve my-brand <id> --fix-qa',
            '/export my-brand <id>: media, caption and hashtags, ready to post.',
          ],
        },
        {
          kind: 'tip',
          text: 'Log real work with /experience. Teach it a rule once with /teach.',
        },
      ],
    },
    {
      id: 'videos',
      title: 'Make a video',
      icon: 'video',
      tone: 'create',
      lead: 'Script, voice, scenes, render. One line.',
      blocks: [
        { kind: 'code', code: '/video my-brand "launch day" 45s reel' },
        {
          kind: 'steps',
          items: [
            'It writes the script in your voice.',
            'It picks a format and builds the scenes.',
            'It renders on your computer and checks timing and audio.',
            'Watch it in Studio → Videos, then Render final.',
          ],
        },
        {
          kind: 'tip',
          text: 'Want the format demos on your machine? pnpm cos demos render (about an hour).',
        },
      ],
    },
    {
      id: 'shortcuts',
      title: 'Every shortcut',
      icon: 'code',
      tone: 'idea',
      lead: 'Plain words work too. These are just faster.',
      blocks: [
        {
          kind: 'table',
          head: ['You type', 'You get'],
          rows: [
            ['/next-post <page>', 'Ideas, each with a reason'],
            ['/carousels <page> 10', 'Ten carousels, checked and rendered'],
            ['/post <page> linkedin-post "<topic>"', 'A text post or one graphic'],
            ['/video <page> "<topic>" 45s reel', 'A finished video'],
            ['/repurpose <page> <id> --to x-thread', 'One idea, for another platform'],
            ['/improve <page> <id> --fix-qa', 'Fixes what QA found'],
            ['/teach <page> "<rule>"', 'A rule it keeps for good'],
            ['/experience "<what happened>"', 'Your real work, saved as material'],
            ['/news', 'News with a business angle'],
            ['/research <page> "<question>"', 'Answers with sources'],
            ['/qa <page> --all --fix', 'Checks everything, fixes what fails'],
            ['/export <page> <id>', 'A ready-to-post package'],
          ],
        },
      ],
    },
    {
      id: 'team',
      title: 'Work as a team',
      icon: 'users',
      tone: 'spark',
      lead: 'Optional. Your own server, your own rules.',
      blocks: [
        {
          kind: 'steps',
          items: [
            'Host the sync server (it ships in the repo) on your own server.',
            'Connect your computer first: that makes you the owner.',
            'Invite people as editor or viewer, page by page.',
          ],
        },
        {
          kind: 'tip',
          text: 'Only files sync. Keys stay on each computer. Conflicts are kept, never overwritten.',
        },
      ],
    },
    {
      id: 'updates',
      title: 'Get updates',
      icon: 'repeat',
      tone: 'signal',
      lead: 'Every update, for life.',
      blocks: [{ kind: 'code', code: 'git pull\npnpm install' }],
    },
    {
      id: 'troubleshooting',
      title: 'If something breaks',
      icon: 'alert',
      tone: 'create',
      lead: 'The usual fixes.',
      blocks: [
        {
          kind: 'table',
          head: ['Problem', 'Fix'],
          rows: [
            ['ffmpeg not found', 'Install it, then open a new terminal'],
            ['“Browser not found” on render', 'pnpm exec playwright install chromium'],
            ['Studio shows an old page', 'Stop pnpm dev, delete .next/, start again'],
            ['Format cards show text, not video', 'pnpm cos demos render'],
            ['An ability says [OFF]', 'Its key is missing, or it’s off in Settings'],
          ],
        },
      ],
    },
  ],
  help: {
    title: 'Stuck?',
    body: 'Run pnpm cos doctor first. Still stuck? Ask Claude Code: it knows the whole project.',
  },
};
