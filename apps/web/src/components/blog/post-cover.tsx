import { accentBg, cn } from '@shimanto/ui';
import type { Entry } from '@/content/catalog';
import { Icon } from '@shimanto/ui';
import { iconFor, issueNumber, worldFor } from '@/lib/blog';

export interface PostCoverProps {
  post: Entry;
  size?: 'card' | 'feature' | 'hero';
  className?: string;
}

/**
 * Generated cover for a post: a flat panel in its category colour with the issue number and the
 * category set large. Consistent and calm, without stock photos. Decorative only.
 */
export function PostCover({ post, size = 'card', className }: PostCoverProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'on-world rounded-card relative overflow-hidden',
        accentBg[worldFor(post)],
        className,
      )}
    >
      <Icon
        name={iconFor(post)}
        strokeWidth={1.1}
        className={cn(
          'absolute top-1/2 right-[7%] h-auto -translate-y-1/2 opacity-80',
          size === 'hero' ? 'w-[18%]' : 'w-[34%]',
        )}
      />
      <span
        className={cn(
          'absolute top-[8%] left-[6%] font-mono tracking-[0.18em] uppercase opacity-70',
          size === 'card' ? 'text-[11px]' : 'text-xs',
        )}
      >
        Nº {issueNumber(post.slug)}
      </span>
      <span
        className={cn(
          'absolute right-[6%] bottom-[7%] left-[6%] leading-[0.95] font-medium tracking-[-0.045em]',
          size === 'hero'
            ? 'text-5xl md:text-7xl'
            : size === 'feature'
              ? 'text-4xl md:text-5xl'
              : 'text-2xl',
        )}
      >
        {post.category}
      </span>
    </div>
  );
}
