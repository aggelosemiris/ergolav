// Να μην τρέχει μέσα σε ξένο iframe (clickjacking — η CSP μέσω <meta> δεν υποστηρίζει frame-ancestors).
if(window.top !== window.self){
  document.body.innerHTML = '<p style="padding:24px;font:17px system-ui">Η εφαρμογή ανοίγει μόνο απευθείας, όχι μέσα σε άλλη σελίδα.</p>';
  throw new Error('framed');
}
import { parse, glueSacks } from './parse.js';
import { createMic, micSupported } from './mic.js';
import { readNotes, shrink, getKey, setKey, forgetKey, canRememberKey, isKeyRemembered, keyProvider } from './photo.js';
import { makePdf, shareFile, download } from './share.js';
import { parseAmount, toCents, formatEur, formatQty } from './number.js';
import { tiers, priceKey, history, remember, ageLabel, isStale } from './prices.js';

const SAMPLE = 'Ανακαίνιση μπάνιου. Δώδεκα μέτρα σωλήνα πολυστρωματικό, μια μπαταρία νιπτήρα, λεκάνη κρεμαστή με καζανάκι εντοιχισμού, και δώδεκα τετραγωνικά πλακάκι τοίχου.';
const BARS = 18;

let LINES = [], TITLE = 'εργασίες';
// Εργασία: ΜΙΑ τιμή για όλη τη δουλειά (λεπτά). null = αυτόματη πρόταση από τον κατάλογο· αριθμός = ό,τι έγραψε ο τεχνίτης.
let LABOR = null, laborBad = false;
const eur = c => (c/100).toLocaleString('el-GR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtQty = formatQty;   // ίδια ακρίβεια (3 δεκαδικά) με την είσοδο της ποσότητας
const $ = id => document.getElementById(id);
let started = 0, checkedCount = 0;

function show(id, step){
  document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on', s.id===id));
  $('step').textContent = step;
  window.scrollTo({top:0});
}
function cta(label, fn, disabled, note){
  $('cta').hidden = !label;
  if(!label) return;
  const b = $('ctaBtn'); b.textContent = label; b.disabled = !!disabled; b.onclick = fn;
  const n = $('ctaNote'); n.hidden = !note; n.textContent = note||'';
}
function notice(msg){ $('notice').hidden = !msg; $('notice').textContent = msg || ''; }

// ─── 2 : ακρόαση σε πραγματικό χρόνο ────────────────────────
const wave = $('wave'), transcript = $('transcript');
for(let i=0;i<BARS;i++){ const b=document.createElement('i'); b.style.animationDelay=(i*0.06)+'s'; wave.appendChild(b); }

const mic = createMic({
  bars: BARS,
  onText(fin, interim){
    if(!mic.listening && !interim) return;
    transcript.innerHTML = esc(fin) + (interim ? ` <span class="interim">${esc(interim)}</span>` : '') + '<span class="caret"></span>';
    renderChips(fin + ' ' + interim);
  },
  onLevels(levels){
    const bars = wave.children;
    for(let i=0;i<bars.length;i++) bars[i].style.height = (8 + levels[i]*52) + 'px';
  },
  onError(msg){ review(transcript.textContent, msg); },
});

function renderChips(text){
  const box = $('chips');
  // Κρατάμε τα τσιπάκια που υπάρχουν ήδη, ώστε να «σκάνε» μόνο τα καινούρια.
  const old = new Map([...box.children].map(c => [c.textContent, c]));
  const next = parse(text).lines.filter(l => !l.unknown && !l.suggest).map(l => {
    const label = `${fmtQty(l.qty)} ${l.unit} ${l.name}${l.flag ? ' ?' : ''}`;
    let c = old.get(label);
    if(!c){ c = document.createElement('span'); c.className = 'chip' + (l.flag ? ' q' : ''); c.textContent = label; }
    return c;
  });
  box.replaceChildren(...next);
}

async function startListening(initial = ''){
  if(!started) started = Date.now();
  if(!micSupported){
    review(initial, 'Αυτός ο browser δεν έχει αναγνώριση φωνής. Γράψε τι χρειάζεται — ή άνοιξέ το σε Chrome ή Safari.');
    return;
  }
  show('s-listen','Ακούω');
  notice('');
  $('shot').hidden = true;
  wave.hidden = false; wave.classList.remove('live');
  [...wave.children].forEach(b => b.style.height = '');
  $('listenAlt').hidden = true;
  $('listenLabel').textContent = 'Ακούω… μίλα φυσικά, πάτα «Τέλος» όταν τελειώσεις';
  transcript.contentEditable = 'false';
  transcript.innerHTML = esc(initial) + '<span class="caret"></span>';
  renderChips(initial);
  cta('Τέλος', finishListening);
  try {
    const live = await mic.start(initial);
    if(mic.listening) wave.classList.toggle('live', live);
  } catch {
    review(initial, 'Δεν μπόρεσα να ξεκινήσω το μικρόφωνο.');
  }
}

async function finishListening(){
  cta('Τελειώνω…', null, true);
  $('listenLabel').textContent = 'Τελειώνω…';
  review(await mic.stop());
}

function review(text, msg){
  if(mic.listening) mic.stop();
  show('s-listen','Διόρθωση');
  notice(msg);
  wave.hidden = true;
  $('listenLabel').textContent = text ? 'Αν κάτι ακούστηκε λάθος, πάτα πάνω στο κείμενο και διόρθωσέ το.' : '';
  transcript.contentEditable = 'true';
  transcript.textContent = (text || '').trim();
  $('listenAlt').hidden = false;
  $('resume').hidden = !micSupported;
  $('sample').hidden = !!text;
  $('changeKey').hidden = true;
  const sync = () => {
    const t = transcript.textContent.trim();
    renderChips(t);
    $('sample').hidden = !!t;
    cta('Βγάλε τιμές', () => buildLines(transcript.textContent), !t);
  };
  transcript.oninput = sync;
  sync();
  if(!text) transcript.focus();
}

$('mic').onclick = () => startListening();
$('resume').onclick = () => startListening(transcript.textContent.trim());
$('sample').onclick = () => { transcript.textContent = SAMPLE; transcript.oninput(); };
if(!micSupported) $('micNote').textContent = 'Ο browser σου δεν έχει αναγνώριση φωνής — θα μπορείς να το γράψεις.';

// ─── Φωτογραφία σημειώσεων → κατευθείαν στην προσφορά ──────
const shot = $('shot');
let pendingPhoto = null;

$('photo').onclick = () => getKey() ? $('photoInput').click() : openKey();
$('photoInput').onchange = async e => {
  const file = e.target.files[0];
  e.target.value = '';
  if(!file) return;
  started = Date.now();
  let img;
  try {
    img = await shrink(file);
  } catch {
    review('', 'Δεν μπόρεσα να ανοίξω τη φωτογραφία.');
    return;
  }
  openRedact(img);
};

// ─── Πριν σταλεί: κάλυψη προσωπικών στοιχείων πάνω στη φωτογραφία ──
// Ό,τι καλυφθεί γίνεται μαύρο ΠΑΝΩ στην εικόνα που στέλνεται (δεν στέλνεται το πρωτότυπο).
const rc = $('redactCanvas'), rctx = rc.getContext('2d');
let rImg = null, rects = [], drag = null;
function drawRedact(){
  if(!rImg) return;
  rctx.drawImage(rImg, 0, 0, rc.width, rc.height);
  rctx.fillStyle = '#000';
  for(const r of drag ? [...rects, drag] : rects) rctx.fillRect(r.x, r.y, r.w, r.h);
}
const rPoint = e => { const b = rc.getBoundingClientRect(); return {x: (e.clientX - b.left) * rc.width / b.width, y: (e.clientY - b.top) * rc.height / b.height}; };
rc.addEventListener('pointerdown', e => { rc.setPointerCapture(e.pointerId); const p = rPoint(e); drag = {x0: p.x, y0: p.y, x: p.x, y: p.y, w: 0, h: 0}; });
rc.addEventListener('pointermove', e => {
  if(!drag) return;
  const p = rPoint(e);
  Object.assign(drag, {x: Math.min(drag.x0, p.x), y: Math.min(drag.y0, p.y), w: Math.abs(p.x - drag.x0), h: Math.abs(p.y - drag.y0)});
  drawRedact();
});
const endDrag = () => { if(drag && drag.w > 6 && drag.h > 6) rects.push({x: drag.x, y: drag.y, w: drag.w, h: drag.h}); drag = null; drawRedact(); };
rc.addEventListener('pointerup', endDrag);
rc.addEventListener('pointercancel', endDrag);
$('redactUndo').onclick = () => { rects.pop(); drawRedact(); };
$('redactCancel').onclick = () => { rImg = null; show('s-start', 'Νέα προσφορά'); cta(null); };

async function openRedact(img){
  rImg = await new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = img.url; });
  rc.width = rImg.width; rc.height = rImg.height; rects = []; drag = null;
  drawRedact();
  const prov = keyProvider(getKey());
  $('privacyNote').textContent = prov === 'anthropic'
    ? 'Θα σταλεί στην Anthropic (Claude) για ανάγνωση. Η Anthropic δεν χρησιμοποιεί τα δεδομένα του API για εκπαίδευση μοντέλων.'
    : 'Θα σταλεί στη Google (Gemini) για ανάγνωση. Στο δωρεάν επίπεδο η Google μπορεί να τη χρησιμοποιήσει για βελτίωση των υπηρεσιών της και να τη δουν άνθρωποι — κάλυψε ό,τι προσωπικό.';
  show('s-redact', 'Απόρρητο');
  cta('Στείλε για ανάγνωση', () => {
    const url = rc.toDataURL('image/jpeg', 0.85);
    pendingPhoto = {url, data: url.split(',')[1]};
    rImg = null;
    readPhoto(pendingPhoto);
  });
}

async function readPhoto(img){
  show('s-listen','Διαβάζω');
  notice(''); wave.hidden = true; $('listenAlt').hidden = true; $('chips').replaceChildren();
  shot.src = img.url; shot.hidden = false; shot.classList.add('reading');
  transcript.contentEditable = 'false';
  transcript.innerHTML = '<span class="caret"></span>';
  cta('Διαβάζω…', null, true);
  $('listenLabel').textContent = 'Διαβάζω τις σημειώσεις σου…';
  try {
    let warning = '';
    const text = await readNotes(img.data, {onStatus: s => $('listenLabel').textContent = s, onWarning: w => warning = w});
    pendingPhoto = null;
    shot.classList.remove('reading');
    review(text, warning);
    buildLines(text, warning);
  } catch (err) {
    shot.classList.remove('reading');
    const msg = err.message === 'NO_KEY' ? '' : err.message;
    // Κρατάμε τη φωτογραφία: με άλλο key ξαναδιαβάζεται χωρίς νέα λήψη.
    review('', msg && msg + ' Μπορείς και να γράψεις τι λένε οι σημειώσεις.');
    $('changeKey').hidden = false;
    if(!getKey()) openKey(msg);
  }
}

$('changeKey').onclick = () => openKey();
// Πάντα διαθέσιμη πρόσβαση στο key (αλλαγή/διαγραφή), ακόμα κι όταν η φωτογραφία ανοίγει κατευθείαν την κάμερα.
const syncKeyUi = () => { $('keySettings').hidden = !getKey(); };
$('keySettings').onclick = () => openKey();
syncKeyUi();

function openKey(msg){
  $('keyError').hidden = !msg; $('keyError').textContent = msg || '';
  $('keyInput').value = '';
  $('keyInput').type = 'password'; $('keyShow').textContent = 'Εμφάνιση'; $('keyShow').setAttribute('aria-pressed', 'false');
  const can = canRememberKey();
  $('keyRemember').checked = can && isKeyRemembered();
  $('keyRemember').disabled = !can;
  $('rememberNote').textContent = can
    ? 'Αν το τσεκάρεις, μένει σε αυτό το κινητό μέχρι να πατήσεις «Ξέχασε το key». Όποιος έχει το κινητό μπορεί να το χρησιμοποιήσει. Αλλιώς ξεχνιέται όταν κλείσει η σελίδα.'
    : 'Σε αυτή τη διεύθυνση δοκιμών το key δεν αποθηκεύεται ποτέ (το domain το μοιράζονται και άλλες σελίδες). Ξεχνιέται όταν κλείσει η σελίδα.';
  $('keyForget').hidden = !getKey();
  $('veil').classList.add('on'); $('keySheet').classList.add('on');
  setTimeout(() => $('keyInput').focus(), 250);
}
function closeKey(){ $('veil').classList.remove('on'); $('keySheet').classList.remove('on'); }
$('keyCancel').onclick = closeKey;
$('keyShow').onclick = () => {
  const show = $('keyInput').type === 'password';
  $('keyInput').type = show ? 'text' : 'password';
  $('keyShow').textContent = show ? 'Απόκρυψη' : 'Εμφάνιση';
  $('keyShow').setAttribute('aria-pressed', String(show));
};
$('keyForget').onclick = () => { forgetKey(); pendingPhoto = null; closeKey(); syncKeyUi(); $('micNote').textContent = 'Το key σβήστηκε από αυτή τη συσκευή.'; };
$('keySave').onclick = () => {
  const k = $('keyInput').value.trim();
  if(!k) return;
  setKey(k, {remember: $('keyRemember').checked}); closeKey(); syncKeyUi();
  // Αν μια φωτογραφία περίμενε το κλειδί, τη διαβάζουμε τώρα· αλλιώς ανοίγει η κάμερα.
  if(pendingPhoto) readPhoto(pendingPhoto);
  else $('photoInput').click();
};

// ─── 3 : γραμμές ─────────────────────────────────────────────
// Πεδίο αριθμού με ζωντανή επιβεβαίωση: κάτω από το πεδίο φαίνεται πώς διαβάστηκε ο αριθμός
// («= 1.234,50 €») ή γιατί δεν διαβάζεται. Επιστρέφει συνάρτηση που δίνει {value} ή {error}.
function numField(el, key, {optional = false, ...opts}, fmt){
  const input = el.querySelector(`[data-p="${key}"]`), out = el.querySelector(`[data-o="${key}"]`);
  const read = () => {
    const raw = input.value.trim();
    if(!raw && optional) return {value: 0, empty: true};
    return parseAmount(raw, opts);
  };
  const show = (force) => {
    const r = read();
    const quiet = !force && !input.value.trim();
    out.textContent = quiet || r.empty ? '' : r.error ? r.error : `= ${fmt(r.value)}`;
    out.classList.toggle('err', !quiet && !!r.error);
  };
  input.addEventListener('input', () => show());
  show();
  return () => { const r = read(); show(true); if(r.error) input.focus(); return r; };
}
function showFieldError(el, key, msg){
  const out = el.querySelector(`[data-o="${key}"]`);
  out.textContent = msg; out.classList.add('err');
  el.querySelector(`[data-p="${key}"]`).focus();
}

// Κάθε γραμμή δείχνει μόνο υλικό (στρογγυλοποιημένο ανά γραμμή, όπως στα σύνολα — το PDF «βγάζει» στο λεπτό).
// Η εργασία είναι μία τιμή για όλη τη δουλειά (LABOR) και δεν ανήκει σε γραμμή.
const matOf = l => Math.round(l.qty * l.mat);
const okLines = () => LINES.filter(l=>!l.flag && !l.suggest && !l.unknown && !needsQty(l));
// Πρόταση εργασίας από τον κατάλογο: Σ qty × εργασία του είδους, για τις γραμμές χωρίς εκκρεμότητα.
const autoLabor = () => okLines().reduce((s,l)=>s+Math.round(l.qty*l.lab),0);
const needsQty = l => l.qtyMissing || l.qtyCheck;
// Στην προσφορά μπαίνουν ΜΟΝΟ υλικά του καταλόγου: ό,τι δεν βρέθηκε (l.unknown) φαίνεται ως «δεν μπαίνει» και δεν μπλοκάρει τίποτα.
function unresolved(){ return LINES.filter(l=>l.flag || l.suggest || needsQty(l) || l.customOpen).length; }

function buildLines(text, warning){
  const r = parse(text);
  $('linesNotice').hidden = !warning; $('linesNotice').textContent = warning || '';
  if(!r.lines.length){
    notice('Δεν βρήκα υλικά στο κείμενο. Πες ή γράψε π.χ. «δέκα μέτρα σωλήνα».');
    return;
  }
  LINES = r.lines; TITLE = r.title || 'εργασίες';
  LABOR = null; laborBad = false;          // νέα ανάλυση = νέα πρόταση εργασίας
  show('s-lines','Έλεγχος');
  renderLines();
}
function renderLines(){
  // Η προτεινόμενη κόλλα ακολουθεί τα τ.μ. πλακακιού όσο δεν την έχει επιβεβαιώσει ο χρήστης.
  const glue = LINES.find(l => l.id === 'glue' && l.suggest);
  if(glue) glue.qty = glueSacks(LINES.filter(l => l.id === 'tile').reduce((s, l) => s + l.qty, 0));
  const box = $('lines'); box.innerHTML = '';
  LINES.forEach((l,i)=>{
    const el = document.createElement('div');
    el.className = 'ln' + (l.unknown ? ' skip' : (l.flag||l.suggest||needsQty(l))?' flag':'');
    el.style.animationDelay = (i*0.07)+'s';
    if(l.unknown){
      el.innerHTML = `
        <div class="ln-top"><span class="ln-name">${fmtQty(l.qty)} ${esc(l.unit)} ${esc(l.name)}</span></div>
        <div class="ask">Δεν υπάρχει στον κατάλογο — δεν μπαίνει στην προσφορά.</div>`;
    } else if(l.flag){
      el.innerHTML = `
        <div class="ln-top"><span class="ln-name">${fmtQty(l.qty)} ${esc(l.unit)} ${esc(l.name)}</span></div>
        <div class="ask">Δεν είπες ποιο. Διάλεξε:</div>
        <div class="opts">${l.options.map((o,j)=>`
          <button class="opt" data-j="${j}"><span>${esc(o.label)}</span><span class="num">${eur(o.mat)}/${esc(l.unit)}</span></button>`).join('')}
        </div>`;
      el.querySelectorAll('.opt').forEach(b=>b.onclick=()=>{
        Object.assign(l, l.pick(l.options[+b.dataset.j]));
        l.flag = false; checkedCount++;
        renderLines();
      });
    } else if(l.suggest){
      el.innerHTML = `
        <div class="ln-top"><span class="ln-name">${fmtQty(l.qty)} ${esc(l.unit)} ${esc(l.name)}</span><span class="ln-sum num">${eur(matOf(l))}</span></div>
        <div class="ask">Δεν το είπες, αλλά χρειάζεται για τα πλακάκια. Το κρατάς;</div>
        <div class="sug-act"><button data-a="keep">Ναι, πρόσθεσέ το</button><button data-a="drop">Όχι</button></div>`;
      el.querySelector('[data-a="keep"]').onclick=()=>{ l.suggest=false; checkedCount++; renderLines(); };
      el.querySelector('[data-a="drop"]').onclick=()=>{ LINES = LINES.filter(x=>x!==l); checkedCount++; renderLines(); };
    } else if(needsQty(l)){
      // Ποσότητα που δεν ειπώθηκε ή φαίνεται παράλογη (π.χ. 999, τιμή που διαβάστηκε ως ποσότητα): επιβεβαίωση.
      el.innerHTML = `
        <div class="ln-top"><span class="ln-name">${esc(l.name)}</span></div>
        <div class="ask">${l.qtyMissing ? `Δεν είπες ποσότητα (${esc(l.unit)}) — γράψε πόσα:` : `${fmtQty(l.qty)} ${esc(l.unit)}; Φαίνεται πολύ — έλεγξε την ποσότητα:`}</div>
        <div class="prices"><label>Ποσότητα (${esc(l.unit)})<input inputmode="decimal" data-p="qty" value="${l.qtyMissing ? '' : String(l.qty).replace('.', ',')}" placeholder="0"><small class="parsed" data-o="qty"></small></label></div>
        <div class="sug-act"><button data-a="ok">Εντάξει</button><button data-a="drop">Βγάλ' το</button></div>`;
      const readQty = numField(el, 'qty', {maxDecimals: 3}, v => `${formatQty(v)} ${l.unit}`);
      el.querySelector('[data-a="ok"]').onclick=()=>{
        const r = readQty();
        if(r.error) return;
        const q = r.value;
        Object.assign(l, {qty: q, qtyMissing: false, qtyCheck: false});
        checkedCount++; renderLines();
      };
      el.querySelector('[data-a="drop"]').onclick=()=>{ LINES = LINES.filter(x=>x!==l); checkedCount++; renderLines(); };
    } else {
      if(l.matBase == null) l.matBase = l.mat;                 // η τιμή καταλόγου μένει σταθερή, ώστε οι προτάσεις να μη μετακινούνται
      const T = tiers(l.matBase), cur = l.customOpen ? 'custom' : (l.tier ?? 'normal');
      const key = priceKey(l), hist = T ? history(key) : [];
      const per = esc(l.unit);
      el.innerHTML = `
        <div class="ln-top"><span class="ln-name">${esc(l.name)}</span><span class="ln-sum num">${l.mat > 0 ? eur(matOf(l)) : 'στην εργασία'}</span></div>
        <div class="ln-meta">${esc(l.code)}</div>
        <div class="ln-row">
          <div class="qty"><button aria-label="Λιγότερα" data-d="-1">−</button><span class="num">${fmtQty(l.qty)} ${per}</span><button aria-label="Περισσότερα" data-d="1">+</button></div>
        </div>
        ${T ? `
        <div class="tiers" role="group" aria-label="Τιμή υλικού ανά ${per}">
          ${[['eco', 'Οικονομική'], ['normal', 'Κανονική'], ['premium', 'Ακριβή']].map(([t, n]) => `
          <button class="tier${cur === t ? ' on' : ''}" data-t="${t}" aria-pressed="${cur === t}"><span>${n}</span><span class="num">${eur(T[t])}<small>/${per}</small></span></button>`).join('')}
          <button class="tier${cur === 'custom' || l.tier === 'custom' ? ' on' : ''}" data-t="custom" aria-pressed="${cur === 'custom'}"><span>Άλλη τιμή</span><span class="num">${l.tier === 'custom' && !l.customOpen ? `${eur(l.mat)}<small>/${per}</small>` : '…'}</span></button>
        </div>
        ${l.customOpen ? `
        <div class="custom">
          <div class="prices"><label>Τιμή υλικού € ανά ${per}<input inputmode="decimal" data-p="cmat" placeholder="0,00" value="${esc(l.customDraft || '')}"><small class="parsed" data-o="cmat"></small></label></div>
          <div class="hist" data-hist ${hist.length && !l.customDraft ? '' : 'hidden'}>${hist.map(h => `
            <button class="hi" data-c="${h.c}"><span class="num">${eur(h.c)}</span><span>${ageLabel(h.at)}${isStale(h.at) ? ' · <b>έλεγξε αν άλλαξε</b>' : ''}</span></button>`).join('')}
          </div>
          <div class="sug-act"><button data-a="keep">Κράτα την</button><button data-a="cancel">Άκυρο</button></div>
        </div>` : ''}` : ''}`;
      el.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{
        l.qty = Math.max(0, Math.round((l.qty + (+b.dataset.d))*100)/100);
        renderLines();
      });
      el.querySelectorAll('.tier').forEach(b=>b.onclick=()=>{
        const t = b.dataset.t;
        if(t === 'custom'){ l.customOpen = true; l.focusCustom = true; renderLines(); return; }
        Object.assign(l, {tier: t, mat: T[t], customOpen: false, customDraft: ''});
        renderLines();
      });
      if(l.customOpen){
        const input = el.querySelector('[data-p="cmat"]'), histBox = el.querySelector('[data-hist]');
        const readC = numField(el, 'cmat', {}, v => `${formatEur(v)} ανά ${l.unit}`);
        // Οι αποθηκευμένες τιμές φαίνονται μόνο όσο το πεδίο είναι άδειο· ποτέ δεν μπαίνουν μόνες τους.
        input.addEventListener('input', () => { l.customDraft = input.value; histBox.hidden = !!input.value || !hist.length; });
        histBox.querySelectorAll('.hi').forEach(h => h.onclick = () => {
          input.value = centsText(+h.dataset.c);
          input.dispatchEvent(new Event('input', {bubbles: true}));
          input.focus();
        });
        el.querySelector('[data-a="keep"]').onclick = () => {
          const r = readC();
          if(r.error) return;
          const cents = toCents(r.value);
          Object.assign(l, {mat: cents, tier: 'custom', customOpen: false, customDraft: ''});
          remember(key, cents);
          checkedCount++; renderLines();
        };
        el.querySelector('[data-a="cancel"]').onclick = () => { Object.assign(l, {customOpen: false, customDraft: ''}); renderLines(); };
        if(l.focusCustom){ l.focusCustom = false; setTimeout(() => input.focus(), 0); }
      }
    }
    box.appendChild(el);
  });
  renderLabor();
  renderTotals();
  refreshCta();
}
function refreshCta(){
  const left = unresolved();
  const none = !LINES.some(l => !l.unknown);                  // τίποτα από τον κατάλογο = δεν υπάρχει προσφορά
  cta('Έλεγξα, φτιάξε την προσφορά', buildPdf, left>0 || laborBad || none,
      left>0 ? (left===1 ? 'Μένει 1 γραμμή να ελέγξεις' : `Μένουν ${left} γραμμές να ελέγξεις`)
        : laborBad ? 'Διόρθωσε την εργασία' : none ? 'Δεν βρέθηκε κανένα υλικό από τον κατάλογο' : '');
}
// Εργασία για όλη τη δουλειά: ΕΝΑ πεδίο, σε δικό του container (το re-render των συνόλων δεν χαλάει το focus την ώρα
// που γράφει). Προσυμπληρωμένο με την πρόταση του καταλόγου· ό,τι γράψει ο τεχνίτης μένει (δεν αλλάζει μόνο του
// όταν αλλάξουν ποσότητες — η πρόταση φαίνεται από κάτω για σύγκριση).
const centsText = c => { const t = (c / 100).toFixed(2).replace('.', ','); return t.replace(/,00$/, ''); };
// ΦΠΑ: τον συντελεστή τον ΕΠΙΛΕΓΕΙ ο τεχνίτης (προτίμηση συσκευής, προεπιλογή 24%). Η εφαρμογή δεν προτείνει
// και δεν ελέγχει ποιος ισχύει (εξαρτάται από τόπο, είδος εργασίας, προϋποθέσεις)· ευθύνη τεχνίτη/λογιστή.
// Πηγές για τους αριθμούς: docs/SOURCES.md.
const VAT_RATES = [24, 17, 13, 9, 6, 4, 0].map(r => [r, `${r}%`]);
let vatRate = (() => { try { const v = Number(localStorage.getItem('ergolav.vat')); return VAT_RATES.some(([r]) => r === v) && localStorage.getItem('ergolav.vat') !== null ? v : 24; } catch { return 24; } })();
function setVat(v){ vatRate = v; try { localStorage.setItem('ergolav.vat', String(v)); } catch {} }

function renderLabor(){
  const box = $('laborBox'), auto = autoLabor();
  laborBad = false;                                          // το πεδίο ξαναφτιάχνεται πάντα με έγκυρη τιμή
  box.innerHTML = `
    <div class="prices"><label>Εργασία για όλη τη δουλειά €<input inputmode="decimal" data-p="labor" value="${centsText(LABOR ?? auto)}" placeholder="0"><small class="parsed" data-o="labor"></small></label></div>
    <div class="hint" data-hint></div>`;
  const hint = box.querySelector('[data-hint]');
  const syncHint = () => {
    hint.innerHTML = LABOR != null && LABOR !== auto ? `Πρόταση καταλόγου: ${eur(auto)} <button class="linkbtn" data-a="auto">Χρησιμοποίησέ την</button>` : '';
    const b = hint.querySelector('[data-a="auto"]');
    if(b) b.onclick = () => { LABOR = null; renderLabor(); renderTotals(); refreshCta(); };
  };
  const read = numField(box, 'labor', {allowZero: true}, formatEur);   // αυστηρή ανάγνωση: «1.500» μπλοκάρει
  box.querySelector('[data-p="labor"]').addEventListener('input', () => {
    const r = read();
    if(r.error){ laborBad = true; refreshCta(); return; }   // η τελευταία έγκυρη τιμή μένει, το κουμπί κλειδώνει
    laborBad = false; LABOR = toCents(r.value);
    syncHint(); renderTotals(); refreshCta();
  });
  syncHint();
}

function sums(){
  const mat = okLines().reduce((s,l)=>s+matOf(l),0);
  const lab = LABOR ?? autoLabor();
  const net = mat+lab, vat = Math.round(net * vatRate / 100);
  return {mat,lab,net,vat,total:net+vat};
}
function renderTotals(){
  const s = sums();
  $('totals').innerHTML = `
    <div class="t"><span>Υλικά</span><span class="num">${eur(s.mat)}</span></div>
    <div class="t"><span>Εργασία</span><span class="num">${eur(s.lab)}</span></div>
    <div class="t"><span>ΦΠΑ ${vatRate}%</span><span class="num">${eur(s.vat)}</span></div>
    <div class="t big"><span>Σύνολο</span><span class="num">${eur(s.total)}</span></div>
    <label class="vat">Συντελεστής ΦΠΑ
      <select id="vatRate">${VAT_RATES.map(([r, t]) => `<option value="${r}"${r === vatRate ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
    <p class="privacy">Η εφαρμογή δεν ελέγχει ποιος συντελεστής ΦΠΑ ισχύει. Τον επιλέγεις εσύ, με ευθύνη δική σου ή του λογιστή σου.</p>`;
  $('vatRate').onchange = e => { setVat(Number(e.target.value)); renderTotals(); };
}

// ─── 4 : PDF ─────────────────────────────────────────────────
function buildPdf(){
  show('s-pdf','Προεπισκόπηση');
  const s = sums();
  const client = $('client').value || 'Πελάτης';
  const today = new Date().toLocaleDateString('el-GR');
  $('pdf').innerHTML = `
    <div class="pdf-head">
      <div style="display:flex;gap:10px;align-items:center"><div class="logo">ΚΑ</div>
        <div><b>Κατασκευές Αντωνίου</b><div style="color:#5E646B;font-size:12px">Υδραυλικά · Ανακαινίσεις</div></div></div>
      <div style="text-align:right;color:#5E646B;font-size:12px">Αρ. 0142<br>${today}</div>
    </div>
    <h2>Προσφορά: ${esc(TITLE)}</h2>
    <div class="who">Προς: ${esc(client)}</div>
    <table>
      <tr><th>Περιγραφή</th><th class="r">Υλικό</th></tr>
      ${LINES.filter(l=>l.qty>0 && !l.unknown).map(l=>`<tr><td>${esc(l.name)}<div class="q">${fmtQty(l.qty)} ${esc(l.unit)}</div></td><td class="num">${l.mat > 0 ? eur(matOf(l)) : 'στην εργασία'}</td></tr>`).join('')}
    </table>
    <div class="sum num">
      <div><span>Υλικά</span><span>${eur(s.mat)}</span></div>
      <div><span>Εργασία</span><span>${eur(s.lab)}</span></div>
      <div><span>Καθαρή αξία</span><span>${eur(s.net)}</span></div>
      <div><span>ΦΠΑ ${vatRate}%</span><span>${eur(s.vat)}</span></div>
      <div class="g"><span>Σύνολο</span><span>${eur(s.total)}</span></div>
    </div>
    <p class="foot">Η προσφορά ισχύει για 15 ημέρες. Περιλαμβάνει υλικά και εργασία τοποθέτησης.</p>`;
  preparePdf();
}

// ─── 5 : αποστολή ────────────────────────────────────────────
// Το PDF φτιάχνεται μόλις ανοίξει η προεπισκόπηση, ώστε το «Στείλε» να ανοίγει αμέσως το μενού
// κοινοποίησης (οι browsers το επιτρέπουν μόνο αμέσως μετά από πάτημα).
let pdfFile = null;
// Όνομα αρχείου με λατινικούς: κάποιοι browsers απορρίπτουν ελληνικά ονόματα στο κατέβασμα.
const GR = {α:'a',β:'v',γ:'g',δ:'d',ε:'e',ζ:'z',η:'i',θ:'th',ι:'i',κ:'k',λ:'l',μ:'m',ν:'n',ξ:'x',ο:'o',π:'p',
  ρ:'r',σ:'s',ς:'s',τ:'t',υ:'y',φ:'f',χ:'ch',ψ:'ps',ω:'o'};
const greeklish = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/ου/g, 'ou').replace(/Ου/g, 'Ou').replace(/ΟΥ/g, 'OU')
  .replace(/./g, c => { const l = c.toLowerCase(), t = GR[l]; return t ? (c === l ? t : t[0].toUpperCase() + t.slice(1)) : c; });
const clientName = () => ($('client').value || 'Πελάτης').split(',')[0].trim();
const shareText = () =>
  `Καλησπέρα σας, σας στέλνω την προσφορά για ${TITLE}. Σύνολο ${eur(sums().total)} με ΦΠΑ.`;

async function preparePdf(){
  pdfFile = null;
  cta('Ετοιμάζω το PDF…', null, true);
  const name = `Prosfora-0142-${greeklish(clientName())}`.replace(/[^\w.-]+/g, '-').replace(/-+$/, '') + '.pdf';
  try {
    pdfFile = await makePdf($('pdf'), name);
    cta('Στείλε στον πελάτη', sendPdf);
  } catch (e) {
    cta('Δοκίμασε ξανά', preparePdf, false, e.message || 'Δεν έγινε το PDF.');
  }
}

async function sendPdf(){
  const res = await shareFile(pdfFile, {title: `Προσφορά 0142 — ${clientName()}`, text: shareText()});
  if(res === 'shared') done('Στάλθηκε', `Η προσφορά έφυγε για ${clientName()}.`);
  else if(res === 'unsupported') openSheet();
  // 'cancelled': ο χρήστης έκλεισε το μενού — μένουμε στην προεπισκόπηση
}

function openSheet(){ $('veil').classList.add('on'); $('sheet').classList.add('on'); }
function closeSheet(){ $('veil').classList.remove('on'); $('sheet').classList.remove('on'); }
$('veil').onclick = () => { closeSheet(); closeKey(); };
document.querySelectorAll('[data-send]').forEach(b => b.onclick = () => {
  closeSheet();
  const how = b.dataset.send, text = encodeURIComponent(shareText());
  download(pdfFile);
  if(how === 'whatsapp') window.open(`https://wa.me/?text=${text}`, '_blank');
  if(how === 'viber') location.href = `viber://forward?text=${text}`;
  if(how === 'email') location.href = `mailto:?subject=${encodeURIComponent(pdfFile.name.replace(/\.pdf$/, ''))}&body=${text}`;
  done('Το PDF κατέβηκε', how === 'download'
    ? 'Βρίσκεται στις Λήψεις. Στείλε το στον πελάτη από όποια εφαρμογή θέλεις.'
    : 'Επισύναψε το PDF από τις Λήψεις στο μήνυμα που άνοιξε.');
});

function done(title, text){
  $('doneTitle').textContent = title;
  $('sentTo').textContent = text;
  const secs = Math.max(1, Math.round((Date.now()-started)/1000));
  $('elapsed').textContent = secs < 60 ? `${secs} δευτ.` : `${Math.floor(secs/60)}′ ${secs%60}″`;
  $('checked').textContent = checkedCount;
  show('s-done','Έτοιμο');
  cta(null);
}
$('resend').onclick = () => { if(pdfFile) sendPdf(); };
$('again').onclick = ()=> location.reload();
