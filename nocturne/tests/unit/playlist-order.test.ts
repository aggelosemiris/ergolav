import { describe, expect, it } from 'vitest';
import { appendTrack, moveTrack, removeTrack, renumber, totalDurationMs, validatePlaylistDetails } from '@/lib/playlist/order';

const items = () => ['a', 'b', 'c', 'd'].map((id, position) => ({ id, position, durationMs: 1000 * (position + 1) }));
const ids = (xs: { id: string }[]) => xs.map((x) => x.id).join('');
const positions = (xs: { position: number }[]) => xs.map((x) => x.position);

describe('playlist ordering', () => {
  it('moves a track down and keeps positions contiguous', () => {
    const r = moveTrack(items(), 'a', 2);
    expect(ids(r)).toBe('bcad');
    expect(positions(r)).toEqual([0, 1, 2, 3]);
  });

  it('moves a track up', () => {
    expect(ids(moveTrack(items(), 'd', 0))).toBe('dabc');
  });

  it('clamps the target and ignores unknown tracks or no-op moves', () => {
    expect(ids(moveTrack(items(), 'b', 99))).toBe('acdb');
    const list = items();
    expect(moveTrack(list, 'zz', 0)).toBe(list);
    expect(moveTrack(list, 'b', 1)).toBe(list);
  });

  it('removes a track and closes the gap', () => {
    const r = removeTrack(items(), 'b');
    expect(ids(r)).toBe('acd');
    expect(positions(r)).toEqual([0, 1, 2]);
    const list = items();
    expect(removeTrack(list, 'nope')).toBe(list);
  });

  it('appends at the end and refuses duplicates', () => {
    const r = appendTrack(items(), { id: 'e', durationMs: 5 });
    expect(r.at(-1)).toMatchObject({ id: 'e', position: 4 });
    const list = items();
    expect(appendTrack(list, { id: 'a', durationMs: 1 })).toBe(list);
  });

  it('renumber only copies items whose position changed', () => {
    const list = items();
    expect(renumber(list)[0]).toBe(list[0]);
  });

  it('sums durations', () => {
    expect(totalDurationMs(items())).toBe(10_000);
  });
});

describe('playlist details validation', () => {
  it('requires a name', () => {
    expect(validatePlaylistDetails('   ', '')).toMatch(/name/);
  });
  it('limits name and description length', () => {
    expect(validatePlaylistDetails('x'.repeat(101), '')).toMatch(/100/);
    expect(validatePlaylistDetails('ok', 'y'.repeat(301))).toMatch(/300/);
  });
  it('accepts accents, emoji and long-but-valid names', () => {
    expect(validatePlaylistDetails('Café nights ☕', 'Été')).toBeNull();
    expect(validatePlaylistDetails('x'.repeat(100), '')).toBeNull();
  });
});
