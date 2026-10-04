import { buildSearchIndex } from '@/lib/search-index';

export const dynamic = 'force-static';

/** The site search index as static JSON, fetched by the ⌘K palette on first open. */
export async function GET() {
  return Response.json(await buildSearchIndex());
}
