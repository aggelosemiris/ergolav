'use client';

import Link from 'next/link';
import { ArrowDown, ArrowUp, ListMusic, Play, X } from 'lucide-react';
import { usePlayer } from '@/store/player';
import { upcomingFromContext } from '@/lib/player/queue';
import { Artwork } from '@/components/media/Artwork';
import { EmptyState, Equalizer } from '@/components/ui/Feedback';
import { ButtonLink } from '@/components/ui/Button';
import { formatTime } from '@/lib/format';
import type { Track } from '@/lib/types';

function Row({ track, onPlay, children, active = false, playing = false, testId }: { track: Track; onPlay?: () => void; children?: React.ReactNode; active?: boolean; playing?: boolean; testId?: string }) {
  return (
    <li data-testid={testId} className="group flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-white/[0.06]">
      <button type="button" onClick={onPlay} disabled={!onPlay} aria-label={`Play ${track.title}`} className="relative size-10 shrink-0 disabled:cursor-default">
        <Artwork src={track.album.coverUrl} alt="" className="size-10" rounded="rounded-sm" />
        {onPlay && (
          <span className="absolute inset-0 hidden items-center justify-center rounded-sm bg-black/50 group-hover:flex group-focus-within:flex">
            <Play className="size-4 fill-current" aria-hidden="true" />
          </span>
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className={`truncate font-semibold ${active ? 'text-accent' : ''}`}>{track.title}</div>
        <Link href={`/artist/${track.artist.id}`} className="truncate text-sm text-muted hover:text-text hover:underline">
          {track.artist.name}
        </Link>
      </div>
      {active && <Equalizer paused={!playing} />}
      <span className="hidden w-10 text-right text-sm text-muted tabular-nums sm:block">{formatTime(track.durationMs / 1000)}</span>
      {children}
    </li>
  );
}

export default function QueuePage() {
  const s = usePlayer();
  const upcoming = upcomingFromContext(s, 50);

  if (!s.current) {
    return (
      <div className="pt-2">
        <h1 className="mb-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Queue</h1>
        <EmptyState icon={<ListMusic />} title="Your queue is empty" body="Play something, or add songs with “Add to queue” from any track menu." action={<ButtonLink href="/search" variant="light">Find something to play</ButtonLink>} />
      </div>
    );
  }

  return (
    <div className="pt-2">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight sm:text-3xl">Queue</h1>

      <section aria-labelledby="now" className="mb-8">
        <h2 id="now" className="mb-2 font-bold text-muted">
          Now playing
        </h2>
        <ul>
          <Row track={s.current} active playing={s.isPlaying} />
        </ul>
      </section>

      {s.upNext.length > 0 && (
        <section aria-labelledby="next-queue" className="mb-8">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="next-queue" className="font-bold text-muted">
              Next in queue
            </h2>
            <button type="button" onClick={s.clearQueue} className="text-sm font-bold text-muted hover:text-text hover:underline">
              Clear queue
            </button>
          </div>
          <ul>
            {s.upNext.map((t, i) => (
              <Row key={`${t.id}-${i}`} track={t} onPlay={() => s.playFromQueue(i)} testId="queue-item">
                <div className="flex items-center">
                  <button type="button" aria-label={`Move ${t.title} up`} disabled={i === 0} onClick={() => s.moveInQueue(i, i - 1)} className="rounded-full p-1.5 text-muted hover:text-text disabled:opacity-30">
                    <ArrowUp className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" aria-label={`Move ${t.title} down`} disabled={i === s.upNext.length - 1} onClick={() => s.moveInQueue(i, i + 1)} className="rounded-full p-1.5 text-muted hover:text-text disabled:opacity-30">
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </button>
                  <button type="button" aria-label={`Remove ${t.title} from queue`} onClick={() => s.removeFromQueue(i)} className="rounded-full p-1.5 text-muted hover:text-text">
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </Row>
            ))}
          </ul>
        </section>
      )}

      {upcoming.length > 0 && (
        <section aria-labelledby="next-from">
          <h2 id="next-from" className="mb-2 font-bold text-muted">
            Next from:{' '}
            {s.context?.href ? (
              <Link href={s.context.href} className="text-text hover:underline">
                {s.context.name}
              </Link>
            ) : (
              <span className="text-text">{s.context?.name}</span>
            )}
          </h2>
          <ul>
            {upcoming.map(({ track, orderPos }) => (
              <Row key={`${track.id}-${orderPos}`} track={track} onPlay={() => s.jumpToContext(orderPos)} testId="context-item" />
            ))}
          </ul>
        </section>
      )}
      {upcoming.length === 0 && s.upNext.length === 0 && <p className="text-sm text-muted">Nothing else is queued. {s.repeat === 'all' ? 'Repeat is on, so this list starts again.' : ''}</p>}
    </div>
  );
}
