import Link from 'next/link';
import { getServerSupabase, getCurrentProfile } from '@/lib/supabase/server';
import { getAlbums, getArtists, getFeaturedPlaylists, getGenres, getHistory, getPopularTracks, getUserPlaylists } from '@/lib/data/catalog';
import { EDITOR_ID } from '@/lib/constants';
import { greeting } from '@/lib/format';
import type { Album, Playlist, Track } from '@/lib/types';
import { Shelf, ShelfItem } from '@/components/media/Shelf';
import { AlbumCard, ArtistCard, PlaylistCard } from '@/components/media/Cards';
import { MediaCard } from '@/components/media/MediaCard';
import { Artwork, LikedCover, PlaylistCover } from '@/components/media/Artwork';
import { ShortcutTile } from '@/components/media/ShortcutTile';
import { PlayContextButton } from '@/components/player/PlayContextButton';
import { TrackList } from '@/components/media/TrackList';

export const dynamic = 'force-dynamic';

function dedupe<T>(items: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((t) => {
    const k = key(t);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export default async function HomePage() {
  const sb = await getServerSupabase();
  const profile = await getCurrentProfile();

  const [featured, artists, albums, genres, popular, history, ownPlaylists] = await Promise.all([
    getFeaturedPlaylists(sb, EDITOR_ID),
    getArtists(sb, 12),
    getAlbums(sb, { limit: 24 }),
    getGenres(sb),
    getPopularTracks(sb, 5),
    profile ? getHistory(sb, profile.id, 60) : Promise.resolve([]),
    profile ? getUserPlaylists(sb, profile.id) : Promise.resolve([] as Playlist[]),
  ]);

  // Recently played: distinct tracks, newest first.
  const recentTracks: Track[] = dedupe(history, (t) => t.id).slice(0, 12);

  // Recommended albums: favour the genres this listener plays most, skip what they just heard.
  const affinity = new Map<string, number>();
  history.forEach((t, i) => t.genreId && affinity.set(t.genreId, (affinity.get(t.genreId) ?? 0) + 1 / (1 + i / 10)));
  const recentAlbums = new Set(recentTracks.slice(0, 6).map((t) => t.album.id));
  const recommended: Album[] = [...albums]
    .filter((a) => !recentAlbums.has(a.id))
    .sort((x, y) => (affinity.get(y.genreId ?? '') ?? 0) - (affinity.get(x.genreId ?? '') ?? 0) || y.releaseDate.localeCompare(x.releaseDate))
    .slice(0, 10);
  const newReleases = [...albums].sort((x, y) => y.releaseDate.localeCompare(x.releaseDate)).slice(0, 10);

  // Quick-access grid: liked songs, recent contexts, own playlists, then curated picks.
  const recentPlaylistIds = dedupe(history.map((t) => t.album.id), (x) => x).slice(0, 3);
  const recentAlbumObjs = recentPlaylistIds.map((id) => albums.find((a) => a.id === id)).filter(Boolean) as Album[];
  const tiles: React.ReactNode[] = [];
  if (profile) {
    tiles.push(<ShortcutTile key="liked" href="/collection/tracks" title="Liked Songs" art={<LikedCover className="size-full" rounded="rounded-none" />} context={{ type: 'liked', id: null, name: 'Liked Songs', href: '/collection/tracks' }} />);
  }
  for (const a of recentAlbumObjs) {
    tiles.push(<ShortcutTile key={`a-${a.id}`} href={`/album/${a.id}`} title={a.title} art={<Artwork src={a.coverUrl} alt="" className="size-full" rounded="rounded-none" />} context={{ type: 'album', id: a.id, name: a.title, href: `/album/${a.id}` }} />);
  }
  const extraPlaylists = dedupe([...ownPlaylists, ...featured], (p) => p.id);
  for (const p of extraPlaylists) {
    if (tiles.length >= 8) break;
    tiles.push(<ShortcutTile key={`p-${p.id}`} href={`/playlist/${p.id}`} title={p.name} art={<PlaylistCover covers={p.covers} name={p.name} className="size-full" rounded="rounded-none" />} context={{ type: 'playlist', id: p.id, name: p.name, href: `/playlist/${p.id}` }} />);
  }

  const hello = greeting();
  return (
    <div className="pt-2">
      <h1 className="mb-5 text-2xl font-extrabold tracking-tight sm:text-3xl">{profile ? `${hello}, ${profile.displayName}` : hello}</h1>

      <div className="mb-8 grid grid-cols-2 gap-2 lg:grid-cols-4">{tiles.slice(0, 8)}</div>

      {recentTracks.length > 0 && (
        <Shelf title="Recently played" href="/history">
          {recentTracks.map((t, i) => (
            <ShelfItem key={t.id}>
              <MediaCard
                href={`/album/${t.album.id}`}
                title={t.title}
                subtitle={t.artist.name}
                art={<Artwork src={t.album.coverUrl} alt={`Cover of ${t.album.title}`} className="w-full" />}
                action={<PlayContextButton context={{ type: 'history', id: null, name: 'Recently played', href: '/history' }} tracks={recentTracks} startIndex={i} trackId={t.id} size="sm" label={`Play ${t.title}`} />}
              />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      <Shelf title="Featured playlists">
        {featured.map((p) => (
          <ShelfItem key={p.id}>
            <PlaylistCard playlist={p} />
          </ShelfItem>
        ))}
      </Shelf>

      <Shelf title={profile && affinity.size ? 'Picked for your ears' : 'Recommended albums'}>
        {recommended.map((a) => (
          <ShelfItem key={a.id}>
            <AlbumCard album={a} />
          </ShelfItem>
        ))}
      </Shelf>

      <Shelf title="Popular artists">
        {artists.map((a) => (
          <ShelfItem key={a.id}>
            <ArtistCard artist={a} />
          </ShelfItem>
        ))}
      </Shelf>

      <section aria-labelledby="trending" className="mb-8">
        <h2 id="trending" className="mb-2 px-1 text-xl font-extrabold tracking-tight sm:text-2xl">
          Trending on Nocturne
        </h2>
        <TrackList tracks={popular} context={{ type: 'search', id: 'trending', name: 'Trending on Nocturne', href: '/' }} showAlbum showPlays label="Trending on Nocturne" />
      </section>

      <Shelf title="New releases">
        {newReleases.map((a) => (
          <ShelfItem key={a.id}>
            <AlbumCard album={a} subtitle={`${a.albumType === 'album' ? 'Album' : a.albumType === 'ep' ? 'EP' : 'Single'} • ${a.artist.name}`} />
          </ShelfItem>
        ))}
      </Shelf>

      <section aria-labelledby="moods" className="mb-8">
        <h2 id="moods" className="mb-3 px-1 text-xl font-extrabold tracking-tight sm:text-2xl">
          Explore by mood
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {genres.map((g) => (
            <Link
              key={g.id}
              href={`/genre/${g.id}`}
              className="relative flex h-24 items-end overflow-hidden rounded-lg p-4 text-xl font-extrabold transition hover:brightness-110 sm:h-28"
              style={{ backgroundColor: g.color }}
            >
              <span className="relative z-10 drop-shadow">{g.name}</span>
              <span aria-hidden="true" className="absolute -right-4 -bottom-4 size-20 rotate-12 rounded-md bg-black/20" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
