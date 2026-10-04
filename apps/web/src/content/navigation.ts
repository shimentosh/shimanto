import type { CommandGroup, NavGroup, NavLink } from '@shimanto/ui';
import { PORTAL_URL } from '@/lib/public-env';

/** Customer portal: orders, downloads, support. */
export const accountNav: NavLink = { href: `${PORTAL_URL}/login`, label: 'My account' };

/** Primary nav (brief §3, with Writing renamed to Blog): Work · Products · Blog · Playbooks · Tools. */
export const primaryNav: NavLink[] = [
  { href: '/work', label: 'Work' },
  { href: '/products', label: 'Products' },
  { href: '/blog', label: 'Blog' },
  { href: '/playbooks', label: 'Playbooks' },
  { href: '/tools', label: 'Tools' },
];

export const ctaNav = { href: '/collaborate', label: "Let's build" };

/** Everything else, grouped as in the brief: Explore / Create / Proof / Personal. */
export const menuGroups: NavGroup[] = [
  {
    title: 'Explore',
    links: [
      { href: '/experiments', label: 'Experiments' },
      { href: '/resources', label: 'Resources' },
      { href: '/lab', label: 'Marketing Lab' },
      { href: '/skills', label: 'Skills Galaxy' },
      { href: '/exploring', label: 'Currently exploring' },
    ],
  },
  {
    title: 'Create',
    links: [
      { href: '/creative', label: 'Creative Archive' },
      { href: '/social', label: 'Social Universe' },
    ],
  },
  {
    title: 'Proof',
    links: [{ href: '/featured', label: 'Featured' }],
  },
  {
    title: 'Personal',
    links: [
      { href: '/about', label: 'About' },
      { href: '/personal', label: 'Personal side' },
      { href: '/collaborate', label: 'Collaborate' },
    ],
  },
];

export const footerColumns: NavGroup[] = [
  {
    title: 'Build',
    links: [
      { href: '/work', label: 'Work' },
      { href: '/products', label: 'Products' },
      { href: '/tools', label: 'Tools' },
      { href: '/experiments', label: 'Experiments' },
      { href: '/lab', label: 'Marketing Lab' },
    ],
  },
  {
    title: 'Read',
    links: [
      { href: '/blog', label: 'Blog' },
      { href: '/playbooks', label: 'Playbooks' },
      { href: '/resources', label: 'Resources' },
    ],
  },
  {
    title: 'Me',
    links: [
      { href: '/about', label: 'About' },
      { href: '/creative', label: 'Creative Archive' },
      { href: '/collaborate', label: 'Collaborate' },
      accountNav,
    ],
  },
];

export const legalNav: NavLink[] = [
  { href: '/legal/privacy', label: 'Privacy' },
  { href: '/legal/terms', label: 'Terms' },
  { href: '/legal/refund', label: 'Refunds' },
];

/** When the audience numbers below were last read off the profiles. Update together. */
export const audienceAsOf = { iso: '2026-10', label: 'October 2026' };

/**
 * Current public profiles. The footer, the home page and /social all read this list.
 */
export const socialProfiles: Array<{
  label: string;
  handle: string;
  href: string | null;
  /**
   * Audience size as shown on the profile (or as Shimanto states it), as of `audienceAsOf`.
   * Hidden when unknown; never estimated.
   */
  audience?: number;
  /** What the platform calls that audience. */
  audienceLabel: 'subscribers' | 'followers';
  /** One more public number worth showing, e.g. TikTok likes. */
  extra?: { value: number; label: string };
}> = [
  {
    label: 'YouTube',
    handle: '@sh1manto',
    href: 'https://www.youtube.com/@sh1manto',
    audience: 1_350,
    audienceLabel: 'subscribers',
  },
  {
    label: 'Instagram',
    handle: '@shimanto.bn',
    href: 'https://www.instagram.com/shimanto.bn/',
    audience: 3_160,
    audienceLabel: 'followers',
  },
  {
    label: 'Facebook',
    handle: 'sh1manto',
    href: 'https://www.facebook.com/sh1manto/',
    audience: 36_256,
    audienceLabel: 'followers',
  },
  {
    label: 'TikTok',
    handle: '@sh1mant0',
    href: 'https://www.tiktok.com/@sh1mant0',
    audience: 20_100,
    audienceLabel: 'followers',
    extra: { value: 1_400_000, label: 'likes' },
  },
];

/**
 * "36,256" → "36.2K". Rounds down, so a shown number is never more than the real one.
 */
export function formatAudience(n: number): string {
  return new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumSignificantDigits: 3,
    roundingMode: 'floor',
  }).format(n);
}

/** ⌘K palette entries: every top-level page, grouped the same way as the menu. */
export const commandGroups: CommandGroup[] = [
  {
    heading: 'Go to',
    items: [{ href: '/', label: 'Home' }, ...primaryNav, ctaNav].map((link) => ({
      href: link.href,
      label: link.label,
    })),
  },
  ...menuGroups.map((group) => ({
    heading: group.title,
    items: group.links
      .filter((link) => link.href !== ctaNav.href)
      .map((link) => ({ href: link.href, label: link.label, hint: group.title })),
  })),
];
