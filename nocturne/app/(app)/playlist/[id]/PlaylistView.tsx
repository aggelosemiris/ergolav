'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, CheckCircle2, Globe2, ListEnd, Lock, MoreHorizontal, Pencil, PlusCircle, Trash2 } from 'lucide-react';
import type { Playlist, PlaylistTrack, Track } from '@/lib/types';
import { formatTotalDuration, pluralize } from '@/lib/format';
import { moveTrack, removeTrack, totalDurationMs, validatePlaylistDetails, PLAYLIST_DESCRIPTION_MAX, PLAYLIST_NAME_MAX } from '@/lib/playlist/order';
import { getBrowserSupabase } from '@/lib/supabase/client';
import { ActionBar, DetailHeader, Dot } from '@/components/media/DetailHeader';
import { PlaylistCover } from '@/components/media/Artwork';
import { TrackList } from '@/components/media/TrackList';
import { PlayContextButton } from '@/components/player/PlayContextButton';
import { ShuffleButton } from '@/components/media/ContextActions';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { openMenuFrom, type MenuItem } from '@/components/ui/Menu';
import { useLibrary } from '@/store/library';
import { usePlayer } from '@/store/player';
import { toast } from '@/store/ui';
import { FindSongs } from './FindSongs';
import { ListMusic } from 'lucide-react';

interface Props {
  playlist: Playlist;
  initialTracks: PlaylistTrack[];
  isOwner: boolean;
  tint: string;
}

export function PlaylistView({ playlist: initial, initialTracks, isOwner, tint }: Props) {
  const router = useRouter();
  const [playlist, setPlaylist] = useState(initial);
  const [tracks, setTracks] = useState(initialTracks);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const saved = useLibrary((s) => s.savedPlaylistIds.has(initial.id));
  const user = useLibrary((s) => s.user);

  // a server re-render (router.refresh) brings fresh data: adopt it
  const [seen, setSeen] = useState({ initial, initialTracks });
  if (seen.initial !== initial || seen.initialTracks !== initialTracks) {
    setSeen({ initial, initialTracks });
    setPlaylist(initial);
    setTracks(initialTracks);
  }

  const context = useMemo(() => ({ type: 'playlist' as const, id: playlist.id, name: playlist.name, href: `/playlist/${playlist.id}` }), [playlist.id, playlist.name]);
  const sb = getBrowserSupabase();

  const syncAfterChange = () => {
    void useLibrary.getState().refreshPlaylists();
    router.refresh();
  };

  const move = async (trackId: string, to: number) => {
    const before = tracks;
    const next = moveTrack(tracks, trackId, to);
    if (next === before) return;
    setTracks(next);
    const { error } = await sb.rpc('playlist_move_track', { p_playlist: playlist.id, p_track: trackId, p_to: to });
    if (error) {
      setTracks(before);
      toast('Could not reorder the playlist. Try again.', { tone: 'error' });
      return;
    }
    syncAfterChange();
  };

  const remove = async (track: Track) => {
    const before = tracks;
    setTracks(removeTrack(tracks, track.id));
    const { error } = await sb.rpc('playlist_remove_track', { p_playlist: playlist.id, p_track: track.id });
    if (error) {
      setTracks(before);
      toast('Could not remove the song. Try again.', { tone: 'error' });
      return;
    }
    toast(`Removed from ${playlist.name}`);
    syncAfterChange();
  };

  const add = async (track: Track) => {
    if (tracks.some((t) => t.id === track.id)) {
      toast(`Already in ${playlist.name}`);
      return;
    }
    const ok = await useLibrary.getState().addToPlaylist(playlist.id, [track]);
    if (ok) {
      setTracks((cur) => [...cur, { ...track, position: cur.length, addedAt: new Date().toISOString() }]);
      router.refresh();
    }
  };

  const setVisibility = async (isPublic: boolean) => {
    const { error } = await sb.from('playlists').update({ is_public: isPublic }).eq('id', playlist.id);
    if (error) {
      toast('Could not change who can see this playlist.', { tone: 'error' });
      return;
    }
    setPlaylist({ ...playlist, isPublic });
    toast(isPublic ? 'Playlist is now public' : 'Playlist is now private');
    syncAfterChange();
  };

  const extraMenu = isOwner
    ? (t: Track, i: number): MenuItem[] => [
        { label: 'Remove from this playlist', icon: <Trash2 />, onSelect: () => void remove(t) },
        { label: 'Move up', icon: <ArrowUp />, disabled: i === 0, onSelect: () => void move(t.id, i - 1) },
        { label: 'Move down', icon: <ArrowDown />, disabled: i === tracks.length - 1, onSelect: () => void move(t.id, i + 1) },
      ]
    : undefined;

  const playlistMenu = (el: HTMLElement) => {
    const items: MenuItem[] = [];
    if (tracks.length) {
      items.push({
        label: 'Add to queue',
        icon: <ListEnd />,
        onSelect: () => {
          usePlayer.getState().addToQueue(tracks);
          toast('Added to queue');
        },
      });
    }
    if (isOwner) {
      items.push(
        { label: 'Edit details', icon: <Pencil />, onSelect: () => setEditOpen(true), separatorBefore: items.length > 0 },
        playlist.isPublic
          ? { label: 'Make private', icon: <Lock />, onSelect: () => void setVisibility(false) }
          : { label: 'Make public', icon: <Globe2 />, onSelect: () => void setVisibility(true) },
        { label: 'Delete', icon: <Trash2 />, danger: true, onSelect: () => setDeleteOpen(true), separatorBefore: true },
      );
    } else if (user) {
      items.push({ label: saved ? 'Remove from Your Library' : 'Save to Your Library', icon: saved ? <CheckCircle2 /> : <PlusCircle />, onSelect: () => void useLibrary.getState().toggleSavePlaylist(playlist) });
    }
    openMenuFrom(el, `Options for ${playlist.name}`, items, 'start');
  };

  const covers = useMemo(() => {
    const c: string[] = [];
    for (const t of tracks) if (!c.includes(t.album.coverUrl) && c.length < 4) c.push(t.album.coverUrl);
    return c;
  }, [tracks]);

  return (
    <div>
      <DetailHeader
        kind={playlist.isPublic ? 'Public playlist' : 'Private playlist'}
        title={playlist.name}
        tint={tint}
        description={playlist.description || undefined}
        art={
          isOwner ? (
            <button type="button" onClick={() => setEditOpen(true)} className="group/art relative block w-full" aria-label="Edit details">
              <PlaylistCover covers={covers} name={playlist.name} className="w-full" />
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-md bg-black/60 text-sm font-semibold opacity-0 transition group-hover/art:opacity-100 group-focus-visible/art:opacity-100">
                <Pencil className="size-8" aria-hidden="true" />
                Edit details
              </span>
            </button>
          ) : (
            <PlaylistCover covers={covers} name={playlist.name} className="w-full" />
          )
        }
        meta={
          <>
            <span className="font-bold">{playlist.ownerName}</span>
            <Dot />
            <span data-testid="playlist-count">{pluralize(tracks.length, 'song')}</span>
            {tracks.length > 0 && (
              <>
                <span>,</span>
                <span className="text-muted">{formatTotalDuration(totalDurationMs(tracks))}</span>
              </>
            )}
          </>
        }
      />

      <ActionBar>
        <PlayContextButton context={context} tracks={tracks} size="lg" />
        <ShuffleButton tracks={tracks} context={context} />
        {!isOwner && user && (
          <button
            type="button"
            onClick={() => void useLibrary.getState().toggleSavePlaylist(playlist)}
            aria-pressed={saved}
            aria-label={saved ? 'Remove from Your Library' : 'Save to Your Library'}
            title={saved ? 'Remove from Your Library' : 'Save to Your Library'}
            className={`inline-flex size-10 items-center justify-center rounded-full transition hover:scale-105 ${saved ? 'text-accent' : 'text-muted hover:text-text'}`}
          >
            {saved ? <CheckCircle2 className="size-7" aria-hidden="true" /> : <PlusCircle className="size-7" aria-hidden="true" />}
          </button>
        )}
        <button
          type="button"
          aria-label={`More options for ${playlist.name}`}
          aria-haspopup="menu"
          onClick={(e) => playlistMenu(e.currentTarget)}
          className="inline-flex size-10 items-center justify-center rounded-full text-muted transition hover:scale-105 hover:text-text"
        >
          <MoreHorizontal className="size-7" aria-hidden="true" />
        </button>
      </ActionBar>

      {tracks.length > 0 ? (
        <TrackList
          tracks={tracks}
          context={context}
          showAlbum
          showAdded="added"
          extraMenu={extraMenu}
          playlistId={playlist.id}
          onMove={isOwner ? (id, to) => void move(id, to) : undefined}
          label={`Songs in ${playlist.name}`}
        />
      ) : (
        !isOwner && <EmptyState icon={<ListMusic />} title="This playlist is empty" body="Nothing has been added here yet." />
      )}

      {isOwner && <FindSongs onAdd={add} existing={new Set(tracks.map((t) => t.id))} prominent={tracks.length === 0} />}

      <EditDetailsDialog
        key={editOpen ? 'editing' : 'closed'}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        playlist={playlist}
        onSaved={(p) => {
          setPlaylist(p);
          syncAfterChange();
        }}
      />
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete playlist?">
        <p className="text-muted">
          <span className="font-bold text-text">{playlist.name}</span> will be removed from Your Library. This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              const { error } = await sb.from('playlists').delete().eq('id', playlist.id);
              if (error) {
                toast('Could not delete the playlist. Try again.', { tone: 'error' });
                return;
              }
              setDeleteOpen(false);
              toast(`Deleted ${playlist.name}`);
              await useLibrary.getState().refreshPlaylists();
              router.replace('/library');
              router.refresh();
            }}
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function EditDetailsDialog({ open, onClose, playlist, onSaved }: { open: boolean; onClose: () => void; playlist: Playlist; onSaved: (p: Playlist) => void }) {
  const [name, setName] = useState(playlist.name);
  const [description, setDescription] = useState(playlist.description);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validatePlaylistDetails(name, description);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    const { error: dbError } = await getBrowserSupabase().from('playlists').update({ name: name.trim(), description: description.trim() }).eq('id', playlist.id);
    setSaving(false);
    if (dbError) {
      setError('Could not save your changes. Try again.');
      return;
    }
    onSaved({ ...playlist, name: name.trim(), description: description.trim() });
    toast('Playlist updated');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Edit details">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="pl-name" className="mb-1.5 block text-sm font-semibold">
            Name
          </label>
          <input
            id="pl-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={PLAYLIST_NAME_MAX}
            required
            aria-invalid={!!error && !name.trim()}
            className="h-11 w-full rounded-md border border-border-input bg-surface-3 px-3 text-text focus:border-text focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="pl-desc" className="mb-1.5 flex justify-between text-sm font-semibold">
            Description <span className="font-normal text-subtle">{description.length}/{PLAYLIST_DESCRIPTION_MAX}</span>
          </label>
          <textarea
            id="pl-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={PLAYLIST_DESCRIPTION_MAX}
            rows={4}
            placeholder="Add an optional description"
            className="w-full resize-none rounded-md border border-border-input bg-surface-3 px-3 py-2 text-text placeholder:text-subtle focus:border-text focus:outline-none"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {error}
          </p>
        )}
        <div className="flex justify-end">
          <Button type="submit" variant="light" loading={saving}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
