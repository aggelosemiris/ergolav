// Μετατρέπει ελεύθερη ομιλία («δώδεκα μέτρα σωλήνα και μια λεκάνη…») ή σημειώσεις σε γραμμές προσφοράς.
import { CATALOG, TITLE_WORDS } from './catalog.js';

export const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ς/g, 'σ');
// Φωνητική μορφή: ανοχή στα συνηθισμένα ορθογραφικά (σολήνας/σωλήνας, λεκανι/λεκάνη, κολα/κόλλα).
export const phon = t => t.replace(/ει|οι/g, 'ι').replace(/αι/g, 'ε').replace(/[ηυ]/g, 'ι').replace(/ω/g, 'ο');

// Greeklish → ελληνικά («dwdeka metra swlina» → «δωδεκα μετρα σωλινα»).
const GL = [['th','θ'],['ch','χ'],['ps','ψ'],['ks','ξ'],['ou','ου'],['mp','μπ'],['a','α'],['b','μπ'],['c','κ'],['d','δ'],['e','ε'],
  ['f','φ'],['g','γ'],['h','η'],['i','ι'],['j','τζ'],['k','κ'],['l','λ'],['m','μ'],['n','ν'],['o','ο'],['p','π'],['q','κ'],['r','ρ'],
  ['s','σ'],['t','τ'],['u','ου'],['v','β'],['w','ω'],['x','χ'],['y','υ'],['z','ζ']];
const isLatin = t => /^[a-z]+$/.test(t);
const g = t => isLatin(t) ? greek(t) : t;          // greeklish token → ελληνικά (τα αγγλικά keywords ελέγχονται πρώτα)
function greek(t){
  let o = '';
  for(let i = 0; i < t.length;){ const p = GL.find(([l]) => t.startsWith(l, i)); if(p){ o += p[1]; i += p[0].length; } else o += t[i++]; }
  return o;
}

const UNITS = {ενα:1,ενασ:1,μια:1,μιασ:1,δυο:2,τρια:3,τρεισ:3,τεσσερα:4,τεσσερισ:4,πεντε:5,εξι:6,
  επτα:7,εφτα:7,οκτω:8,οχτω:8,εννεα:9,εννια:9};
const TEENS = {δεκα:10,εντεκα:11,ενδεκα:11,δωδεκα:12,δεκατρια:13,δεκατρεισ:13,δεκατεσσερα:14,δεκατεσσερισ:14,
  δεκαπεντε:15,δεκαεξι:16,δεκαεξη:16,δεκαεπτα:17,δεκαεφτα:17,δεκαοκτω:18,δεκαοχτω:18,δεκαεννεα:19,δεκαεννια:19};
const TENS = {εικοσι:20,τριαντα:30,σαραντα:40,πενηντα:50,εξηντα:60,εβδομηντα:70,ογδοντα:80,ενενηντα:90};
const HUNDREDS = {εκατο:100,εκατον:100,διακοσια:200,διακοσιεσ:200,διακοσιοι:200,τριακοσια:300,τριακοσιεσ:300,τετρακοσια:400,
  πεντακοσια:500,εξακοσια:600,επτακοσια:700,εφτακοσια:700,οκτακοσια:800,οχτακοσια:800,εννιακοσια:900,εννεακοσια:900,χιλια:1000,χιλιεσ:1000};
const FRAC = {μισο:0.5,μιση:0.5,μισα:0.5,μιαμιση:1.5};
const EN_NUM = {one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,fifteen:15,twenty:20,thirty:30,fifty:50,hundred:100};

// Σπάει σε φράσεις: στίξη (όχι μέσα σε δεκαδικούς) και συνδετικά που η ομιλία συχνά βγάζει χωρίς στίξη.
const SPLIT = /[.,;!?·](?=\s|$)|\n|\s(?:και|επισησ|επειτα|μετα|ακομα|ακομη|συν|and|also)\s/;

// Άρνηση πριν από υλικό («δεν χρειάζεται θερμοσίφωνας», «εκτός από την μπανιέρα»).
const NEG = new Set(['δεν','χωρισ','εκτοσ','οχι','μην','μη','without','no']);
// Διόρθωση («όχι, συγγνώμη, 15 μέτρα»): η επόμενη αναφορά στο ίδιο υλικό ΑΝΤΙΚΑΘΙΣΤΑ την ποσότητα.
const CORR = new Set(['οχι','συγγνωμη','συγνωμη','λαθοσ','τελικα','διορθωση','ενοω','δηλαδη']);
// Λέξεις γεμίσματος — μια φράση μόνο από αυτές δεν είναι υλικό.
const FILLER = new Set(['λοιπον','εεε','εε','εμ','οκ','οκει','ναι','καλα','και','ρε','που','λεμε','ας','πουμε','τελοσ','παντων','αυτα','αυτο','ετσι']);

function numberWord(t){
  if(UNITS[t] ?? TEENS[t] ?? TENS[t] ?? HUNDREDS[t] ?? FRAC[t] ?? EN_NUM[t]) return UNITS[t] ?? TEENS[t] ?? TENS[t] ?? HUNDREDS[t] ?? FRAC[t] ?? EN_NUM[t];
  // «δυόμισι», «τρεισήμισι», «εναμισι» → +0.5
  const m = t.match(/^(.+?)η?μισ[ιηυ]$/);
  if(m){ const base = UNITS[m[1]] ?? TEENS[m[1]]; if(base) return base + 0.5; }
  return null;
}

/** Αριθμός από token· null για ό,τι δεν είναι ποσότητα (τιμές €, ώρες, τηλέφωνα). */
function toNumber(tok, next = ''){
  if(/[€%:]/.test(tok) || /^(€|ευρω|eur|%)/.test(next)) return null;            // τιμή / ποσοστό / ώρα
  const d = tok.match(/^(\d+(?:[.,]\d+)?)/);
  if(d){
    if(d[1].replace(/\D/g, '').length >= 5) return null;                         // τηλέφωνο, κωδικός
    return parseFloat(d[1].replace(',', '.'));
  }
  return numberWord(tok) ?? (isLatin(tok) ? numberWord(greek(tok)) : null);
}
const isWordNumber = t => !/\d/.test(t) && numberWord(t) != null;

// Keywords σε φωνητική μορφή (υπολογίζονται μία φορά).
const PH = new Map(CATALOG.map(c => [c, {
  kw: c.keywords.map(phon), not: (c.notWords || []).map(phon), after: (c.notAfter || []).map(phon), before: (c.notBefore || []).map(phon),
}]));

function findItem(tokens, i){
  const tok = phon(g(tokens[i])), prev = phon(g(tokens[i-1] || '')), next = [tokens[i+1], tokens[i+2]].filter(Boolean).map(t => phon(g(t)));
  const en = isLatin(tokens[i]) ? tokens[i] : null;
  return CATALOG.find(c => {
    const p = PH.get(c);
    const hit = (en && c.en?.includes(en)) || p.kw.some(k => tok.startsWith(k));
    return hit && !p.not.some(w => tok.startsWith(w)) && !p.after.some(k => prev.startsWith(k)) &&
      !p.before.some(k => next.some(n => n.startsWith(k)));
  });
}

const hasAny = (tokens, kws) => tokens.some(t => kws.some(k => t.startsWith(k) || phon(g(t)).startsWith(phon(k))));

// Λογικά όρια ποσότητας ανά μονάδα· πάνω από αυτά η γραμμή ζητάει επιβεβαίωση.
const QTY_LIMIT = {'τεμ.':30, 'μ.':300, 'τ.μ.':200, 'σακί':60, 'κάδος':10, 'κατ.':3, 'kg':500, 'λ.':500};
// Μονάδες όπου η ποσότητα δεν «εννοείται» 1 — αν δεν ειπώθηκε, τη ζητάμε.
const MEASURED = new Set(['μ.', 'τ.μ.', 'σακί', 'kg', 'λ.', 'κάδος']);

function checkQty(line){
  line.qtyCheck = line.qty > (QTY_LIMIT[line.unit] ?? 100);
  return line;
}

function makeLine(item, qty, tokens, qtyMissing){
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
  if(qtyMissing && MEASURED.has(line.unit)) line.qtyMissing = true;
  return checkQty(line);
}

// Συντομογραφίες σημειώσεων («12 μ.», «τ.μ.», «τεμ.») — η τελεία τους δεν κλείνει φράση.
const ABBR = /(^|[\s\d])(τ\.\s?μ|τμ|μ|τεμ|τεμαχ|μετ|κιλ|λιτ|σακ|κουτ)\./gi;

// Μονάδες που μπορεί να ακολουθούν την ποσότητα (κανονικοποιημένες ρίζες → εμφάνιση).
const UNIT_WORDS = [[/^(μ|μετρ|μετ|m|meters?|metres?)$|^μετρ/, 'μ.'], [/^(τμ|τετραγων|sqm|m2)/, 'τ.μ.'], [/^(τεμ|pcs|pieces?)/, 'τεμ.'], [/^σακ/, 'σακί'],
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
  return checkQty({id:'unknown', name: rest ? rest[0].toUpperCase() + rest.slice(1) : seg, unit, qty: qty ?? 1, mat:0, lab:0, unknown:true});
}

// ── Καθάρισμα εξόδου LLM / σημειώσεων πριν την ανάλυση ──
const HEADER_WORDS = new Set(['υλικο','υλικα','ποσοτητα','ποσοτ','μοναδα','περιγραφη','τιμη','κωδικοσ','ποσο','αα','item','items','qty','quantity','description','unit','price']);
const PREAMBLE = /(οριστε|ακολουθ|παρακατω|διαβασα|μεταγραφ|σημειωσεισ που|here (are|is)|following|below)/;

function cleanText(text){
  return text.split('\n').map(line => {
    if(/^\s*\|?\s*:?-{2,}/.test(line)) return '';                                // γραμμή διαχωρισμού markdown πίνακα
    line = line.replace(/\|/g, ' ').replace(/[*_#`]+/g, ' ')                       // κελιά πίνακα, **έντονα**, # τίτλοι
               .replace(/^[ \t]*(?:\d{1,2}[.)]|[-•–·])[ \t]+/, '');                 // αρίθμηση/κουκκίδες λίστας
    const n = norm(line).trim();
    if(/^καμια σημειωση\.?$/.test(n)) return '';
    const words = n.split(/\s+/).filter(Boolean);
    if(words.length && words.every(w => HEADER_WORDS.has(w.replace(/[^\p{L}]/gu, '')))) return '';   // επικεφαλίδα πίνακα
    if(/:\s*$/.test(n) && !/\d/.test(n) && PREAMBLE.test(n)) return '';           // «Ορίστε οι σημειώσεις:»
    return line;
  }).join('\n').replace(ABBR, (_, pre, ab) => pre + ab.replace(/[.\s]/g, '') + ' ');
}

/** Σακιά κόλλας 25 kg για τόσα τ.μ. πλακάκι (≈5 kg/τ.μ. + 10%). */
export const glueSacks = tileSqm => Math.max(1, Math.ceil(tileSqm * 5 * 1.1 / 25));

export function parse(text){
  text = cleanText(text);
  const lines = [], unknown = [];
  let title = '', correcting = false;
  for(const rawSeg of text.split(SPLIT)){
    const seg = rawSeg.trim();
    if(!seg) continue;
    const tokens = norm(seg).split(/[\s\-–—/]+/).map(t => t.replace(/[«»"'()]/g, '')).filter(Boolean);
    let pending = null, pendingAt = -1, found = 0, lastNum = -2;
    const used = new Set(), seen = new Set();
    if(tokens.some(t => CORR.has(t))) correcting = true;
    for(let i = 0; i < tokens.length; i++){
      if(used.has(i)) continue;
      const n = toNumber(tokens[i], tokens[i + 1]);
      if(n != null){
        // Σύνθετοι αριθμοί μόνο από διαδοχικές λέξεις: «εκατόν είκοσι πέντε» → 125 (όχι «12 5»).
        const joinable = lastNum === i - 1 && isWordNumber(tokens[i]) && isWordNumber(tokens[i - 1]) && pending != null;
        if(joinable && pending % 100 === 0 && n < 100) pending += n;
        else if(joinable && pending >= 20 && pending % 10 === 0 && n < 10) pending += n;
        else { pending = n; pendingAt = i; }
        lastNum = i;
        continue;
      }
      const item = findItem(tokens, i);
      if(!item) continue;
      // Άρνηση λίγο πριν το υλικό, χωρίς αριθμό ανάμεσα → το υλικό ΔΕΝ μπαίνει (και βγαίνει αν είχε μπει).
      const negated = pending == null && tokens.slice(Math.max(0, i - 3), i).some(t => NEG.has(t));
      if(negated){
        found++;
        for(let k = lines.length - 1; k >= 0; k--) if(lines[k].id === item.id) lines.splice(k, 1);
        continue;
      }
      // Δεύτερη λέξη για το ίδιο υλικό στην ίδια φράση («2 κάδοι μπάζα») — όχι νέα γραμμή.
      if(pending == null && seen.has(item.id)) continue;
      seen.add(item.id);
      found++;
      // Ποσότητα μετά το υλικό («σωλήνας 12 μέτρα»): ψάχνουμε μέχρι το επόμενο υλικό.
      if(pending == null){
        for(let j = i + 1; j < tokens.length && !findItem(tokens, j); j++){
          const m = toNumber(tokens[j], tokens[j + 1]);
          if(m != null){ pending = m; used.add(j); break; }
        }
      }
      const qtyMissing = pending == null;
      const qty = pending ?? 1;
      pending = null;
      const line = makeLine(item, qty, tokens, qtyMissing);
      const same = lines.find(l => l.id === line.id && (l.name === line.name || correcting) && !l.flag && !line.flag);
      if(same && correcting){
        // Διόρθωση: η νέα αναφορά αντικαθιστά την παλιά (ποσότητα και τύπο).
        Object.assign(same, {...line, qtyMissing: line.qtyMissing});
        correcting = false;
      } else if(same){
        same.qty += qty;
        if(!qtyMissing) same.qtyMissing = false;
        checkQty(same);
      } else {
        lines.push(line);
        if(correcting) correcting = false;
      }
    }
    if(found) continue;
    if(tokens.every(t => FILLER.has(t) || CORR.has(t) || NEG.has(t))) continue;   // «όχι, συγγνώμη», «λοιπόν»
    const onlyQty = tokens.every(t => toNumber(t) != null || unitOf(t));
    if(!title && pending == null && hasAny(tokens, TITLE_WORDS)) title = seg.replace(/[.,;:!?]+$/, '');
    else if(!onlyQty && (tokens.length >= 2 || pending != null || tokens[0].length >= 4)) unknown.push(seg);
  }

  // Κόλλα για τα πλακάκια, αν δεν ειπώθηκε.
  const tiles = lines.filter(l => l.id === 'tile').reduce((s, l) => s + l.qty, 0);
  if(tiles > 0 && !lines.some(l => l.id === 'glue')){
    const glue = CATALOG.find(c => c.id === 'glue');
    lines.push({...makeLine(glue, glueSacks(tiles), []), suggest:true});
  }
  for(const u of unknown) lines.push(unknownLine(u));

  return {title: title ? title[0].toLowerCase() + title.slice(1) : '', lines};
}
