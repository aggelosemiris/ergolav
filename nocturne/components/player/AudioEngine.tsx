'use client';

// The one and only <audio> element. Mounted in the root layout so client-side navigation never
// unmounts it. Store -> element: source, play/pause, volume, seeks. Element -> store: time,
// duration, buffering, errors, end of track. Also wires the Media Session API.

import { useEffect, useRef } from 'react';
import { usePlayer } from '@/store/player';
import { useLibrary } from '@/store/library';
import { toast } from '@/store/ui';

const MEDIA_ERRORS: Record<number, string> = {
  1: 'Playback was stopped.',
  2: 'A network problem stopped this track. Check your connection and try again.',
  3: 'This track could not be decoded.',
  4: "This track's audio is missing or in a format your browser can't play.",
};

function absolute(url: string) {
  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return url;
  }
}

export function AudioEngine() {
  const ref = useRef<HTMLAudioElement>(null);
  const loadedId = useRef<number>(-1);
  const loggedFor = useRef<number>(-1);
  const lastReport = useRef(0);

  const current = usePlayer((s) => s.current);
  const loadId = usePlayer((s) => s.loadId);
  const isPlaying = usePlayer((s) => s.isPlaying);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const seekId = usePlayer((s) => s.seekId);

  // ---------------------------------------------------------------- source
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!current?.streamUrl) {
      if (!current) {
        el.removeAttribute('src');
        el.load();
      }
      return;
    }
    // A new loadId (or first mount with a restored track) means: load this track from the start.
    if (loadedId.current === loadId && el.src) return;
    loadedId.current = loadId;
    const src = absolute(current.streamUrl);
    if (el.src !== src) el.src = src;
    else el.currentTime = 0;
    const s = usePlayer.getState();
    if (s.isPlaying) {
      void attemptPlay(el, loadId);
    } else {
      el.load();
    }
  }, [current, loadId]);

  // ---------------------------------------------------------------- play / pause intent
  useEffect(() => {
    const el = ref.current;
    if (!el || !current?.streamUrl) return;
    if (isPlaying && el.paused) void attemptPlay(el, loadedId.current);
    if (!isPlaying && !el.paused) el.pause();
  }, [isPlaying, current]);

  // ---------------------------------------------------------------- volume
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.volume = volume;
    el.muted = muted;
  }, [volume, muted]);

  // ---------------------------------------------------------------- seeks
  useEffect(() => {
    const el = ref.current;
    if (!el || seekId === 0) return;
    const target = usePlayer.getState().seekTarget;
    try {
      el.currentTime = target;
    } catch {
      /* not seekable yet; the store already shows the target */
    }
    if (usePlayer.getState().isPlaying && el.paused) void attemptPlay(el, loadedId.current);
  }, [seekId]);

  // ---------------------------------------------------------------- element events -> store
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const report = usePlayer.getState()._report;

    const onLoadStart = () => {
      if (usePlayer.getState().isPlaying) report({ status: 'loading' });
    };
    const onWaiting = () => report({ status: 'buffering' });
    const onPlaying = () => {
      report({ status: 'playing', isPlaying: true, error: null });
      if (loggedFor.current !== loadedId.current) {
        loggedFor.current = loadedId.current;
        const s = usePlayer.getState();
        if (s.current) useLibrary.getState().logPlay(s.current.id, s.context);
      }
    };
    const onPause = () => {
      // Ignore the pause the load algorithm queues when the source changes mid-play.
      if (el.ended || !el.paused) return;
      const s = usePlayer.getState();
      if (s.status !== 'error') report({ status: 'paused', isPlaying: false });
    };
    const onCanPlay = () => {
      const s = usePlayer.getState();
      if (!s.isPlaying && (s.status === 'loading' || s.status === 'buffering' || s.status === 'idle')) report({ status: 'paused' });
    };
    const onTime = () => {
      const now = performance.now();
      if (now - lastReport.current < 200) return;
      lastReport.current = now;
      report({ currentTime: el.currentTime });
      updatePosition(el);
    };
    const onSeeked = () => report({ currentTime: el.currentTime });
    const onDuration = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) report({ duration: el.duration });
    };
    const onEnded = () => {
      report({ currentTime: el.duration || 0 });
      usePlayer.getState()._onEnded();
    };
    const onError = () => {
      const code = el.error?.code ?? 4;
      const st = usePlayer.getState();
      if (!st.current || st.status === 'error') return;
      const message = MEDIA_ERRORS[code] ?? MEDIA_ERRORS[4];
      report({ status: 'error', isPlaying: false, error: message });
      toast(message, { tone: 'error' });
    };

    el.addEventListener('loadstart', onLoadStart);
    el.addEventListener('waiting', onWaiting);
    el.addEventListener('stalled', onWaiting);
    el.addEventListener('playing', onPlaying);
    el.addEventListener('pause', onPause);
    el.addEventListener('canplay', onCanPlay);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('seeked', onSeeked);
    el.addEventListener('durationchange', onDuration);
    el.addEventListener('loadedmetadata', onDuration);
    el.addEventListener('ended', onEnded);
    el.addEventListener('error', onError);
    return () => {
      el.removeEventListener('loadstart', onLoadStart);
      el.removeEventListener('waiting', onWaiting);
      el.removeEventListener('stalled', onWaiting);
      el.removeEventListener('playing', onPlaying);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('canplay', onCanPlay);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('seeked', onSeeked);
      el.removeEventListener('durationchange', onDuration);
      el.removeEventListener('loadedmetadata', onDuration);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('error', onError);
    };
  }, []);

  // ---------------------------------------------------------------- Media Session
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    if (!current) {
      ms.metadata = null;
      return;
    }
    try {
      ms.metadata = new MediaMetadata({
        title: current.title,
        artist: current.artist.name,
        album: current.album.title,
        artwork: [{ src: absolute(current.album.coverUrl), sizes: '600x600', type: 'image/svg+xml' }],
      });
    } catch {
      /* MediaMetadata unsupported */
    }
  }, [current]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const p = () => usePlayer.getState();
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => p().play()],
      ['pause', () => p().pause()],
      ['previoustrack', () => p().previous()],
      ['nexttrack', () => p().next()],
      ['seekbackward', (d) => p().seekBy(-(d.seekOffset ?? 10))],
      ['seekforward', (d) => p().seekBy(d.seekOffset ?? 10)],
      ['seekto', (d) => d.seekTime !== undefined && p().seek(d.seekTime)],
    ];
    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        /* action not supported here */
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          ms.setActionHandler(action, null);
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : current ? 'paused' : 'none';
  }, [isPlaying, current]);

  return <audio ref={ref} preload="metadata" data-testid="audio-engine" aria-hidden="true" className="hidden" />;
}

async function attemptPlay(el: HTMLAudioElement, forLoad: number) {
  try {
    await el.play();
  } catch (err) {
    const name = (err as DOMException)?.name;
    if (name === 'AbortError') return; // a newer load replaced this one
    // Ignore stale attempts from an older load.
    if (forLoad !== usePlayer.getState().loadId) return;
    if (name === 'NotAllowedError') {
      // Autoplay policy: wait for the listener to press play.
      usePlayer.getState()._report({ isPlaying: false, status: 'paused' });
      return;
    }
    if (name === 'NotSupportedError') {
      if (usePlayer.getState().status === 'error') return; // the error event already reported it
      const message = "This track's audio is missing or in a format your browser can't play.";
      usePlayer.getState()._report({ isPlaying: false, status: 'error', error: message });
      toast(message, { tone: 'error' });
    }
  }
}

function updatePosition(el: HTMLAudioElement) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  if (!Number.isFinite(el.duration) || el.duration <= 0) return;
  try {
    navigator.mediaSession.setPositionState({
      duration: el.duration,
      playbackRate: el.playbackRate,
      position: Math.min(el.currentTime, el.duration),
    });
  } catch {
    /* ignore */
  }
}
