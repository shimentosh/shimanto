import type { Accent, IconName } from '@shimanto/ui';

/** A short line with its icon. */
export type Point = { text: string; icon: IconName };

/**
 * Every word on the Content OS landing page, per language. The page renders only from this, so a
 * new language is a new copy file plus a route: `en.ts` → `/content-os`, `bn.ts` → `/bn/content-os`.
 * `{price}` is replaced with the live store price; `{videos}`, `{carousels}`, `{posts}` with counts.
 */
export interface ContentOsCopy {
  meta: { title: string; description: string };

  nav: {
    back: string;
    links: Array<{ href: string; label: string }>;
    buy: string;
  };

  hero: {
    badge: string;
    title: { line1: string; line2: string };
    intro: string;
    buy: string;
    watch: string;
    points: Point[];
    stats: Array<{ value: string; label: string; icon: IconName }>;
    videoLabel: string;
    videoCaption: string;
  };

  /** The hero's chat: Content OS shown as a bot you talk to, cycling through real jobs. */
  bot: {
    name: string;
    status: string;
    placeholder: string;
    you: string;
    /** Screen-reader summary of the animated chat. */
    label: string;
    pause: string;
    play: string;
    chats: Array<{
      /** Short label on the chip that switches to this chat. */
      chip: string;
      prompt: string;
      /** What it does before answering, one line each. */
      steps: string[];
      reply: string;
      /** Which real output to attach. */
      show: 'carousel' | 'reel' | 'post' | 'youtube';
    }>;
  };

  /** The plain-words overview: everything it makes, by type. */
  makes: {
    eyebrow: string;
    title: string;
    rest: string;
    kinds: Array<{
      title: string;
      body: string;
      examples: string[];
      icon: IconName;
      tone: Accent;
    }>;
  };

  carousels: {
    eyebrow: string;
    title: string;
    rest: string;
    intro: string;
    pick: string;
    slideOf: string;
    prev: string;
    next: string;
    captionLabel: string;
    note: string;
    points: Point[];
  };

  posts: {
    eyebrow: string;
    title: string;
    rest: string;
    intro: string;
    note: string;
    readMore: string;
    points: Point[];
  };

  gallery: {
    eyebrow: string;
    title: string;
    rest: string;
    intro: string;
    all: string;
    showMore: string;
    close: string;
    vertical: string;
    landscape: string;
    /** Badge on a format that also comes in 16:9. */
    wideToo: string;
    note: string;
  };

  real: {
    eyebrow: string;
    title: string;
    intro: string;
  };

  /** Past the catalogue: styles, a brand host, "make it like this", anything you describe. */
  beyond: {
    eyebrow: string;
    title: string;
    rest: string;
    intro: string;
    /** Things to ask for, shown as chat bubbles. */
    asks: string[];
    /** One per style clip; `id` matches the clip in demos.json. */
    styles: Array<{ id: string; title: string; body: string }>;
    host: { title: string; body: string; sheet: string; emotions: string };
    note: string;
  };

  /**
   * Brand memory: a 3D "brain" of the context Content OS keeps per page, with real pages to
   * switch between. Each page's facts come from its own context files.
   */
  memory: {
    eyebrow: string;
    title: string;
    rest: string;
    intro: string;
    switchLabel: string;
    /** The context categories orbiting the core. */
    categories: string[];
    /** Where the core sends finished work. */
    outputs: string[];
    labels: {
      voice: string;
      audience: string;
      pillars: string;
      rule: string;
      colours: string;
      fonts: string;
      platform: string;
      language: string;
    };
    brands: Array<{
      id: string;
      name: string;
      handle: string;
      /** Brand name of the platform (its logo is looked up by it). */
      platform: string;
      colors: string[];
      fonts: string;
      language: string;
      voice?: string;
      audience?: string;
      pillars?: string;
      rule?: string;
    }>;
    note: string;
    /** Screen-reader description of the animation. */
    visualLabel: string;
  };

  /** Everything it can do, in four groups. */
  abilities: {
    eyebrow: string;
    title: string;
    rest: string;
    groups: Array<{ title: string; blurb: string; icon: IconName; tone: Accent; items: Point[] }>;
  };

  how: {
    eyebrow: string;
    title: string;
    rest: string;
    steps: Array<{ title: string; body: string; command?: string; icon: IconName; tone: Accent }>;
  };

  different: {
    eyebrow: string;
    title: string;
    rest: string;
    items: Array<{ title: string; body: string; icon: IconName; tone: Accent }>;
  };

  commands: {
    eyebrow: string;
    title: string;
    intro: string;
    list: Array<{ command: string; does: string; icon: IconName }>;
  };

  platforms: {
    eyebrow: string;
    title: string;
    /** `name` is the platform's brand name (its logo is looked up by it). */
    list: Array<{ name: string; formats: Array<{ label: string; icon: IconName }> }>;
    languageNote: string;
  };

  audience: {
    eyebrow: string;
    title: string;
    list: Array<{ title: string; body: string; icon: IconName; tone: Accent }>;
  };

  pricing: {
    eyebrow: string;
    title: string;
    rest: string;
    plan: string;
    priceNote: string;
    included: Point[];
    buy: string;
    comingSoon: string;
    refund: { before: string; link: string; after: string };
  };

  requirements: {
    eyebrow: string;
    title: string;
    intro: string;
    needed: { title: string; list: Point[] };
    optional: { title: string; list: Array<{ key: string; unlocks: string; icon: IconName }> };
    costs: string;
  };

  faq: { eyebrow: string; title: string; list: Array<{ q: string; a: string }> };

  final: { title: string; rest: string; buy: string; note: string };

  footer: {
    by: string;
    back: string;
    links: Array<{ href: string; label: string }>;
  };
}
