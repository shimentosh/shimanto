import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PostListItem } from '@/components/blog/post-card';
import { ArticleLayout } from '@/components/page/article';
import { JsonLd } from '@/components/page/json-ld';
import { FollowAlong } from '@/components/page/social-reach';
import { posts } from '@/content/catalog';
import { publishingOsCovers } from '@/content/publishing-os';
import { issueNumber, relatedPosts, sortedPosts, worldFor } from '@/lib/blog';
import { pageMetadata } from '@/lib/seo';
import { absoluteUrl, site } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = posts.find((p) => p.slug === slug);
  if (!post) return {};
  const cover = publishingOsCovers[post.slug];
  return {
    ...pageMetadata({ title: post.title, description: post.summary, path: `/blog/${post.slug}` }),
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.summary,
      url: `/blog/${post.slug}`,
      publishedTime: post.publishedAt,
      authors: [site.name],
      tags: post.tags,
      ...(cover && {
        images: [{ url: cover.src, width: cover.width, height: cover.height, alt: cover.alt }],
      }),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const all = sortedPosts();
  const index = all.findIndex((p) => p.slug === slug);
  const post = all[index];
  if (!post) notFound();
  const newer = all[index - 1];
  const older = all[index + 1];
  const related = relatedPosts(post);
  const url = absoluteUrl(`/blog/${post.slug}`);

  return (
    <main id="main">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.summary,
          datePublished: post.publishedAt,
          dateModified: post.updatedAt ?? post.publishedAt,
          articleSection: post.category,
          keywords: post.tags?.join(', '),
          author: { '@type': 'Person', name: site.name, url: absoluteUrl('/about') },
          mainEntityOfPage: url,
        }}
      />
      <ArticleLayout
        entry={post}
        eyebrow={post.category}
        kicker={`Nº ${issueNumber(post.slug)}`}
        tone={worldFor(post)}
        url={url}
        crumbs={[
          { label: 'Blog', href: '/blog' },
          { label: post.title, href: `/blog/${post.slug}` },
        ]}
        after={<FollowAlong />}
        prev={older && { href: `/blog/${older.slug}`, title: older.title }}
        next={newer && { href: `/blog/${newer.slug}`, title: newer.title }}
        related={
          related.length > 0 && (
            <section aria-labelledby="related-title" className="border-ink/10 mt-20 border-t pt-12">
              <p className="text-ink-soft text-sm font-medium">Keep reading</p>
              <h2
                id="related-title"
                className="mt-2 text-2xl font-medium tracking-[-0.03em] md:text-4xl"
              >
                More from the notebook.
              </h2>
              <ol className="border-ink/10 mt-8 border-b">
                {related.map((p) => (
                  <li key={p.slug}>
                    <PostListItem post={p} />
                  </li>
                ))}
              </ol>
            </section>
          )
        }
        backHref="/blog"
        backLabel="All notes"
      />
    </main>
  );
}
