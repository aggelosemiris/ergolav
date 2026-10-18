import type { Track } from '@/lib/types';

export function makeTrack(n: number, overrides: Partial<Track> = {}): Track {
  return {
    id: `t${n}`,
    title: `Track ${n}`,
    durationMs: 60_000 + n * 1000,
    trackNumber: n,
    playCount: 100 * n,
    streamUrl: `/media/audio/t${n}.mp3`,
    mimeType: 'audio/mpeg',
    album: { id: 'a1', title: 'Album', coverUrl: '/media/art/album/a1.svg' },
    artist: { id: 'r1', name: 'Artist' },
    genreId: 'lofi',
    ...overrides,
  };
}

export const tracks = (count: number) => Array.from({ length: count }, (_, i) => makeTrack(i + 1));

/** Deterministic RNG for shuffle tests. */
export function seeded(seed = 42) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
