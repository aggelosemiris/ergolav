import { parse } from './parse.js';
import { createMic, micSupported } from './mic.js';
import { readNotes, shrink, getKey, setKey } from './photo.js';

const SAMPLE = 'Ανακαίνιση μπάνιου. Δώδεκα μέτρα σωλήνα πολυστρωματικό, μια μπαταρία νιπτήρα, λεκάνη κρεμαστή με καζανάκι εντοιχισμού, και δώδεκα τετραγωνικά πλακάκι τοίχου.';
const BARS = 18;

let LINES = [], TITLE = 'εργασίες';
const eur = c => (c/100).toLocaleString('el-GR',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtQty = q => q.toLocaleString('el-GR', {maximumFractionDigits:2});
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
  try {
    pendingPhoto = await shrink(file);
  } catch {
    review('', 'Δεν μπόρεσα να ανοίξω τη φωτογραφία.');
    return;
  }
  readPhoto(pendingPhoto);
};

async function readPhoto(img){
  show('s-listen','Διαβάζω');
  notice(''); wave.hidden = true; $('listenAlt').hidden = true; $('chips').replaceChildren();
  shot.src = img.url; shot.hidden = false; shot.classList.add('reading');
  transcript.contentEditable = 'false';
  transcript.innerHTML = '<span class="caret"></span>';
  cta('Διαβάζω…', null, true);
  $('listenLabel').textContent = 'Διαβάζω τις σημειώσεις σου…';
  try {
    const text = await readNotes(img.data);
    pendingPhoto = null;
    shot.classList.remove('reading');
    review(text);
    buildLines(text);
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

function openKey(msg){
  $('keyError').hidden = !msg; $('keyError').textContent = msg || '';
  $('keyInput').value = '';
  $('veil').classList.add('on'); $('keySheet').classList.add('on');
  setTimeout(() => $('keyInput').focus(), 250);
}
function closeKey(){ $('veil').classList.remove('on'); $('keySheet').classList.remove('on'); }
$('keyCancel').onclick = closeKey;
$('keySave').onclick = () => {
  const k = $('keyInput').value.trim();
  if(!k) return;
  setKey(k); closeKey();
  // Αν μια φωτογραφία περίμενε το κλειδί, τη διαβάζουμε τώρα· αλλιώς ανοίγει η κάμερα.
  if(pendingPhoto) readPhoto(pendingPhoto);
  else $('photoInput').click();
};

// ─── 3 : γραμμές ─────────────────────────────────────────────
function lineTotal(l){ return Math.round(l.qty*(l.mat+l.lab)); }
function unresolved(){ return LINES.filter(l=>l.flag || l.suggest || l.unknown).length; }

function buildLines(text){
  const r = parse(text);
  if(!r.lines.some(l => !l.unknown)){
    notice('Δεν βρήκα υλικά από τον κατάλογο. Πες ή γράψε π.χ. «δέκα μέτρα σωλήνα».');
    return;
  }
  LINES = r.lines; TITLE = r.title || 'εργασίες';
  show('s-lines','Έλεγχος');
  renderLines();
}
function renderLines(){
  const box = $('lines'); box.innerHTML = '';
  LINES.forEach((l,i)=>{
    const el = document.createElement('div');
    el.className = 'ln' + ((l.flag||l.suggest||l.unknown)?' flag':'');
    el.style.animationDelay = (i*0.07)+'s';
    if(l.unknown){
      el.innerHTML = `
        <div class="ln-top"><span class="ln-name">«${esc(l.name)}»</span></div>
        <div class="ask">Δεν το βρήκα στον κατάλογο. Θα το προσθέσεις με το χέρι αργότερα.</div>
        <div class="sug-act"><button data-a="drop">Εντάξει, βγάλ' το</button></div>`;
      el.querySelector('[data-a="drop"]').onclick=()=>{ LINES = LINES.filter(x=>x!==l); checkedCount++; renderLines(); };
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
        <div class="ln-top"><span class="ln-name">${fmtQty(l.qty)} ${esc(l.unit)} ${esc(l.name)}</span><span class="ln-sum num">${eur(lineTotal(l))}</span></div>
        <div class="ask">Δεν το είπες, αλλά χρειάζεται για τα πλακάκια. Το κρατάς;</div>
        <div class="sug-act"><button data-a="keep">Ναι, πρόσθεσέ το</button><button data-a="drop">Όχι</button></div>`;
      el.querySelector('[data-a="keep"]').onclick=()=>{ l.suggest=false; checkedCount++; renderLines(); };
      el.querySelector('[data-a="drop"]').onclick=()=>{ LINES = LINES.filter(x=>x!==l); checkedCount++; renderLines(); };
    } else {
      el.innerHTML = `
        <div class="ln-top"><span class="ln-name">${esc(l.name)}</span><span class="ln-sum num">${eur(lineTotal(l))}</span></div>
        <div class="ln-meta">${esc(l.code)}</div>
        <div class="ln-row">
          <div class="qty"><button aria-label="Λιγότερα" data-d="-1">−</button><span class="num">${fmtQty(l.qty)} ${esc(l.unit)}</span><button aria-label="Περισσότερα" data-d="1">+</button></div>
          <div class="split num">υλικό ${eur(l.mat)}<br>εργασία ${eur(l.lab)}</div>
        </div>`;
      el.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{
        l.qty = Math.max(0, Math.round((l.qty + (+b.dataset.d))*100)/100);
        renderLines();
      });
    }
    box.appendChild(el);
  });
  renderTotals();
  const left = unresolved();
  cta('Έλεγξα, φτιάξε την προσφορά', buildPdf, left>0,
      left>0 ? (left===1 ? 'Μένει 1 γραμμή να ελέγξεις' : `Μένουν ${left} γραμμές να ελέγξεις`) : '');
}
function sums(){
  const ok = LINES.filter(l=>!l.flag && !l.suggest && !l.unknown);
  const mat = ok.reduce((s,l)=>s+Math.round(l.qty*l.mat),0);
  const lab = ok.reduce((s,l)=>s+Math.round(l.qty*l.lab),0);
  const net = mat+lab, vat = Math.round(net*0.24);
  return {mat,lab,net,vat,total:net+vat};
}
function renderTotals(){
  const s = sums();
  $('totals').innerHTML = `
    <div class="t"><span>Υλικά</span><span class="num">${eur(s.mat)}</span></div>
    <div class="t"><span>Εργασία</span><span class="num">${eur(s.lab)}</span></div>
    <div class="t"><span>ΦΠΑ 24%</span><span class="num">${eur(s.vat)}</span></div>
    <div class="t big"><span>Σύνολο</span><span class="num">${eur(s.total)}</span></div>`;
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
      <tr><th>Περιγραφή</th><th>Ποσ.</th><th>Ποσό</th></tr>
      ${LINES.filter(l=>l.qty>0 && !l.unknown).map(l=>`<tr><td>${esc(l.name)}</td><td class="num">${fmtQty(l.qty)} ${esc(l.unit)}</td><td class="num">${eur(lineTotal(l))}</td></tr>`).join('')}
    </table>
    <div class="sum num">
      <div><span>Καθαρή αξία</span><span>${eur(s.net)}</span></div>
      <div><span>ΦΠΑ 24%</span><span>${eur(s.vat)}</span></div>
      <div class="g"><span>Σύνολο</span><span>${eur(s.total)}</span></div>
    </div>
    <p class="foot">Η προσφορά ισχύει για 15 ημέρες. Περιλαμβάνει υλικά και εργασία τοποθέτησης.</p>`;
  cta('Στείλε στον πελάτη', openSheet);
}

// ─── 5 : αποστολή ────────────────────────────────────────────
function openSheet(){ $('veil').classList.add('on'); $('sheet').classList.add('on'); }
function closeSheet(){ $('veil').classList.remove('on'); $('sheet').classList.remove('on'); }
$('veil').onclick = () => { closeSheet(); closeKey(); };
document.querySelectorAll('.app').forEach(b=>b.onclick=()=>{
  closeSheet();
  const client = ($('client').value || 'Πελάτης').split(',')[0];
  $('sentTo').textContent = `Η προσφορά έφυγε στον ${client} από το ${b.dataset.app} σου.`;
  const secs = Math.max(1, Math.round((Date.now()-started)/1000));
  $('elapsed').textContent = secs < 60 ? `${secs} δευτ.` : `${Math.floor(secs/60)}′ ${secs%60}″`;
  $('checked').textContent = checkedCount;
  show('s-done','Έτοιμο');
  cta(null);
});
$('again').onclick = ()=> location.reload();
