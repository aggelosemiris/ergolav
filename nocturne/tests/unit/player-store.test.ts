import { beforeEach, describe, expect, it } from 'vitest';
import { usePlayer } from '@/store/player';
import { emptyQueue } from '@/lib/player/queue';
import { makeTrack, tracks } from './fixtures';

const ctx = { type: 'album' as const, id: 'a1', name: 'Album', href: '/album/a1' };

beforeEach(() => {
  usePlayer.setState({
    ...emptyQueue(),
    context: null,
    isPlaying: false,
    status: 'idle',
    error: null,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    muted: false,
    loadId: 0,
    seekId: 0,
    seekTarget: 0,
  });
});

const s = () => usePlayer.getState();

describe('player store', () => {
  it('playContext loads the track, asks to play and bumps the load id', () => {
    s().playContext(tracks(3), 1, ctx);
    expect(s().current?.id).toBe('t2');
    expect(s().isPlaying).toBe(true);
    expect(s().status).toBe('loading');
    expect(s().loadId).toBe(1);
    expect(s().context).toEqual(ctx);
  });

  it('skips tracks without a stream URL but keeps the requested start', () => {
    const list = [makeTrack(1, { streamUrl: null }), makeTrack(2), makeTrack(3)];
    s().playContext(list, 2, ctx);
    expect(s().tracks.map((t) => t.id)).toEqual(['t2', 't3']);
    expect(s().current?.id).toBe('t3');
  });

  it('reports an error when nothing is playable', () => {
    s().playContext([makeTrack(1, { streamUrl: null })], 0, ctx);
    expect(s().current).toBeNull();
    expect(s().error).toMatch(/Nothing playable/);
  });

  it('pause, resume and toggle', () => {
    s().playContext(tracks(2), 0, ctx);
    s().pause();
    expect(s().isPlaying).toBe(false);
    s().togglePlay();
    expect(s().isPlaying).toBe(true);
  });

  it('play after an error retries the source', () => {
    s().playContext(tracks(2), 0, ctx);
    s()._report({ status: 'error', error: 'boom', isPlaying: false });
    const before = s().loadId;
    s().play();
    expect(s().status).toBe('loading');
    expect(s().error).toBeNull();
    expect(s().loadId).toBe(before + 1);
  });

  it('seek clamps to the track and records a seek request', () => {
    s().playContext(tracks(2), 0, ctx);
    s()._report({ duration: 100 });
    s().seek(250);
    expect(s().seekTarget).toBeCloseTo(99.95);
    s().seek(-5);
    expect(s().seekTarget).toBe(0);
    expect(s().seekId).toBe(2);
  });

  it('volume is clamped; zero mutes; unmuting from zero restores a usable level', () => {
    s().setVolume(1.7);
    expect(s().volume).toBe(1);
    s().setVolume(0);
    expect(s().muted).toBe(true);
    s().toggleMute();
    expect(s().muted).toBe(false);
    expect(s().volume).toBe(0.5);
  });

  it('mute toggles without losing the volume', () => {
    s().setVolume(0.6);
    s().toggleMute();
    expect(s().muted).toBe(true);
    expect(s().volume).toBe(0.6);
    s().toggleMute();
    expect(s().muted).toBe(false);
  });

  it('previous restarts the track after 3 seconds', () => {
    s().playContext(tracks(3), 1, ctx);
    s()._report({ currentTime: 30 });
    s().previous();
    expect(s().current?.id).toBe('t2');
    expect(s().seekTarget).toBe(0);
    s()._report({ currentTime: 1 });
    s().previous();
    expect(s().current?.id).toBe('t1');
  });

  it('end of track: advances, and stops at the end of the queue', () => {
    s().playContext(tracks(2), 0, ctx);
    s()._onEnded();
    expect(s().current?.id).toBe('t2');
    expect(s().isPlaying).toBe(true);
    s()._onEnded();
    expect(s().isPlaying).toBe(false);
    expect(s().current?.id).toBe('t1');
  });

  it('end of track with repeat one replays it', () => {
    s().playContext(tracks(2), 0, ctx);
    s().cycleRepeat();
    s().cycleRepeat();
    expect(s().repeat).toBe('one');
    const seekId = s().seekId;
    s()._onEnded();
    expect(s().current?.id).toBe('t1');
    expect(s().seekId).toBe(seekId + 1);
    expect(s().isPlaying).toBe(true);
  });

  it('a manual next at the end with repeat off pauses on the first track', () => {
    s().playContext(tracks(2), 1, ctx);
    s().next();
    expect(s().current?.id).toBe('t1');
    expect(s().isPlaying).toBe(false);
  });

  it('adding to an empty queue starts playing it', () => {
    s().addToQueue([makeTrack(4)]);
    expect(s().current?.id).toBe('t4');
    expect(s().context?.type).toBe('queue');
  });

  it('shuffle toggle keeps the current track', () => {
    s().playContext(tracks(6), 2, ctx);
    s().toggleShuffle();
    expect(s().shuffle).toBe(true);
    expect(s().current?.id).toBe('t3');
    expect(s().order[s().cursor]).toBe(2);
  });
});
