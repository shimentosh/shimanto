import type { Entry } from './catalog';
import { publishingOsPosts } from './publishing-os';

/**
 * Blog posts, newest first. Written in Shimanto's voice from what the brief states; they make no
 * claims about metrics or events beyond it. Phase 5 moves them into the CMS.
 * Posts published from Publishing OS live in ./publishing-os and are appended below.
 */
export const posts: Entry[] = [
  {
    slug: 'own-the-house-rent-the-megaphone',
    title: 'Own the house, rent the megaphone',
    summary:
      'Social platforms are incredible for reach and terrible as a home. Why every founder needs one place on the internet they actually own.',
    category: 'Founder notes',
    publishedAt: '2026-09-24',
    world: 'build',
    tags: ['Owned media', 'Distribution'],
    featured: true,
    body: [
      {
        type: 'p',
        text: 'Every few months a platform changes the rules. Reach drops, a format dies, an account gets locked for no clear reason, and a lot of people discover at the same moment that the audience they built was never really theirs. It was on loan.',
      },
      {
        type: 'p',
        text: 'I still post on social every week. I am not anti-platform. I just stopped confusing the megaphone with the house.',
      },
      { type: 'h2', id: 'rented-vs-owned', text: 'Rented reach vs. owned ground' },
      {
        type: 'p',
        text: 'Rented reach is anything where someone else controls the distribution: feeds, algorithms, marketplaces. It is fast, cheap and wildly unpredictable. Owned ground is anything you control end to end: your site, your email list, your products, your archive.',
      },
      {
        type: 'p',
        text: 'The mistake is not using rented reach. The mistake is building nothing permanent with it. A viral post that sends people nowhere is a firework. Pretty, loud, gone.',
      },
      {
        type: 'quote',
        text: 'Social media distributes. Your own site owns.',
      },
      { type: 'h2', id: 'what-belongs-at-home', text: 'What belongs at home' },
      {
        type: 'p',
        text: 'When I started designing this site, I made a simple rule: if it took real thinking to make, the canonical version lives here. Social gets the trailer. The site gets the film.',
      },
      {
        type: 'list',
        items: [
          'Builds: every venture gets a proper page, not a thread that scrolls away.',
          'Notes: the full argument, with room for nuance a caption never has.',
          'Playbooks: systems people can actually copy and use.',
          'Products: things people can buy without a DM and a payment screenshot.',
        ],
      },
      { type: 'h2', id: 'the-loop', text: 'The loop that compounds' },
      {
        type: 'p',
        text: 'The magic is in the loop. A note on the site becomes five posts on social. The posts send the curious back to the note. The note links to a product, a playbook or a way to work together. Every piece of content has somewhere to go next.',
      },
      {
        type: 'callout',
        title: 'A quick test',
        text: 'If every platform you use disappeared tomorrow, what would you still have? A list of emails, a site with your best work, a product people pay for? That is your house. Everything else is weather.',
        tone: 'build',
      },
      { type: 'h2', id: 'start-small', text: 'Start smaller than you think' },
      {
        type: 'p',
        text: 'You do not need a big site to start. One page with who you are, what you build and how to reach you beats a perfect site you never launch. Then add one note a week. In a year you have fifty pieces of work that belong to you, and a reason for people to come home.',
      },
    ],
  },
  {
    slug: 'systems-beat-motivation',
    title: 'Systems beat motivation: turning a messy process into a machine',
    summary:
      'Motivation is a great starter and a terrible engine. The four-step path I use to take any repeating task from chaos to a system that runs itself.',
    category: 'Automation',
    publishedAt: '2026-09-18',
    world: 'signal',
    tags: ['Systems', 'Operations'],
    body: [
      {
        type: 'p',
        text: 'Most businesses do not have a strategy problem. They have a Tuesday problem. The same small tasks, done slightly differently every week, by whoever remembers, eating the hours that should go to the work that matters.',
      },
      {
        type: 'p',
        text: 'Motivation will get you through a hard week. It will not get you through a hard year. Systems will.',
      },
      { type: 'h2', id: 'the-ladder', text: 'The ladder: do, document, standardise, automate' },
      {
        type: 'p',
        text: 'I run every repeating process up the same four rungs. Skipping a rung is where most automation projects go to die.',
      },
      {
        type: 'list',
        ordered: true,
        items: [
          'Do it by hand, at least twice. You cannot systemise something you do not understand yet.',
          'Document it while you do it. Screenshots, rough steps, the weird exceptions.',
          'Standardise it. Remove the steps that only exist because "that is how we did it last time".',
          'Automate or delegate the standard version. Now the machine is copying something good.',
        ],
      },
      {
        type: 'quote',
        text: 'Automating a messy process just gives you a faster mess.',
      },
      { type: 'h2', id: 'what-to-pick-first', text: 'What to pick first' },
      {
        type: 'p',
        text: 'Pick the task that is boring, frequent and low-risk. Boring means nobody will miss doing it. Frequent means the time saved adds up. Low-risk means a mistake while you learn will not hurt a customer.',
      },
      {
        type: 'p',
        text: 'Reporting, content repurposing, lead routing, invoice reminders and file organisation are the usual suspects. Not glamorous. Enormously valuable.',
      },
      { type: 'h2', id: 'owner', text: 'Every system needs an owner' },
      {
        type: 'p',
        text: 'The quiet killer of systems is that nobody owns them. A workflow breaks, nobody notices for a month, and everyone decides automation "does not work for us". Give every system a name, an owner and a simple health check, even if the owner is you.',
      },
      {
        type: 'callout',
        title: 'The one-page system card',
        text: 'Name. Trigger. Steps. Owner. What "broken" looks like. Where the logs live. If you cannot fill this in, the system is not ready to automate.',
        tone: 'signal',
      },
      { type: 'h2', id: 'freedom', text: 'The point is freedom, not efficiency' },
      {
        type: 'p',
        text: 'Efficiency is a side effect. The real win is attention. Every process you turn into a system hands back a little of your head, and that is the resource founders run out of first.',
      },
    ],
  },
  {
    slug: 'ai-is-a-teammate-not-a-vending-machine',
    title: 'AI is a teammate, not a vending machine',
    summary:
      'Prompt in, magic out is the wrong mental model. How I brief, review and actually work with AI across content, video and operations.',
    category: 'AI',
    publishedAt: '2026-09-11',
    world: 'spark',
    tags: ['AI', 'Workflows'],
    body: [
      {
        type: 'p',
        text: 'The disappointing way to use AI is the vending machine: put a prompt in, get something out, complain that it is generic. The useful way is closer to working with a very fast, very well-read new teammate who has no context about your business.',
      },
      {
        type: 'p',
        text: 'Nobody hands a new hire a single sentence and expects great work. Yet that is exactly how most people brief AI.',
      },
      { type: 'h2', id: 'brief-like-a-manager', text: 'Brief it like a manager' },
      {
        type: 'p',
        text: 'A good brief has the same parts whether it is for a person or a model:',
      },
      {
        type: 'list',
        items: [
          'Context: who the audience is, what the business does, what good looks like.',
          'The job: one clear outcome, not five.',
          'Constraints: tone, length, format, what to avoid.',
          'Examples: one or two pieces you already love.',
          'The review: tell it you will iterate, and ask what is missing.',
        ],
      },
      {
        type: 'quote',
        text: 'Generic output is usually a generic brief wearing a disguise.',
      },
      { type: 'h2', id: 'where-it-shines', text: 'Where it genuinely shines' },
      {
        type: 'p',
        text: 'First drafts, variations, summaries, restructuring, research starting points, turning one long piece into many short ones, and all the glue work between tools. Anything where you can judge quality faster than you can produce it.',
      },
      { type: 'h2', id: 'where-it-fails', text: 'Where it quietly fails' },
      {
        type: 'p',
        text: 'Facts it cannot check, taste it has not been shown, and decisions that need your judgement. AI will confidently fill gaps. That is fine in a draft and dangerous in anything you publish, send or sign without reading.',
      },
      {
        type: 'callout',
        title: 'My rule',
        text: 'AI can do the first 80% of almost anything. I always own the last 20%: the facts, the taste and the decision.',
        tone: 'spark',
      },
      { type: 'h2', id: 'build-the-loop', text: 'Build loops, not one-offs' },
      {
        type: 'p',
        text: 'The biggest jump comes when you stop using AI in single chats and start building it into systems: a brief template, a review checklist, a place where good outputs are saved as examples for next time. That is when it stops being a toy and starts being a teammate.',
      },
    ],
  },
  {
    slug: 'distribution-is-part-of-the-product',
    title: 'Distribution is part of the product',
    summary:
      'Before startups there was a song with 35M+ views. The lesson I took from music into every business since: how it spreads is not an afterthought.',
    category: 'Marketing',
    publishedAt: '2026-09-04',
    world: 'create',
    tags: ['Marketing', 'Music'],
    body: [
      {
        type: 'p',
        text: 'Long before I was building companies, I was writing songs. One of them went on to pass 35 million views. That number still surprises me, but the lesson behind it shaped how I think about every product since.',
      },
      {
        type: 'p',
        text: 'Great work does not spread on its own. How something travels is designed, or it is left to luck.',
      },
      { type: 'h2', id: 'the-myth', text: 'The "build it and they will come" myth' },
      {
        type: 'p',
        text: 'Founders love the idea that a good enough product markets itself. Sometimes it does. Usually it sits quietly on a landing page while a worse product with a better story wins the market.',
      },
      {
        type: 'quote',
        text: 'If you did not design how it spreads, you designed it not to.',
      },
      { type: 'h2', id: 'three-questions', text: 'Three questions before you build' },
      {
        type: 'list',
        ordered: true,
        items: [
          'Who already gathers the people who need this? Communities, channels, creators, search terms.',
          'Why would someone share it without being asked? A result worth showing, a format worth sending.',
          'What is the smallest version that proves people want it? A post, a waitlist, a demo video.',
        ],
      },
      { type: 'h2', id: 'build-distribution-in', text: 'Build the spread into the thing' },
      {
        type: 'p',
        text: 'The best distribution is not a campaign bolted on at the end. It is a feature: output people want to post, a template people pass around, a result that is visible to others by default. Songs have hooks for a reason.',
      },
      {
        type: 'callout',
        title: 'Try this',
        text: 'Write the launch post before you write the first line of code. If you cannot make it interesting, the product probably is not sharp enough yet.',
        tone: 'create',
      },
      { type: 'h2', id: 'patience', text: 'And then, patience' },
      {
        type: 'p',
        text: 'Distribution compounds slowly and then suddenly. Most things that "blew up overnight" had months or years of quiet work underneath. Keep shipping, keep sharing, and make sure every burst of attention has a home to land in.',
      },
    ],
  },
  {
    slug: 'the-five-tool-founder',
    title: 'The five-tool founder',
    summary:
      'Business, marketing, technology, AI and automation are not five careers. They are one toolkit, and the leverage lives where they connect.',
    category: 'Business',
    publishedAt: '2026-08-28',
    world: 'idea',
    tags: ['Founder', 'Skills'],
    body: [
      {
        type: 'p',
        text: 'People like to put founders in boxes: the technical one, the marketing one, the operator. I understand why. It is neat. It is also how a lot of good ideas die in the gap between departments.',
      },
      {
        type: 'p',
        text: 'I do not call myself a developer, and I am not only an AI creator. I am a founder who uses whatever the business needs. In practice that means five tools.',
      },
      { type: 'h2', id: 'the-five', text: 'The five tools' },
      {
        type: 'list',
        items: [
          'Business: offers, pricing, operations. Does this make money and can it keep doing so?',
          'Marketing: positioning and distribution. Do the right people know and care?',
          'Technology: enough to build, direct and judge the work.',
          'AI: leverage on thinking, writing and making.',
          'Automation: leverage on doing, so the business runs without you pushing every button.',
        ],
      },
      { type: 'h2', id: 'depth-vs-range', text: 'You do not need mastery, you need range' },
      {
        type: 'p',
        text: 'Being world class at all five is impossible. Being dangerous at all five is very possible. The goal is to understand each well enough to make good decisions, spot bad advice and hire or build well.',
      },
      {
        type: 'quote',
        text: 'Specialists go deep. Founders connect.',
      },
      { type: 'h2', id: 'where-leverage-lives', text: 'Where the leverage lives' },
      {
        type: 'p',
        text: 'The interesting opportunities sit at the joins. Marketing plus automation gives you content systems that publish daily. Business plus AI gives you offers that were too expensive to deliver last year. Technology plus distribution gives you products that spread by design.',
      },
      {
        type: 'callout',
        title: 'A useful exercise',
        text: 'Rate yourself 1 to 5 on each tool. Your next big win is usually hiding in your lowest score, not your highest.',
        tone: 'idea',
      },
      { type: 'h2', id: 'learning', text: 'How I keep learning' },
      {
        type: 'p',
        text: 'Build small things in the tool you are weakest at. Nothing teaches marketing like launching something. Nothing teaches technology like shipping a tiny app. The experiments page on this site exists partly to keep me honest about that.',
      },
    ],
  },
  {
    slug: 'ship-the-ugly-version',
    title: 'Ship the ugly version: a one-week launch checklist',
    summary:
      'Perfect is a very comfortable place to hide. The checklist I use to get a first version in front of real people within a week.',
    category: 'Product building',
    publishedAt: '2026-08-21',
    world: 'build',
    tags: ['Launch', 'Checklist'],
    body: [
      {
        type: 'p',
        text: 'The first version of anything I have built was embarrassing. That is the point. You learn more from one week with real users than from three months of polishing in private.',
      },
      {
        type: 'p',
        text: 'Here is the checklist I use to force a launch inside a week. It is not about cutting corners on quality. It is about cutting scope until the core idea is testable.',
      },
      { type: 'h2', id: 'day-1-2', text: 'Days 1–2: shrink it' },
      {
        type: 'list',
        items: [
          'Write the problem in one sentence a stranger would understand.',
          'List every feature you want, then delete everything that does not prove the core promise.',
          'Decide the single action that means "this worked": a signup, a purchase, a reply.',
        ],
      },
      { type: 'h2', id: 'day-3-5', text: 'Days 3–5: build the spine' },
      {
        type: 'list',
        items: [
          'Use boring, proven tools. This is not the week for a new framework.',
          'Fake what you can by hand behind the scenes. Automate later, once people care.',
          'Make it work on a phone. That is where most people will first see it.',
        ],
      },
      {
        type: 'quote',
        text: 'If you are not a little embarrassed by version one, you launched too late.',
        cite: 'Common founder wisdom',
      },
      { type: 'h2', id: 'day-6', text: 'Day 6: prepare the launch' },
      {
        type: 'list',
        items: [
          'One clear landing page: problem, promise, proof, one button.',
          'A short demo video or a few screenshots.',
          'A list of 20 specific people or places to share it with.',
        ],
      },
      { type: 'h2', id: 'day-7', text: 'Day 7: ship and listen' },
      {
        type: 'p',
        text: 'Launch in the morning so you can respond all day. Talk to everyone who tries it. Write down every confused question, because each one is a free lesson in positioning.',
      },
      {
        type: 'callout',
        title: 'After the launch',
        text: 'Decide within two weeks: double down, change direction, or stop. A clear "no" is a result too, and it frees you for the next idea.',
        tone: 'build',
      },
    ],
  },
  ...publishingOsPosts,
];
