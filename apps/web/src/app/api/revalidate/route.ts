import { revalidateTag } from 'next/cache';
import { verifyRevalidation } from '@/lib/revalidate';

/**
 * On-demand revalidation webhook, called by the API when products change (price, name, cover,
 * published state), so code-built sales pages always show current data.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const result = verifyRevalidation(
    process.env.REVALIDATE_SECRET,
    request.headers.get('x-revalidate-timestamp'),
    request.headers.get('x-revalidate-signature'),
    body,
  );
  if (!result.ok) {
    return Response.json(
      { error: result.reason },
      { status: result.reason === 'not configured' ? 503 : 401 },
    );
  }
  // Expire immediately: a changed price must never be served stale.
  for (const tag of result.tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: result.tags });
}
