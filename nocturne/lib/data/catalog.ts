// Data access shared by server components and the browser. Every function takes a Supabase
// client, so the same queries run under the caller's session and its row level security.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Album, Artist, Genre, Playlist, PlaylistTrack, SearchResults, Track } from '@/lib/types';

export const TRACK_SELECT =
  'id, title, duration_ms, track_number, play_count, genre_id, album:albums!inner(id, title, cover_url), artist:artists!inner(id, name), stream:track_streams(url, mime_type)';

const ALBUM_SELECT = 'id, title, album_type, release_date, cover_url, genre_id, artist:artists!inner(id, name)';
const PLAYLIST_SELECT = 'id, name, description, is_public, owner_id, created_at, updated_at, owner:profiles!playlists_owner_id_fkey(display_name)';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = any;

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export function mapTrack(r: Row): Track {
  const album = one(r.album) as Row;
  const artist = one(r.artist) as Row;
  const stream = one(r.stream) as Row;
  return {
    id: r.id,
    title: r.title,
    durationMs: r.duration_ms,
    trackNumber: r.track_number,
    playCount: Number(r.play_count ?? 0),
    genreId: r.genre_id ?? null,
    streamUrl: stream?.url ?? null,
    mimeType: stream?.mime_type ?? null,
    album: { id: album?.id, title: album?.title, coverUrl: album?.cover_url },
    artist: { id: artist?.id, name: artist?.name },
  };
}

export function mapArtist(r: Row): Artist {
  return { id: r.id, name: r.name, bio: r.bio ?? '', imageUrl: r.image_url, monthlyListeners: r.monthly_listeners ?? 0 };
}

export function mapAlbum(r: Row): Album {
  const artist = one(r.artist) as Row;
  return {
    id: r.id,
    title: r.title,
    albumType: r.album_type,
    releaseDate: r.release_date,
    coverUrl: r.cover_url,
    genreId: r.genre_id ?? null,
    artist: { id: artist?.id, name: artist?.name },
  };
}

function mapPlaylist(r: Row, covers: string[] = [], trackCount = 0): Playlist {
  const owner = one(r.owner) as Row;
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    isPublic: r.is_public,
    ownerId: r.owner_id,
    ownerName: owner?.display_name ?? 'Unknown',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    covers,
    trackCount,
  };
}

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

// ------------------------------------------------------------------ catalogue

export async function getGenres(sb: SupabaseClient): Promise<Genre[]> {
  const rows = check(await sb.from('genres').select('id, name, color').order('sort_order'));
  return rows as Genre[];
}

export async function getGenre(sb: SupabaseClient, id: string): Promise<Genre | null> {
  const row = check(await sb.from('genres').select('id, name, color').eq('id', id).maybeSingle());
  return (row as Genre | null) ?? null;
}

export async function getArtists(sb: SupabaseClient, limit = 20): Promise<Artist[]> {
  const rows = check(await sb.from('artists').select('*').order('monthly_listeners', { ascending: false }).limit(limit));
  return rows.map(mapArtist);
}

export async function getArtist(sb: SupabaseClient, id: string): Promise<Artist | null> {
  if (!isUuid(id)) return null;
  const row = check(await sb.from('artists').select('*').eq('id', id).maybeSingle());
  return row ? mapArtist(row) : null;
}

export async function getAlbums(sb: SupabaseClient, opts: { limit?: number; genreId?: string; artistId?: string; newest?: boolean } = {}): Promise<Album[]> {
  let q = sb.from('albums').select(ALBUM_SELECT);
  if (opts.genreId) q = q.eq('genre_id', opts.genreId);
  if (opts.artistId) q = q.eq('artist_id', opts.artistId);
  q = q.order('release_date', { ascending: false }).limit(opts.limit ?? 20);
  return check(await q).map(mapAlbum);
}

export async function getAlbum(sb: SupabaseClient, id: string): Promise<Album | null> {
  if (!isUuid(id)) return null;
  const row = check(await sb.from('albums').select(ALBUM_SELECT).eq('id', id).maybeSingle());
  return row ? mapAlbum(row) : null;
}

export async function getAlbumTracks(sb: SupabaseClient, albumId: string): Promise<Track[]> {
  if (!isUuid(albumId)) return [];
  const rows = check(await sb.from('tracks').select(TRACK_SELECT).eq('album_id', albumId).order('track_number'));
  return rows.map(mapTrack);
}

export async function getArtistTopTracks(sb: SupabaseClient, artistId: string, limit = 10): Promise<Track[]> {
  if (!isUuid(artistId)) return [];
  const rows = check(
    await sb.from('tracks').select(TRACK_SELECT).eq('artist_id', artistId).order('play_count', { ascending: false }).limit(limit),
  );
  return rows.map(mapTrack);
}

export async function getGenreTracks(sb: SupabaseClient, genreId: string, limit = 20): Promise<Track[]> {
  const rows = check(
    await sb.from('tracks').select(TRACK_SELECT).eq('genre_id', genreId).order('play_count', { ascending: false }).limit(limit),
  );
  return rows.map(mapTrack);
}

export async function getTracksByIds(sb: SupabaseClient, ids: string[]): Promise<Track[]> {
  const valid = ids.filter(isUuid);
  if (!valid.length) return [];
  const rows = check(await sb.from('tracks').select(TRACK_SELECT).in('id', valid));
  const byId = new Map(rows.map((r: Row) => [r.id, mapTrack(r)]));
  return valid.map((id) => byId.get(id)).filter(Boolean) as Track[];
}

export async function getPopularTracks(sb: SupabaseClient, limit = 10): Promise<Track[]> {
  const rows = check(await sb.from('tracks').select(TRACK_SELECT).order('play_count', { ascending: false }).limit(limit));
  return rows.map(mapTrack);
}

/** Artists sharing the genre first, then the most listened to. */
export async function getRelatedArtists(sb: SupabaseClient, artist: Artist, genreId: string | null, limit = 6): Promise<Artist[]> {
  const rows = check(await sb.from('artists').select('*, albums(genre_id)').neq('id', artist.id));
  const related = rows
    .map((r: Row) => ({ a: mapArtist(r), same: (r.albums ?? []).some((al: Row) => al.genre_id === genreId) }))
    .sort((x: Row, y: Row) => Number(y.same) - Number(x.same) || y.a.monthlyListeners - x.a.monthlyListeners)
    .slice(0, limit)
    .map((x: Row) => x.a);
  return related;
}

// ------------------------------------------------------------------ playlists

async function playlistExtras(sb: SupabaseClient, ids: string[]) {
  const extras = new Map<string, { covers: string[]; count: number }>();
  if (!ids.length) return extras;
  const rows = check(
    await sb
      .from('playlist_tracks')
      .select('playlist_id, position, track:tracks!inner(album:albums!inner(cover_url))')
      .in('playlist_id', ids)
      .order('position'),
  );
  for (const r of rows as Row[]) {
    const e = extras.get(r.playlist_id) ?? { covers: [], count: 0 };
    e.count++;
    const cover = (one(one(r.track)?.album) as Row)?.cover_url;
    if (cover && !e.covers.includes(cover) && e.covers.length < 4) e.covers.push(cover);
    extras.set(r.playlist_id, e);
  }
  return extras;
}

async function withExtras(sb: SupabaseClient, rows: Row[]): Promise<Playlist[]> {
  const extras = await playlistExtras(sb, rows.map((r) => r.id));
  return rows.map((r) => {
    const e = extras.get(r.id);
    return mapPlaylist(r, e?.covers ?? [], e?.count ?? 0);
  });
}

export async function getFeaturedPlaylists(sb: SupabaseClient, editorId: string, limit = 12): Promise<Playlist[]> {
  const rows = check(
    await sb.from('playlists').select(PLAYLIST_SELECT).eq('owner_id', editorId).eq('is_public', true).order('created_at', { ascending: false }).limit(limit),
  );
  return withExtras(sb, rows);
}

export async function getPlaylistsByIds(sb: SupabaseClient, ids: string[]): Promise<Playlist[]> {
  const valid = ids.filter(isUuid);
  if (!valid.length) return [];
  const rows = check(await sb.from('playlists').select(PLAYLIST_SELECT).in('id', valid));
  const list = await withExtras(sb, rows);
  const byId = new Map(list.map((p) => [p.id, p]));
  return valid.map((id) => byId.get(id)).filter(Boolean) as Playlist[];
}

export async function getUserPlaylists(sb: SupabaseClient, ownerId: string, opts: { publicOnly?: boolean } = {}): Promise<Playlist[]> {
  let q = sb.from('playlists').select(PLAYLIST_SELECT).eq('owner_id', ownerId);
  if (opts.publicOnly) q = q.eq('is_public', true);
  const rows = check(await q.order('updated_at', { ascending: false }));
  return withExtras(sb, rows);
}

export async function getPlaylist(sb: SupabaseClient, id: string): Promise<Playlist | null> {
  if (!isUuid(id)) return null;
  const row = check(await sb.from('playlists').select(PLAYLIST_SELECT).eq('id', id).maybeSingle());
  if (!row) return null;
  const [p] = await withExtras(sb, [row]);
  return p;
}

export async function getPlaylistTracks(sb: SupabaseClient, playlistId: string): Promise<PlaylistTrack[]> {
  if (!isUuid(playlistId)) return [];
  const rows = check(
    await sb.from('playlist_tracks').select(`position, added_at, track:tracks!inner(${TRACK_SELECT})`).eq('playlist_id', playlistId).order('position'),
  );
  return rows.map((r: Row) => ({ ...mapTrack(one(r.track)), position: r.position, addedAt: r.added_at }));
}

// ------------------------------------------------------------------ context loading (play buttons on cards)

export async function getContextTracks(sb: SupabaseClient, type: 'album' | 'playlist' | 'artist' | 'genre', id: string): Promise<Track[]> {
  if (type === 'album') return getAlbumTracks(sb, id);
  if (type === 'playlist') return getPlaylistTracks(sb, id);
  if (type === 'genre') return getGenreTracks(sb, id);
  return getArtistTopTracks(sb, id);
}

// ------------------------------------------------------------------ personal (RLS limits to the signed-in user)

export async function getLikedTracks(sb: SupabaseClient, userId: string): Promise<(Track & { likedAt: string })[]> {
  const rows = check(
    await sb.from('liked_tracks').select(`liked_at, track:tracks!inner(${TRACK_SELECT})`).eq('user_id', userId).order('liked_at', { ascending: false }),
  );
  return rows.map((r: Row) => ({ ...mapTrack(one(r.track)), likedAt: r.liked_at }));
}

export async function getHistory(sb: SupabaseClient, userId: string, limit = 50): Promise<(Track & { playedAt: string; historyId: number })[]> {
  const rows = check(
    await sb
      .from('listening_history')
      .select(`id, played_at, track:tracks!inner(${TRACK_SELECT})`)
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .limit(limit),
  );
  return rows.map((r: Row) => ({ ...mapTrack(one(r.track)), playedAt: r.played_at, historyId: r.id }));
}

// ------------------------------------------------------------------ search

export async function searchCatalog(sb: SupabaseClient, query: string, max = 8): Promise<SearchResults> {
  const q = query.trim().slice(0, 100);
  if (!q) return { tracks: [], artists: [], albums: [], playlists: [] };
  const ids = check(await sb.rpc('search_catalog', { q, max_results: max })) as Record<keyof SearchResults, string[]>;
  const [tracks, artists, albums, playlists] = await Promise.all([
    getTracksByIds(sb, ids.tracks ?? []),
    (async () => {
      const v = (ids.artists ?? []).filter(isUuid);
      if (!v.length) return [];
      const rows = check(await sb.from('artists').select('*').in('id', v));
      const m = new Map(rows.map((r: Row) => [r.id, mapArtist(r)]));
      return v.map((id) => m.get(id)).filter(Boolean) as Artist[];
    })(),
    (async () => {
      const v = (ids.albums ?? []).filter(isUuid);
      if (!v.length) return [];
      const rows = check(await sb.from('albums').select(ALBUM_SELECT).in('id', v));
      const m = new Map(rows.map((r: Row) => [r.id, mapAlbum(r)]));
      return v.map((id) => m.get(id)).filter(Boolean) as Album[];
    })(),
    getPlaylistsByIds(sb, ids.playlists ?? []),
  ]);
  return { tracks, artists, albums, playlists };
}
