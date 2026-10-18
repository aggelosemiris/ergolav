import Link from 'next/link';
import type { ReactNode } from 'react';
import type { PlayContext } from '@/lib/types';
import { PlayContextButton } from '@/components/player/PlayContextButton';

interface Props {
  href: string;
  title: string;
  subtitle: ReactNode;
  art: ReactNode;
  round?: boolean;
  context?: PlayContext;
  /** custom play control instead of the context button */
  action?: ReactNode;
}

/** Square (album/playlist) or round (artist) card with a play button that rises on hover/focus. */
export function MediaCard({ href, title, subtitle, art, round = false, context, action }: Props) {
  return (
    <div className="group relative flex w-full flex-col gap-2 rounded-lg p-3 transition-colors duration-200 hover:bg-surface-2 focus-within:bg-surface-2">
      <div className={`relative shadow-card ${round ? 'rounded-full' : 'rounded-md'}`}>
        {art}
        {(context || action) && (
          <div className="absolute right-2 bottom-2 z-10 translate-y-2 opacity-0 transition duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100">
            {action ?? (context && <PlayContextButton context={context} size="sm" />)}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <Link href={href} className="line-clamp-1 font-bold text-text after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
          {title}
        </Link>
        <div className="mt-0.5 line-clamp-2 text-sm text-muted">{subtitle}</div>
      </div>
    </div>
  );
}
