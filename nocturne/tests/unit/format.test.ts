import { describe, expect, it } from 'vitest';
import { formatTime, formatTotalDuration, greeting, pluralize, relativeTime } from '@/lib/format';
import { safeNext } from '@/lib/redirect';

describe('format', () => {
  it('formats playback times', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(7.9)).toBe('0:07');
    expect(formatTime(205)).toBe('3:25');
    expect(formatTime(3729)).toBe('1:02:09');
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(-3)).toBe('0:00');
  });

  it('formats total durations for headers', () => {
    expect(formatTotalDuration(45_000)).toBe('45 sec');
    expect(formatTotalDuration(18 * 60_000 + 4000)).toBe('18 min 4 sec');
    expect(formatTotalDuration(20 * 60_000)).toBe('20 min');
    expect(formatTotalDuration(72 * 60_000)).toBe('1 hr 12 min');
  });

  it('pluralises', () => {
    expect(pluralize(1, 'song')).toBe('1 song');
    expect(pluralize(1200, 'song')).toBe('1,200 songs');
  });

  it('greets by time of day', () => {
    expect(greeting(new Date(2026, 0, 1, 9))).toBe('Good morning');
    expect(greeting(new Date(2026, 0, 1, 14))).toBe('Good afternoon');
    expect(greeting(new Date(2026, 0, 1, 21))).toBe('Good evening');
  });

  it('describes relative times', () => {
    const now = Date.parse('2026-10-18T12:00:00Z');
    expect(relativeTime('2026-10-18T11:59:40Z', now)).toBe('just now');
    expect(relativeTime('2026-10-18T11:15:00Z', now)).toBe('45 min ago');
    expect(relativeTime('2026-10-16T12:00:00Z', now)).toBe('2 days ago');
  });
});

describe('safeNext', () => {
  it('keeps same-site paths', () => {
    expect(safeNext('/library')).toBe('/library');
    expect(safeNext('/playlist/abc?x=1')).toBe('/playlist/abc?x=1');
  });
  it('rejects open redirects', () => {
    expect(safeNext('https://evil.example')).toBe('/');
    expect(safeNext('//evil.example')).toBe('/');
    expect(safeNext('/\\evil.example')).toBe('/');
    expect(safeNext(null)).toBe('/');
  });
});
