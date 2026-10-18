'use client';

// The signed-in listener's library: likes, playlists, saved albums, followed artists.
// Loaded once per session, updated optimistically, rolled back with a toast when the database says no.

import { create } from 'zustand';
import type { Album, Artist, Playlist, Track } from '@/lib/types';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { getUserPlaylists, getPlaylistsByIds, mapAlbum, mapArtist } from '@/lib/data/catalog';
import { toast } from './ui';

export interface LibraryUser {
  id: string;
  email: string | null;
  displayName: string;
}

interface LibraryState {
  user: LibraryUser | null;
  ready: boolean;
  loading: boolean;
  liked: Set<string>;
  ownPlaylists: Playlist[];
  savedPlaylists: Playlist[];
  savedPlaylistIds: Set<string>;
  savedAlbums: (Album & { savedAt: string })[];
  savedAlbumIds: Set<string>;
  followedArtists: (Artist & { followedAt: string })[];
  followedArtistIds: Set<string>;

  setUser: (user: LibraryUser | null) => void;
  load: () => Promise<void>;
  refreshPlaylists: () => Promise<void>;
  toggleLike: (track: Track) => Promise<void>;
  createPlaylist: (name?: string) => Promise<Playlist | null>;
  addToPlaylist: (playlistId: string, tracks: Track[]) => Promise<boolean>;
  toggleSavePlaylist: (playlist: Playlist) => Promise<void>;
  toggleSaveAlbum: (album: Album) => Promise<void>;
  toggleFollowArtist: (artist: Artist) => Promise<void>;
  logPlay: (trackId: string, context: { type: string; id: string | null } | null) => void;
}

const emptyLibrary = {
  liked: new Set<string>(),
  ownPlaylists: [] as Playlist[],
  savedPlaylists: [] as Playlist[],
  savedPlaylistIds: new Set<string>(),
  savedAlbums: [] as (Album & { savedAt: string })[],
  savedAlbumIds: new Set<string>(),
  followedArtists: [] as (Artist & { followedAt: string })[],
  followedArtistIds: new Set<string>(),
};

function requireUser(get: () => LibraryState): LibraryUser | null {
  const u = get().user;
  if (!u) toast('Log in to build your library.', { action: { label: 'Log in', href: '/login' } });
  return u;
}

export const useLibrary = create<LibraryState>()((set, get) => ({
  user: null,
  ready: false,
  loading: false,
  ...emptyLibrary,

  setUser: (user) => {
    const prev = get().user;
    if (prev?.id === user?.id && get().ready) {
      if (user && prev?.displayName !== user.displayName) set({ user });
      return;
    }
    set({ user, ...emptyLibrary, ready: !user });
    if (user) void get().load();
  },

  load: async () => {
    const user = get().user;
    if (!user) return;
    set({ loading: true });
    const sb = getBrowserSupabase();
    try {
      const [likes, own, savedPl, albums, artists] = await Promise.all([
        sb.from('liked_tracks').select('track_id').eq('user_id', user.id),
        getUserPlaylists(sb, user.id),
        sb.from('saved_playlists').select('playlist_id, saved_at').eq('user_id', user.id).order('saved_at', { ascending: false }),
        sb.from('saved_albums').select('saved_at, album:albums!inner(id, title, album_type, release_date, cover_url, genre_id, artist:artists!inner(id, name))').eq('user_id', user.id).order('saved_at', { ascending: false }),
        sb.from('followed_artists').select('followed_at, artist:artists!inner(*)').eq('user_id', user.id).order('followed_at', { ascending: false }),
      ]);
      const savedIds = (savedPl.data ?? []).map((r) => r.playlist_id as string);
      const saved = await getPlaylistsByIds(sb, savedIds);
      if (get().user?.id !== user.id) return; // signed out meanwhile
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const savedAlbums = (albums.data ?? []).map((r: any) => ({ ...mapAlbum(Array.isArray(r.album) ? r.album[0] : r.album), savedAt: r.saved_at }));
      const followed = (artists.data ?? []).map((r: any) => ({ ...mapArtist(Array.isArray(r.artist) ? r.artist[0] : r.artist), followedAt: r.followed_at }));
      /* eslint-enable @typescript-eslint/no-explicit-any */
      set({
        liked: new Set((likes.data ?? []).map((r) => r.track_id as string)),
        ownPlaylists: own,
        savedPlaylists: saved,
        savedPlaylistIds: new Set(savedIds),
        savedAlbums,
        savedAlbumIds: new Set(savedAlbums.map((a) => a.id)),
        followedArtists: followed,
        followedArtistIds: new Set(followed.map((a) => a.id)),
        ready: true,
        loading: false,
      });
    } catch {
      set({ loading: false, ready: true });
      toast('Could not load your library. Check your connection and refresh.', { tone: 'error' });
    }
  },

  refreshPlaylists: async () => {
    const user = get().user;
    if (!user) return;
    const sb = getBrowserSupabase();
    try {
      const [own, saved] = await Promise.all([getUserPlaylists(sb, user.id), getPlaylistsByIds(sb, [...get().savedPlaylistIds])]);
      set({ ownPlaylists: own, savedPlaylists: saved });
    } catch {
      /* keep what we have */
    }
  },

  toggleLike: async (track) => {
    const user = requireUser(get);
    if (!user) return;
    const sb = getBrowserSupabase();
    const wasLiked = get().liked.has(track.id);
    const optimistic = new Set(get().liked);
    if (wasLiked) optimistic.delete(track.id);
    else optimistic.add(track.id);
    set({ liked: optimistic });
    const { error } = wasLiked
      ? await sb.from('liked_tracks').delete().eq('user_id', user.id).eq('track_id', track.id)
      : await sb.from('liked_tracks').upsert({ user_id: user.id, track_id: track.id }, { onConflict: 'user_id,track_id', ignoreDuplicates: true });
    if (error) {
      const rollback = new Set(get().liked);
      if (wasLiked) rollback.add(track.id);
      else rollback.delete(track.id);
      set({ liked: rollback });
      toast('That did not save. Try again.', { tone: 'error' });
      return;
    }
    toast(wasLiked ? 'Removed from Liked Songs' : 'Added to Liked Songs');
  },

  createPlaylist: async (name) => {
    const user = requireUser(get);
    if (!user) return null;
    const sb = getBrowserSupabase();
    const finalName = name?.trim() || `My Playlist #${get().ownPlaylists.length + 1}`;
    const { data, error } = await sb
      .from('playlists')
      .insert({ owner_id: user.id, name: finalName.slice(0, 100), is_public: true })
      .select('id, name, description, is_public, owner_id, created_at, updated_at')
      .single();
    if (error || !data) {
      toast('Could not create the playlist. Try again.', { tone: 'error' });
      return null;
    }
    const playlist: Playlist = {
      id: data.id,
      name: data.name,
      description: data.description,
      isPublic: data.is_public,
      ownerId: data.owner_id,
      ownerName: user.displayName,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      covers: [],
      trackCount: 0,
    };
    set({ ownPlaylists: [playlist, ...get().ownPlaylists] });
    return playlist;
  },

  addToPlaylist: async (playlistId, tracks) => {
    const user = requireUser(get);
    if (!user) return false;
    const sb = getBrowserSupabase();
    const target = get().ownPlaylists.find((p) => p.id === playlistId);
    let added = 0;
    let duplicates = 0;
    for (const t of tracks) {
      const { error } = await sb.rpc('playlist_add_track', { p_playlist: playlistId, p_track: t.id });
      if (!error) added++;
      else if (error.code === '23505') duplicates++;
      else {
        toast('Could not add to the playlist. Try again.', { tone: 'error' });
        return false;
      }
    }
    const name = target?.name ?? 'playlist';
    if (added === 0 && duplicates > 0) toast(`Already in ${name}`);
    else toast(added === 1 ? `Added to ${name}` : `Added ${added} songs to ${name}`, { action: { label: 'View', href: `/playlist/${playlistId}` } });
    void get().refreshPlaylists();
    return added > 0;
  },

  toggleSavePlaylist: async (playlist) => {
    const user = requireUser(get);
    if (!user) return;
    const sb = getBrowserSupabase();
    const saved = get().savedPlaylistIds.has(playlist.id);
    const ids = new Set(get().savedPlaylistIds);
    if (saved) ids.delete(playlist.id);
    else ids.add(playlist.id);
    set({
      savedPlaylistIds: ids,
      savedPlaylists: saved ? get().savedPlaylists.filter((p) => p.id !== playlist.id) : [playlist, ...get().savedPlaylists],
    });
    const { error } = saved
      ? await sb.from('saved_playlists').delete().eq('user_id', user.id).eq('playlist_id', playlist.id)
      : await sb.from('saved_playlists').insert({ user_id: user.id, playlist_id: playlist.id });
    if (error) {
      toast('That did not save. Try again.', { tone: 'error' });
      void get().load();
      return;
    }
    toast(saved ? 'Removed from Your Library' : 'Saved to Your Library');
  },

  toggleSaveAlbum: async (album) => {
    const user = requireUser(get);
    if (!user) return;
    const sb = getBrowserSupabase();
    const saved = get().savedAlbumIds.has(album.id);
    const ids = new Set(get().savedAlbumIds);
    if (saved) ids.delete(album.id);
    else ids.add(album.id);
    set({
      savedAlbumIds: ids,
      savedAlbums: saved ? get().savedAlbums.filter((a) => a.id !== album.id) : [{ ...album, savedAt: new Date().toISOString() }, ...get().savedAlbums],
    });
    const { error } = saved
      ? await sb.from('saved_albums').delete().eq('user_id', user.id).eq('album_id', album.id)
      : await sb.from('saved_albums').insert({ user_id: user.id, album_id: album.id });
    if (error) {
      toast('That did not save. Try again.', { tone: 'error' });
      void get().load();
      return;
    }
    toast(saved ? 'Removed from Your Library' : 'Saved to Your Library');
  },

  toggleFollowArtist: async (artist) => {
    const user = requireUser(get);
    if (!user) return;
    const sb = getBrowserSupabase();
    const following = get().followedArtistIds.has(artist.id);
    const ids = new Set(get().followedArtistIds);
    if (following) ids.delete(artist.id);
    else ids.add(artist.id);
    set({
      followedArtistIds: ids,
      followedArtists: following
        ? get().followedArtists.filter((a) => a.id !== artist.id)
        : [{ ...artist, followedAt: new Date().toISOString() }, ...get().followedArtists],
    });
    const { error } = following
      ? await sb.from('followed_artists').delete().eq('user_id', user.id).eq('artist_id', artist.id)
      : await sb.from('followed_artists').insert({ user_id: user.id, artist_id: artist.id });
    if (error) {
      toast('That did not save. Try again.', { tone: 'error' });
      void get().load();
      return;
    }
    toast(following ? `Unfollowed ${artist.name}` : `Following ${artist.name}`);
  },

  logPlay: (trackId, context) => {
    const user = get().user;
    if (!user) return;
    const allowed = ['album', 'artist', 'playlist', 'liked', 'search', 'queue', 'genre', 'history'];
    const type = context && allowed.includes(context.type) ? context.type : null;
    void getBrowserSupabase()
      .from('listening_history')
      .insert({ user_id: user.id, track_id: trackId, context_type: type, context_id: context?.id ?? null })
      .then(({ error }) => {
        if (error) console.warn('history not saved', error.message);
      });
  },
}));
