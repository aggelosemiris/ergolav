'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AlertCircle, ChevronDown, ListMusic, MoreHorizontal } from 'lucide-react';
import { usePlayer } from '@/store/player';
import { Artwork } from '@/components/media/Artwork';
import { LikeButton } from '@/components/library/LikeButton';
import { SeekBar, TransportControls, VolumeControl, PlayPauseButton } from './Controls';
import { openMenuFrom } from '@/components/ui/Menu';
import { trackMenuItems } from '@/components/library/trackMenu';
import { formatTime } from '@/lib/format';
import { useEffect } from 'react';

function NowPlayingInfo() {
  const current = usePlayer((s) => s.current);
  const status = usePlayer((s) => s.status);
  const error = usePlayer((s) => s.error);
  if (!current) {
    return <div className="text-sm text-subtle">Pick something to play</div>;
  }
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Link href={`/album/${current.album.id}`} className="shrink-0" aria-label={`Go to album ${current.album.title}`}>
        <Artwork src={current.album.coverUrl} alt="" className="size-14" rounded="rounded-md" />
      </Link>
      <div className="min-w-0">
        <Link href={`/album/${current.album.id}`} className="block truncate text-sm font-semibold hover:underline" data-testid="now-playing-title">
          {current.title}
        </Link>
        {status === 'error' ? (
          <p className="flex items-center gap-1 truncate text-xs text-danger" role="alert">
            <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
            {error ?? 'This track could not be played.'}
          </p>
        ) : (
          <Link href={`/artist/${current.artist.id}`} className="block truncate text-xs text-muted hover:text-text hover:underline" data-testid="now-playing-artist">
            {current.artist.name}
          </Link>
        )}
      </div>
      <LikeButton track={current} size="sm" />
    </div>
  );
}

/** Desktop transport bar, always visible at the bottom. */
export function PlayerBar() {
  const pathname = usePathname();
  const router = useRouter();
  const hasTrack = usePlayer((s) => !!s.current);
  const onQueue = pathname === '/queue';
  return (
    <section aria-label="Player" className="hidden h-[88px] shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-center gap-4 px-2 md:grid">
      <NowPlayingInfo />
      <div className="flex flex-col items-center gap-1.5">
        <TransportControls />
        <SeekBar />
      </div>
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => (onQueue ? router.back() : router.push('/queue'))}
          aria-label="Queue"
          title="Queue"
          aria-pressed={onQueue}
          disabled={!hasTrack && !onQueue}
          className={`relative inline-flex size-8 items-center justify-center rounded-full transition hover:scale-105 disabled:opacity-40 ${onQueue ? 'text-accent' : 'text-muted hover:text-text'}`}
        >
          <ListMusic className="size-5" aria-hidden="true" />
          {onQueue && <span aria-hidden="true" className="absolute -bottom-0.5 size-1 rounded-full bg-accent" />}
        </button>
        <VolumeControl />
      </div>
    </section>
  );
}

/** Phone mini player above the tab bar; tapping it opens the full player. */
export function MiniPlayer() {
  const current = usePlayer((s) => s.current);
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const status = usePlayer((s) => s.status);
  const setOpen = usePlayer((s) => s.setFullPlayerOpen);
  if (!current) return null;
  const pct = duration ? Math.min(100, (currentTime / duration) * 100) : 0;
  return (
    <section aria-label="Now playing" className="fixed inset-x-2 bottom-[calc(var(--tabbar-h)+4px)] z-40 md:hidden">
      <div className="relative flex h-14 items-center gap-3 overflow-hidden rounded-md bg-surface-3 py-2 pr-2 pl-2 shadow-pop">
        <button type="button" onClick={() => setOpen(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Open player: ${current.title} by ${current.artist.name}`}>
          <Artwork src={current.album.coverUrl} alt="" className="size-10 shrink-0" rounded="rounded-sm" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{current.title}</span>
            <span className={`block truncate text-xs ${status === 'error' ? 'text-danger' : 'text-muted'}`}>{status === 'error' ? 'Could not play this track' : current.artist.name}</span>
          </span>
        </button>
        <LikeButton track={current} size="sm" />
        <PlayPauseButton />
        <div className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-white/15" aria-hidden="true">
          <div className="h-full rounded-full bg-text" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </section>
  );
}

/** Phone full-screen player. */
export function FullPlayer() {
  const open = usePlayer((s) => s.fullPlayerOpen);
  const current = usePlayer((s) => s.current);
  const context = usePlayer((s) => s.context);
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const status = usePlayer((s) => s.status);
  const error = usePlayer((s) => s.error);
  const setOpen = usePlayer((s) => s.setFullPlayerOpen);
  const pathname = usePathname();

  // close when navigating (e.g. "Go to artist" from inside the player)
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open || !current) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Now playing" className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-surface-3 via-surface to-bg px-6 pt-[max(env(safe-area-inset-top),16px)] pb-[max(env(safe-area-inset-bottom),24px)] animate-sheet md:hidden">
      <div className="flex items-center justify-between py-2">
        <button type="button" onClick={() => setOpen(false)} aria-label="Close player" className="-ml-2 rounded-full p-2 text-text">
          <ChevronDown className="size-7" aria-hidden="true" />
        </button>
        <div className="min-w-0 px-2 text-center">
          <div className="text-[11px] font-semibold tracking-widest text-muted uppercase">Playing from</div>
          <div className="truncate text-sm font-bold">{context?.name ?? current.album.title}</div>
        </div>
        <button
          type="button"
          aria-label={`More options for ${current.title}`}
          onClick={(e) => openMenuFrom(e.currentTarget, `Options for ${current.title}`, trackMenuItems(current))}
          className="-mr-2 rounded-full p-2 text-text"
        >
          <MoreHorizontal className="size-6" aria-hidden="true" />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center py-6">
        <Artwork src={current.album.coverUrl} alt={`Cover of ${current.album.title}`} className="w-full max-w-[min(80vw,420px)] shadow-pop" rounded="rounded-lg" priority />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/album/${current.album.id}`} className="block truncate text-2xl font-extrabold">
            {current.title}
          </Link>
          <Link href={`/artist/${current.artist.id}`} className="block truncate text-base text-muted">
            {current.artist.name}
          </Link>
        </div>
        <LikeButton track={current} />
      </div>
      {status === 'error' && (
        <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-danger">
          <AlertCircle className="size-4" aria-hidden="true" />
          {error}
        </p>
      )}
      <div className="mt-4">
        <SeekBar compact />
        <div className="mt-1 flex justify-between text-xs text-muted tabular-nums">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <div className="mt-3">
        <TransportControls large />
      </div>
      <div className="mt-6 flex items-center justify-between">
        <VolumeControl />
        <Link href="/queue" className="inline-flex items-center gap-2 rounded-full p-2 text-sm font-semibold text-muted hover:text-text">
          <ListMusic className="size-5" aria-hidden="true" />
          Queue
        </Link>
      </div>
    </div>
  );
}
