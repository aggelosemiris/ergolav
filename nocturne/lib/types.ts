export type AlbumType = 'album' | 'ep' | 'single';

export interface Track {
  id: string;
  title: string;
  durationMs: number;
  trackNumber: number;
  playCount: number;
  /** Stream URL from track_streams. Kept apart from metadata on purpose. */
  streamUrl: string | null;
  mimeType: string | null;
  album: { id: string; title: string; coverUrl: string };
  artist: { id: string; name: string };
  genreId: string | null;
}

export interface PlaylistTrack extends Track {
  position: number;
  addedAt: string;
}

export interface Artist {
  id: string;
  name: string;
  bio: string;
  imageUrl: string;
  monthlyListeners: number;
}

export interface Album {
  id: string;
  title: string;
  albumType: AlbumType;
  releaseDate: string;
  coverUrl: string;
  genreId: string | null;
  artist: { id: string; name: string };
}

export interface Genre {
  id: string;
  name: string;
  color: string;
}

export interface Playlist {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  ownerId: string;
  ownerName: string;
  updatedAt: string;
  createdAt: string;
  /** Up to four distinct album covers for the mosaic. */
  covers: string[];
  trackCount: number;
}

export type ContextType = 'album' | 'artist' | 'playlist' | 'liked' | 'search' | 'queue' | 'genre' | 'history';

export interface PlayContext {
  type: ContextType;
  id: string | null;
  name: string;
  href: string | null;
}

export interface Profile {
  id: string;
  displayName: string;
}

export interface SearchResults {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  playlists: Playlist[];
}
