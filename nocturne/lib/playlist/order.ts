// Pure helpers for optimistic playlist edits. Positions are 0-based and always contiguous,
// mirroring what the playlist_* database functions guarantee.

export interface Positioned {
  id: string;
  position: number;
}

export function renumber<T extends Positioned>(items: T[]): T[] {
  return items.map((item, i) => (item.position === i ? item : { ...item, position: i }));
}

export function moveTrack<T extends Positioned>(items: T[], trackId: string, to: number): T[] {
  const from = items.findIndex((t) => t.id === trackId);
  if (from === -1) return items;
  const target = Math.max(0, Math.min(to, items.length - 1));
  if (target === from) return items;
  const copy = items.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(target, 0, item);
  return renumber(copy);
}

export function removeTrack<T extends Positioned>(items: T[], trackId: string): T[] {
  const next = items.filter((t) => t.id !== trackId);
  return next.length === items.length ? items : renumber(next);
}

export function appendTrack<T extends Positioned>(items: T[], track: Omit<T, 'position'>): T[] {
  if (items.some((t) => t.id === track.id)) return items;
  return [...items, { ...track, position: items.length } as T];
}

export function totalDurationMs(items: { durationMs: number }[]): number {
  return items.reduce((sum, t) => sum + t.durationMs, 0);
}

export const PLAYLIST_NAME_MAX = 100;
export const PLAYLIST_DESCRIPTION_MAX = 300;

/** Returns an error message, or null when the details are valid. */
export function validatePlaylistDetails(name: string, description: string): string | null {
  const n = name.trim();
  if (!n) return 'Give your playlist a name.';
  if (n.length > PLAYLIST_NAME_MAX) return `Names can be up to ${PLAYLIST_NAME_MAX} characters.`;
  if (description.length > PLAYLIST_DESCRIPTION_MAX) return `Descriptions can be up to ${PLAYLIST_DESCRIPTION_MAX} characters.`;
  return null;
}
