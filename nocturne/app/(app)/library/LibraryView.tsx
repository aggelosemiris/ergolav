'use client';

import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ArrowDownAZ, Clock, Library, Plus } from 'lucide-react';
import { useLibrary } from '@/store/library';
import { useLibraryEntries } from '@/components/shell/Sidebar';
import { SignedOut } from '@/components/auth/SignedOut';
import { Button } from '@/components/ui/Button';
import { EmptyState, Skeleton } from '@/components/ui/Feedback';

type Filter = 'all' | 'playlists' | 'albums' | 'artists';
const FILTERS: Filter[] = ['all', 'playlists', 'albums', 'artists'];

export function LibraryView() {
  const user = useLibrary((s) => s.user);
  const ready = useLibrary((s) => s.ready);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = params.get('filter') as Filter | null;
  const filter: Filter = raw && FILTERS.includes(raw) ? raw : 'all';
  const [sort, setSort] = useState<'recent' | 'alpha'>('recent');
  const entries = useLibraryEntries(filter);
  const sorted = useMemo(() => {
    if (sort === 'recent') return entries;
    const pinned = entries.filter((e) => e.kind === 'liked' || e.kind === 'history');
    return [...pinned, ...entries.filter((e) => e.kind !== 'liked' && e.kind !== 'history').sort((a, b) => a.title.localeCompare(b.title))];
  }, [entries, sort]);

  if (!user) {
    return <SignedOut icon={<Library />} title="Your Library lives here" body="Log in to see your playlists, liked songs, saved albums and the artists you follow." next="/library" />;
  }

  const setFilter = (f: Filter) => router.replace(f === 'all' ? pathname : `${pathname}?filter=${f}`, { scroll: false });

  return (
    <div className="pt-2">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Your Library</h1>
        <Button
          variant="light"
          size="sm"
          icon={<Plus className="size-4" aria-hidden="true" />}
          onClick={async () => {
            const p = await createPlaylist();
            if (p) router.push(`/playlist/${p.id}`);
          }}
        >
          Create playlist
        </Button>
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filter your library" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={`h-8 rounded-full px-4 text-sm font-semibold capitalize transition-colors ${filter === f ? 'bg-text text-bg' : 'bg-surface-2 text-text hover:bg-surface-3'}`}
            >
              {f}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setSort(sort === 'recent' ? 'alpha' : 'recent')} className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-text">
          {sort === 'recent' ? <Clock className="size-4" aria-hidden="true" /> : <ArrowDownAZ className="size-4" aria-hidden="true" />}
          {sort === 'recent' ? 'Recents' : 'Alphabetical'}
          <span className="sr-only">(change sort order)</span>
        </button>
      </div>

      {!ready ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5" aria-label="Loading your library">
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState icon={<Library />} title={`No ${filter} yet`} body={filter === 'artists' ? 'Follow artists from their pages to see them here.' : filter === 'albums' ? 'Save albums with the plus button on an album page.' : 'Create a playlist or save one you like.'} />
      ) : (
        <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {sorted.map((e) => (
            <li key={e.key}>
              <Link href={e.href} className="group flex flex-col gap-2 rounded-lg p-3 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2">
                <div className={`w-full shadow-card [&>*]:!size-full [&>*]:aspect-square ${e.kind === 'artist' ? 'rounded-full' : ''}`}>{e.art}</div>
                <div className="min-w-0">
                  <div className="truncate font-bold">{e.title}</div>
                  <div className="truncate text-sm text-muted">{e.subtitle}</div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
