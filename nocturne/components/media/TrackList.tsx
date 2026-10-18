'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Clock3, GripVertical, MoreHorizontal, Pause, Play } from 'lucide-react';
import type { PlayContext, Track } from '@/lib/types';
import { formatCount, formatTime, relativeTime } from '@/lib/format';
import { usePlayer } from '@/store/player';
import { Artwork } from './Artwork';
import { LikeButton } from '@/components/library/LikeButton';
import { Equalizer } from '@/components/ui/Feedback';
import { openMenuAt, openMenuFrom, type MenuItem } from '@/components/ui/Menu';
import { trackMenuItems } from '@/components/library/trackMenu';

export type ListTrack = Track & { addedAt?: string; likedAt?: string; playedAt?: string; historyId?: number };

interface Props {
  tracks: ListTrack[];
  context: PlayContext;
  showCover?: boolean;
  showAlbum?: boolean;
  showAdded?: 'added' | 'liked' | 'played' | false;
  showPlays?: boolean;
  /** use track numbers from the album instead of list positions */
  albumNumbers?: boolean;
  extraMenu?: (track: ListTrack, index: number) => MenuItem[];
  playlistId?: string;
  /** enables drag-and-drop reordering (owner of a playlist) */
  onMove?: (trackId: string, to: number) => void;
  label: string;
}

export function TrackList({ tracks, context, showCover = true, showAlbum = false, showAdded = false, showPlays = false, albumNumbers = false, extraMenu, playlistId, onMove, label }: Props) {
  const currentId = usePlayer((s) => s.current?.id ?? null);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const play = (i: number) => {
    const p = usePlayer.getState();
    if (tracks[i]?.id === p.current?.id && p.context?.type === context.type && p.context?.id === context.id) {
      p.togglePlay();
      return;
    }
    p.playContext(tracks, i, context);
  };

  const menuFor = (t: ListTrack, i: number) => trackMenuItems(t, extraMenu ? extraMenu(t, i) : [], { playlistId });

  const cols = [
    'grid-cols-[28px_minmax(0,1fr)_auto]',
    showAlbum ? 'md:grid-cols-[32px_minmax(0,4fr)_minmax(0,3fr)_auto]' : '',
    showAlbum && showAdded ? 'lg:grid-cols-[32px_minmax(0,4fr)_minmax(0,3fr)_minmax(0,2fr)_auto]' : '',
    !showAlbum && (showAdded || showPlays) ? 'md:grid-cols-[32px_minmax(0,4fr)_minmax(0,2fr)_auto]' : '',
    !showAlbum && !showAdded && !showPlays ? 'md:grid-cols-[32px_minmax(0,1fr)_auto]' : '',
  ].join(' ');

  return (
    <div role="table" aria-label={label} className="select-none">
      <div role="rowgroup" className="sticky top-[var(--topbar-h)] z-20 -mx-2 hidden border-b border-white/10 bg-surface/95 px-2 backdrop-blur md:block">
        <div role="row" className={`grid ${cols} items-center gap-4 px-2 py-2 text-xs font-semibold tracking-wider text-subtle uppercase`}>
          <span role="columnheader" className="text-center">#</span>
          <span role="columnheader">Title</span>
          {showAlbum && <span role="columnheader" className="hidden md:block">Album</span>}
          {showAdded && <span role="columnheader" className={showAlbum ? 'hidden lg:block' : 'hidden md:block'}>{showAdded === 'liked' ? 'Liked' : showAdded === 'played' ? 'Played' : 'Date added'}</span>}
          {showPlays && !showAdded && <span role="columnheader" className="hidden md:block">Plays</span>}
          <span role="columnheader" className="flex justify-end pr-10">
            <Clock3 className="size-4" aria-label="Duration" />
          </span>
        </div>
      </div>
      <div role="rowgroup" className="mt-2">
        {tracks.map((t, i) => {
          const active = t.id === currentId;
          const playingThis = active && isPlaying;
          const when = showAdded === 'liked' ? t.likedAt : showAdded === 'played' ? t.playedAt : t.addedAt;
          return (
            <div
              key={t.historyId ?? `${t.id}-${i}`}
              role="row"
              tabIndex={0}
              aria-selected={active}
              data-testid="track-row"
              data-track-id={t.id}
              draggable={!!onMove}
              onDragStart={(e) => {
                if (!onMove) return;
                setDragId(t.id);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', t.id);
              }}
              onDragOver={(e) => {
                if (!onMove || !dragId) return;
                e.preventDefault();
                setOverIndex(i);
              }}
              onDragLeave={() => setOverIndex((o) => (o === i ? null : o))}
              onDrop={(e) => {
                if (!onMove || !dragId) return;
                e.preventDefault();
                onMove(dragId, i);
                setDragId(null);
                setOverIndex(null);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverIndex(null);
              }}
              onDoubleClick={() => play(i)}
              onClick={(e) => {
                // touch screens have no hover or double-click: a tap on the row plays it
                if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches && !(e.target as HTMLElement).closest('a, button')) play(i);
              }}
              onKeyDown={(e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === 'Enter') {
                  e.preventDefault();
                  play(i);
                } else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
                  e.preventDefault();
                  openMenuFrom(e.currentTarget, `Options for ${t.title}`, menuFor(t, i), 'start');
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                openMenuAt(e.clientX, e.clientY, `Options for ${t.title}`, menuFor(t, i), e.currentTarget);
              }}
              className={`group grid ${cols} items-center gap-4 rounded-md px-2 py-1.5 outline-none transition-colors hover:bg-white/[0.07] focus-visible:bg-white/[0.1] focus-visible:ring-2 focus-visible:ring-focus ${
                active ? 'bg-white/[0.05]' : ''
              } ${dragId === t.id ? 'opacity-40' : ''} ${overIndex === i && dragId !== t.id ? 'shadow-[inset_0_2px_0_var(--color-accent)]' : ''}`}
            >
              <div role="cell" className="relative flex h-10 items-center justify-center text-subtle tabular-nums">
                <span className={`text-base group-hover:invisible group-focus-within:invisible [@media(hover:none)]:invisible ${active ? 'invisible' : ''}`}>{albumNumbers ? t.trackNumber : i + 1}</span>
                {active && <span className="absolute group-hover:invisible group-focus-within:invisible"><Equalizer paused={!isPlaying} /></span>}
                <button
                  type="button"
                  aria-label={playingThis ? `Pause ${t.title}` : `Play ${t.title} by ${t.artist.name}`}
                  onClick={() => play(i)}
                  className="absolute inset-0 hidden items-center justify-center text-text group-hover:flex group-focus-within:flex [@media(hover:none)]:flex"
                >
                  {playingThis ? <Pause className="size-4 fill-current" aria-hidden="true" /> : <Play className="size-4 fill-current" aria-hidden="true" />}
                </button>
              </div>
              <div role="cell" className="flex min-w-0 items-center gap-3">
                {onMove && <GripVertical className="hidden size-4 shrink-0 cursor-grab text-subtle md:block" aria-hidden="true" />}
                {showCover && <Artwork src={t.album.coverUrl} alt="" className="size-10 shrink-0" rounded="rounded-sm" />}
                <div className="min-w-0">
                  <div className={`truncate font-semibold ${active ? 'text-accent' : 'text-text'}`}>{t.title}</div>
                  <Link href={`/artist/${t.artist.id}`} tabIndex={-1} className="block truncate text-sm text-muted hover:text-text hover:underline">
                    {t.artist.name}
                  </Link>
                </div>
              </div>
              {showAlbum && (
                <div role="cell" className="hidden min-w-0 md:block">
                  <Link href={`/album/${t.album.id}`} tabIndex={-1} className="truncate text-sm text-muted hover:text-text hover:underline">
                    {t.album.title}
                  </Link>
                </div>
              )}
              {showAdded && (
                <div role="cell" className={`truncate text-sm text-muted ${showAlbum ? 'hidden lg:block' : 'hidden md:block'}`}>
                  {when ? relativeTime(when) : ''}
                </div>
              )}
              {showPlays && !showAdded && (
                <div role="cell" className="hidden text-sm text-muted tabular-nums md:block">
                  {formatCount(t.playCount)}
                </div>
              )}
              <div role="cell" className="flex items-center justify-end gap-1">
                <LikeButton track={t} size="sm" alwaysVisible={false} />
                <span className="w-12 text-right text-sm text-muted tabular-nums">{formatTime(t.durationMs / 1000)}</span>
                <button
                  type="button"
                  aria-label={`More options for ${t.title}`}
                  aria-haspopup="menu"
                  onClick={(e) => {
                    e.stopPropagation();
                    openMenuFrom(e.currentTarget, `Options for ${t.title}`, menuFor(t, i));
                  }}
                  className="rounded-full p-1.5 text-muted opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 hover:text-text focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                >
                  <MoreHorizontal className="size-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
