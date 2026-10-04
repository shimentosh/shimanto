import { Button, cn } from '@shimanto/ui';
import type { Entry } from '@/content/catalog';
import { PostCard } from './post-card';

/** "Keep reading" row of blog cards. Renders nothing when there are no posts. */
export function RelatedPosts({
  posts,
  eyebrow = 'From the blog',
  title = 'Start with these notes.',
  className,
}: {
  posts: Entry[];
  eyebrow?: string;
  title?: string;
  className?: string;
}) {
  if (posts.length === 0) return null;
  return (
    <section aria-label={title} className={cn('border-ink/10 mt-16 border-t pt-12', className)}>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-ink-soft text-sm font-medium">{eyebrow}</p>
          <h2 className="mt-2 text-2xl leading-tight font-medium tracking-[-0.03em] md:text-4xl">
            {title}
          </h2>
        </div>
        <Button href="/blog" variant="text">
          All notes →
        </Button>
      </div>
      <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <PostCard post={post} />
          </li>
        ))}
      </ul>
    </section>
  );
}
