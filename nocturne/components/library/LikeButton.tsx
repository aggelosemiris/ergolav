'use client';

import { Heart } from 'lucide-react';
import type { Track } from '@/lib/types';
import { useLibrary } from '@/store/library';

export function LikeButton({ track, className = '', size = 'md', alwaysVisible = true }: { track: Track; className?: string; size?: 'sm' | 'md'; alwaysVisible?: boolean }) {
  const liked = useLibrary((s) => s.liked.has(track.id));
  const label = liked ? `Remove ${track.title} from Liked Songs` : `Save ${track.title} to Liked Songs`;
  const icon = size === 'sm' ? 'size-4' : 'size-5';
  return (
    <button
      type="button"
      aria-label={label}
      title={liked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}
      aria-pressed={liked}
      onClick={(e) => {
        e.stopPropagation();
        void useLibrary.getState().toggleLike(track);
      }}
      className={`inline-flex shrink-0 items-center justify-center rounded-full p-1.5 transition duration-150 hover:scale-110 active:scale-95 ${
        liked ? 'text-accent' : `text-muted hover:text-text ${alwaysVisible ? '' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100'}`
      } ${className}`}
    >
      <Heart className={`${icon} ${liked ? 'fill-current' : ''}`} aria-hidden="true" />
    </button>
  );
}
