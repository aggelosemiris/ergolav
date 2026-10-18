// Pure playback-queue logic. No React, no DOM: the Zustand store and the unit tests both use it.
//
// Model
//   tracks   the context (album, playlist...) in its original order
//   order    play order: indices into `tracks` (identity, or shuffled with the current first)
//   cursor   position in `order` of the context track that is playing or was last played
//   upNext   tracks the listener queued by hand; they play before the context continues
//   current  what is loaded in the player (a context track or one taken from upNext)

import type { Track } from '@/lib/types';

export type RepeatMode = 'off' | 'all' | 'one';

export interface QueueState {
  tracks: Track[];
  order: number[];
  cursor: number;
  upNext: Track[];
  current: Track | null;
  /** true when `current` came from upNext rather than the context */
  fromUpNext: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
}

export type Rng = () => number;

export const emptyQueue = (): QueueState => ({
  tracks: [],
  order: [],
  cursor: 0,
  upNext: [],
  current: null,
  fromUpNext: false,
  shuffle: false,
  repeat: 'off',
});

const identity = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Fisher-Yates over a copy. */
export function shuffled<T>(items: T[], rng: Rng = Math.random): T[] {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A shuffled play order that starts with `first` (when given) and contains every index once. */
export function shuffledOrder(length: number, first: number | null, rng: Rng = Math.random): number[] {
  const rest = identity(length).filter((i) => i !== first);
  const mixed = shuffled(rest, rng);
  return first === null || first < 0 || first >= length ? mixed : [first, ...mixed];
}

/** Start playing a context at `startIndex` (index into tracks). With shuffle and no explicit start, a random track leads. */
export function startContext(
  state: QueueState,
  tracks: Track[],
  startIndex: number | null,
  opts: { shuffle?: boolean; rng?: Rng } = {},
): QueueState {
  const shuffle = opts.shuffle ?? state.shuffle;
  if (tracks.length === 0) return { ...state, tracks: [], order: [], cursor: 0, current: null, fromUpNext: false };
  const start = startIndex === null ? null : Math.max(0, Math.min(startIndex, tracks.length - 1));
  let order: number[];
  let cursor: number;
  if (shuffle) {
    order = shuffledOrder(tracks.length, start, opts.rng);
    cursor = 0;
  } else {
    order = identity(tracks.length);
    cursor = start ?? 0;
  }
  return { ...state, tracks, order, cursor, shuffle, current: tracks[order[cursor]], fromUpNext: false };
}

export function currentContextIndex(state: QueueState): number {
  return state.order[state.cursor] ?? -1;
}

export function setShuffle(state: QueueState, on: boolean, rng?: Rng): QueueState {
  if (on === state.shuffle) return state;
  if (state.tracks.length === 0) return { ...state, shuffle: on };
  const idx = currentContextIndex(state);
  if (on) {
    return { ...state, shuffle: true, order: shuffledOrder(state.tracks.length, idx, rng), cursor: 0 };
  }
  return { ...state, shuffle: false, order: identity(state.tracks.length), cursor: Math.max(0, idx) };
}

export function cycleRepeat(mode: RepeatMode): RepeatMode {
  return mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off';
}

export interface Advance {
  state: QueueState;
  /** true when playback should stop (end of the queue with repeat off) */
  stop: boolean;
}

/**
 * Move to the next track.
 * auto = the previous track ended by itself. Repeat-one replays only on auto; a manual skip always moves on.
 */
export function next(state: QueueState, { auto = false, rng }: { auto?: boolean; rng?: Rng } = {}): Advance {
  if (!state.current) return { state, stop: true };
  if (auto && state.repeat === 'one') return { state: { ...state }, stop: false };

  if (state.upNext.length > 0) {
    const [head, ...rest] = state.upNext;
    return { state: { ...state, upNext: rest, current: head, fromUpNext: true }, stop: false };
  }
  if (state.order.length === 0) return { state, stop: true };

  // After an upNext track, the context resumes after the item it was last on.
  const nextCursor = state.cursor + 1;
  if (nextCursor < state.order.length) {
    return { state: { ...state, cursor: nextCursor, current: state.tracks[state.order[nextCursor]], fromUpNext: false }, stop: false };
  }
  // End of the context.
  if (state.repeat === 'all' && state.shuffle && state.order.length > 1) {
    // A new lap gets a fresh order (no fixed sequence repeating), never starting with the track just heard.
    const last = state.order[state.order.length - 1];
    const order = shuffledOrder(state.order.length, null, rng);
    if (order[0] === last) [order[0], order[1]] = [order[1], order[0]];
    return { state: { ...state, order, cursor: 0, current: state.tracks[order[0]], fromUpNext: false }, stop: false };
  }
  const first = { ...state, cursor: 0, current: state.tracks[state.order[0]], fromUpNext: false };
  if (state.repeat === 'all') return { state: first, stop: false };
  // Repeat off: go back to the start and stop.
  return { state: first, stop: true };
}

export interface Back {
  state: QueueState;
  /** true when the current track should simply restart */
  restart: boolean;
}

/** Previous: restart if more than 3 s in; otherwise step back (wrapping only with repeat all). */
export function previous(state: QueueState, currentTime: number): Back {
  if (!state.current) return { state, restart: false };
  if (currentTime > 3) return { state, restart: true };
  if (state.fromUpNext) {
    // Leave the hand-queued track and return to the context track we were on.
    const ctx = state.tracks[state.order[state.cursor]];
    if (ctx) return { state: { ...state, current: ctx, fromUpNext: false }, restart: false };
    return { state, restart: true };
  }
  if (state.cursor > 0) {
    const c = state.cursor - 1;
    return { state: { ...state, cursor: c, current: state.tracks[state.order[c]] }, restart: false };
  }
  if (state.repeat === 'all' && state.order.length > 1) {
    const c = state.order.length - 1;
    return { state: { ...state, cursor: c, current: state.tracks[state.order[c]] }, restart: false };
  }
  return { state, restart: true };
}

/** Jump to a position in the play order (clicking an item under "Next from"). */
export function jumpTo(state: QueueState, orderPos: number): QueueState {
  if (orderPos < 0 || orderPos >= state.order.length) return state;
  return { ...state, cursor: orderPos, current: state.tracks[state.order[orderPos]], fromUpNext: false };
}

export function addToQueue(state: QueueState, tracks: Track[]): QueueState {
  return { ...state, upNext: [...state.upNext, ...tracks] };
}

export function playNext(state: QueueState, tracks: Track[]): QueueState {
  return { ...state, upNext: [...tracks, ...state.upNext] };
}

export function removeFromUpNext(state: QueueState, index: number): QueueState {
  if (index < 0 || index >= state.upNext.length) return state;
  return { ...state, upNext: state.upNext.filter((_, i) => i !== index) };
}

export function moveInList<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length) return items;
  const target = Math.max(0, Math.min(to, items.length - 1));
  const copy = items.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(target, 0, item);
  return copy;
}

export function moveInUpNext(state: QueueState, from: number, to: number): QueueState {
  return { ...state, upNext: moveInList(state.upNext, from, to) };
}

/** Play a hand-queued track now; everything queued before it is dropped (it was skipped). */
export function playFromUpNext(state: QueueState, index: number): QueueState {
  const t = state.upNext[index];
  if (!t) return state;
  return { ...state, current: t, fromUpNext: true, upNext: state.upNext.slice(index + 1) };
}

export function clearUpNext(state: QueueState): QueueState {
  return { ...state, upNext: [] };
}

/** Context tracks still to come, with their position in the play order. */
export function upcomingFromContext(state: QueueState, limit = 50): { track: Track; orderPos: number }[] {
  const out: { track: Track; orderPos: number }[] = [];
  for (let p = state.cursor + 1; p < state.order.length && out.length < limit; p++) {
    out.push({ track: state.tracks[state.order[p]], orderPos: p });
  }
  return out;
}
