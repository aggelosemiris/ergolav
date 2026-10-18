'use client';

import { useState } from 'react';
import { Loader2, Pause, Play } from 'lucide-react';
import type { PlayContext, Track } from '@/lib/types';
import { isContextActive, usePlayer } from '@/store/player';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { getContextTracks, getLikedTracks } from '@/lib/data/catalog';
import { useLibrary } from '@/store/library';
import { toast } from '@/store/ui';

interface Props {
  context: PlayContext;
  /** tracks when already known; otherwise they are fetched on click */
  tracks?: Track[];
  size?: 'sm' | 'md' | 'lg';
  shuffle?: boolean;
  label?: string;
  className?: string;
  /** play this index of `tracks` (default: first, or random with shuffle) */
  startIndex?: number;
  /** for single-track buttons: only show "pause" when this track is the one playing */
  trackId?: string;
}

/** Round play/pause for a whole context (album, playlist, artist, genre). */
export function PlayContextButton({ context, tracks, size = 'md', shuffle, label, className = '', startIndex, trackId }: Props) {
  const active = usePlayer((s) => isContextActive(s.context, context.type, context.id) && (!trackId || s.current?.id === trackId));
  const isPlaying = usePlayer((s) => s.isPlaying);
  const [busy, setBusy] = useState(false);
  const playing = active && isPlaying;

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const player = usePlayer.getState();
    if (active) {
      player.togglePlay();
      return;
    }
    let list = tracks;
    if (!list) {
      setBusy(true);
      try {
        const sb = getBrowserSupabase();
        if (context.type === 'liked') {
          const user = useLibrary.getState().user;
          list = user ? await getLikedTracks(sb, user.id) : [];
        } else if (context.id && ['album', 'playlist', 'artist', 'genre'].includes(context.type)) {
          list = await getContextTracks(sb, context.type as 'album' | 'playlist' | 'artist' | 'genre', context.id);
        } else {
          list = [];
        }
      } catch {
        toast('Could not load these tracks. Try again.', { tone: 'error' });
        return;
      } finally {
        setBusy(false);
      }
    }
    if (!list.length) {
      toast('Nothing to play here yet.');
      return;
    }
    player.playContext(list, shuffle ? null : (startIndex ?? 0), context, { shuffle });
  };

  const dims = size === 'lg' ? 'size-14' : size === 'sm' ? 'size-10' : 'size-12';
  const icon = size === 'lg' ? 'size-6' : 'size-5';
  const name = label ?? `${playing ? 'Pause' : 'Play'} ${context.name}`;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={name}
      title={name}
      className={`inline-flex ${dims} shrink-0 items-center justify-center rounded-full bg-accent text-on-accent shadow-card transition duration-150 hover:scale-105 hover:bg-accent-strong active:scale-95 ${className}`}
    >
      {busy ? (
        <Loader2 className={`${icon} animate-spin`} aria-hidden="true" />
      ) : playing ? (
        <Pause className={`${icon} fill-current`} aria-hidden="true" />
      ) : (
        <Play className={`${icon} translate-x-[1px] fill-current`} aria-hidden="true" />
      )}
    </button>
  );
}
