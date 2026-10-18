'use client';

import { useRef, useState } from 'react';
import { Loader2, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume, Volume1, Volume2, VolumeX } from 'lucide-react';
import { usePlayer } from '@/store/player';
import { formatTime } from '@/lib/format';

export function PlayPauseButton({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const isPlaying = usePlayer((s) => s.isPlaying);
  const status = usePlayer((s) => s.status);
  const hasTrack = usePlayer((s) => !!s.current);
  const togglePlay = usePlayer((s) => s.togglePlay);
  const busy = isPlaying && (status === 'loading' || status === 'buffering');
  const dims = size === 'lg' ? 'size-16' : 'size-9';
  const icon = size === 'lg' ? 'size-7' : 'size-4';
  return (
    <button
      type="button"
      onClick={togglePlay}
      disabled={!hasTrack}
      aria-label={isPlaying ? 'Pause' : 'Play'}
      title={isPlaying ? 'Pause' : 'Play'}
      data-testid="player-play-pause"
      data-status={status}
      className={`inline-flex ${dims} items-center justify-center rounded-full bg-text text-bg transition duration-150 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100`}
    >
      {busy ? (
        <Loader2 className={`${icon} animate-spin`} aria-hidden="true" />
      ) : isPlaying ? (
        <Pause className={`${icon} fill-current`} aria-hidden="true" />
      ) : (
        <Play className={`${icon} translate-x-[1px] fill-current`} aria-hidden="true" />
      )}
    </button>
  );
}

function ToggleIcon({ label, pressed, onClick, children, disabled }: { label: string; pressed: boolean | 'mixed'; onClick: () => void; children: React.ReactNode; disabled?: boolean }) {
  const on = pressed === true || pressed === 'mixed';
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed === 'mixed' ? true : pressed}
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex size-8 items-center justify-center rounded-full transition hover:scale-105 active:scale-95 disabled:opacity-40 ${on ? 'text-accent' : 'text-muted hover:text-text'}`}
    >
      {children}
      {on && <span aria-hidden="true" className="absolute -bottom-0.5 size-1 rounded-full bg-accent" />}
    </button>
  );
}

export function TransportControls({ large = false }: { large?: boolean }) {
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const hasTrack = usePlayer((s) => !!s.current);
  const { toggleShuffle, cycleRepeat, next, previous } = usePlayer.getState();
  const icon = large ? 'size-7' : 'size-5';
  const repeatLabel = repeat === 'off' ? 'Enable repeat' : repeat === 'all' ? 'Repeat one' : 'Disable repeat';
  return (
    <div className={`flex items-center ${large ? 'justify-between' : 'gap-4'}`}>
      <ToggleIcon label={shuffle ? 'Disable shuffle' : 'Enable shuffle'} pressed={shuffle} onClick={toggleShuffle}>
        <Shuffle className={large ? 'size-6' : 'size-4'} aria-hidden="true" />
      </ToggleIcon>
      <button type="button" onClick={previous} disabled={!hasTrack} aria-label="Previous" title="Previous" className="inline-flex size-8 items-center justify-center rounded-full text-muted transition hover:scale-105 hover:text-text active:scale-95 disabled:opacity-40">
        <SkipBack className={`${icon} fill-current`} aria-hidden="true" />
      </button>
      <PlayPauseButton size={large ? 'lg' : 'md'} />
      <button type="button" onClick={next} disabled={!hasTrack} aria-label="Next" title="Next" className="inline-flex size-8 items-center justify-center rounded-full text-muted transition hover:scale-105 hover:text-text active:scale-95 disabled:opacity-40">
        <SkipForward className={`${icon} fill-current`} aria-hidden="true" />
      </button>
      <ToggleIcon label={repeatLabel} pressed={repeat !== 'off'} onClick={cycleRepeat}>
        {repeat === 'one' ? <Repeat1 className={large ? 'size-6' : 'size-4'} aria-hidden="true" /> : <Repeat className={large ? 'size-6' : 'size-4'} aria-hidden="true" />}
        <span className="sr-only">{`Repeat is ${repeat}`}</span>
      </ToggleIcon>
    </div>
  );
}

/** Seek bar: drag previews, release commits; keyboard seeks immediately (arrows = 5 s). */
export function SeekBar({ compact = false }: { compact?: boolean }) {
  const currentTime = usePlayer((s) => s.currentTime);
  const duration = usePlayer((s) => s.duration);
  const hasTrack = usePlayer((s) => !!s.current);
  const seek = usePlayer((s) => s.seek);
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? currentTime;
  const max = duration > 0 ? duration : 0;
  const pct = max ? Math.min(100, (shown / max) * 100) : 0;
  const pointerDown = useRef(false);

  return (
    <div className={`flex w-full items-center gap-2 ${compact ? '' : 'max-w-[640px]'}`}>
      {!compact && <span className="w-10 text-right text-xs text-muted tabular-nums" data-testid="player-current-time">{formatTime(shown)}</span>}
      <input
        type="range"
        className="range"
        min={0}
        max={max || 1}
        step={0.1}
        value={max ? shown : 0}
        disabled={!hasTrack || !max}
        aria-label="Seek"
        aria-valuetext={`${formatTime(shown)} of ${formatTime(max)}`}
        data-testid="seek-slider"
        data-dragging={drag !== null}
        style={{ '--pct': `${pct}%` } as React.CSSProperties}
        onKeyDown={(e) => {
          const steps: Record<string, number> = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5, PageUp: max * 0.1, PageDown: -max * 0.1 };
          if (e.key in steps) {
            e.preventDefault();
            seek(currentTime + steps[e.key]);
          } else if (e.key === 'Home') {
            e.preventDefault();
            seek(0);
          } else if (e.key === 'End') {
            e.preventDefault();
            seek(max);
          }
        }}
        onPointerDown={() => {
          pointerDown.current = true;
        }}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (pointerDown.current) setDrag(v);
          else seek(v);
        }}
        onPointerUp={(e) => {
          pointerDown.current = false;
          const v = Number((e.target as HTMLInputElement).value);
          setDrag(null);
          seek(v);
        }}
        onPointerCancel={() => {
          pointerDown.current = false;
          setDrag(null);
        }}
      />
      {!compact && <span className="w-10 text-xs text-muted tabular-nums" data-testid="player-duration">{formatTime(max)}</span>}
    </div>
  );
}

export function VolumeControl({ className = '' }: { className?: string }) {
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);
  const effective = muted ? 0 : volume;
  const Icon = effective === 0 ? VolumeX : effective < 0.34 ? Volume : effective < 0.67 ? Volume1 : Volume2;
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} title={muted ? 'Unmute' : 'Mute'} aria-pressed={muted} className="inline-flex size-8 items-center justify-center rounded-full text-muted transition hover:text-text">
        <Icon className="size-5" aria-hidden="true" />
      </button>
      <input
        type="range"
        className="range w-24"
        min={0}
        max={1}
        step={0.01}
        value={effective}
        onChange={(e) => setVolume(Number(e.target.value))}
        onKeyDown={(e) => {
          const steps: Record<string, number> = { ArrowRight: 0.05, ArrowUp: 0.05, ArrowLeft: -0.05, ArrowDown: -0.05 };
          if (e.key in steps) {
            e.preventDefault();
            setVolume(effective + steps[e.key]);
          }
        }}
        aria-label="Volume"
        aria-valuetext={`${Math.round(effective * 100)}%`}
        data-testid="volume-slider"
        style={{ '--pct': `${effective * 100}%` } as React.CSSProperties}
      />
    </div>
  );
}
