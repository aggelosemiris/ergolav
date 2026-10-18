// Deterministic generative artwork for Nocturne's demo catalogue (album covers and artist
// images). Original SVG, no text, no third-party imagery.

import { mulberry32, hashString } from './synth.mjs';

const PALETTES = {
  lofi: [['#2b1f4a', '#7a5af5', '#f2b6c8', '#ffe3b3'], ['#1d2a3a', '#5a7fa8', '#f6c28b', '#fdf0d5']],
  ambient: [['#0d2b33', '#2f8f9d', '#a8e0d8', '#f1f7f5'], ['#1a2233', '#56739c', '#c9d8e8', '#f6f2ea']],
  synthwave: [['#16052b', '#d1497a', '#ff9a5a', '#ffd36e'], ['#0b0a2a', '#6b2fd1', '#ff4fa0', '#4ff0ff']],
  house: [['#06173a', '#2e6fd8', '#5fd1ff', '#ffe08a'], ['#0e1430', '#3b4fe0', '#ff7a59', '#ffd2c2']],
  piano: [['#1f1812', '#8a6d4b', '#e8d3b0', '#fbf6ec'], ['#141414', '#5b5b5b', '#d9cbb3', '#fffaf0']],
  chiptune: [['#0c1f12', '#3fa34d', '#b6f26b', '#fff36b'], ['#131133', '#4b5bdc', '#7ef0a4', '#ffe96b']],
  downtempo: [['#2a140a', '#b5652b', '#f0b67f', '#fde8cf'], ['#1a1414', '#7e3b2e', '#e08e5a', '#f5d7b8']],
  jazz: [['#1c0b0b', '#a03f3f', '#e2a76f', '#f6e7cf'], ['#0e1116', '#2c4a6b', '#d4a24c', '#f3ead8']],
};

const f = (n) => Number(n.toFixed(1));

function background(rng, pal, id) {
  const angle = Math.floor(rng() * 360);
  return `<defs>
  <linearGradient id="g${id}" gradientTransform="rotate(${angle} .5 .5)">
    <stop offset="0" stop-color="${pal[0]}"/><stop offset="1" stop-color="${pal[1]}"/>
  </linearGradient>
  <radialGradient id="r${id}" cx="${f(rng())}" cy="${f(rng())}" r=".9">
    <stop offset="0" stop-color="${pal[2]}" stop-opacity=".55"/><stop offset="1" stop-color="${pal[2]}" stop-opacity="0"/>
  </radialGradient>
  <filter id="n${id}"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${Math.floor(rng() * 999)}"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .06 0"/></filter>
</defs>
<rect width="600" height="600" fill="url(#g${id})"/>
<rect width="600" height="600" fill="url(#r${id})"/>`;
}

const motifs = {
  lofi(rng, p) {
    // window with rain streaks and a moon
    let s = `<circle cx="${f(380 + rng() * 120)}" cy="${f(130 + rng() * 60)}" r="${f(50 + rng() * 30)}" fill="${p[3]}" opacity=".9"/>`;
    s += `<rect x="70" y="70" width="460" height="460" rx="18" fill="none" stroke="${p[3]}" stroke-opacity=".35" stroke-width="10"/>`;
    s += `<line x1="300" y1="70" x2="300" y2="530" stroke="${p[3]}" stroke-opacity=".3" stroke-width="8"/>`;
    for (let i = 0; i < 38; i++) {
      const x = 80 + rng() * 440, y = 80 + rng() * 420, l = 20 + rng() * 60;
      s += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x - 6)}" y2="${f(y + l)}" stroke="${p[2]}" stroke-opacity="${f(0.25 + rng() * 0.4)}" stroke-width="3" stroke-linecap="round"/>`;
    }
    return s;
  },
  ambient(rng, p) {
    let s = '';
    for (let i = 0; i < 7; i++) {
      const y = 330 + i * 38 + rng() * 10;
      let d = `M0 ${f(y)}`;
      for (let x = 0; x <= 600; x += 60) d += ` Q${f(x + 30)} ${f(y - 30 + rng() * 60)} ${x + 60} ${f(y + rng() * 8 - 4)}`;
      s += `<path d="${d} V600 H0Z" fill="${p[i % 2 ? 2 : 3]}" opacity="${f(0.08 + i * 0.05)}"/>`;
    }
    s += `<circle cx="${f(150 + rng() * 300)}" cy="${f(170 + rng() * 60)}" r="${f(70 + rng() * 40)}" fill="${p[3]}" opacity=".35"/>`;
    return s;
  },
  synthwave(rng, p) {
    const cy = 300;
    let s = `<defs><linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[3]}"/><stop offset="1" stop-color="${p[1]}"/></linearGradient></defs>`;
    s += `<circle cx="300" cy="${cy}" r="${f(140 + rng() * 40)}" fill="url(#sun)"/>`;
    for (let i = 0; i < 6; i++) s += `<rect x="100" y="${cy + 20 + i * 22}" width="400" height="${4 + i * 2}" fill="${p[0]}"/>`;
    s += `<rect x="0" y="380" width="600" height="220" fill="${p[0]}" opacity=".92"/>`;
    for (let i = 0; i <= 12; i++) s += `<line x1="${300 + (i - 6) * 20}" y1="380" x2="${300 + (i - 6) * 140}" y2="600" stroke="${p[2]}" stroke-width="2" opacity=".8"/>`;
    for (let i = 0; i < 7; i++) {
      const y = 380 + Math.pow(i / 6, 1.8) * 220;
      s += `<line x1="0" y1="${f(y)}" x2="600" y2="${f(y)}" stroke="${p[2]}" stroke-width="2" opacity=".8"/>`;
    }
    return s;
  },
  house(rng, p) {
    let s = '';
    const cx = 300, cy = 300;
    for (let i = 9; i > 0; i--) {
      s += `<circle cx="${cx}" cy="${cy}" r="${i * 30}" fill="none" stroke="${p[i % 2 ? 2 : 3]}" stroke-width="${f(3 + rng() * 6)}" opacity="${f(0.2 + rng() * 0.5)}"/>`;
    }
    s += `<circle cx="${cx}" cy="${cy}" r="26" fill="${p[3]}"/>`;
    return s;
  },
  piano(rng, p) {
    let s = '';
    const keys = 12;
    const w = 600 / keys;
    for (let i = 0; i < keys; i++) s += `<rect x="${f(i * w + 2)}" y="360" width="${f(w - 4)}" height="240" rx="4" fill="${p[3]}" opacity=".9"/>`;
    [1, 2, 4, 5, 6, 8, 9, 11].forEach((i) => { s += `<rect x="${f(i * w - w * 0.3)}" y="360" width="${f(w * 0.6)}" height="150" rx="3" fill="${p[0]}"/>`; });
    s += `<circle cx="${f(160 + rng() * 280)}" cy="${f(170 + rng() * 40)}" r="${f(60 + rng() * 30)}" fill="${p[2]}" opacity=".6"/>`;
    return s;
  },
  chiptune(rng, p) {
    let s = '';
    const n = 12, size = 600 / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n / 2; x++) {
        if (rng() < 0.45) {
          const c = p[1 + Math.floor(rng() * 3)];
          s += `<rect x="${x * size}" y="${y * size}" width="${size}" height="${size}" fill="${c}"/>`;
          s += `<rect x="${600 - (x + 1) * size}" y="${y * size}" width="${size}" height="${size}" fill="${c}"/>`;
        }
      }
    }
    return s;
  },
  downtempo(rng, p) {
    let s = '';
    for (let i = 0; i < 14; i++) {
      const y = 60 + i * 36;
      s += `<path d="M-20 ${y} C 150 ${f(y - 60 + rng() * 120)}, 450 ${f(y - 60 + rng() * 120)}, 620 ${y}" fill="none" stroke="${p[2 + (i % 2)]}" stroke-width="${f(2 + rng() * 5)}" opacity="${f(0.35 + rng() * 0.5)}"/>`;
    }
    return s;
  },
  jazz(rng, p) {
    let s = '';
    for (let i = 0; i < 5; i++) {
      const x = 80 + rng() * 440, y = 80 + rng() * 440, r = 40 + rng() * 120;
      s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${p[2 + (i % 2)]}" opacity="${f(0.25 + rng() * 0.45)}"/>`;
    }
    s += `<rect x="${f(90 + rng() * 60)}" y="${f(300 + rng() * 80)}" width="${f(260 + rng() * 120)}" height="18" fill="${p[3]}"/>`;
    s += `<rect x="${f(240 + rng() * 60)}" y="${f(120 + rng() * 80)}" width="18" height="${f(200 + rng() * 120)}" fill="${p[0]}"/>`;
    return s;
  },
};

export function albumCover(slug, genre) {
  const seed = hashString(slug);
  const rng = mulberry32(seed);
  const pals = PALETTES[genre];
  const pal = pals[seed % pals.length];
  const id = seed.toString(36);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
${background(rng, pal, id)}
${motifs[genre](rng, pal)}
<rect width="600" height="600" filter="url(#n${id})"/>
</svg>
`;
}

export function artistImage(slug, genre) {
  const seed = hashString(`artist:${slug}`);
  const rng = mulberry32(seed);
  const pal = PALETTES[genre][(seed >>> 3) % 2];
  const id = `a${seed.toString(36)}`;
  // abstract bust: head and shoulders built from soft shapes
  const headX = 300 + (rng() - 0.5) * 60;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
${background(rng, [pal[1], pal[0], pal[2], pal[3]], id)}
<circle cx="${f(120 + rng() * 360)}" cy="${f(100 + rng() * 120)}" r="${f(120 + rng() * 80)}" fill="${pal[2]}" opacity=".25"/>
<ellipse cx="${f(headX)}" cy="600" rx="230" ry="190" fill="${pal[0]}" opacity=".92"/>
<circle cx="${f(headX)}" cy="290" r="108" fill="${pal[0]}" opacity=".92"/>
<circle cx="${f(headX - 30)}" cy="262" r="108" fill="${pal[3]}" opacity=".08"/>
<rect width="600" height="600" filter="url(#n${id})"/>
</svg>
`;
}
