'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SearchX, Search, X, RotateCcw } from 'lucide-react';
import type { Genre, SearchResults } from '@/lib/types';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { searchCatalog } from '@/lib/data/catalog';
import { Artwork } from '@/components/media/Artwork';
import { TrackList } from '@/components/media/TrackList';
import { Shelf, ShelfItem } from '@/components/media/Shelf';
import { AlbumCard, ArtistCard, PlaylistCard } from '@/components/media/Cards';
import { PlayContextButton } from '@/components/player/PlayContextButton';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';
import { Button } from '@/components/ui/Button';

type Filter = 'all' | 'songs' | 'artists' | 'albums' | 'playlists';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'songs', label: 'Songs' },
  { id: 'artists', label: 'Artists' },
  { id: 'albums', label: 'Albums' },
  { id: 'playlists', label: 'Playlists' },
];

type State = { status: 'idle' } | { status: 'loading'; q: string } | { status: 'done'; q: string; results: SearchResults } | { status: 'error'; q: string };
type Settled = { q: string; attempt: number; results: SearchResults | null };

export function SearchView({ genres }: { genres: Genre[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = (params.get('q') ?? '').slice(0, 100);
  const [settled, setSettled] = useState<Settled | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [retry, setRetry] = useState(0);
  const [mobileValue, setMobileValue] = useState(q);
  const [seenQ, setSeenQ] = useState(q);
  if (seenQ !== q) {
    setSeenQ(q);
    setMobileValue(q);
  }
  const latest = useRef(0);
  const query = q.trim();

  // The view state is derived: idle without a query, loading until this query (and attempt) settles.
  const state: State = !query
    ? { status: 'idle' }
    : settled && settled.q === query && settled.attempt === retry
      ? settled.results
        ? { status: 'done', q: query, results: settled.results }
        : { status: 'error', q: query }
      : { status: 'loading', q: query };

  useEffect(() => {
    if (!query) return;
    const ticket = ++latest.current;
    const t = setTimeout(async () => {
      try {
        const results = await searchCatalog(getBrowserSupabase(), query, 10);
        if (ticket === latest.current) setSettled({ q: query, attempt: retry, results });
      } catch {
        if (ticket === latest.current) setSettled({ q: query, attempt: retry, results: null });
      }
    }, 220);
    return () => clearTimeout(t);
  }, [query, retry]);

  const setQuery = (v: string) => {
    setMobileValue(v);
    router.replace(v ? `${pathname}?q=${encodeURIComponent(v)}` : pathname, { scroll: false });
  };

  const total = state.status === 'done' ? state.results.tracks.length + state.results.artists.length + state.results.albums.length + state.results.playlists.length : 0;

  return (
    <div className="pt-2">
      {/* phones get their own field; wider screens use the one in the top bar */}
      <form role="search" onSubmit={(e) => e.preventDefault()} className="relative mb-5 md:hidden">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-bg" aria-hidden="true" />
        <input
          type="search"
          value={mobileValue}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What do you want to hear?"
          aria-label="Search songs, artists, albums and playlists"
          maxLength={100}
          className="h-12 w-full rounded-md bg-text pr-10 pl-11 font-semibold text-bg placeholder:text-bg/60 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {mobileValue && (
          <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-1 text-bg">
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </form>

      {state.status === 'idle' && <Browse genres={genres} />}

      {state.status !== 'idle' && (
        <div role="group" aria-label="Filter results" className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`h-8 rounded-full px-4 text-sm font-semibold transition-colors ${filter === f.id ? 'bg-text text-bg' : 'bg-surface-2 text-text hover:bg-surface-3'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite" className="sr-only">
        {state.status === 'loading' ? 'Searching' : state.status === 'done' ? `${total} results for ${state.q}` : state.status === 'error' ? 'Search failed' : ''}
      </div>

      {state.status === 'loading' && <ResultsSkeleton />}

      {state.status === 'error' && (
        <EmptyState
          icon={<SearchX />}
          title="Search is not responding"
          body="We could not reach the catalogue. Check your connection and try again."
          action={
            <Button variant="light" icon={<RotateCcw className="size-4" aria-hidden="true" />} onClick={() => setRetry((r) => r + 1)}>
              Try again
            </Button>
          }
        />
      )}

      {state.status === 'done' && total === 0 && (
        <EmptyState icon={<SearchX />} title={`No results for “${state.q}”`} body="Check the spelling, try fewer words, or search for an artist or mood instead." />
      )}

      {state.status === 'done' && total > 0 && <Results results={state.results} filter={filter} q={state.q} />}
    </div>
  );
}

function Results({ results, filter, q }: { results: SearchResults; filter: Filter; q: string }) {
  const searchContext = useMemo(() => ({ type: 'search' as const, id: q, name: `Search: ${q}`, href: `/search?q=${encodeURIComponent(q)}` }), [q]);
  const top = results.artists[0] && (!results.tracks[0] || results.artists[0].name.toLowerCase().includes(q.toLowerCase())) ? { kind: 'artist' as const, artist: results.artists[0] } : results.tracks[0] ? { kind: 'track' as const, track: results.tracks[0] } : results.albums[0] ? { kind: 'album' as const, album: results.albums[0] } : null;

  if (filter === 'songs') {
    return results.tracks.length ? <TrackList tracks={results.tracks} context={searchContext} showAlbum label="Songs" /> : <EmptyState title="No songs match" />;
  }
  const grid = 'grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
  if (filter === 'artists') return results.artists.length ? <div className={grid}>{results.artists.map((a) => <ArtistCard key={a.id} artist={a} />)}</div> : <EmptyState title="No artists match" />;
  if (filter === 'albums') return results.albums.length ? <div className={grid}>{results.albums.map((a) => <AlbumCard key={a.id} album={a} />)}</div> : <EmptyState title="No albums match" />;
  if (filter === 'playlists') return results.playlists.length ? <div className={grid}>{results.playlists.map((p) => <PlaylistCard key={p.id} playlist={p} />)}</div> : <EmptyState title="No playlists match" />;

  return (
    <div className="animate-fade-in">
      <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {top && (
          <section aria-labelledby="top-result">
            <h2 id="top-result" className="mb-3 text-2xl font-extrabold tracking-tight">
              Top result
            </h2>
            <div className="group relative flex flex-col gap-4 rounded-lg bg-surface-2 p-5 transition-colors hover:bg-surface-3">
              {top.kind === 'artist' ? (
                <>
                  <Artwork src={top.artist.imageUrl} alt={top.artist.name} className="size-24 shadow-card" rounded="rounded-full" />
                  <div>
                    <Link href={`/artist/${top.artist.id}`} className="text-3xl font-extrabold tracking-tight after:absolute after:inset-0 after:content-['']">
                      {top.artist.name}
                    </Link>
                    <p className="mt-1 text-sm text-muted">Artist</p>
                  </div>
                  <div className="absolute right-5 bottom-5 z-10">
                    <PlayContextButton context={{ type: 'artist', id: top.artist.id, name: top.artist.name, href: `/artist/${top.artist.id}` }} />
                  </div>
                </>
              ) : top.kind === 'track' ? (
                <>
                  <Artwork src={top.track.album.coverUrl} alt="" className="size-24 shadow-card" />
                  <div>
                    <Link href={`/album/${top.track.album.id}`} className="text-3xl font-extrabold tracking-tight after:absolute after:inset-0 after:content-['']">
                      {top.track.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted">Song • {top.track.artist.name}</p>
                  </div>
                  <div className="absolute right-5 bottom-5 z-10">
                    <PlayContextButton context={searchContext} tracks={results.tracks} startIndex={0} trackId={top.track.id} label={`Play ${top.track.title}`} />
                  </div>
                </>
              ) : (
                <>
                  <Artwork src={top.album.coverUrl} alt="" className="size-24 shadow-card" />
                  <div>
                    <Link href={`/album/${top.album.id}`} className="text-3xl font-extrabold tracking-tight after:absolute after:inset-0 after:content-['']">
                      {top.album.title}
                    </Link>
                    <p className="mt-1 text-sm text-muted">Album • {top.album.artist.name}</p>
                  </div>
                  <div className="absolute right-5 bottom-5 z-10">
                    <PlayContextButton context={{ type: 'album', id: top.album.id, name: top.album.title, href: `/album/${top.album.id}` }} />
                  </div>
                </>
              )}
            </div>
          </section>
        )}
        {results.tracks.length > 0 && (
          <section aria-labelledby="songs">
            <h2 id="songs" className="mb-3 text-2xl font-extrabold tracking-tight">
              Songs
            </h2>
            <TrackList tracks={results.tracks.slice(0, 4)} context={searchContext} label="Songs" />
          </section>
        )}
      </div>
      {results.artists.length > 0 && (
        <Shelf title="Artists">
          {results.artists.map((a) => (
            <ShelfItem key={a.id}>
              <ArtistCard artist={a} />
            </ShelfItem>
          ))}
        </Shelf>
      )}
      {results.albums.length > 0 && (
        <Shelf title="Albums">
          {results.albums.map((a) => (
            <ShelfItem key={a.id}>
              <AlbumCard album={a} />
            </ShelfItem>
          ))}
        </Shelf>
      )}
      {results.playlists.length > 0 && (
        <Shelf title="Playlists">
          {results.playlists.map((p) => (
            <ShelfItem key={p.id}>
              <PlaylistCard playlist={p} />
            </ShelfItem>
          ))}
        </Shelf>
      )}
    </div>
  );
}

function Browse({ genres }: { genres: Genre[] }) {
  return (
    <section aria-labelledby="browse-all" className="animate-fade-in">
      <h1 id="browse-all" className="mb-4 text-2xl font-extrabold tracking-tight">
        Browse all
      </h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {genres.map((g) => (
          <Link key={g.id} href={`/genre/${g.id}`} className="relative aspect-[16/10] overflow-hidden rounded-lg p-4 text-xl font-extrabold transition hover:brightness-110" style={{ backgroundColor: g.color }}>
            <span className="relative z-10 drop-shadow">{g.name}</span>
            <span aria-hidden="true" className="absolute -right-3 -bottom-3 size-20 rotate-[25deg] rounded-md bg-black/25 shadow-card" />
          </Link>
        ))}
      </div>
      <p className="mt-8 text-sm text-subtle">
        Tip: press <kbd className="rounded bg-surface-3 px-1.5 py-0.5 font-sans text-xs text-text">/</kbd> anywhere to jump to search.
      </p>
    </section>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" aria-hidden="true">
      <div className="rounded-lg bg-surface-2 p-5">
        <Skeleton className="size-24 rounded-full" />
        <Skeleton className="mt-5 h-8 w-2/3" />
        <Skeleton className="mt-2 h-4 w-1/4" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="size-10" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
