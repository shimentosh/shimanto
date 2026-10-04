import type { SearchDoc } from './search-index';

function score(doc: SearchDoc, terms: string[]): number {
  const title = doc.title.toLowerCase();
  const text = doc.text.toLowerCase();
  let total = 0;
  for (const term of terms) {
    // One letter matches almost everything, so it only counts at the start of a title word.
    if (term.length < 2) {
      if (title.startsWith(term)) total += 5;
      else if (title.split(/[\s:·-]+/).some((word) => word.startsWith(term))) total += 2;
      else return 0;
      continue;
    }
    if (title.startsWith(term)) total += 5;
    else if (title.includes(term)) total += 3;
    else if (text.includes(term)) total += 1;
    else return 0;
  }
  return total;
}

/**
 * Ranks the index against a query: every term must match somewhere, title hits beat body hits.
 * Shared by /search and the ⌘K palette so both find the same things in the same order.
 */
export function searchDocs(docs: SearchDoc[], query: string, limit = 30): SearchDoc[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  const seen = new Set<string>();
  return docs
    .map((doc) => ({ doc, s: score(doc, terms) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .filter(({ doc }) => {
      const key = `${doc.kind}:${doc.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map(({ doc }) => doc);
}
