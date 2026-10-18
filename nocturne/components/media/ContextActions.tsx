'use client';

import { CheckCircle2, ListEnd, MoreHorizontal, PlusCircle, Shuffle, User2, UserCheck, UserPlus, ListPlus } from 'lucide-react';
import type { Album, Artist, PlayContext, Track } from '@/lib/types';
import { PlayContextButton } from '@/components/player/PlayContextButton';
import { usePlayer } from '@/store/player';
import { useLibrary } from '@/store/library';
import { openMenuFrom } from '@/components/ui/Menu';
import { addToPlaylistItems } from '@/components/library/trackMenu';
import { toast } from '@/store/ui';

export function ShuffleButton({ tracks, context }: { tracks: Track[]; context: PlayContext }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!tracks.length) return;
        const p = usePlayer.getState();
        if (!p.shuffle) p.toggleShuffle();
        p.playContext(tracks, null, context, { shuffle: true });
      }}
      disabled={!tracks.length}
      aria-label={`Shuffle play ${context.name}`}
      title="Shuffle play"
      className="inline-flex size-10 items-center justify-center rounded-full text-muted transition hover:scale-105 hover:text-text disabled:opacity-40"
    >
      <Shuffle className="size-6" aria-hidden="true" />
    </button>
  );
}

export function AlbumActions({ album, tracks }: { album: Album; tracks: Track[] }) {
  const saved = useLibrary((s) => s.savedAlbumIds.has(album.id));
  const context: PlayContext = { type: 'album', id: album.id, name: album.title, href: `/album/${album.id}` };
  return (
    <>
      <PlayContextButton context={context} tracks={tracks} size="lg" />
      <ShuffleButton tracks={tracks} context={context} />
      <button
        type="button"
        onClick={() => void useLibrary.getState().toggleSaveAlbum(album)}
        aria-pressed={saved}
        aria-label={saved ? 'Remove from Your Library' : 'Save to Your Library'}
        title={saved ? 'Remove from Your Library' : 'Save to Your Library'}
        className={`inline-flex size-10 items-center justify-center rounded-full transition hover:scale-105 ${saved ? 'text-accent' : 'text-muted hover:text-text'}`}
      >
        {saved ? <CheckCircle2 className="size-7" aria-hidden="true" /> : <PlusCircle className="size-7" aria-hidden="true" />}
      </button>
      <button
        type="button"
        aria-label={`More options for ${album.title}`}
        aria-haspopup="menu"
        onClick={(e) =>
          openMenuFrom(
            e.currentTarget,
            `Options for ${album.title}`,
            [
              {
                label: 'Add to queue',
                icon: <ListEnd />,
                onSelect: () => {
                  usePlayer.getState().addToQueue(tracks);
                  toast('Added to queue');
                },
              },
              { label: 'Add to playlist', icon: <ListPlus />, submenu: () => addToPlaylistItems(tracks) },
              { label: 'Go to artist', icon: <User2 />, href: `/artist/${album.artist.id}`, separatorBefore: true },
            ],
            'start',
          )
        }
        className="inline-flex size-10 items-center justify-center rounded-full text-muted transition hover:scale-105 hover:text-text"
      >
        <MoreHorizontal className="size-7" aria-hidden="true" />
      </button>
    </>
  );
}

export function ArtistActions({ artist, tracks }: { artist: Artist; tracks: Track[] }) {
  const following = useLibrary((s) => s.followedArtistIds.has(artist.id));
  const context: PlayContext = { type: 'artist', id: artist.id, name: artist.name, href: `/artist/${artist.id}` };
  return (
    <>
      <PlayContextButton context={context} tracks={tracks} size="lg" />
      <ShuffleButton tracks={tracks} context={context} />
      <button
        type="button"
        onClick={() => void useLibrary.getState().toggleFollowArtist(artist)}
        aria-pressed={following}
        className="inline-flex h-8 items-center gap-2 rounded-full border border-border-input px-4 text-sm font-bold transition hover:scale-105 hover:border-text"
      >
        {following ? <UserCheck className="size-4" aria-hidden="true" /> : <UserPlus className="size-4" aria-hidden="true" />}
        {following ? 'Following' : 'Follow'}
      </button>
    </>
  );
}
