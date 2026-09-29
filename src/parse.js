// Μετατρέπει ελεύθερη ομιλία («δώδεκα μέτρα σωλήνα και μια λεκάνη…») σε γραμμές προσφοράς.
import { CATALOG, TITLE_WORDS } from './catalog.js';

export const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ς/g, 'σ');

const UNITS = {ενα:1,ενασ:1,μια:1,μιασ:1,δυο:2,τρια:3,τρεισ:3,τεσσερα:4,τεσσερισ:4,πεντε:5,εξι:6,
  επτα:7,εφτα:7,οκτω:8,οχτω:8,εννεα:9,εννια:9};
const TEENS = {δεκα:10,εντεκα:11,ενδεκα:11,δωδεκα:12,δεκατρια:13,δεκατρεισ:13,δεκατεσσερα:14,δεκατεσσερισ:14,
  δεκαπεντε:15,δεκαεξι:16,δεκαεξη:16,δεκαεπτα:17,δεκαεφτα:17,δεκαοκτω:18,δεκαοχτω:18,δεκαεννεα:19,δεκαεννια:19};
const TENS = {εικοσι:20,τριαντα:30,σαραντα:40,πενηντα:50,εξηντα:60,εβδομηντα:70,ογδοντα:80,ενενηντα:90};
const FRAC = {μισο:0.5,μιση:0.5,μισα:0.5,εναμιση:1.5,εναμισι:1.5,μιαμιση:1.5};

// Σπάει σε φράσεις: στίξη (όχι μέσα σε δεκαδικούς) και συνδετικά που η ομιλία συχνά βγάζει χωρίς στίξη.
const SPLIT = /[.,;!?·](?=\s|$)|\n|\s(?:και|επισησ|επειτα|μετα|ακομα|ακομη|συν)\s/;

function toNumber(tok){
  const d = tok.match(/^(\d+(?:[.,]\d+)?)/);
  if(d) return parseFloat(d[1].replace(',', '.'));
  return UNITS[tok] ?? TEENS[tok] ?? TENS[tok] ?? FRAC[tok] ?? (tok === 'εκατο' ? 100 : null);
}

function findItem(tokens, i){
  const tok = tokens[i], prev = tokens[i-1] || '';
  return CATALOG.find(c =>
    c.keywords.some(k => tok.startsWith(k)) &&
    !(c.notAfter || []).some(k => prev.startsWith(k)));
}

const hasAny = (tokens, kws) => tokens.some(t => kws.some(k => t.startsWith(k)));

function makeLine(item, qty, tokens){
  const line = {id:item.id, name:item.name, code:item.code || '', unit:item.unit, qty,
                mat:item.mat || 0, lab:item.lab || 0};
  const q = (item.qualifiers || []).find(q => hasAny(tokens, q.kw));
  if(q) line.name = q.name;
  if(item.options){
    // Αν δεν ειπώθηκε τύπος και το υλικό έχει συνηθισμένη επιλογή (def), την παίρνουμε χωρίς ερώτηση.
    const picked = item.options.find(o => hasAny(tokens, o.kw)) ?? item.options[item.def];
    const base = line.name;
    line.pick = o => ({name:`${base} ${o.label}`, code:o.code, mat:o.mat, lab:o.lab ?? item.lab ?? 0});
    if(picked){ Object.assign(line, line.pick(picked)); }
    else { line.flag = true; line.options = item.options; }
  }
  return line;
}

// Συντομογραφίες σημειώσεων («12 μ.», «τ.μ.», «τεμ.») — η τελεία τους δεν κλείνει φράση.
const ABBR = /(^|[\s\d])(τ\.\s?μ|τμ|μ|τεμ|τεμαχ|μετ|κιλ|λιτ|σακ|κουτ)\./gi;

// Μονάδες που μπορεί να ακολουθούν την ποσότητα (κανονικοποιημένες ρίζες → εμφάνιση).
const UNIT_WORDS = [[/^(μ|μετρ|μετ)/, 'μ.'], [/^(τμ|τετραγων)/, 'τ.μ.'], [/^τεμ/, 'τεμ.'], [/^σακ/, 'σακί'],
  [/^(κιλ|kg)/, 'kg'], [/^λιτ/, 'λ.'], [/^κουτ/, 'κουτί'], [/^(ζευγ|ζευγαρ)/, 'ζεύγος']];
const unitOf = tok => UNIT_WORDS.find(([re]) => re.test(tok))?.[1];
const wordTok = w => norm(w).replace(/[«»"'().,;:!?]/g, '');

// Υλικό εκτός καταλόγου: κρατάμε ποσότητα/μονάδα και ό,τι απομένει ως περιγραφή.
function unknownLine(seg){
  let qty = null, unit = '';
  const rest = seg.split(/\s+/).filter(w => {
    const t = wordTok(w);
    const n = toNumber(t);
    if(n != null && qty == null){ qty = n; return false; }
    const u = t.length <= 12 && unitOf(t);
    if(u && !unit && qty != null){ unit = u; return false; }
    return true;
  }).join(' ').replace(/^[\s,.:-]+|[\s,.:;-]+$/g, '');
  return {id:'unknown', name: rest ? rest[0].toUpperCase() + rest.slice(1) : seg, unit, qty: qty ?? 1, mat:0, lab:0, unknown:true};
}

export function parse(text){
  text = text
    .replace(/[*_#`]+/g, ' ')                          // markdown (**έντονα**, # τίτλοι)
    .replace(/^[ \t]*(?:\d{1,2}[.)]|[-•–·])[ \t]+/gm, '') // αρίθμηση/κουκκίδες λίστας
    .replace(ABBR, (_, pre, ab) => pre + ab.replace(/[.\s]/g, '') + ' ');
  const lines = [], unknown = [];
  let title = '';
  for(const raw of text.split(SPLIT)){
    const seg = raw.trim();
    if(!seg) continue;
    const tokens = norm(seg).split(/[\s\-–—/]+/).map(t => t.replace(/[«»"'()]/g, '')).filter(Boolean);
    let pending = null, found = 0;
    const used = new Set(), seen = new Set();
    for(let i = 0; i < tokens.length; i++){
      if(used.has(i)) continue;
      const n = toNumber(tokens[i]);
      if(n != null){
        // «είκοσι πέντε» → 25
        pending = (pending != null && pending >= 20 && pending % 10 === 0 && n < 10) ? pending + n : n;
        continue;
      }
      const item = findItem(tokens, i);
      if(!item) continue;
      // Δεύτερη λέξη για το ίδιο υλικό στην ίδια φράση («2 κάδοι μπάζα») — όχι νέα γραμμή.
      if(pending == null && seen.has(item.id)) continue;
      seen.add(item.id);
      found++;
      // Ποσότητα μετά το υλικό («σωλήνας 12 μέτρα»): ψάχνουμε μέχρι το επόμενο υλικό.
      if(pending == null){
        for(let j = i + 1; j < tokens.length && !findItem(tokens, j); j++){
          const m = toNumber(tokens[j]);
          if(m != null){ pending = m; used.add(j); break; }
        }
      }
      const qty = pending ?? 1;
      pending = null;
      const line = makeLine(item, qty, tokens);
      const same = lines.find(l => l.id === line.id && l.name === line.name && !l.flag && !line.flag);
      if(same) same.qty += qty; else lines.push(line);
    }
    if(found) continue;
    const onlyQty = tokens.every(t => toNumber(t) != null || unitOf(t));
    if(!title && pending == null && hasAny(tokens, TITLE_WORDS)) title = seg.replace(/[.,;:!?]+$/, '');
    else if(!onlyQty && (tokens.length >= 2 || pending != null || tokens[0].length >= 4)) unknown.push(seg);
  }

  // Κόλλα για τα πλακάκια, αν δεν ειπώθηκε (≈5 kg/τ.μ. + 10%).
  const tiles = lines.filter(l => l.id === 'tile').reduce((s, l) => s + l.qty, 0);
  if(tiles > 0 && !lines.some(l => l.id === 'glue')){
    const glue = CATALOG.find(c => c.id === 'glue');
    lines.push({...makeLine(glue, Math.max(1, Math.ceil(tiles * 5 * 1.1 / 25)), []), suggest:true});
  }
  for(const u of unknown) lines.push(unknownLine(u));

  return {title: title ? title[0].toLowerCase() + title.slice(1) : '', lines};
}
