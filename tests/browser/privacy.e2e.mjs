// Έλεγχος απορρήτου πάνω στα BYTES που στέλνονται στον provider (όχι σε ό,τι φαίνεται στην οθόνη).
//   1. Φωτογραφία με EXIF + GPS → η εικόνα που στέλνεται δεν έχει EXIF/GPS.
//   2. Χειροκίνητη κάλυψη → στην εικόνα που στέλνεται η περιοχή είναι μαύρη (και στο πρωτότυπο δεν ήταν).
//   3. Η εφαρμογή δεν τρέχει μέσα σε ξένο iframe.
// Εκτέλεση (χρειάζεται Playwright + Chromium, δεν είναι dependency του project):
//   npm start &   (http://localhost:8080)
//   PLAYWRIGHT_MODULE=/path/to/node_modules/playwright/index.mjs node tests/browser/privacy.e2e.mjs
import fs from 'node:fs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const BASE = process.env.APP_URL || 'http://localhost:8080/';
const results = [];
const check = (name, pass, detail = '') => { results.push({name, pass}); console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`); };

// ── JPEG με EXIF/GPS: TIFF (big-endian) με IFD0 → GPS IFD (GPSLatitudeRef = N, GPSLatitude = 38°2'3") ──
function withGps(jpeg){
  const t = Buffer.alloc(80);
  t.write('MM', 0); t.writeUInt16BE(42, 2); t.writeUInt32BE(8, 4);
  t.writeUInt16BE(1, 8);                                              // IFD0: 1 entry
  t.writeUInt16BE(0x8825, 10); t.writeUInt16BE(4, 12); t.writeUInt32BE(1, 14); t.writeUInt32BE(26, 18);   // GPSInfo → 26
  t.writeUInt32BE(0, 22);
  t.writeUInt16BE(2, 26);                                             // GPS IFD: 2 entries
  t.writeUInt16BE(0x0001, 28); t.writeUInt16BE(2, 30); t.writeUInt32BE(2, 32); t.write('N\0', 36);           // GPSLatitudeRef
  t.writeUInt16BE(0x0002, 40); t.writeUInt16BE(5, 42); t.writeUInt32BE(3, 44); t.writeUInt32BE(56, 48);       // GPSLatitude → 56
  t.writeUInt32BE(0, 52);
  [38, 2, 3].forEach((v, i) => { t.writeUInt32BE(v, 56 + i * 8); t.writeUInt32BE(1, 60 + i * 8); });
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), t]);
  const app1 = Buffer.concat([Buffer.from([0xFF, 0xE1]), Buffer.from([(payload.length + 2) >> 8, (payload.length + 2) & 255]), payload]);
  return Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);                                          // αμέσως μετά το SOI
}
const hasExif = buf => buf.includes(Buffer.from('Exif\0\0', 'binary'));
const hasGpsIfd = buf => buf.includes(Buffer.from([0x88, 0x25]));

const src = withGps(fs.readFileSync(new URL('../stress/fixtures/01-normal.jpg', import.meta.url)));
const tmp = new URL('./.gps-test.jpg', import.meta.url);
fs.writeFileSync(tmp, src);
check('η είσοδος έχει EXIF με GPS (έλεγχος του ίδιου του test)', hasExif(src) && hasGpsIfd(src));

const b = await chromium.launch(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {});
const p = await b.newPage({viewport: {width: 400, height: 860}});
let sent = null;
await p.route('https://generativelanguage.googleapis.com/**', async r => {
  sent = JSON.parse(r.request().postData()).contents[0].parts[0].inline_data.data;
  await r.fulfill({headers: {'access-control-allow-origin': '*'}, contentType: 'application/json',
    body: JSON.stringify({candidates: [{finishReason: 'STOP', content: {parts: [{text: '12 μέτρα σωλήνας'}]}}]})});
});
await p.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
await p.goto(BASE);
await p.click('#photo');
await p.fill('#keyInput', 'AIza' + 'P'.repeat(35));
const [chooser] = await Promise.all([p.waitForEvent('filechooser'), p.click('#keySave')]);
await chooser.setFiles(fs.realpathSync(tmp));
await p.waitForSelector('#s-redact.on');

// Περιοχή κάλυψης: οριζόντια λωρίδα στο πάνω μέρος (σε κλάσματα της εικόνας, για σύγκριση με τα bytes).
const box = await p.locator('#redactCanvas').boundingBox();
const frac = {x0: 0.15, x1: 0.85, y0: 0.08, y1: 0.20};
const before = await p.evaluate(({x, y}) => { const c = document.getElementById('redactCanvas'); return [...c.getContext('2d').getImageData(c.width * x, c.height * y, 1, 1).data].slice(0, 3); }, {x: 0.5, y: 0.14});
await p.mouse.move(box.x + box.width * frac.x0, box.y + box.height * frac.y0);
await p.mouse.down();
await p.mouse.move(box.x + box.width * frac.x1, box.y + box.height * frac.y1, {steps: 6});
await p.mouse.up();
await p.click('#ctaBtn');
await p.waitForSelector('#s-lines.on', {timeout: 20000});

const bytes = Buffer.from(sent, 'base64');
check('στάλθηκε JPEG', bytes[0] === 0xFF && bytes[1] === 0xD8);
check('τα bytes που στάλθηκαν ΔΕΝ έχουν EXIF', !hasExif(bytes));
check('τα bytes που στάλθηκαν ΔΕΝ έχουν GPS IFD', !hasGpsIfd(bytes));
// Αποκωδικοποίηση ΤΩΝ BYTES ΠΟΥ ΣΤΑΛΘΗΚΑΝ και δειγματοληψία pixels.
const px = await p.evaluate(async ({b64, pts}) => {
  const img = new Image(); img.src = 'data:image/jpeg;base64,' + b64; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0);
  return pts.map(([fx, fy]) => [...x.getImageData(Math.floor(c.width * fx), Math.floor(c.height * fy), 1, 1).data].slice(0, 3));
}, {b64: sent, pts: [[0.5, 0.14], [0.3, 0.1], [0.7, 0.18], [0.5, 0.6]]});
const dark = rgb => rgb.every(v => v < 30), light = rgb => rgb.reduce((a, v) => a + v, 0) > 300;
check('στο πρωτότυπο η περιοχή ΔΕΝ ήταν μαύρη', light(before), JSON.stringify(before));
check('στα bytes που στάλθηκαν η καλυμμένη περιοχή είναι μαύρη (3 σημεία)', px.slice(0, 3).every(dark), JSON.stringify(px.slice(0, 3)));
check('εκτός κάλυψης η εικόνα μένει ίδια (όχι μαύρη)', !dark(px[3]), JSON.stringify(px[3]));

// iframe
await p.setContent(`<iframe src="${BASE}" width="400" height="300"></iframe>`);
await p.waitForTimeout(1500);
const frame = p.frames().find(f => f !== p.mainFrame());   // το iframe, όχι η κύρια σελίδα
check('μέσα σε ξένο iframe η εφαρμογή δεν τρέχει', /μόνο απευθείας/.test(await frame.textContent('body')));

await b.close();
fs.rmSync(tmp, {force: true});
const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed${failed.length ? ' — απέτυχαν: ' + failed.map(r => r.name).join(' | ') : ''}`);
process.exit(failed.length ? 1 : 0);
