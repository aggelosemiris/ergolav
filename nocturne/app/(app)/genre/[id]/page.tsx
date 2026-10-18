import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getServerSupabase } from '@/lib/supabase/server';
import { getAlbums, getGenre, getGenreTracks } from '@/lib/data/catalog';
import { ActionBar } from '@/components/media/DetailHeader';
import { PlayContextButton } from '@/components/player/PlayContextButton';
import { ShuffleButton } from '@/components/media/ContextActions';
import { TrackList } from '@/components/media/TrackList';
import { Shelf, ShelfItem } from '@/components/media/Shelf';
import { AlbumCard } from '@/components/media/Cards';
import { EmptyState } from '@/components/ui/Feedback';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const g = await getGenre(await getServerSupabase(), id);
  return { title: g?.name ?? 'Genre not found' };
}

export default async function GenrePage({ params }: Props) {
  const { id } = await params;
  const sb = await getServerSupabase();
  const genre = await getGenre(sb, id);
  if (!genre) notFound();
  const [tracks, albums] = await Promise.all([getGenreTracks(sb, genre.id, 20), getAlbums(sb, { genreId: genre.id })]);
  const context = { type: 'genre' as const, id: genre.id, name: genre.name, href: `/genre/${genre.id}` };
  return (
    <div>
      <header className="relative -mx-4 -mt-[var(--topbar-h)] px-4 pt-[calc(var(--topbar-h)+48px)] pb-8 sm:-mx-6 sm:px-6" style={{ backgroundImage: `linear-gradient(to bottom, ${genre.color} 0%, ${genre.color}66 70%, transparent 100%)` }}>
        <p className="text-sm font-semibold">Genre</p>
        <h1 className="text-5xl font-black tracking-tight sm:text-7xl">{genre.name}</h1>
      </header>
      {tracks.length === 0 ? (
        <EmptyState title="Nothing in this genre yet" />
      ) : (
        <>
          <ActionBar>
            <PlayContextButton context={context} tracks={tracks} size="lg" />
            <ShuffleButton tracks={tracks} context={context} />
          </ActionBar>
          <section aria-labelledby="top-tracks" className="mb-10">
            <h2 id="top-tracks" className="mb-2 text-2xl font-extrabold tracking-tight">
              Most played
            </h2>
            <TrackList tracks={tracks} context={context} showAlbum showPlays label={`Most played in ${genre.name}`} />
          </section>
          <Shelf title={`${genre.name} albums`}>
            {albums.map((a) => (
              <ShelfItem key={a.id}>
                <AlbumCard album={a} />
              </ShelfItem>
            ))}
          </Shelf>
        </>
      )}
    </div>
  );
}
