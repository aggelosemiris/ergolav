'use client';

import { useState } from 'react';
import type { Artist, Track } from '@/lib/types';
import { TrackList } from '@/components/media/TrackList';

export function PopularTracks({ tracks, artist }: { tracks: Track[]; artist: Artist }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? tracks : tracks.slice(0, 5);
  return (
    <>
      <TrackList tracks={shown} context={{ type: 'artist', id: artist.id, name: artist.name, href: `/artist/${artist.id}` }} showPlays label={`Popular tracks by ${artist.name}`} />
      {tracks.length > 5 && (
        <button type="button" onClick={() => setExpanded(!expanded)} className="mt-3 px-2 text-sm font-bold text-muted hover:text-text" aria-expanded={expanded}>
          {expanded ? 'Show less' : 'See more'}
        </button>
      )}
    </>
  );
}
