import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getServerSupabase } from '@/lib/supabase/server';
import { getAlbum, getAlbums, getAlbumTracks, getArtist, getGenre } from '@/lib/data/catalog';
import { albumTypeLabel, formatTotalDuration, pluralize } from '@/lib/format';
import { totalDurationMs } from '@/lib/playlist/order';
import { ActionBar, DetailHeader, Dot } from '@/components/media/DetailHeader';
import { Artwork } from '@/components/media/Artwork';
import { TrackList } from '@/components/media/TrackList';
import { AlbumActions } from '@/components/media/ContextActions';
import { Shelf, ShelfItem } from '@/components/media/Shelf';
import { AlbumCard } from '@/components/media/Cards';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const album = await getAlbum(await getServerSupabase(), id);
  return { title: album ? `${album.title} by ${album.artist.name}` : 'Album not found' };
}

export default async function AlbumPage({ params }: Props) {
  const { id } = await params;
  const sb = await getServerSupabase();
  const album = await getAlbum(sb, id);
  if (!album) notFound();
  const [tracks, artist, genre, more] = await Promise.all([
    getAlbumTracks(sb, album.id),
    getArtist(sb, album.artist.id),
    album.genreId ? getGenre(sb, album.genreId) : Promise.resolve(null),
    getAlbums(sb, { artistId: album.artist.id, limit: 10 }),
  ]);
  const year = new Date(album.releaseDate).getFullYear();
  const others = more.filter((a) => a.id !== album.id);

  return (
    <div>
      <DetailHeader
        kind={albumTypeLabel(album.albumType)}
        title={album.title}
        tint={genre?.color ?? '#3a3a4a'}
        art={<Artwork src={album.coverUrl} alt={`Cover of ${album.title}`} className="w-full" priority />}
        meta={
          <>
            {artist && <Artwork src={artist.imageUrl} alt="" className="size-6" rounded="rounded-full" />}
            <Link href={`/artist/${album.artist.id}`} className="font-bold hover:underline">
              {album.artist.name}
            </Link>
            <Dot />
            <span>{year}</span>
            <Dot />
            <span>{pluralize(tracks.length, 'song')},</span>
            <span className="text-muted">{formatTotalDuration(totalDurationMs(tracks))}</span>
          </>
        }
      />
      <ActionBar>
        <AlbumActions album={album} tracks={tracks} />
      </ActionBar>
      <TrackList tracks={tracks} context={{ type: 'album', id: album.id, name: album.title, href: `/album/${album.id}` }} showCover={false} albumNumbers showPlays label={`Tracks on ${album.title}`} />
      <p className="mt-6 text-sm text-subtle">
        {new Date(album.releaseDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        <br />
        Original recording synthesised for Nocturne. Released under CC0.
      </p>
      {others.length > 0 && (
        <div className="mt-10">
          <Shelf title={`More by ${album.artist.name}`} href={`/artist/${album.artist.id}`}>
            {others.map((a) => (
              <ShelfItem key={a.id}>
                <AlbumCard album={a} subtitle={`${new Date(a.releaseDate).getFullYear()} • ${albumTypeLabel(a.albumType)}`} />
              </ShelfItem>
            ))}
          </Shelf>
        </div>
      )}
    </div>
  );
}
