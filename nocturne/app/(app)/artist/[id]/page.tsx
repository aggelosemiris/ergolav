import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getServerSupabase } from '@/lib/supabase/server';
import { getAlbums, getArtist, getArtistTopTracks, getGenre, getRelatedArtists } from '@/lib/data/catalog';
import { albumTypeLabel, formatCount } from '@/lib/format';
import { ActionBar } from '@/components/media/DetailHeader';
import { ArtistActions } from '@/components/media/ContextActions';
import { Shelf, ShelfItem } from '@/components/media/Shelf';
import { AlbumCard, ArtistCard } from '@/components/media/Cards';
import { PopularTracks } from './PopularTracks';
import { Artwork } from '@/components/media/Artwork';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const artist = await getArtist(await getServerSupabase(), id);
  return { title: artist?.name ?? 'Artist not found' };
}

export default async function ArtistPage({ params }: Props) {
  const { id } = await params;
  const sb = await getServerSupabase();
  const artist = await getArtist(sb, id);
  if (!artist) notFound();
  const [top, albums] = await Promise.all([getArtistTopTracks(sb, artist.id, 10), getAlbums(sb, { artistId: artist.id, limit: 20 })]);
  const genreId = albums[0]?.genreId ?? null;
  const [genre, related] = await Promise.all([genreId ? getGenre(sb, genreId) : Promise.resolve(null), getRelatedArtists(sb, artist, genreId)]);
  const tint = genre?.color ?? '#3a3a4a';

  return (
    <div>
      <header
        className="relative -mx-4 -mt-[var(--topbar-h)] flex min-h-[300px] items-end overflow-hidden px-4 pt-[calc(var(--topbar-h)+24px)] pb-6 sm:-mx-6 sm:min-h-[340px] sm:px-6"
        style={{ backgroundColor: tint }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={artist.imageUrl} alt="" aria-hidden="true" className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent" aria-hidden="true" />
        <div className="relative flex items-end gap-5">
          <Artwork src={artist.imageUrl} alt={artist.name} className="hidden size-40 shrink-0 shadow-pop sm:block lg:size-48" rounded="rounded-full" priority />
          <div>
            <p className="text-sm font-semibold">Artist</p>
            <h1 className="text-5xl font-black tracking-tight [text-wrap:balance] sm:text-6xl lg:text-7xl">{artist.name}</h1>
            <p className="mt-3 text-sm">{formatCount(artist.monthlyListeners)} monthly listeners</p>
          </div>
        </div>
      </header>

      <ActionBar>
        <ArtistActions artist={artist} tracks={top} />
      </ActionBar>

      <section aria-labelledby="popular" className="mb-10">
        <h2 id="popular" className="mb-2 text-2xl font-extrabold tracking-tight">
          Popular
        </h2>
        <PopularTracks tracks={top} artist={artist} />
      </section>

      {albums.length > 0 && (
        <Shelf title="Discography">
          {albums.map((a) => (
            <ShelfItem key={a.id}>
              <AlbumCard album={a} subtitle={`${new Date(a.releaseDate).getFullYear()} • ${albumTypeLabel(a.albumType)}`} />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      {related.length > 0 && (
        <Shelf title="Fans also like">
          {related.map((a) => (
            <ShelfItem key={a.id}>
              <ArtistCard artist={a} />
            </ShelfItem>
          ))}
        </Shelf>
      )}

      <section aria-labelledby="about" className="mb-8">
        <h2 id="about" className="mb-3 text-2xl font-extrabold tracking-tight">
          About
        </h2>
        <div className="relative max-w-3xl overflow-hidden rounded-lg bg-surface-2 p-6">
          <p className="mb-3 font-bold">{formatCount(artist.monthlyListeners)} monthly listeners</p>
          <p className="leading-relaxed text-muted">{artist.bio}</p>
          {genre && <p className="mt-4 text-sm text-subtle">Genre: {genre.name}</p>}
        </div>
      </section>
    </div>
  );
}
