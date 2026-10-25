import data from './demos.json';

/**
 * Everything Content OS has rendered that the landing page shows: the format demos (made-up
 * brands), real work and style tests for Dot Mirror, and carousels and posts made in Shimanto's
 * brand kit. The files live in R2 under `media/content-os/`: a small preview of each (cards,
 * hover) and the original under `full/` (opened on click). `demos.json` holds their keys.
 */
export const CONTENT_OS_MEDIA = (
  process.env.NEXT_PUBLIC_CONTENT_OS_MEDIA_URL ?? 'https://media.shimanto.xyz/media/content-os'
).replace(/\/+$/, '');

const url = (key: string) => `${CONTENT_OS_MEDIA}/${key}`;

export type DemoGroup = keyof typeof data.groups;

/** A video with a light preview for cards and the original for the player. */
export interface DemoVideo {
  video: string;
  poster: string;
  full: string;
}

export interface FormatDemo extends DemoVideo {
  id: string;
  name: string;
  tagline: string;
  group: DemoGroup;
  aspect: '9:16' | '16:9' | '1:1';
  /** The same format at 16:9, when it has one. */
  wide?: DemoVideo;
}

export interface CarouselDemo {
  id: string;
  hook: string;
  caption: string;
  hashtags: string[];
  slides: Array<{ src: string; full: string }>;
}

export interface GraphicDemo {
  id: string;
  channel: string | null;
  series: { name: string } | null;
  hook: string;
  caption: string;
  hashtags: string[];
  image: string;
  full: string;
}

export interface RealDemo extends DemoVideo {
  id: string;
  title: string;
  brand: string;
  aspect: string;
}

/** A style engine clip (hand-painted, collage, 3D…), keyed by the copy's `beyond.styles[].id`. */
export interface BeyondDemo extends DemoVideo {
  id: string;
  aspect: string;
}

/** A brand host character drawn from a logo: a demo, its model sheet and its emotions. */
export interface HostDemo extends DemoVideo {
  sheet: string;
  sheetFull: string;
  emotions: string;
  emotionsFull: string;
}

const clip = <T extends DemoVideo>(c: T): T => ({
  ...c,
  video: url(c.video),
  poster: url(c.poster),
  full: url(c.full),
});

export const demoGroups = data.groups as Record<DemoGroup, string>;

export const storyDemo = clip(data.story as DemoVideo);

export const formatDemos: FormatDemo[] = (data.formats as FormatDemo[]).map((f) => ({
  ...clip(f),
  ...(f.wide ? { wide: clip(f.wide) } : {}),
}));

export const carouselDemos: CarouselDemo[] = (data.carousels as CarouselDemo[]).map((c) => ({
  ...c,
  slides: c.slides.map((s) => ({ src: url(s.src), full: url(s.full) })),
}));

export const graphicDemos: GraphicDemo[] = (data.graphics as GraphicDemo[]).map((g) => ({
  ...g,
  image: url(g.image),
  full: url(g.full),
}));

export const realDemos = (data.real as RealDemo[]).map(clip);
export const beyondDemos = (data.beyond as BeyondDemo[]).map(clip);

const host = data.host as Partial<HostDemo>;
export const hostDemo: HostDemo | null =
  host.sheet && host.sheetFull && host.emotions && host.emotionsFull
    ? {
        ...clip(host as HostDemo),
        sheet: url(host.sheet),
        sheetFull: url(host.sheetFull),
        emotions: url(host.emotions),
        emotionsFull: url(host.emotionsFull),
      }
    : null;

/** Every video file on the page, counting 16:9 versions. */
export const videoDemoCount = formatDemos.reduce((n, f) => n + (f.wide ? 2 : 1), 0);
