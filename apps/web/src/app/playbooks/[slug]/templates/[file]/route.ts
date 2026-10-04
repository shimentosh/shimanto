import { playbooks } from '@/content/playbooks';

export const dynamicParams = false;

export function generateStaticParams() {
  return playbooks.flatMap((p) => p.templates.map((t) => ({ slug: p.slug, file: t.file })));
}

/** Serves a playbook template as a downloadable file. Built statically at deploy time. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; file: string }> },
) {
  const { slug, file } = await params;
  const template = playbooks.find((p) => p.slug === slug)?.templates.find((t) => t.file === file);
  if (!template) return new Response('Not found', { status: 404 });
  return new Response(template.content, {
    headers: {
      'content-type': `${template.mime}; charset=utf-8`,
      'content-disposition': `attachment; filename="${template.file}"`,
    },
  });
}
