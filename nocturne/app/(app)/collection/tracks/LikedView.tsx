'use client';

import { useMemo } from 'react';
import { Heart } from 'lucide-react';
import type { Track } from '@/lib/types';
import { formatTotalDuration, pluralize } from '@/lib/format';
import { totalDurationMs } from '@/lib/playlist/order';
import { useLibrary } from '@/store/library';
import { ActionBar, DetailHeader, Dot } from '@/components/media/DetailHeader';
import { LikedCover } from '@/components/media/Artwork';
import { TrackList } from '@/components/media/TrackList';
import { PlayContextButton } from '@/components/player/PlayContextButton';
import { ShuffleButton } from '@/components/media/ContextActions';
import { EmptyState } from '@/components/ui/Feedback';
import { ButtonLink } from '@/components/ui/Button';

export function LikedView({ tracks, ownerName }: { tracks: (Track & { likedAt: string })[]; ownerName: string }) {
  const liked = useLibrary((s) => s.liked);
  const ready = useLibrary((s) => s.ready);
  // Unliking elsewhere on the page removes the row straight away.
  const shown = useMemo(() => (ready ? tracks.filter((t) => liked.has(t.id)) : tracks), [tracks, liked, ready]);
  const context = { type: 'liked' as const, id: null, name: 'Liked Songs', href: '/collection/tracks' };

  return (
    <div>
      <DetailHeader
        kind="Playlist"
        title="Liked Songs"
        tint="#5b3fd6"
        art={<LikedCover className="w-full" />}
        meta={
          <>
            <span className="font-bold">{ownerName}</span>
            <Dot />
            <span>{pluralize(shown.length, 'song')}</span>
            {shown.length > 0 && <span className="text-muted">, {formatTotalDuration(totalDurationMs(shown))}</span>}
          </>
        }
      />
      {shown.length === 0 ? (
        <EmptyState icon={<Heart />} title="Songs you like will appear here" body="Save songs by tapping the heart icon." action={<ButtonLink href="/search" variant="light">Find songs</ButtonLink>} />
      ) : (
        <>
          <ActionBar>
            <PlayContextButton context={context} tracks={shown} size="lg" />
            <ShuffleButton tracks={shown} context={context} />
          </ActionBar>
          <TrackList tracks={shown} context={context} showAlbum showAdded="liked" label="Liked Songs" />
        </>
      )}
    </div>
  );
}
