// Generative arrangements for the eight Nocturne genres. Each track spec gives a seed, tempo,
// key, mode and chord progression; the arranger writes drums, bass, harmony and a melody, mixes
// buses with reverb/delay sends and masters the result.

import {
  SR, Bus, mulberry32, midiToFreq,
  kick, snare, clap, hat, shaker, brush, ride, chipNoise,
  bassVoice, padVoice, ePiano, pianoVoice, pluck, leadVoice, bell,
  reverb, pingPong, sidechain, vinyl, master, filterBuffer,
} from './synth.mjs';

const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
};

function theory(root, mode) {
  const scale = MODES[mode];
  const degree = (d, octave = 0) => {
    const oct = Math.floor(d / 7);
    const idx = ((d % 7) + 7) % 7;
    return root + scale[idx] + 12 * (oct + octave);
  };
  const chord = (d, size = 4, octave = 0) => Array.from({ length: size }, (_, i) => degree(d + i * 2, octave));
  return { degree, chord, scale };
}

const RHYTHMS = [
  [[0, 3], [4, 2], [6, 2], [8, 4], [12, 4]],
  [[0, 2], [2, 2], [4, 4], [10, 2], [12, 4]],
  [[0, 6], [6, 2], [8, 2], [10, 6]],
  [[2, 2], [4, 2], [6, 4], [12, 2], [14, 2]],
  [[0, 4], [4, 4], [8, 8]],
  [[0, 2], [3, 3], [6, 2], [8, 2], [11, 3], [14, 2]],
];

// A two-bar motif, repeated with variation, walking through scale degrees near chord tones.
function makeMelody(rng, progression, bars, { density = 1, rangeLow = 7, rangeHigh = 14 } = {}) {
  const notes = [];
  let deg = rangeLow + 2;
  let motif = null;
  for (let bar = 0; bar < bars; bar++) {
    const chordDeg = progression[bar % progression.length];
    if (bar % 4 === 0 || !motif) {
      motif = [RHYTHMS[Math.floor(rng() * RHYTHMS.length)], RHYTHMS[Math.floor(rng() * RHYTHMS.length)]];
    }
    const rhythm = motif[bar % 2];
    for (const [step, len] of rhythm) {
      if (rng() > density) continue;
      const onBeat = step % 4 === 0;
      if (onBeat) {
        const tones = [0, 2, 4].map((o) => chordDeg + o);
        let best = tones[0];
        for (const tn of tones) {
          for (const o of [0, 7, -7]) {
            if (Math.abs(tn + o - deg) < Math.abs(best - deg)) best = tn + o;
          }
        }
        deg = best;
      } else {
        deg += [-2, -1, -1, 1, 1, 2][Math.floor(rng() * 6)];
      }
      if (deg < rangeLow) deg += 2;
      if (deg > rangeHigh) deg -= 2;
      notes.push({ bar, step, len, deg });
    }
  }
  return notes;
}

function swingTime(step, stepSec, swing) {
  return step * stepSec + (step % 2 === 1 ? swing * stepSec : 0);
}

function arrangement(bars) {
  // intro / groove / lead / break / lead / outro, scaled to the bar count
  const intro = 4;
  const outro = 4;
  const body = bars - intro - outro;
  const q = Math.max(4, Math.floor(body / 4 / 4) * 4);
  return {
    intro: [0, intro],
    groove: [intro, intro + q],
    lead1: [intro + q, intro + 2 * q],
    break: [intro + 2 * q, intro + 3 * q],
    lead2: [intro + 3 * q, bars - outro],
    outro: [bars - outro, bars],
  };
}
const inRange = (bar, r) => bar >= r[0] && bar < r[1];

export function renderTrack(spec) {
  const rng = mulberry32(spec.seed);
  const beat = 60 / spec.bpm;
  const barSec = beat * 4;
  const stepSec = beat / 4;
  const bars = spec.bars;
  const length = Math.floor((bars * barSec + 2.5) * SR);
  const T = theory(spec.root, spec.mode);
  const prog = spec.progression;
  const sec = arrangement(bars);
  const drums = new Bus(length);
  const bass = new Bus(length);
  const music = new Bus(length);
  const lead = new Bus(length);
  const swing = spec.swing ?? 0;
  const at = (bar, step) => bar * barSec + swingTime(step, stepSec, swing);
  const chordFor = (bar) => prog[bar % prog.length];
  const melody = makeMelody(rng, prog, bars, spec.melody || {});

  const g = spec.genre;
  const kit = {
    kick: kick(rng, g === 'house' ? { decay: 9, punch: 90 } : g === 'lofi' ? { decay: 9, tone: 0.95 } : {}),
    snare: snare(rng, g === 'lofi' ? { decay: 22, noise: 0.7 } : g === 'synthwave' ? { decay: 11, tone: 170 } : {}),
    clap: clap(rng),
    hat: hat(rng),
    ohat: hat(rng, { open: true }),
    shaker: shaker(rng),
    brush: brush(rng),
    ride: ride(rng),
  };
  const hasDrums = (bar) => (g === 'house' || !inRange(bar, sec.intro)) && !(g !== 'house' && inRange(bar, sec.outro) && bar >= bars - 2);

  for (let bar = 0; bar < bars; bar++) {
    const cd = chordFor(bar);
    const chordNotes = T.chord(cd, 4, 0).map((m) => m + 12);
    const isBreak = inRange(bar, sec.break);
    const leadOn = inRange(bar, sec.lead1) || inRange(bar, sec.lead2);
    const vel = () => 0.75 + rng() * 0.25;

    // ---------------- drums
    if (g !== 'ambient' && g !== 'piano' && hasDrums(bar)) {
      for (let step = 0; step < 16; step++) {
        const t = at(bar, step);
        if (g === 'house') {
          if (step % 4 === 0 && !(isBreak && bar % 4 !== 3)) drums.addMono(t, kit.kick, 0.95);
          if ((step === 4 || step === 12) && !isBreak && !inRange(bar, sec.intro)) drums.addMono(t, kit.clap, 0.42, 0.05);
          if (step % 4 === 2) drums.addMono(t, kit.ohat, 0.22 * vel(), 0.25);
          drums.addMono(t, kit.shaker, (step % 2 ? 0.16 : 0.1) * vel(), -0.3);
        } else if (g === 'synthwave') {
          if ((step === 0 || step === 8 || (step === 10 && bar % 2)) && !isBreak) drums.addMono(t, kit.kick, 0.9);
          if (step === 4 || step === 12) drums.addMono(t, kit.snare, isBreak ? 0.25 : 0.55);
          if (!isBreak) drums.addMono(t, kit.hat, (step % 4 === 2 ? 0.16 : 0.08) * vel(), 0.3);
        } else if (g === 'lofi') {
          if (step === 0 || step === 7 || (step === 10 && bar % 2 === 1)) drums.addMono(t, kit.kick, 0.85);
          if (step === 4 || step === 12) drums.addMono(t, kit.snare, 0.42 * vel(), -0.05);
          if (step % 2 === 0) drums.addMono(t, kit.hat, 0.12 * vel(), 0.25);
          if (step === 14 && rng() < 0.3) drums.addMono(t, kit.ohat, 0.08, 0.3);
        } else if (g === 'downtempo') {
          if (step === 0 || step === 9) drums.addMono(t, kit.kick, 0.85);
          if (step === 8) drums.addMono(t, kit.snare, 0.45);
          if (step % 2 === 1) drums.addMono(t, kit.shaker, 0.13 * vel(), 0.35);
          if (step === 6 && rng() < 0.5) drums.addMono(t, kit.hat, 0.1, -0.3);
        } else if (g === 'jazz') {
          // swung ride pattern, brushes on 2 and 4, feathered kick
          if (step === 0 || step === 4 || step === 7 || step === 8 || step === 12 || step === 15) drums.addMono(t, kit.ride, 0.11 * vel(), 0.35);
          if (step === 4 || step === 12) drums.addMono(t, kit.brush, 0.35, -0.2);
          if (step % 4 === 0) drums.addMono(t, kit.kick, 0.18);
        } else if (g === 'chiptune') {
          if (step === 0 || step === 6 || step === 8) drums.addMono(t, chipNoise(rng, 0.09, 0.4), 0.3);
          if (step === 4 || step === 12) drums.addMono(t, chipNoise(rng, 0.14, 1.5), 0.25);
          if (step % 2 === 0) drums.addMono(t, chipNoise(rng, 0.03, 4), 0.07);
        }
      }
    }

    // ---------------- bass
    const root = T.degree(cd, -2);
    const bassOn = !inRange(bar, sec.intro) || g === 'ambient';
    if (bassOn) {
      if (g === 'house') {
        for (const step of [2, 6, 10, 14]) bass.addMono(at(bar, step), bassVoice(midiToFreq(root), stepSec * 1.6, { type: 'saw', cutoff: 300, env: 700 }), 0.55);
      } else if (g === 'synthwave') {
        for (let step = 0; step < 16; step += 2) {
          const m = root + (step % 4 === 2 ? 12 : 0);
          bass.addMono(at(bar, step), bassVoice(midiToFreq(m), stepSec * 1.7, { type: 'saw', cutoff: 380, env: 900, sub: 0.4 }), 0.42);
        }
      } else if (g === 'jazz') {
        // walking bass: chord tones and approach notes on every beat
        const tones = [T.degree(cd, -2), T.degree(cd + 2, -2), T.degree(cd + 4, -2)];
        const nextRoot = T.degree(chordFor(bar + 1), -2);
        const walk = [tones[0], tones[1], tones[2], nextRoot + (rng() < 0.5 ? -1 : 1)];
        walk.forEach((m, i) => bass.addMono(at(bar, i * 4), pluck(rng, midiToFreq(m), beat * 0.95, { damp: 0.993, bright: 0.25 }), 0.75));
      } else if (g === 'chiptune') {
        for (let step = 0; step < 16; step += 2) {
          const m = root + 12 + (step % 8 === 4 ? 7 : 0);
          bass.addMono(at(bar, step), leadVoice(midiToFreq(m), stepSec * 1.6, { type: 'triangle', release: 0.01 }), 0.5);
        }
      } else if (g === 'ambient') {
        if (bar % 2 === 0) bass.addMono(at(bar, 0), bassVoice(midiToFreq(root), barSec * 2, { type: 'sine', cutoff: 200, env: 0, sub: 0.2, release: 1.5 }), 0.4);
      } else if (g === 'piano') {
        // left hand handled in harmony
      } else {
        // lofi and downtempo: round sine bass with a pickup note
        bass.addMono(at(bar, 0), bassVoice(midiToFreq(root), beat * 2.4, { type: 'sine', cutoff: 400, env: 300, sub: 0.3 }), 0.6);
        bass.addMono(at(bar, 10), bassVoice(midiToFreq(root + (rng() < 0.5 ? 7 : 12)), beat * 1.2, { type: 'sine', cutoff: 400, env: 300, sub: 0.3 }), 0.45);
      }
    }

    // ---------------- harmony
    if (g === 'lofi') {
      const offs = [0, 0.012, 0.024, 0.036];
      chordNotes.forEach((m, i) => music.addMono(at(bar, 0) + offs[i], filterBuffer(ePiano(midiToFreq(m), barSec * 0.9, { bright: 0.9 }), 'lowpass', 2600), 0.2, (i - 1.5) * 0.25));
      if (bar % 2 === 1) chordNotes.slice(1).forEach((m, i) => music.addMono(at(bar, 10) + i * 0.01, ePiano(midiToFreq(m), beat, { bright: 0.6 }), 0.1, 0.3));
    } else if (g === 'ambient') {
      if (bar % 2 === 0) {
        const [L, R] = padVoice(chordNotes.map((m) => midiToFreq(m - 12)), barSec * 2, { cutoff: 900, attack: 2.2, release: 3, seed: spec.seed + bar });
        music.addStereo(at(bar, 0), L, R, 0.32);
      }
      for (let k = 0; k < 3; k++) {
        if (rng() < 0.55) {
          const m = T.degree(cd + [0, 2, 4, 7, 9][Math.floor(rng() * 5)], 1);
          lead.addMono(at(bar, Math.floor(rng() * 16)), bell(midiToFreq(m), beat), 0.12, rng() * 1.4 - 0.7);
        }
      }
    } else if (g === 'synthwave' || g === 'downtempo') {
      if (bar % 2 === 0 || g === 'synthwave') {
        const len = g === 'synthwave' ? barSec : barSec * 2;
        const [L, R] = padVoice(chordNotes.map((m) => midiToFreq(m - 12)), len, { cutoff: g === 'synthwave' ? 2200 : 1100, attack: 0.4, release: 0.9, seed: spec.seed + bar });
        music.addStereo(at(bar, 0), L, R, g === 'synthwave' ? 0.2 : 0.24);
      }
      if (g === 'synthwave' && !inRange(bar, sec.intro)) {
        const arp = [0, 1, 2, 3, 2, 1];
        for (let step = 0; step < 16; step++) {
          const m = chordNotes[arp[step % arp.length]] + 12;
          lead.addMono(at(bar, step), leadVoice(midiToFreq(m), stepSec * 0.6, { cutoff: 1800, release: 0.05 }), 0.07, step % 2 ? 0.4 : -0.4);
        }
      }
      if (g === 'downtempo' && !inRange(bar, sec.intro)) {
        for (const step of [0, 3, 6, 10]) {
          const m = chordNotes[Math.floor(rng() * 4)] + 12;
          lead.addMono(at(bar, step), pluck(rng, midiToFreq(m), stepSec * 2, { damp: 0.995, bright: 0.45 }), 0.16, rng() - 0.5);
        }
      }
    } else if (g === 'house') {
      if (!inRange(bar, sec.intro) || bar >= 2) {
        for (const step of [0, 3, 6, 10]) {
          if (isBreak && step !== 0) continue;
          chordNotes.forEach((m, i) => music.addMono(at(bar, step), filterBuffer(ePiano(midiToFreq(m), stepSec * (isBreak ? 12 : 1.4), { bright: 1.6 }), 'lowpass', isBreak ? 1400 : 3200), 0.12, (i - 1.5) * 0.3));
        }
      }
    } else if (g === 'piano') {
      // left hand: broken chord in eighths; right hand plays the melody
      const lh = [T.degree(cd, -1), T.degree(cd + 4, -1), T.degree(cd + 7, -1), T.degree(cd + 9, -1)];
      for (let step = 0; step < 16; step += 2) {
        const m = lh[(step / 2) % 4];
        music.addMono(at(bar, step), pianoVoice(rng, midiToFreq(m), stepSec * 3), 0.2 * (step === 0 ? 1.2 : 0.85), -0.2);
      }
    } else if (g === 'jazz') {
      const comp = [[0, 3], [6, 2], [11, 3]];
      const voicing = [T.degree(cd + 2, 0), T.degree(cd + 4, 0), T.degree(cd + 6, 0), T.degree(cd + 8, 0)];
      for (const [step, len] of comp) {
        if (rng() < 0.2) continue;
        voicing.forEach((m, i) => music.addMono(at(bar, step) + i * 0.006, ePiano(midiToFreq(m), stepSec * len, { bright: 0.8 }), 0.12, (i - 1.5) * 0.2));
      }
    } else if (g === 'chiptune') {
      for (let step = 0; step < 16; step++) {
        const m = chordNotes[step % 3] + 12;
        music.addMono(at(bar, step), leadVoice(midiToFreq(m), stepSec * 0.8, { type: 'pulse', duty: 0.125, release: 0.005 }), 0.06, 0.3);
      }
    }

    // ---------------- melody
    const melodyBars = g === 'ambient' ? false : leadOn || (g === 'piano' && !inRange(bar, sec.intro));
    if (melodyBars) {
      for (const n of melody.filter((x) => x.bar === bar)) {
        const m = T.degree(n.deg, g === 'piano' || g === 'jazz' ? 0 : g === 'chiptune' ? 1 : 0) + 12;
        const t = at(bar, n.step);
        const dur = n.len * stepSec;
        if (g === 'piano') lead.addMono(t, pianoVoice(rng, midiToFreq(m), dur), 0.32, 0.15);
        else if (g === 'jazz') lead.addMono(t, pianoVoice(rng, midiToFreq(m + 12), dur), 0.26, 0.15);
        else if (g === 'chiptune') lead.addMono(t, leadVoice(midiToFreq(m), dur * 0.9, { type: 'pulse', duty: 0.25, vibrato: 0.01, release: 0.02 }), 0.14);
        else if (g === 'synthwave') lead.addMono(t, leadVoice(midiToFreq(m), dur, { cutoff: 3200, vibrato: 0.006, glideFrom: 0 }), 0.15);
        else if (g === 'house') lead.addMono(t, pluck(rng, midiToFreq(m + 12), dur, { damp: 0.994, bright: 0.6 }), 0.2, 0.2);
        else if (g === 'lofi') lead.addMono(t, filterBuffer(leadVoice(midiToFreq(m + 12), dur, { type: 'sine', vibrato: 0.008, attack: 0.03, release: 0.25 }), 'lowpass', 2500), 0.12, 0.15);
        else lead.addMono(t, leadVoice(midiToFreq(m), dur, { type: 'sine', vibrato: 0.006, attack: 0.04, release: 0.4 }), 0.13);
      }
    }
  }

  // ---------------- mix
  if (g === 'house') {
    const drop = [sec.groove[0] * barSec, sec.break[0] * barSec];
    sidechain(music, beat, { depth: 0.55, start: drop[0], end: drop[1] });
    sidechain(bass, beat, { depth: 0.7 });
    sidechain(music, beat, { depth: 0.55, start: sec.lead2[0] * barSec });
  }
  const out = new Bus(length);
  drums.mixInto(out, g === 'jazz' ? 0.7 : 1);
  bass.mixInto(out, 1);
  music.mixInto(out, 1);
  lead.mixInto(out, 1);

  const sendAmount = { ambient: 1.1, piano: 0.55, jazz: 0.35, lofi: 0.35, synthwave: 0.6, house: 0.3, downtempo: 0.55, chiptune: 0.12 }[g];
  const verbSrc = new Bus(length);
  music.mixInto(verbSrc, 1);
  lead.mixInto(verbSrc, 1);
  if (g === 'synthwave') drums.mixInto(verbSrc, 0.35);
  const wet = reverb(verbSrc, { room: g === 'ambient' ? 0.9 : 0.82, damp: g === 'lofi' ? 0.5 : 0.25 });
  wet.mixInto(out, sendAmount);

  if (['synthwave', 'downtempo', 'house', 'chiptune', 'ambient'].includes(g)) {
    const echo = pingPong(lead, { time: beat * 0.75, feedback: g === 'ambient' ? 0.55 : 0.35 });
    echo.mixInto(out, g === 'chiptune' ? 0.25 : 0.4);
  }
  if (g === 'lofi') vinyl(out, rng, 1);

  return master(out, {
    lowpass: g === 'lofi' ? 8500 : g === 'jazz' ? 12000 : 0,
    targetRms: g === 'ambient' || g === 'piano' ? 0.12 : g === 'jazz' ? 0.11 : 0.15,
    fadeOut: 4,
    drive: g === 'chiptune' ? 1.2 : 1.5,
  });
}

export function barsFor(bpm, seconds) {
  const barSec = (60 / bpm) * 4;
  return Math.max(16, Math.round(seconds / barSec / 4) * 4);
}

export function durationMs(bpm, bars) {
  return Math.round((bars * (60 / bpm) * 4 + 2.5) * 1000);
}
