import { describe, expect, it } from 'vitest';
import * as Q from '@/lib/player/queue';
import { makeTrack, seeded, tracks } from './fixtures';

const start = (n: number, at: number | null, opts: { shuffle?: boolean; repeat?: Q.RepeatMode } = {}) => {
  const base = { ...Q.emptyQueue(), repeat: opts.repeat ?? 'off' };
  return Q.startContext(base, tracks(n), at, { shuffle: opts.shuffle, rng: seeded() });
};

describe('startContext', () => {
  it('plays the requested track in album order', () => {
    const s = start(5, 2);
    expect(s.current?.id).toBe('t3');
    expect(s.order).toEqual([0, 1, 2, 3, 4]);
    expect(s.cursor).toBe(2);
  });

  it('with shuffle, keeps the chosen track first and every track exactly once', () => {
    const s = start(8, 5, { shuffle: true });
    expect(s.current?.id).toBe('t6');
    expect(s.order[0]).toBe(5);
    expect([...s.order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('with shuffle and no start, still covers all tracks', () => {
    const s = start(6, null, { shuffle: true });
    expect(new Set(s.order).size).toBe(6);
    expect(s.current).not.toBeNull();
  });

  it('clamps an out-of-range start index', () => {
    expect(start(3, 99).current?.id).toBe('t3');
  });

  it('handles an empty context', () => {
    const s = Q.startContext(Q.emptyQueue(), [], 0);
    expect(s.current).toBeNull();
  });
});

describe('next', () => {
  it('advances through the context', () => {
    const { state, stop } = Q.next(start(3, 0));
    expect(stop).toBe(false);
    expect(state.current?.id).toBe('t2');
  });

  it('stops at the end with repeat off and parks on the first track', () => {
    const { state, stop } = Q.next(start(3, 2), { auto: true });
    expect(stop).toBe(true);
    expect(state.current?.id).toBe('t1');
    expect(state.cursor).toBe(0);
  });

  it('wraps around with repeat all', () => {
    const { state, stop } = Q.next(start(3, 2, { repeat: 'all' }), { auto: true });
    expect(stop).toBe(false);
    expect(state.current?.id).toBe('t1');
  });

  it('replays the same track on auto-advance with repeat one', () => {
    const { state, stop } = Q.next(start(3, 1, { repeat: 'one' }), { auto: true });
    expect(stop).toBe(false);
    expect(state.current?.id).toBe('t2');
  });

  it('a manual skip moves on even with repeat one', () => {
    const { state } = Q.next(start(3, 1, { repeat: 'one' }), { auto: false });
    expect(state.current?.id).toBe('t3');
  });

  it('plays hand-queued tracks first, then resumes the context where it left off', () => {
    let s = start(4, 0);
    s = Q.addToQueue(s, [makeTrack(10), makeTrack(11)]);
    let r = Q.next(s);
    expect(r.state.current?.id).toBe('t10');
    expect(r.state.fromUpNext).toBe(true);
    r = Q.next(r.state);
    expect(r.state.current?.id).toBe('t11');
    r = Q.next(r.state);
    expect(r.state.current?.id).toBe('t2');
    expect(r.state.upNext).toHaveLength(0);
  });

  it('with shuffle + repeat all, each lap is a fresh order that never repeats the last track first', () => {
    let s = start(6, 0, { shuffle: true, repeat: 'all' });
    const lap1 = [...s.order];
    for (let i = 0; i < 5; i++) s = Q.next(s, { rng: seeded(i + 1) }).state;
    const lastOfLap = s.current!.id;
    const r = Q.next(s, { auto: true, rng: seeded(99) });
    expect(r.stop).toBe(false);
    expect(new Set(r.state.order).size).toBe(6);
    expect(r.state.current!.id).not.toBe(lastOfLap);
    expect(r.state.order).not.toEqual(lap1);
  });

  it('follows the shuffled order', () => {
    const s = start(6, 0, { shuffle: true });
    const { state } = Q.next(s);
    expect(state.current?.id).toBe(`t${s.order[1] + 1}`);
  });
});

describe('previous', () => {
  it('restarts the track when more than 3 seconds in', () => {
    const r = Q.previous(start(3, 2), 12);
    expect(r.restart).toBe(true);
    expect(r.state.current?.id).toBe('t3');
  });

  it('steps back near the start of a track', () => {
    const r = Q.previous(start(3, 2), 1);
    expect(r.restart).toBe(false);
    expect(r.state.current?.id).toBe('t2');
  });

  it('restarts the first track with repeat off', () => {
    expect(Q.previous(start(3, 0), 0).restart).toBe(true);
  });

  it('wraps to the last track with repeat all', () => {
    const r = Q.previous(start(3, 0, { repeat: 'all' }), 0);
    expect(r.state.current?.id).toBe('t3');
  });

  it('from a hand-queued track, goes back to the context track', () => {
    let s = start(3, 1);
    s = Q.next(Q.addToQueue(s, [makeTrack(9)])).state;
    expect(s.current?.id).toBe('t9');
    const r = Q.previous(s, 0);
    expect(r.state.current?.id).toBe('t2');
    expect(r.state.fromUpNext).toBe(false);
  });
});

describe('shuffle toggle', () => {
  it('turning shuffle on keeps the current track and puts it first', () => {
    const s = Q.setShuffle(start(6, 3), true, seeded(7));
    expect(s.shuffle).toBe(true);
    expect(s.current?.id).toBe('t4');
    expect(s.order[0]).toBe(3);
    expect(s.cursor).toBe(0);
    expect(new Set(s.order).size).toBe(6);
  });

  it('turning shuffle off restores album order at the current track', () => {
    const on = Q.setShuffle(start(6, 3), true, seeded(7));
    const moved = Q.next(on).state;
    const off = Q.setShuffle(moved, false);
    expect(off.order).toEqual([0, 1, 2, 3, 4, 5]);
    expect(off.tracks[off.order[off.cursor]].id).toBe(moved.current?.id);
  });

  it('cycles repeat off -> all -> one -> off', () => {
    expect(Q.cycleRepeat('off')).toBe('all');
    expect(Q.cycleRepeat('all')).toBe('one');
    expect(Q.cycleRepeat('one')).toBe('off');
  });
});

describe('queue editing', () => {
  it('play next goes before already queued tracks', () => {
    let s = Q.addToQueue(start(2, 0), [makeTrack(5)]);
    s = Q.playNext(s, [makeTrack(6)]);
    expect(s.upNext.map((t) => t.id)).toEqual(['t6', 't5']);
  });

  it('removes and reorders queued tracks', () => {
    let s = Q.addToQueue(start(2, 0), [makeTrack(5), makeTrack(6), makeTrack(7)]);
    s = Q.moveInUpNext(s, 2, 0);
    expect(s.upNext.map((t) => t.id)).toEqual(['t7', 't5', 't6']);
    s = Q.removeFromUpNext(s, 1);
    expect(s.upNext.map((t) => t.id)).toEqual(['t7', 't6']);
    expect(Q.removeFromUpNext(s, 9)).toBe(s);
  });

  it('playing from the queue drops what was queued before it', () => {
    let s = Q.addToQueue(start(2, 0), [makeTrack(5), makeTrack(6), makeTrack(7)]);
    s = Q.playFromUpNext(s, 1);
    expect(s.current?.id).toBe('t6');
    expect(s.upNext.map((t) => t.id)).toEqual(['t7']);
  });

  it('lists what is left in the context and can jump to it', () => {
    const s = start(5, 1);
    const up = Q.upcomingFromContext(s);
    expect(up.map((u) => u.track.id)).toEqual(['t3', 't4', 't5']);
    const j = Q.jumpTo(s, up[1].orderPos);
    expect(j.current?.id).toBe('t4');
  });

  it('moveInList clamps targets and ignores bad indices', () => {
    expect(Q.moveInList([1, 2, 3], 0, 10)).toEqual([2, 3, 1]);
    const same = [1, 2, 3];
    expect(Q.moveInList(same, 5, 0)).toBe(same);
  });
});
