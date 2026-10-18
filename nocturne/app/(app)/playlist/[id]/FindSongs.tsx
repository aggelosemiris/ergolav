'use client';

import { useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import type { Track } from '@/lib/types';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { getPopularTracks, searchCatalog } from '@/lib/data/catalog';
import { Artwork } from '@/components/media/Artwork';
import { formatTime } from '@/lib/format';

/** Search the catalogue and add songs without leaving the playlist. */
export function FindSongs({ onAdd, existing, prominent }: { onAdd: (t: Track) => Promise<void>; existing: Set<string>; prominent: boolean }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const sb = getBrowserSupabase();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const list = q.trim() ? (await searchCatalog(sb, q, 10)).tracks : await getPopularTracks(sb, 8);
        if (!cancelled) setResults(list);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  const shown = results.filter((t) => !existing.has(t.id));
  return (
    <section aria-labelledby="find-songs" className={`mt-10 border-t border-white/10 pt-8 ${prominent ? '' : ''}`}>
      <h2 id="find-songs" className="text-2xl font-extrabold tracking-tight">
        {prominent ? "Let's find something for your playlist" : 'Add more songs'}
      </h2>
      <div className="relative mt-4 max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search for songs or artists"
          aria-label="Search for songs to add"
          maxLength={100}
          className="h-11 w-full rounded-md bg-surface-2 pr-3 pl-10 text-text placeholder:text-subtle focus:ring-2 focus:ring-focus focus:outline-none"
        />
        {loading && <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted" aria-label="Searching" />}
      </div>
      <p className="mt-3 text-sm text-subtle">{q.trim() ? 'Results' : 'Popular right now'}</p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          Search is not responding. Try again in a moment.
        </p>
      )}
      <ul className="mt-2 space-y-1" aria-label="Songs you can add">
        {shown.map((t) => (
          <li key={t.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-white/[0.06]">
            <Artwork src={t.album.coverUrl} alt="" className="size-10 shrink-0" rounded="rounded-sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{t.title}</div>
              <div className="truncate text-sm text-muted">{t.artist.name}</div>
            </div>
            <span className="hidden truncate text-sm text-muted sm:block sm:w-40">{t.album.title}</span>
            <span className="w-10 text-right text-sm text-muted tabular-nums">{formatTime(t.durationMs / 1000)}</span>
            <button
              type="button"
              disabled={adding === t.id}
              onClick={async () => {
                setAdding(t.id);
                await onAdd(t);
                setAdding(null);
              }}
              aria-label={`Add ${t.title} to playlist`}
              className="h-8 rounded-full border border-border-input px-4 text-sm font-bold transition hover:scale-105 hover:border-text disabled:opacity-50"
            >
              Add
            </button>
          </li>
        ))}
        {!loading && !error && q.trim() && shown.length === 0 && <li className="px-2 py-3 text-sm text-muted">No songs found for “{q.trim()}”.</li>}
      </ul>
    </section>
  );
}
