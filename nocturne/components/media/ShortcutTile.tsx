import Link from 'next/link';
import type { ReactNode } from 'react';
import type { PlayContext } from '@/lib/types';
import { PlayContextButton } from '@/components/player/PlayContextButton';

/** Wide quick-access tile used in the Home greeting grid. */
export function ShortcutTile({ href, title, art, context }: { href: string; title: string; art: ReactNode; context?: PlayContext }) {
  return (
    <div className="group relative flex h-14 items-center gap-3 overflow-hidden rounded-md bg-white/[0.07] pr-2 transition-colors hover:bg-white/[0.16] focus-within:bg-white/[0.16] sm:h-16">
      <div className="size-14 shrink-0 shadow-card sm:size-16">{art}</div>
      <Link href={href} className="line-clamp-2 flex-1 text-sm font-bold after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
        {title}
      </Link>
      {context && (
        <div className="relative z-10 hidden opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 lg:block">
          <PlayContextButton context={context} size="sm" />
        </div>
      )}
    </div>
  );
}
