'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Home, Library, Plus, Search, Volume2 } from 'lucide-react';
import { useLibrary } from '@/store/library';
import { usePlayer } from '@/store/player';
import { Artwork, HistoryCover, LikedCover, PlaylistCover } from '@/components/media/Artwork';
import { buttonClass } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Feedback';

type Filter = 'all' | 'playlists' | 'albums' | 'artists';

interface Entry {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  art: React.ReactNode;
  kind: 'playlist' | 'album' | 'artist' | 'liked' | 'history';
  id: string | null;
  sortDate: string;
}

export function useLibraryEntries(filter: Filter): Entry[] {
  const { ownPlaylists, savedPlaylists, savedAlbums, followedArtists, liked } = useLibrary();
  return useMemo(() => {
    const out: Entry[] = [];
    if (filter === 'all' || filter === 'playlists') {
      out.push({ key: 'liked', href: '/collection/tracks', title: 'Liked Songs', subtitle: `Playlist • ${liked.size} song${liked.size === 1 ? '' : 's'}`, art: <LikedCover className="size-12" />, kind: 'liked', id: null, sortDate: '9999' });
      out.push({ key: 'history', href: '/history', title: 'Recently played', subtitle: 'Your listening history', art: <HistoryCover className="size-12" />, kind: 'history', id: null, sortDate: '9998' });
      for (const p of [...ownPlaylists, ...savedPlaylists]) {
        out.push({ key: `p-${p.id}`, href: `/playlist/${p.id}`, title: p.name, subtitle: `Playlist • ${p.ownerName}`, art: <PlaylistCover covers={p.covers} name={p.name} className="size-12" rounded="rounded-sm" />, kind: 'playlist', id: p.id, sortDate: p.updatedAt });
      }
    }
    if (filter === 'all' || filter === 'albums') {
      for (const a of savedAlbums) {
        out.push({ key: `a-${a.id}`, href: `/album/${a.id}`, title: a.title, subtitle: `Album • ${a.artist.name}`, art: <Artwork src={a.coverUrl} alt="" className="size-12" rounded="rounded-sm" />, kind: 'album', id: a.id, sortDate: a.savedAt });
      }
    }
    if (filter === 'all' || filter === 'artists') {
      for (const a of followedArtists) {
        out.push({ key: `r-${a.id}`, href: `/artist/${a.id}`, title: a.name, subtitle: 'Artist', art: <Artwork src={a.imageUrl} alt="" className="size-12" rounded="rounded-full" />, kind: 'artist', id: a.id, sortDate: a.followedAt });
      }
    }
    return out.sort((x, y) => (x.sortDate < y.sortDate ? 1 : -1));
  }, [filter, ownPlaylists, savedPlaylists, savedAlbums, followedArtists, liked]);
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useLibrary((s) => s.user);
  const ready = useLibrary((s) => s.ready);
  const createPlaylist = useLibrary((s) => s.createPlaylist);
  const context = usePlayer((s) => s.context);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const [filter, setFilter] = useState<Filter>('all');
  const entries = useLibraryEntries(filter);

  const onCreate = async () => {
    if (!user) {
      router.push('/login?next=/library');
      return;
    }
    const p = await createPlaylist();
    if (p) router.push(`/playlist/${p.id}`);
  };

  const navLink = (href: string, label: string, Icon: typeof Home) => {
    const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`flex items-center gap-4 rounded-md px-3 py-2.5 font-bold transition-colors lg:px-4 ${active ? 'text-text' : 'text-muted hover:text-text'}`}
      >
        <Icon className={`size-6 shrink-0 ${active ? 'stroke-[2.5]' : ''}`} aria-hidden="true" />
        <span className="hidden lg:inline">{label}</span>
        <span className="sr-only lg:hidden">{label}</span>
      </Link>
    );
  };

  return (
    <nav aria-label="Main" className="hidden w-[76px] min-h-0 flex-col gap-2 md:flex lg:w-[300px]">
      <div className="rounded-lg bg-surface px-2 py-3">
        {navLink('/', 'Home', Home)}
        {navLink('/search', 'Search', Search)}
      </div>
      <div className="flex min-h-0 flex-1 flex-col rounded-lg bg-surface">
        <div className="flex items-center justify-between px-3 pt-3 pb-2 lg:px-4">
          <Link href="/library" className="flex items-center gap-3 rounded-md px-1 py-1.5 font-bold text-muted transition-colors hover:text-text" aria-current={pathname === '/library' ? 'page' : undefined}>
            <Library className="size-6 shrink-0" aria-hidden="true" />
            <span className="hidden lg:inline">Your Library</span>
            <span className="sr-only lg:hidden">Your Library</span>
          </Link>
          <button type="button" onClick={onCreate} aria-label="Create playlist" title="Create playlist" className="hidden size-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-text lg:inline-flex">
            <Plus className="size-5" aria-hidden="true" />
          </button>
        </div>

        {user && (
          <div className="hidden gap-2 px-4 pb-2 lg:flex" role="group" aria-label="Filter your library">
            {(['playlists', 'albums', 'artists'] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(filter === f ? 'all' : f)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold capitalize transition-colors ${filter === f ? 'bg-text text-bg' : 'bg-surface-2 text-text hover:bg-surface-3'}`}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {!user ? (
            <div className="hidden flex-col gap-5 p-2 lg:flex">
              <div className="rounded-lg bg-surface-2 p-5">
                <h2 className="font-bold">Start your first playlist</h2>
                <p className="mt-1 mb-4 text-sm text-muted">Sign in to save songs, build playlists and pick up where you left off.</p>
                <Link href="/signup" className={buttonClass('light', 'sm')}>
                  Create a free account
                </Link>
              </div>
              <div className="rounded-lg bg-surface-2 p-5">
                <h2 className="font-bold">Find something to play</h2>
                <p className="mt-1 mb-4 text-sm text-muted">Every song here is playable now. No account needed to listen.</p>
                <Link href="/search" className={buttonClass('secondary', 'sm')}>
                  Browse the catalogue
                </Link>
              </div>
            </div>
          ) : !ready ? (
            <div className="space-y-2 p-2" aria-label="Loading your library">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-12 shrink-0" />
                  <div className="hidden flex-1 space-y-2 lg:block">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-0.5" aria-label="Your Library">
              {entries.map((e) => {
                const active = pathname === e.href;
                const playingHere = context && ((e.kind === 'liked' && context.type === 'liked') || (context.type === e.kind && context.id === e.id));
                return (
                  <li key={e.key}>
                    <Link href={e.href} title={e.title} aria-current={active ? 'page' : undefined} className={`flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-surface-2 ${active ? 'bg-surface-2' : ''}`}>
                      <span className="shrink-0">{e.art}</span>
                      <span className="hidden min-w-0 flex-1 lg:block">
                        <span className={`block truncate font-semibold ${playingHere ? 'text-accent' : 'text-text'}`}>{e.title}</span>
                        <span className="block truncate text-sm text-muted">{e.subtitle}</span>
                      </span>
                      {playingHere && isPlaying && <Volume2 className="hidden size-4 shrink-0 text-accent lg:block" aria-label="Now playing" />}
                    </Link>
                  </li>
                );
              })}
              {entries.length === 0 && <li className="hidden p-3 text-sm text-muted lg:block">Nothing here yet.</li>}
            </ul>
          )}
        </div>
      </div>
    </nav>
  );
}
