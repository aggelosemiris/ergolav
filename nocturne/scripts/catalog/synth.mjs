// Small deterministic synthesiser used to render Nocturne's original demo catalogue.
// Everything here is written for this project: oscillators, envelopes, filters, drums,
// a Freeverb-style reverb, a ping-pong delay and a master chain. No samples are used.

export const SR = 44100;
const TAU = Math.PI * 2;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ------------------------------------------------------------------ buses

export class Bus {
  constructor(length) {
    this.L = new Float32Array(length);
    this.R = new Float32Array(length);
    this.length = length;
  }
  addMono(startSec, data, gain = 1, pan = 0) {
    const start = Math.floor(startSec * SR);
    const p = (Math.max(-1, Math.min(1, pan)) + 1) * (Math.PI / 4);
    const gl = Math.cos(p) * gain;
    const gr = Math.sin(p) * gain;
    const n = Math.min(data.length, this.length - start);
    for (let i = Math.max(0, -start); i < n; i++) {
      this.L[start + i] += data[i] * gl;
      this.R[start + i] += data[i] * gr;
    }
  }
  addStereo(startSec, left, right, gain = 1) {
    const start = Math.floor(startSec * SR);
    const n = Math.min(left.length, this.length - start);
    for (let i = Math.max(0, -start); i < n; i++) {
      this.L[start + i] += left[i] * gain;
      this.R[start + i] += right[i] * gain;
    }
  }
  mixInto(target, gain = 1) {
    for (let i = 0; i < this.length; i++) {
      target.L[i] += this.L[i] * gain;
      target.R[i] += this.R[i] * gain;
    }
  }
}

// ------------------------------------------------------------------ filters

export class Biquad {
  constructor(type, freq, q = 0.707) {
    this.type = type;
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.set(freq, q);
  }
  set(freq, q = this.q) {
    this.q = q;
    const f = Math.max(10, Math.min(freq, SR * 0.45));
    const w = (TAU * f) / SR;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    const a0 = 1 + alpha;
    if (this.type === 'lowpass') {
      b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2;
    } else if (this.type === 'highpass') {
      b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2;
    } else {
      // bandpass, constant skirt gain
      b0 = alpha; b1 = 0; b2 = -alpha;
    }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0;
    this.a1 = (-2 * cos) / a0; this.a2 = (1 - alpha) / a0;
  }
  process(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x;
    this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

export function filterBuffer(data, type, freq, q) {
  const f = new Biquad(type, freq, q);
  for (let i = 0; i < data.length; i++) data[i] = f.process(data[i]);
  return data;
}

// ------------------------------------------------------------------ oscillators

function polyBlep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}

export function saw(phase, dt) { return 2 * phase - 1 - polyBlep(phase, dt); }

export function pulse(phase, dt, duty = 0.5) {
  let v = phase < duty ? 1 : -1;
  v += polyBlep(phase, dt);
  v -= polyBlep((phase + 1 - duty) % 1, dt);
  return v;
}

export function adsr(t, dur, a, d, s, r) {
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < dur) return s;
  const rt = t - dur;
  return rt < r ? s * (1 - rt / r) : 0;
}

// ------------------------------------------------------------------ drums

export function kick(rng, { tone = 1, decay = 7, punch = 75 } = {}) {
  const n = Math.floor(SR * 0.6);
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = (42 + punch * Math.exp(-t * 32)) * tone;
    phase += (TAU * f) / SR;
    out[i] = Math.sin(phase) * Math.exp(-t * decay);
    if (i < 120) out[i] += (rng() * 2 - 1) * 0.25 * (1 - i / 120);
  }
  return out;
}

export function snare(rng, { decay = 15, tone = 190, noise = 1 } = {}) {
  const n = Math.floor(SR * 0.35);
  const out = new Float32Array(n);
  const hp = new Biquad('highpass', 1200, 0.8);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const body = Math.sin(TAU * tone * t) * Math.exp(-t * 28) * 0.55;
    const nz = hp.process(rng() * 2 - 1) * Math.exp(-t * decay) * noise;
    out[i] = body + nz * 0.8;
  }
  return out;
}

export function clap(rng) {
  const n = Math.floor(SR * 0.3);
  const out = new Float32Array(n);
  const bp = new Biquad('bandpass', 1500, 1.2);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let env = Math.exp(-Math.max(0, t - 0.02) * 22);
    for (const off of [0, 0.009, 0.018]) if (t >= off && t < off + 0.006) env = Math.max(env, 1 - (t - off) / 0.006);
    out[i] = bp.process(rng() * 2 - 1) * env * 2.2;
  }
  return out;
}

export function hat(rng, { open = false, bright = 7000 } = {}) {
  const n = Math.floor(SR * (open ? 0.35 : 0.08));
  const out = new Float32Array(n);
  const hp = new Biquad('highpass', bright, 0.9);
  const dec = open ? 9 : 55;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] = hp.process(rng() * 2 - 1) * Math.exp(-t * dec);
  }
  return out;
}

export function shaker(rng) {
  const n = Math.floor(SR * 0.09);
  const out = new Float32Array(n);
  const bp = new Biquad('bandpass', 6500, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.012) * Math.exp(-t * 40);
    out[i] = bp.process(rng() * 2 - 1) * env * 1.6;
  }
  return out;
}

export function brush(rng, len = 0.22) {
  const n = Math.floor(SR * len);
  const out = new Float32Array(n);
  const bp = new Biquad('bandpass', 3800, 0.6);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.sin(Math.PI * Math.min(1, t / len)) * 0.9;
    out[i] = bp.process(rng() * 2 - 1) * env;
  }
  return out;
}

export function ride(rng) {
  const n = Math.floor(SR * 0.9);
  const out = new Float32Array(n);
  const hp = new Biquad('highpass', 4500, 0.7);
  const partials = [3020, 4210, 5330, 6870, 8170];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (const p of partials) v += Math.sin(TAU * p * t + p);
    out[i] = hp.process(v * 0.15 + (rng() * 2 - 1) * 0.4) * Math.exp(-t * 4.5);
  }
  return out;
}

// 8-bit style noise for chiptune drums
export function chipNoise(rng, len = 0.12, pitch = 1) {
  const n = Math.floor(SR * len);
  const out = new Float32Array(n);
  let v = 0;
  const hold = Math.max(1, Math.floor(6 / pitch));
  for (let i = 0; i < n; i++) {
    if (i % hold === 0) v = rng() > 0.5 ? 1 : -1;
    out[i] = v * Math.exp((-i / SR) * (8 / len) * 0.5);
  }
  return out;
}

// ------------------------------------------------------------------ tonal voices

export function bassVoice(freq, dur, { type = 'saw', cutoff = 600, env = 1200, sub = 0.6, release = 0.06 } = {}) {
  const n = Math.floor(SR * (dur + release));
  const out = new Float32Array(n);
  const lp = new Biquad('lowpass', cutoff, 1.1);
  let ph = 0;
  const dt = freq / SR;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph = (ph + dt) % 1;
    let v = type === 'sine' ? Math.sin(TAU * ph) : type === 'square' ? pulse(ph, dt, 0.5) * 0.7 : saw(ph, dt);
    v += Math.sin(TAU * ph) * sub;
    if (i % 32 === 0) lp.set(cutoff + env * Math.exp(-t * 9), 1.1);
    out[i] = lp.process(v) * adsr(t, dur, 0.004, 0.12, 0.75, release);
  }
  return out;
}

export function padVoice(freqs, dur, { cutoff = 1400, attack = 0.7, release = 1.2, detune = 0.006, voices = 3, seed = 1 } = {}) {
  const n = Math.floor(SR * (dur + release));
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const rng = mulberry32(seed);
  for (const side of [L, R]) {
    const lp = new Biquad('lowpass', cutoff, 0.8);
    const oscs = [];
    for (const f of freqs) {
      for (let v = 0; v < voices; v++) {
        const d = 1 + (v - (voices - 1) / 2) * detune + (rng() - 0.5) * detune * 0.5;
        oscs.push({ dt: (f * d) / SR, ph: rng() });
      }
    }
    const norm = 1 / Math.sqrt(oscs.length);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      let v = 0;
      for (const o of oscs) {
        o.ph = (o.ph + o.dt) % 1;
        v += saw(o.ph, o.dt);
      }
      if (i % 64 === 0) lp.set(cutoff * (0.85 + 0.15 * Math.sin(TAU * 0.15 * t)), 0.8);
      side[i] = lp.process(v * norm) * adsr(t, dur, attack, 0.5, 0.85, release);
    }
  }
  return [L, R];
}

// Electric-piano-like FM voice
export function ePiano(freq, dur, { bright = 1.4, decay = 2.2, release = 0.35 } = {}) {
  const n = Math.floor(SR * (dur + release));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const index = bright * Math.exp(-t * 3) + 0.15;
    const mod = Math.sin(TAU * freq * t) * index;
    const v = Math.sin(TAU * freq * t + mod) + 0.25 * Math.sin(TAU * freq * 2 * t + mod * 0.5) * Math.exp(-t * 6);
    const tail = t < dur ? 1 : Math.max(0, 1 - (t - dur) / release);
    out[i] = v * Math.exp(-t * (decay * 0.35)) * Math.min(1, t / 0.003) * tail * (1 + 0.04 * Math.sin(TAU * 4.5 * t));
  }
  return out;
}

// Additive acoustic-piano-like voice with slight inharmonicity
export function pianoVoice(rng, freq, dur, { release = 0.25, harmonics = 9 } = {}) {
  const n = Math.floor(SR * Math.min(dur + release + 1.2, 6));
  const out = new Float32Array(n);
  const B = 0.0004;
  const parts = [];
  for (let k = 1; k <= harmonics; k++) {
    const fk = freq * k * Math.sqrt(1 + B * k * k);
    if (fk > SR * 0.45) break;
    parts.push({ w: (TAU * fk) / SR, amp: 1 / Math.pow(k, 1.25), dec: 0.9 + k * 0.55 + freq / 900, ph: rng() * TAU });
  }
  const hp = new Biquad('bandpass', freq * 6, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (const p of parts) v += Math.sin(p.w * i + p.ph) * p.amp * Math.exp(-t * p.dec);
    if (i < 400) v += hp.process(rng() * 2 - 1) * 0.3 * (1 - i / 400);
    const damper = t < dur ? 1 : Math.exp(-(t - dur) * 14);
    out[i] = v * damper * Math.min(1, t / 0.002) * 0.6;
  }
  return out;
}

// Karplus-Strong plucked string
export function pluck(rng, freq, dur, { damp = 0.996, bright = 0.5 } = {}) {
  const n = Math.floor(SR * (dur + 0.5));
  const out = new Float32Array(n);
  const period = Math.max(2, Math.round(SR / freq));
  const buf = new Float32Array(period);
  let prev = 0;
  for (let i = 0; i < period; i++) {
    const x = rng() * 2 - 1;
    prev = prev + bright * (x - prev);
    buf[i] = prev;
  }
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const next = (idx + 1) % period;
    const v = buf[idx];
    buf[idx] = damp * 0.5 * (buf[idx] + buf[next]);
    idx = next;
    const t = i / SR;
    out[i] = v * (t < dur ? 1 : Math.exp(-(t - dur) * 12));
  }
  return out;
}

// Synth lead: two detuned saws or a pulse, filter envelope, delayed vibrato
export function leadVoice(freq, dur, { type = 'saw', cutoff = 2400, vibrato = 0.004, attack = 0.01, release = 0.2, duty = 0.5, glideFrom = 0 } = {}) {
  const n = Math.floor(SR * (dur + release));
  const out = new Float32Array(n);
  const lp = new Biquad('lowpass', cutoff, 1.2);
  let p1 = 0, p2 = 0.37;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let f = freq;
    if (glideFrom && t < 0.06) f = glideFrom + (freq - glideFrom) * (t / 0.06);
    const vib = 1 + vibrato * Math.sin(TAU * 5.5 * t) * Math.min(1, Math.max(0, (t - 0.18) / 0.25));
    const dt1 = (f * vib) / SR;
    const dt2 = (f * vib * 1.007) / SR;
    p1 = (p1 + dt1) % 1;
    p2 = (p2 + dt2) % 1;
    let v;
    if (type === 'pulse') v = pulse(p1, dt1, duty) * 0.6;
    else if (type === 'triangle') v = (1 - 4 * Math.abs(p1 - 0.5)) * 0.9;
    else if (type === 'sine') v = Math.sin(TAU * p1);
    else v = (saw(p1, dt1) + saw(p2, dt2)) * 0.5;
    if (type !== 'pulse' && type !== 'triangle' && i % 32 === 0) lp.set(cutoff * (0.6 + 0.8 * Math.exp(-t * 6)), 1.2);
    const filtered = type === 'pulse' || type === 'triangle' ? v : lp.process(v);
    out[i] = filtered * adsr(t, dur, attack, 0.15, 0.8, release);
  }
  return out;
}

// Soft bell / mallet for ambient sparkle
export function bell(freq, dur) {
  const n = Math.floor(SR * (dur + 2.5));
  const out = new Float32Array(n);
  const ratios = [1, 2.76, 5.4, 8.93];
  const amps = [1, 0.4, 0.2, 0.08];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let v = 0;
    for (let k = 0; k < ratios.length; k++) v += Math.sin(TAU * freq * ratios[k] * t) * amps[k] * Math.exp(-t * (1.2 + k * 1.6));
    out[i] = v * Math.min(1, t / 0.004) * 0.5;
  }
  return out;
}

// ------------------------------------------------------------------ effects

class Comb {
  constructor(size, feedback, damp) {
    this.buf = new Float32Array(size); this.i = 0; this.fb = feedback; this.damp = damp; this.store = 0;
  }
  process(x) {
    const y = this.buf[this.i];
    this.store = y * (1 - this.damp) + this.store * this.damp;
    this.buf[this.i] = x + this.store * this.fb;
    this.i = (this.i + 1) % this.buf.length;
    return y;
  }
}
class Allpass {
  constructor(size) { this.buf = new Float32Array(size); this.i = 0; }
  process(x) {
    const b = this.buf[this.i];
    const y = -x + b;
    this.buf[this.i] = x + b * 0.5;
    this.i = (this.i + 1) % this.buf.length;
    return y;
  }
}

// Freeverb-style stereo reverb. Returns a new wet bus.
export function reverb(bus, { room = 0.84, damp = 0.3, width = 1 } = {}) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const aps = [556, 441, 341, 225];
  const spread = 23;
  const out = new Bus(bus.length);
  const make = (off) => ({
    c: combs.map((s) => new Comb(s + off, room, damp)),
    a: aps.map((s) => new Allpass(s + off)),
  });
  const l = make(0), r = make(spread);
  for (let i = 0; i < bus.length; i++) {
    const input = (bus.L[i] + bus.R[i]) * 0.015;
    let yl = 0, yr = 0;
    for (const c of l.c) yl += c.process(input);
    for (const c of r.c) yr += c.process(input);
    for (const a of l.a) yl = a.process(yl);
    for (const a of r.a) yr = a.process(yr);
    const w1 = width / 2 + 0.5, w2 = (1 - width) / 2;
    out.L[i] = yl * w1 + yr * w2;
    out.R[i] = yr * w1 + yl * w2;
  }
  return out;
}

export function pingPong(bus, { time = 0.375, feedback = 0.4, tone = 3500 } = {}) {
  const d = Math.max(1, Math.floor(time * SR));
  const out = new Bus(bus.length);
  const bl = new Float32Array(d), br = new Float32Array(d);
  const lpL = new Biquad('lowpass', tone), lpR = new Biquad('lowpass', tone);
  let idx = 0;
  for (let i = 0; i < bus.length; i++) {
    const dl = bl[idx], dr = br[idx];
    const input = (bus.L[i] + bus.R[i]) * 0.5;
    bl[idx] = lpL.process(input + dr * feedback);
    br[idx] = lpR.process(dl * feedback);
    out.L[i] = dl;
    out.R[i] = dr;
    idx = (idx + 1) % d;
  }
  return out;
}

export function sidechain(bus, beatSec, { depth = 0.6, release = 0.18, start = 0, end = Infinity } = {}) {
  for (let i = 0; i < bus.length; i++) {
    const t = i / SR;
    if (t < start || t >= end) continue;
    const ph = (t % beatSec);
    const g = 1 - depth * Math.exp(-ph / (release / 3));
    bus.L[i] *= g;
    bus.R[i] *= g;
  }
}

export function vinyl(bus, rng, amount = 1) {
  const lp = new Biquad('lowpass', 3000);
  for (let i = 0; i < bus.length; i++) {
    let v = lp.process(rng() * 2 - 1) * 0.004 * amount;
    if (rng() < 0.00025 * amount) v += (rng() * 2 - 1) * 0.08 * amount;
    bus.L[i] += v;
    bus.R[i] += v * 0.9;
  }
}

// ------------------------------------------------------------------ master

export function master(bus, { lowpass = 0, targetRms = 0.16, fadeIn = 0.3, fadeOut = 3.5, drive = 1.6 } = {}) {
  const hpL = new Biquad('highpass', 28), hpR = new Biquad('highpass', 28);
  const lpL = lowpass ? new Biquad('lowpass', lowpass) : null;
  const lpR = lowpass ? new Biquad('lowpass', lowpass) : null;
  let sum = 0;
  for (let i = 0; i < bus.length; i++) {
    let l = hpL.process(bus.L[i]);
    let r = hpR.process(bus.R[i]);
    if (lpL) { l = lpL.process(l); r = lpR.process(r); }
    bus.L[i] = l; bus.R[i] = r;
    sum += l * l + r * r;
  }
  const rms = Math.sqrt(sum / (bus.length * 2)) || 1;
  const gain = targetRms / rms;
  const norm = Math.tanh(drive);
  const total = bus.length / SR;
  for (let i = 0; i < bus.length; i++) {
    const t = i / SR;
    let fade = 1;
    if (t < fadeIn) fade = t / fadeIn;
    if (t > total - fadeOut) fade = Math.max(0, (total - t) / fadeOut);
    bus.L[i] = (Math.tanh(bus.L[i] * gain * drive) / norm) * 0.95 * fade;
    bus.R[i] = (Math.tanh(bus.R[i] * gain * drive) / norm) * 0.95 * fade;
  }
  return bus;
}
