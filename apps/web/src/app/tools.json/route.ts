import { absoluteUrl } from '@/lib/site';
import { priceLabel, tools } from '@/content/tools';

export const dynamic = 'force-static';

/**
 * Every tool on /tools as a public JSON feed, newest first, for other sites
 * to list (the Clientdesk client portal's Tools page reads it).
 *
 * Built from the same `tools` array as the pages, so adding a tool there and
 * deploying is all "publishing" takes: the feed changes with the deploy.
 * Only what the public page already shows; every URL is absolute.
 */
export function GET() {
  const body = {
    version: 1,
    site: absoluteUrl('/tools'),
    tools: tools.map((t) => ({
      slug: t.slug,
      name: t.name,
      kind: t.kind,
      tagline: t.tagline,
      price: priceLabel(t),
      free: t.price === undefined,
      url: absoluteUrl(`/tools/${t.slug}`),
      href: t.href,
      cta: t.cta,
      logo: absoluteUrl(t.logo.src),
      image: t.screenshots[0] ? absoluteUrl(t.screenshots[0].src) : null,
      video: t.youtubeId ? `https://youtu.be/${t.youtubeId}` : null,
      tags: t.tags,
    })),
  };
  return Response.json(body, {
    headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, max-age=300' },
  });
}
