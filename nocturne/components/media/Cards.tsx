// Ready-made cards for each kind of thing, so every shelf links and plays the same way.

import type { Album, Artist, Playlist } from '@/lib/types';
import { albumTypeLabel } from '@/lib/format';
import { MediaCard } from './MediaCard';
import { Artwork, PlaylistCover } from './Artwork';

export function AlbumCard({ album, subtitle }: { album: Album; subtitle?: string }) {
  return (
    <MediaCard
      href={`/album/${album.id}`}
      title={album.title}
      subtitle={subtitle ?? `${new Date(album.releaseDate).getFullYear()} • ${album.artist.name}`}
      art={<Artwork src={album.coverUrl} alt={`Cover of ${album.title}`} className="w-full" />}
      context={{ type: 'album', id: album.id, name: album.title, href: `/album/${album.id}` }}
    />
  );
}

export function ArtistCard({ artist }: { artist: Artist }) {
  return (
    <MediaCard
      href={`/artist/${artist.id}`}
      title={artist.name}
      subtitle="Artist"
      round
      art={<Artwork src={artist.imageUrl} alt={artist.name} className="w-full" rounded="rounded-full" />}
      context={{ type: 'artist', id: artist.id, name: artist.name, href: `/artist/${artist.id}` }}
    />
  );
}

export function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <MediaCard
      href={`/playlist/${playlist.id}`}
      title={playlist.name}
      subtitle={playlist.description || `By ${playlist.ownerName}`}
      art={<PlaylistCover covers={playlist.covers} name={playlist.name} className="w-full" />}
      context={{ type: 'playlist', id: playlist.id, name: playlist.name, href: `/playlist/${playlist.id}` }}
    />
  );
}

export function albumKind(album: Album) {
  return albumTypeLabel(album.albumType);
}
