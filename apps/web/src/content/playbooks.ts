import type { Entry } from './catalog';

export interface PlaybookStep {
  title: string;
  body: string;
  duration?: string;
  /** Short sub-points shown as a list under the step. */
  items?: string[];
  tip?: string;
}

/** A file the reader can download, generated from `content` by the template route. */
export interface PlaybookTemplate {
  file: string;
  name: string;
  description: string;
  mime: 'text/markdown' | 'text/csv';
  content: string;
}

export interface Playbook extends Entry {
  outcome: string;
  audience: string;
  time: string;
  level: 'Starter' | 'Intermediate' | 'Advanced';
  tools: string[];
  steps: PlaybookStep[];
  checklist: string[];
  templates: PlaybookTemplate[];
}

/**
 * Playbooks, newest first. Frameworks and methods written in Shimanto's voice; they make no claims
 * about his results. Phase 5 moves them into the CMS.
 */
export const playbooks: Playbook[] = [
  {
    slug: 'automate-lead-intake',
    title: 'Automate lead intake in an afternoon',
    summary:
      'Route every enquiry from form to follow-up automatically, so no lead waits and nothing slips through.',
    category: 'Workflows',
    publishedAt: '2026-09-22',
    tags: ['Automation', 'Sales'],
    outcome: 'Every new lead captured, tagged, notified and answered within minutes.',
    audience: 'Service businesses and founders who get enquiries by form, email or DM.',
    time: '3–4 hours',
    level: 'Intermediate',
    tools: [
      'A form tool',
      'A spreadsheet or CRM',
      'An automation tool (Zapier, Make or n8n)',
      'Email',
    ],
    body: [
      {
        type: 'p',
        text: 'Leads go cold fast. A reply within minutes feels like great service; a reply three days later feels like you were never that interested. Most small businesses lose leads not to competitors but to their own inbox.',
      },
      {
        type: 'p',
        text: 'This workflow puts every enquiry in one place, tells you the moment it arrives, sends a warm first reply automatically and nudges you if you forget to follow up.',
      },
    ],
    steps: [
      {
        title: 'Map where leads come from',
        duration: '20 min',
        body: 'List every way people reach you. Pick one to automate first, usually the website form. You can add the others later with the same pattern.',
        items: ['Website forms', 'Email', 'Social DMs', 'Referrals and intros'],
      },
      {
        title: 'Decide the fields you actually need',
        duration: '20 min',
        body: 'Only ask for what helps you qualify and reply: name, email, company, what they need, budget range, timeline. Every extra field costs submissions.',
      },
      {
        title: 'Create one place leads land',
        duration: '30 min',
        body: 'A spreadsheet or CRM with one row per lead and a status column: New, Contacted, Qualified, Won, Lost. Add a column for source so you learn which channel works.',
      },
      {
        title: 'Connect the form',
        duration: '45 min',
        body: 'In your automation tool, build one flow: new submission → add a row → notify you by email or chat → tag the lead by what they asked for.',
        tip: 'Test with a fake submission after every change. Automations break silently.',
      },
      {
        title: 'Send an instant, human reply',
        duration: '30 min',
        body: 'An automatic email that confirms you received the message, says when you will reply ("within one working day") and links one genuinely useful thing, like a relevant case study or guide.',
        tip: 'Write it like a person, not a ticket system. It is the first impression.',
      },
      {
        title: 'Add a follow-up nudge',
        duration: '30 min',
        body: 'If a lead is still "New" after 24 hours, remind yourself. A simple scheduled check in the automation tool is enough.',
      },
      {
        title: 'Test end to end, then go live',
        duration: '20 min',
        body: 'Submit the form as a stranger would, on your phone. Check the row, the notification, the auto-reply and the nudge. Then switch it on.',
      },
    ],
    checklist: [
      'Every lead source listed, first one chosen',
      'Form asks only for fields you use',
      'One sheet or CRM with a status column',
      'New submissions create a row automatically',
      'You get notified within a minute',
      'Auto-reply sent, written like a human',
      '24-hour follow-up nudge in place',
      'Tested end to end on a phone',
    ],
    templates: [
      {
        file: 'lead-pipeline.csv',
        name: 'Lead pipeline sheet',
        description: 'Columns for a simple lead tracker. Import into any spreadsheet or CRM.',
        mime: 'text/csv',
        content: [
          'date,name,email,company,source,need,budget,timeline,status,next_step,owner',
          '2026-09-22,Example Lead,lead@example.com,Example Co,Website form,New website,$5k–$15k,1–3 months,New,Reply within 24h,You',
        ].join('\n'),
      },
      {
        file: 'auto-reply.md',
        name: 'Auto-reply email',
        description: 'A warm first-reply template to adapt.',
        mime: 'text/markdown',
        content: `# Auto-reply email

Subject: Got your message, {first_name}

Hi {first_name},

Thanks for reaching out about {need}. I've got your message and I'll reply personally within one working day.

In the meantime, this might be useful: {link_to_relevant_guide_or_case_study}

Talk soon,
{your_name}
`,
      },
    ],
  },
  {
    slug: 'what-to-automate-first',
    title: 'Decide what to automate first',
    summary:
      'Score every repeating task on three questions, then automate the winners, not the shiny ones.',
    category: 'Frameworks',
    publishedAt: '2026-09-17',
    tags: ['Automation', 'Prioritising'],
    outcome: 'A ranked list of tasks to automate, delegate or delete.',
    audience: 'Founders and operators drowning in small repeating tasks.',
    time: '45 minutes',
    level: 'Starter',
    tools: ['A spreadsheet', 'Last week’s calendar and to-do list'],
    body: [
      {
        type: 'p',
        text: 'The tasks people automate first are usually the interesting ones, not the valuable ones. This framework flips that: it ranks work by how boring, frequent and safe it is, so the first automation pays off immediately.',
      },
      {
        type: 'callout',
        title: 'Remember',
        text: 'Automating a messy process just gives you a faster mess. Standardise first, then automate.',
        tone: 'idea',
      },
    ],
    steps: [
      {
        title: 'List every repeating task',
        duration: '15 min',
        body: 'Go through last week’s calendar, inbox and to-do list. Write down every task you do more than once a month, however small.',
      },
      {
        title: 'Score each task from 1 to 5',
        duration: '15 min',
        body: 'Three questions, one score each. Add them up.',
        items: [
          'Boring: would anyone miss doing it?',
          'Frequent: how often does it happen?',
          'Safe: how small is the damage if it goes wrong while you learn?',
        ],
      },
      {
        title: 'Add the time it takes',
        duration: '5 min',
        body: 'Estimate minutes per month for each task. Multiply by the score to see where the real leverage is.',
      },
      {
        title: 'Sort into automate, delegate or delete',
        duration: '10 min',
        body: 'High score and rule-based: automate. High score but needs judgement: delegate it with an SOP. Low value: stop doing it.',
        tip: 'Deleting a task is the fastest automation there is.',
      },
      {
        title: 'Run the top task up the ladder',
        body: 'Take the winner through do, document, standardise, automate. Only then pick the next one.',
      },
    ],
    checklist: [
      'All repeating tasks listed',
      'Each task scored for boring, frequent, safe',
      'Minutes per month estimated',
      'Every task marked automate, delegate or delete',
      'At least one task deleted outright',
      'Top task chosen and documented',
    ],
    templates: [
      {
        file: 'automation-scorecard.csv',
        name: 'Automation scorecard',
        description: 'Score tasks and sort them into automate, delegate or delete.',
        mime: 'text/csv',
        content: [
          'task,boring_1to5,frequent_1to5,safe_1to5,total,minutes_per_month,leverage,decision,owner',
          'Weekly report,5,4,5,14,120,1680,Automate,You',
          'Invoice reminders,5,3,4,12,60,720,Automate,You',
          'Client onboarding call,2,2,2,6,180,1080,Delegate,Team',
        ].join('\n'),
      },
    ],
  },
  {
    slug: 'write-an-sop-people-follow',
    title: 'Write an SOP someone else can actually follow',
    summary: 'Record, draft, test, fix: a simple method for procedures that survive the hand-off.',
    category: 'SOPs',
    publishedAt: '2026-09-12',
    tags: ['Delegation', 'Operations'],
    outcome: 'A tested SOP a teammate or contractor can run without asking you.',
    audience: 'Anyone about to delegate a recurring task.',
    time: '1–2 hours per SOP',
    level: 'Starter',
    tools: ['A screen recorder', 'A doc or wiki', 'One person to test it'],
    body: [
      {
        type: 'p',
        text: 'Most SOPs are written from memory, at a desk, by someone who has done the task a hundred times. That is exactly why they skip the steps that matter. This method writes the SOP from the work itself, then proves it with a real test.',
      },
    ],
    steps: [
      {
        title: 'Record yourself doing it',
        duration: '20 min',
        body: 'Do the task once while recording your screen and talking through why each step matters. Don’t write anything yet.',
      },
      {
        title: 'Draft from the recording',
        duration: '30 min',
        body: 'Turn the recording into numbered steps. One action per step, each starting with a verb. Add a screenshot wherever a click is easy to miss.',
      },
      {
        title: 'Add the edges',
        duration: '15 min',
        body: 'The parts people forget to write down are the ones that cause mistakes.',
        items: [
          'Trigger: when does this run?',
          'Done: what does finished look like?',
          'Common mistakes and how to fix them',
          'Who to ask when stuck',
        ],
      },
      {
        title: 'Test it with someone new',
        duration: '20 min',
        body: 'Hand it to someone who has never done the task. Watch without helping. Every question they ask is a missing line.',
      },
      {
        title: 'Fix, date and own it',
        duration: '15 min',
        body: 'Update the SOP, add a version date and an owner. Review it whenever the task or the tools change.',
        tip: 'An SOP nobody owns is out of date within a quarter.',
      },
    ],
    checklist: [
      'Task recorded with narration',
      'Numbered steps, one action each',
      'Screenshots where clicks are easy to miss',
      'Trigger and definition of done written',
      'Common mistakes listed',
      'Tested by someone new, silently',
      'Owner and version date added',
    ],
    templates: [
      {
        file: 'sop-template.md',
        name: 'SOP template',
        description: 'A one-page structure for any standard operating procedure.',
        mime: 'text/markdown',
        content: `# SOP: {task name}

Owner: {name} · Version: {YYYY-MM-DD}

## When to run it
{trigger}

## What done looks like
{definition of done}

## Before you start
- Access needed:
- Tools:

## Steps
1. {Verb} …
2. {Verb} …
3. {Verb} …

## Common mistakes
- {mistake} → {fix}

## Stuck?
Ask {person / channel}.
`,
      },
    ],
  },
  {
    slug: 'repurpose-one-post-into-a-week',
    title: 'Turn one long post into a week of content',
    summary:
      'A repeatable workflow to get seven pieces of content out of one good idea, without sounding repetitive.',
    category: 'Workflows',
    publishedAt: '2026-09-08',
    tags: ['Content', 'Distribution'],
    outcome: 'A week of platform-native posts from one long-form piece.',
    audience: 'Founders and creators who publish on more than one platform.',
    time: '2 hours',
    level: 'Starter',
    tools: ['Your long-form piece', 'A content calendar', 'An AI assistant (optional)'],
    body: [
      {
        type: 'p',
        text: 'A good long piece takes hours to make. Publishing it once is a waste. This workflow breaks one piece into the formats each platform actually rewards, and every short piece points back home to the original.',
      },
      {
        type: 'quote',
        text: 'Social gets the trailer. Your site gets the film.',
      },
    ],
    steps: [
      {
        title: 'Start from one strong piece',
        body: 'A blog post, video or talk with one clear point. It lives on your own site, so every short piece has somewhere to send people.',
      },
      {
        title: 'Pull out the atoms',
        duration: '20 min',
        body: 'Read it once and pull out the reusable parts.',
        items: [
          'The core idea in one sentence',
          'Three to five supporting points',
          'One story or example',
          'One surprising or contrarian line',
          'One checklist or framework',
        ],
      },
      {
        title: 'Match atoms to formats',
        duration: '30 min',
        body: 'Each atom becomes one piece: the story becomes a short video script, the checklist a carousel, the surprising line a short text post, the framework a simple diagram.',
      },
      {
        title: 'Write platform-native versions',
        duration: '45 min',
        body: 'Same idea, different packaging for each platform. An AI assistant is great for first drafts here; you own the final edit and the voice.',
        tip: 'Lead with the hook, not the context. Context is what the long piece is for.',
      },
      {
        title: 'Schedule across the week',
        duration: '15 min',
        body: 'Spread the pieces over seven days and your platforms. Every piece links or points back to the original.',
      },
      {
        title: 'Review what landed',
        duration: '10 min, a week later',
        body: 'Note which atom performed best. It is a strong hint for your next long piece.',
      },
    ],
    checklist: [
      'One long piece published on your own site',
      'Five atoms pulled out',
      'Each atom matched to a format',
      'Platform-native drafts written and edited',
      'Seven pieces scheduled',
      'Every piece points back to the original',
      'Results reviewed a week later',
    ],
    templates: [
      {
        file: 'content-week.csv',
        name: 'Content week planner',
        description: 'Plan seven pieces from one long post.',
        mime: 'text/csv',
        content: [
          'day,platform,format,atom,hook,links_back,status',
          'Mon,,Short text post,Surprising line,,yes,draft',
          'Tue,,Carousel,Checklist,,yes,draft',
          'Wed,,Short video,Story,,yes,draft',
          'Thu,,Thread,Supporting points,,yes,draft',
          'Fri,,Diagram,Framework,,yes,draft',
          'Sat,,Newsletter,Core idea,,yes,draft',
          'Sun,,Recap post,Best reply of the week,,yes,draft',
        ].join('\n'),
      },
    ],
  },
  {
    slug: 'weekly-operating-system',
    title: 'The founder’s weekly operating system',
    summary:
      'One review, one plan, three priorities: a weekly rhythm that keeps the business moving without heroics.',
    category: 'Systems',
    publishedAt: '2026-09-03',
    tags: ['Planning', 'Focus'],
    outcome: 'A repeatable 60-minute weekly review and a clear plan for the week.',
    audience: 'Solo founders and small teams juggling too many things at once.',
    time: '60 minutes a week',
    level: 'Starter',
    tools: ['Your calendar', 'A notes app or doc', 'Your key numbers'],
    body: [
      {
        type: 'p',
        text: 'Busy weeks feel productive and often aren’t. A weekly operating system is one fixed hour where you step out of the work, look at the whole board and choose what matters next.',
      },
      {
        type: 'p',
        text: 'It is deliberately simple. The value comes from doing it every single week, not from a clever template.',
      },
    ],
    steps: [
      {
        title: 'Block the hour',
        duration: '5 min, once',
        body: 'Same time every week, recurring in your calendar. Friday afternoon or Monday morning both work. Protect it like a client meeting.',
      },
      {
        title: 'Clear the decks',
        duration: '15 min',
        body: 'Get every loose end into one list so nothing lives only in your head.',
        items: [
          'Email and messages',
          'Notes and voice memos',
          'Browser tabs kept open “for later”',
        ],
      },
      {
        title: 'Check the numbers',
        duration: '10 min',
        body: 'Write down the three to five numbers that tell you whether the business is healthy: revenue, pipeline, output, audience. Trends matter more than any single week.',
      },
      {
        title: 'Review last week',
        duration: '10 min',
        body: 'What moved, what stalled, what surprised you. One line each. Be honest; this is for you.',
      },
      {
        title: 'Choose three priorities',
        duration: '15 min',
        body: 'The three outcomes that would make next week a win. Put time for each on the calendar before anything else gets in.',
        tip: 'If everything feels like a priority, pick the one that makes the others easier.',
      },
      {
        title: 'Share and schedule',
        duration: '5 min',
        body: 'If you have a team, share the three priorities. Then confirm next week’s review is on the calendar. Done.',
      },
    ],
    checklist: [
      'Weekly review is a recurring calendar event',
      'Inboxes cleared or captured in one list',
      'Key numbers recorded',
      'Last week reviewed in one line each',
      'Three priorities chosen',
      'Time blocked for each priority',
      'Next review confirmed',
    ],
    templates: [
      {
        file: 'weekly-review.md',
        name: 'Weekly review sheet',
        description: 'Copy it into your notes app every week.',
        mime: 'text/markdown',
        content: `# Weekly review · Week of {date}

## Numbers
| Metric | This week | Last week |
| ------ | --------- | --------- |
| Revenue |  |  |
| Pipeline |  |  |
| Output |  |  |
| Audience |  |  |

## Last week
- Moved:
- Stalled:
- Surprised me:

## Three priorities
1.
2.
3.

## Time blocked
- [ ] Priority 1
- [ ] Priority 2
- [ ] Priority 3
`,
      },
    ],
  },
  {
    slug: 'offer-clarity-framework',
    title: 'The offer clarity framework',
    summary:
      'Five questions that turn a fuzzy idea into an offer people understand in ten seconds.',
    category: 'Frameworks',
    publishedAt: '2026-08-27',
    tags: ['Offers', 'Positioning'],
    outcome: 'A one-page offer you can use on a landing page, a sales call or a pitch.',
    audience: 'Founders and freelancers launching or relaunching an offer.',
    time: '90 minutes',
    level: 'Starter',
    tools: ['A doc', 'Five real customers or prospects to test it on'],
    body: [
      {
        type: 'p',
        text: 'Most offers don’t fail because the product is bad. They fail because nobody can tell, quickly, who it is for and why it matters to them.',
      },
      {
        type: 'p',
        text: 'This framework forces the answers onto one page. If you can’t fill in a box, that box is the work.',
      },
    ],
    steps: [
      {
        title: 'Describe one specific person',
        duration: '20 min',
        body: 'Not a demographic, a person: their role, their situation and the moment they go looking for help.',
        items: [
          'What are they doing when the problem shows up?',
          'What have they already tried?',
          'What would they type into a search bar?',
        ],
        tip: 'If you have customers, use a real one. Their words beat yours.',
      },
      {
        title: 'Name the problem in their words',
        duration: '15 min',
        body: 'Write the "before" state the way they would say it. "I rebuild the same report every Monday" beats "lack of reporting automation".',
      },
      {
        title: 'Make one promise',
        duration: '15 min',
        body: 'The "after" state in one sentence, with a timeframe if you can keep it honestly. One promise. Offers with five promises have none.',
      },
      {
        title: 'Show why it’s believable',
        duration: '20 min',
        body: 'What makes the promise credible: a demo, a clear process, a case study, a guarantee. No proof yet? Make a smaller promise you can prove.',
      },
      {
        title: 'Price it against the problem',
        duration: '20 min',
        body: 'Price against what the problem costs them, not against your hours. Write the price, what is included and what is not.',
      },
    ],
    checklist: [
      'One specific customer described',
      'Problem written in their words',
      'One promise, one sentence',
      'At least one piece of proof',
      'Price, inclusions and exclusions written down',
      'Read aloud to someone in the audience',
      'Everything they asked about rewritten',
    ],
    templates: [
      {
        file: 'offer-one-pager.md',
        name: 'Offer one-pager',
        description: 'Fill in the five boxes and the 10-second version.',
        mime: 'text/markdown',
        content: `# Offer one-pager

## Who it's for
- Role / situation:
- The moment they look for help:
- What they've already tried:

## The problem (their words)
>

## The promise (one sentence)
>

## Why it's believable
-
-

## Price
- Price:
- Included:
- Not included:

## The 10-second version
{Offer} helps {who} go from {before} to {after} in {time}, without {main objection}.
`,
      },
    ],
  },
];
