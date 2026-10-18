'use client';

// Global player state. The store holds intent (what should play, play/pause, volume) and the
// latest facts reported by the <audio> element (time, duration, status). AudioEngine is the only
// thing that touches the element.

import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { PlayContext, Track } from '@/lib/types';
import * as Q from '@/lib/player/queue';

export type PlayerStatus = 'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'error';

interface PlayerState extends Q.QueueState {
  context: PlayContext | null;
  isPlaying: boolean;
  status: PlayerStatus;
  error: string | null;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  /** bumps whenever the engine must (re)load `current` from the start */
  loadId: number;
  /** bumps whenever the engine must seek to `seekTarget` */
  seekId: number;
  seekTarget: number;
  fullPlayerOpen: boolean;

  playContext: (tracks: Track[], startIndex: number | null, context: PlayContext, opts?: { shuffle?: boolean }) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (seconds: number) => void;
  seekBy: (delta: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  addToQueue: (tracks: Track[]) => void;
  playNext: (tracks: Track[]) => void;
  removeFromQueue: (index: number) => void;
  moveInQueue: (from: number, to: number) => void;
  playFromQueue: (index: number) => void;
  jumpToContext: (orderPos: number) => void;
  clearQueue: () => void;
  setFullPlayerOpen: (open: boolean) => void;

  // reported by AudioEngine
  _onEnded: () => void;
  _report: (patch: Partial<Pick<PlayerState, 'status' | 'currentTime' | 'duration' | 'error' | 'isPlaying'>>) => void;
}

const queueOf = (s: PlayerState): Q.QueueState => ({
  tracks: s.tracks,
  order: s.order,
  cursor: s.cursor,
  upNext: s.upNext,
  current: s.current,
  fromUpNext: s.fromUpNext,
  shuffle: s.shuffle,
  repeat: s.repeat,
});

// localStorage can be missing or throw (private mode, blocked storage); never let that break playback.
const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* ignore */
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => ({
      ...Q.emptyQueue(),
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
      fullPlayerOpen: false,

      playContext: (tracks, startIndex, context, opts = {}) => {
        const playable = tracks.filter((t) => t.streamUrl);
        if (!playable.length) {
          set({ error: 'Nothing playable here yet.', status: get().current ? get().status : 'idle' });
          return;
        }
        // keep the requested start track even after filtering unplayable ones
        const wanted = startIndex === null ? null : tracks[startIndex];
        const idx = wanted ? playable.findIndex((t) => t.id === wanted.id) : null;
        const q = Q.startContext(queueOf(get()), playable, idx === -1 ? 0 : idx, { shuffle: opts.shuffle });
        set((s) => ({
          ...q,
          context,
          isPlaying: true,
          error: null,
          status: 'loading',
          currentTime: 0,
          duration: (q.current?.durationMs ?? 0) / 1000,
          loadId: s.loadId + 1,
        }));
      },

      play: () => {
        const s = get();
        if (!s.current) return;
        if (s.status === 'error') {
          // retry the failed source
          set({ isPlaying: true, error: null, status: 'loading', loadId: s.loadId + 1, currentTime: 0 });
          return;
        }
        set({ isPlaying: true });
      },
      pause: () => set({ isPlaying: false }),
      togglePlay: () => (get().isPlaying ? get().pause() : get().play()),

      next: () => {
        const s = get();
        const { state, stop } = Q.next(queueOf(s), { auto: false });
        if (!state.current) return;
        set({
          ...state,
          // a manual skip always plays the new track, except past the end of the queue
          isPlaying: !stop,
          status: 'loading',
          error: null,
          currentTime: 0,
          duration: state.current.durationMs / 1000,
          loadId: s.loadId + 1,
        });
      },

      previous: () => {
        const s = get();
        const { state, restart } = Q.previous(queueOf(s), s.currentTime);
        if (restart || state.current === s.current) {
          set({ seekTarget: 0, seekId: s.seekId + 1, currentTime: 0 });
          return;
        }
        set({
          ...state,
          status: 'loading',
          error: null,
          currentTime: 0,
          duration: (state.current?.durationMs ?? 0) / 1000,
          loadId: s.loadId + 1,
        });
      },

      seek: (seconds) => {
        const s = get();
        if (!s.current) return;
        const max = s.duration || s.current.durationMs / 1000;
        const t = Math.max(0, Math.min(seconds, Math.max(0, max - 0.05)));
        set({ seekTarget: t, seekId: s.seekId + 1, currentTime: t });
      },
      seekBy: (delta) => get().seek(get().currentTime + delta),

      setVolume: (v) => {
        const volume = Math.max(0, Math.min(1, v));
        set({ volume, muted: volume === 0 ? true : false });
      },
      toggleMute: () => {
        const s = get();
        if (s.muted && s.volume === 0) set({ muted: false, volume: 0.5 });
        else set({ muted: !s.muted });
      },
      toggleShuffle: () => set((s) => Q.setShuffle(queueOf(s), !s.shuffle)),
      cycleRepeat: () => set((s) => ({ repeat: Q.cycleRepeat(s.repeat) })),

      addToQueue: (tracks) => {
        const playable = tracks.filter((t) => t.streamUrl);
        const s = get();
        if (!s.current) {
          // nothing loaded yet: queueing starts playback of the queue
          get().playContext(playable, 0, { type: 'queue', id: null, name: 'Your queue', href: '/queue' });
          return;
        }
        set(Q.addToQueue(queueOf(s), playable));
      },
      playNext: (tracks) => {
        const playable = tracks.filter((t) => t.streamUrl);
        const s = get();
        if (!s.current) {
          get().playContext(playable, 0, { type: 'queue', id: null, name: 'Your queue', href: '/queue' });
          return;
        }
        set(Q.playNext(queueOf(s), playable));
      },
      removeFromQueue: (i) => set((s) => Q.removeFromUpNext(queueOf(s), i)),
      moveInQueue: (from, to) => set((s) => Q.moveInUpNext(queueOf(s), from, to)),
      playFromQueue: (i) => {
        const s = get();
        const q = Q.playFromUpNext(queueOf(s), i);
        if (q === queueOf(s)) return;
        set({ ...q, isPlaying: true, status: 'loading', error: null, currentTime: 0, duration: (q.current?.durationMs ?? 0) / 1000, loadId: s.loadId + 1 });
      },
      jumpToContext: (pos) => {
        const s = get();
        const q = Q.jumpTo(queueOf(s), pos);
        set({ ...q, isPlaying: true, status: 'loading', error: null, currentTime: 0, duration: (q.current?.durationMs ?? 0) / 1000, loadId: s.loadId + 1 });
      },
      clearQueue: () => set((s) => Q.clearUpNext(queueOf(s))),
      setFullPlayerOpen: (open) => set({ fullPlayerOpen: open }),

      _onEnded: () => {
        const s = get();
        if (s.repeat === 'one') {
          set({ seekTarget: 0, seekId: s.seekId + 1, currentTime: 0, isPlaying: true });
          return;
        }
        const { state, stop } = Q.next(queueOf(s), { auto: true });
        if (stop) {
          // End of the queue: park on the first track, paused, like a finished record.
          set({ ...state, isPlaying: false, status: 'paused', currentTime: 0, loadId: s.loadId + 1, duration: (state.current?.durationMs ?? 0) / 1000 });
          return;
        }
        set({ ...state, isPlaying: true, status: 'loading', currentTime: 0, duration: (state.current?.durationMs ?? 0) / 1000, loadId: s.loadId + 1 });
      },
      _report: (patch) => set(patch),
    }),
    {
      name: 'nocturne-player',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        volume: s.volume,
        muted: s.muted,
        shuffle: s.shuffle,
        repeat: s.repeat,
        tracks: s.tracks,
        order: s.order,
        cursor: s.cursor,
        upNext: s.upNext,
        current: s.current,
        fromUpNext: s.fromUpNext,
        context: s.context,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.current) {
          state._report({ status: 'paused', isPlaying: false, duration: state.current.durationMs / 1000 });
        }
      },
    },
  ),
);

/** Is this context (album/playlist/...) the one currently loaded? */
export function isContextActive(ctx: { type: string; id: string | null } | null, type: string, id: string | null) {
  return !!ctx && ctx.type === type && ctx.id === id;
}
