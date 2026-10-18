'use client';

import { Disc3, Heart, HeartOff, ListEnd, ListPlus, ListStart, Plus, User2 } from 'lucide-react';
import type { MenuItem } from '@/components/ui/Menu';
import type { Track } from '@/lib/types';
import { usePlayer } from '@/store/player';
import { useLibrary } from '@/store/library';
import { toast } from '@/store/ui';

/** "Add to playlist" submenu: a new playlist first, then the listener's own playlists. */
export function addToPlaylistItems(tracks: Track[], excludePlaylistId?: string): MenuItem[] {
  const lib = useLibrary.getState();
  if (!lib.user) {
    return [{ label: 'Log in to make playlists', href: '/login' }];
  }
  const items: MenuItem[] = [
    {
      label: 'New playlist',
      icon: <Plus />,
      onSelect: async () => {
        const p = await useLibrary.getState().createPlaylist(tracks.length === 1 ? tracks[0].title : undefined);
        if (p) await useLibrary.getState().addToPlaylist(p.id, tracks);
      },
    },
  ];
  const own = lib.ownPlaylists.filter((p) => p.id !== excludePlaylistId);
  own.forEach((p, i) =>
    items.push({
      label: p.name,
      separatorBefore: i === 0,
      onSelect: () => void useLibrary.getState().addToPlaylist(p.id, tracks),
    }),
  );
  return items;
}

/** Standard actions for a track; `extra` goes at the end (e.g. remove from this playlist). */
export function trackMenuItems(track: Track, extra: MenuItem[] = [], opts: { playlistId?: string } = {}): MenuItem[] {
  const liked = useLibrary.getState().liked.has(track.id);
  const items: MenuItem[] = [
    {
      label: 'Add to queue',
      icon: <ListEnd />,
      onSelect: () => {
        usePlayer.getState().addToQueue([track]);
        toast('Added to queue');
      },
    },
    {
      label: 'Play next',
      icon: <ListStart />,
      onSelect: () => {
        usePlayer.getState().playNext([track]);
        toast('Playing next');
      },
    },
    { label: 'Add to playlist', icon: <ListPlus />, submenu: () => addToPlaylistItems([track], opts.playlistId) },
    {
      label: liked ? 'Remove from Liked Songs' : 'Save to Liked Songs',
      icon: liked ? <HeartOff /> : <Heart />,
      onSelect: () => void useLibrary.getState().toggleLike(track),
    },
    { label: 'Go to artist', icon: <User2 />, href: `/artist/${track.artist.id}`, separatorBefore: true },
    { label: 'Go to album', icon: <Disc3 />, href: `/album/${track.album.id}` },
  ];
  if (extra.length) items.push({ ...extra[0], separatorBefore: true }, ...extra.slice(1));
  return items;
}
