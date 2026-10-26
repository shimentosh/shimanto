/**
 * Creates the two Content OS products if they don't exist yet: `content-os` (English, USD,
 * listed) and `content-os-bd` (Bangla, BDT, unlisted; the web proxy keeps it to Bangladesh).
 * Both start as drafts with their sales copy, cover and gallery; an admin checks the GitHub
 * repository and publishes them. Products that already exist are left untouched, so admin edits
 * are never overwritten.
 *
 * Images come from the public media domain (media.shimanto.xyz/media/content-os/…) and go
 * through MediaService like an admin upload. Runs after the seed on every production start
 * (see infra/docker/api.Dockerfile); locally: `pnpm build && node dist/scripts/content-os-products.js`.
 */
import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { ProductInputSchema } from '@shimanto/types';
import { AppModule } from '../app.module.js';
import { ProductsService } from '../commerce/products.js';
import { loadEnv } from '../config/env.js';
import { MediaService } from '../media/media.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const MEDIA = 'https://media.shimanto.xyz/media/content-os';

/** Where buyers get access. Confirm in the admin before publishing. */
const GITHUB = { githubOwner: 'shimentosh', githubRepo: 'contentos' };

type Image = { path: string; alt: string };

const studio = (file: string, alt: string): Image => ({ path: `studio/${file}.webp`, alt });

const products = [
  {
    cover: { path: 'story.jpg', alt: 'Content OS: one idea turned into finished posts' },
    gallery: [
      studio('overview', 'The Content OS Studio: a brand’s page overview'),
      studio('dashboard', 'The Content OS dashboard with every brand side by side'),
      studio('carousel', 'Editing a carousel in the Content OS Studio'),
      studio('videos', 'Video productions in the Content OS Studio'),
      studio('ideas', 'The ideas backlog, each idea with its reason'),
      studio('scheduler', 'The posting scheduler in the Content OS Studio'),
      studio('context', 'What the AI knows about a brand, in the Context screen'),
      studio('brand', 'A brand kit in the Content OS Studio'),
      {
        path: 'carousels/2026-09-27-small-team-big-output-with-ai/01.jpg',
        alt: 'A carousel made by Content OS: Do more without hiring more people',
      },
      {
        path: 'graphics/2026-10-03-weak-first-line-nobody-reads.jpg',
        alt: 'A post made by Content OS about writing a first line people read',
      },
    ],
    input: {
      slug: 'content-os',
      name: 'Content OS',
      type: 'SOFTWARE',
      version: '1.0',
      price: 11900,
      currency: 'USD',
      visibility: 'LISTED',
      featured: true,
      badge: 'New',
      tagline:
        'The content bot that knows your brand. Tell it what to post and get finished files.',
      summary:
        'A content bot that runs on your computer, remembers every brand you post for, and turns one line into carousels, posts, reels and YouTube videos that are ready to post.',
      description: [
        'Content OS is the system I built to run my own pages. You talk to it in Claude Code, Codex or Gemini, and it does the work a small content team would do: it plans, writes, designs, renders, checks and packs everything for posting.',
        'Every brand gets its own memory. Voice, audience, pillars, rules, colours, fonts and everything posted before stay with that brand, so a post for one page never sounds like another.',
        'It makes carousels in your brand kit, text posts and graphics with captions and hashtags, reels and Shorts, and full YouTube videos, all rendered on your computer. Before anything reaches you it runs 28 quality checks: hooks, overflow, brand, facts, timing and audio.',
        'You get the full source code in a private GitHub repository, the Studio to review and export, and every future update for life. One payment, no subscription.',
      ].join('\n\n'),
      highlights: [
        'One-time payment, lifetime updates',
        'Runs on your own computer',
        'A separate memory for every brand',
        'Works with Claude Code, Codex or Gemini',
      ],
      features: [
        'The full Content OS source code',
        'The Studio, the engine and the cos command line',
        '43 Claude Code skills and 18 specialist agents',
        'Every video format, headline style and motion demo',
        'Setup guide and a health check that shows what is missing',
        'Optional team sync server you host yourself',
        'Every future update, for life',
        'Private GitHub repository: update with one git pull',
      ],
      requirements: [
        'A Mac or Windows computer',
        'Node.js 22 or newer, pnpm and Git',
        'Claude Code in VS Code with your own Claude plan (Codex or Gemini CLI also work)',
        'FFmpeg and Playwright’s Chromium (the setup guide installs both)',
        'About 20 minutes to set up',
      ],
      benefits: [
        {
          title: 'It remembers each brand',
          body: 'Voice, audience, pillars, rules, colours and past posts are kept per brand. Switch pages and it switches with you, so nothing mixes.',
        },
        {
          title: 'Ask in plain words',
          body: 'Type what you want, or use a shortcut like /carousels or /video. Every idea it suggests comes with the reason behind it.',
        },
        {
          title: 'Carousels, posts and graphics',
          body: 'Carousels in 39 layouts and graphics from 30 templates, all in your brand kit, with a caption, a CTA line and four hashtags.',
        },
        {
          title: 'Reels and YouTube videos',
          body: 'Script, voice, scenes and a finished render: 80+ vertical formats and 59 YouTube formats, made in code on your machine.',
        },
        {
          title: 'Checked before you see it',
          body: '28 quality checks cover hooks, text overflow, brand colours and fonts, facts, timing and audio. What fails gets fixed first.',
        },
        {
          title: 'Your files, your accounts',
          body: 'Plain files on your computer and your own AI accounts. Paid APIs are optional, and it asks before it spends credits.',
        },
      ],
      faq: [
        {
          q: 'Is it a chatbot I log into?',
          a: 'No. It runs on your computer. You talk to it in Claude Code, Codex or Gemini, and the Studio is a local web app where you review and export everything.',
        },
        {
          q: 'Do I need to code?',
          a: 'No. Paste the setup prompt from the guides and your AI installs it for you. After that you ask in plain words or use short commands.',
        },
        {
          q: 'Does it post for me?',
          a: 'No. It stops at export: media, caption and hashtags in one package, ready for you or your scheduler.',
        },
        {
          q: 'What does it cost to run?',
          a: 'Your own AI plan, plus any optional media APIs you switch on, billed to your own accounts. Content OS itself is a one-time payment.',
        },
        {
          q: 'How do I get it after buying?',
          a: 'Connect your GitHub account in your customer account and you are invited to the private repository. Updates arrive with git pull.',
        },
        {
          q: 'How many brands can I run?',
          a: 'As many as you like. Each one gets its own context, brand kit, voice and history.',
        },
      ],
      demoUrl: 'https://shimanto.xyz/content-os/features',
      deliverGithub: true,
      ...GITHUB,
    },
  },
  {
    cover: { path: 'story.jpg', alt: 'Content OS: একটা আইডিয়া থেকে তৈরি পোস্ট' },
    gallery: [
      studio('overview', 'Content OS Studio: একটা brand-এর পেজ ওভারভিউ'),
      studio('dashboard', 'Content OS dashboard, সব brand পাশাপাশি'),
      studio('carousel', 'Content OS Studio-তে carousel এডিট করা হচ্ছে'),
      studio('videos', 'Content OS Studio-তে ভিডিও প্রোডাকশন'),
      studio('ideas', 'আইডিয়ার লিস্ট, প্রতিটার পেছনের কারণসহ'),
      studio('scheduler', 'Content OS Studio-র পোস্টিং scheduler'),
      studio('context', 'Context স্ক্রিন: AI একটা brand সম্পর্কে যা জানে'),
      studio('brand', 'Content OS Studio-তে একটা brand kit'),
      {
        path: 'bn/carousels/2026-09-27-small-team-big-output-with-ai/01.jpg',
        alt: 'Content OS-এ বানানো carousel: লোক না বাড়িয়ে বেশি কাজ',
      },
      {
        path: 'bn/graphics/2026-10-03-weak-first-line-nobody-reads.jpg',
        alt: 'Content OS-এ বানানো পোস্ট: প্রথম লাইন কীভাবে লিখবেন',
      },
    ],
    input: {
      slug: 'content-os-bd',
      name: 'Content OS (বাংলাদেশ)',
      type: 'SOFTWARE',
      version: '1.0',
      price: 500000,
      compareAtPrice: 1450000,
      currency: 'BDT',
      visibility: 'UNLISTED',
      featured: false,
      badge: 'বিশেষ দাম',
      tagline: 'যে content bot আপনার brand চেনে, বলুন কী পোস্ট করবেন আর তৈরি ফাইল নিন',
      summary:
        'আপনার কম্পিউটারে চলা একটা content bot, যে আপনার প্রতিটা brand মনে রাখে আর এক লাইন থেকে carousel, পোস্ট, reel আর YouTube ভিডিও বানিয়ে দেয়',
      description: [
        'Content OS আমি বানিয়েছি নিজের পেজগুলো চালানোর জন্য। মানে, এটা সেই system যা দিয়ে আমার নিজের content বের হয়',
        'আপনি Claude Code, Codex বা Gemini-তে কথা বলবেন, আর ও একটা ছোট content টিমের কাজ করে দেবে: প্ল্যান, লেখা, ডিজাইন, render, চেক, তারপর পোস্টের জন্য প্যাক করা',
        'প্রতিটা brand-এর আলাদা মেমরি থাকে। Voice, audience, pillar, নিয়ম, রং, font আর আগের সব পোস্ট সেই brand-এর সাথেই থাকে, তাই এক পেজের পোস্ট আরেক পেজের মতো শোনায় না',
        'আপনার brand kit-এ carousel, caption আর hashtag সহ পোস্ট ও graphic, reel, Shorts আর পুরো YouTube ভিডিও, সব আপনার কম্পিউটারেই render হয়। আপনার কাছে আসার আগে ২৮টা কোয়ালিটি চেক পার হয়',
        'পুরো source code পাবেন একটা private GitHub repository-তে, সাথে Studio আর সারাজীবনের আপডেট। একবার পেমেন্ট, কোনো সাবস্ক্রিপশন নেই। পেমেন্ট করা যাবে bKash বা Nagad-এ',
      ].join('\n\n'),
      highlights: [
        'একবার পেমেন্ট, সারাজীবন আপডেট',
        'চলে আপনার নিজের কম্পিউটারে',
        'প্রতিটা brand-এর আলাদা মেমরি',
        'bKash বা Nagad-এ পেমেন্ট',
      ],
      features: [
        'Content OS-এর পুরো source code',
        'Studio, engine আর cos command line',
        '৪৩টা Claude Code skill আর ১৮টা specialist agent',
        'সব ভিডিও format, headline স্টাইল আর motion ডেমো',
        'Setup গাইড আর একটা health check, যা দেখায় কী বাকি আছে',
        'চাইলে নিজের সার্ভারে team sync',
        'ভবিষ্যতের সব আপডেট, সারাজীবন',
        'Private GitHub repository, আপডেট এক git pull-এ',
      ],
      requirements: [
        'একটা Mac বা Windows কম্পিউটার',
        'Node.js 22 বা নতুন, pnpm আর Git',
        'VS Code-এ Claude Code, নিজের Claude plan সহ (Codex বা Gemini CLI-ও চলবে)',
        'FFmpeg আর Playwright-এর Chromium (setup গাইড দুটোই install করে দেয়)',
        'সেটআপে মোটামুটি ২০ মিনিট',
      ],
      benefits: [
        {
          title: 'প্রতিটা brand মনে রাখে',
          body: 'Voice, audience, pillar, নিয়ম, রং আর আগের পোস্ট প্রতিটা brand-এর আলাদা থাকে। পেজ বদলালে ও-ও বদলে যায়, কিছু মেশে না',
        },
        {
          title: 'সহজ কথায় বলুন',
          body: 'যা চান লিখুন, বা /carousels, /video এর মতো shortcut দিন। প্রতিটা আইডিয়ার সাথে কারণটাও বলে দেয়',
        },
        {
          title: 'Carousel, পোস্ট আর graphic',
          body: '৩৯টা layout-এ carousel আর ৩০টা template থেকে graphic, সব আপনার brand kit-এ, caption, CTA আর ৪টা hashtag সহ',
        },
        {
          title: 'Reel আর YouTube ভিডিও',
          body: 'Script, voice, scene আর ফাইনাল render: ৮০+ vertical format আর ৫৯টা YouTube format, আপনার কম্পিউটারেই কোডে বানানো',
        },
        {
          title: 'আপনি দেখার আগেই চেক করা',
          body: 'Hook, লেখা উপচে যাওয়া, brand-এর রং আর font, তথ্য, টাইমিং আর অডিও মিলিয়ে ২৮টা চেক। যা আটকায়, আগে ঠিক হয়',
        },
        {
          title: 'ফাইল আর অ্যাকাউন্ট আপনার',
          body: 'সব ফাইল আপনার কম্পিউটারে, AI অ্যাকাউন্টও আপনার। Paid API চাইলে চালু করবেন, খরচের আগে ও জিজ্ঞেস করে নেয়',
        },
      ],
      faq: [
        {
          q: 'এটা কি লগইন করে চালানোর chatbot?',
          a: 'না। এটা চলে আপনার কম্পিউটারে। Claude Code, Codex বা Gemini-তে কথা বলবেন, আর Studio হলো একটা লোকাল web app যেখানে সব দেখে export করবেন',
        },
        {
          q: 'কোডিং জানতে হবে?',
          a: 'না। গাইড থেকে setup prompt কপি করে দিলেই আপনার AI সব install করে দেবে। তারপর সহজ কথায় বলবেন, বা ছোট command দেবেন',
        },
        {
          q: 'পেমেন্ট কীভাবে করব?',
          a: 'bKash, Nagad বা ব্যাংক ট্রান্সফারে টাকায় পেমেন্ট করবেন। পেমেন্ট কনফার্ম হলে GitHub-এ অ্যাক্সেস পেয়ে যাবেন',
        },
        {
          q: 'নিজে নিজে পোস্ট করে দেয়?',
          a: 'না। Export পর্যন্ত করে: মিডিয়া, caption আর hashtag এক প্যাকেজে, আপনি বা আপনার scheduler পোস্ট করবেন',
        },
        {
          q: 'চালাতে মাসে কত খরচ?',
          a: 'আপনার নিজের AI plan, আর চাইলে কিছু media API, যার বিল আসবে আপনার অ্যাকাউন্টে। Content OS নিজে একবারের পেমেন্ট',
        },
        {
          q: 'বাংলায় কাজ করে?',
          a: 'হ্যাঁ। প্রতিটা পেজের ভাষা আলাদা সেট করা যায়, বাংলা পেজে বাংলা ঠিকমতো দেখানোর মতো টাইপোগ্রাফি আর বাংলা ট্রান্সক্রিপশন আছে',
        },
      ],
      demoUrl: 'https://shimanto.xyz/bn/content-os/features',
      deliverGithub: true,
      ...GITHUB,
    },
  },
] as const;

async function main() {
  const env = loadEnv();
  const app = await NestFactory.createApplicationContext(AppModule.forRoot(env), {
    logger: ['error', 'warn'],
  });
  try {
    const prisma = app.get(PrismaService);
    const media = app.get(MediaService);
    const productsService = app.get(ProductsService);
    // Uploads and the product are recorded against the first super admin, like an admin action.
    const admin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
      orderBy: { createdAt: 'asc' },
    });
    if (!admin) {
      console.log('Content OS products: no admin account yet, skipped.');
      return;
    }
    const actor = { type: 'user' as const, id: admin.id };

    const upload = async (image: Image) => {
      const res = await fetch(`${MEDIA}/${image.path}`);
      if (!res.ok) throw new Error(`${image.path}: ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const name = image.path.split('/').join('-');
      const saved = await media.upload(
        { buffer, originalname: name },
        { alt: image.alt, visibility: 'public' },
        actor,
      );
      return saved.id;
    };

    for (const product of products) {
      const { slug } = product.input;
      if (await prisma.product.findUnique({ where: { slug } })) {
        console.log(`Content OS products: ${slug} exists, left unchanged.`);
        continue;
      }
      const coverId = await upload(product.cover);
      const galleryIds: string[] = [];
      for (const image of product.gallery) galleryIds.push(await upload(image));
      const input = ProductInputSchema.parse({ ...product.input, coverId, galleryIds });
      await productsService.create(input, actor);
      console.log(`Content OS products: created ${slug} as a draft.`);
    }
  } finally {
    await app.close();
  }
}

// Never block the API from starting: give up after two minutes (an unreachable database or
// media domain), and always exit when done, even if a queue connection is still open.
setTimeout(() => {
  console.error('Content OS products: timed out, skipped.');
  process.exit(1);
}, 120_000).unref();

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Content OS products:', error);
    process.exit(1);
  });
