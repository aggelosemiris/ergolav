import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser, getServerSupabase } from '@/lib/supabase/server';
import { getGenre, getPlaylist, getPlaylistTracks } from '@/lib/data/catalog';
import { tintFor } from '@/lib/format';
import { PlaylistView } from './PlaylistView';

type Props = { params: Promise<{ id: string }> };

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await getPlaylist(await getServerSupabase(), id);
  return { title: p?.name ?? 'Playlist not found' };
}

export default async function PlaylistPage({ params }: Props) {
  const { id } = await params;
  const sb = await getServerSupabase();
  const [playlist, user] = await Promise.all([getPlaylist(sb, id), getCurrentUser()]);
  // Row level security hides other people's private playlists: to a visitor they do not exist.
  if (!playlist) notFound();
  const tracks = await getPlaylistTracks(sb, playlist.id);
  const firstGenre = tracks.find((t) => t.genreId)?.genreId;
  const genre = firstGenre ? await getGenre(sb, firstGenre) : null;
  return <PlaylistView playlist={playlist} initialTracks={tracks} isOwner={user?.id === playlist.ownerId} tint={genre?.color ?? tintFor(playlist.id)} />;
}
