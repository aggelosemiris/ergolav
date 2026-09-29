// Φωτογραφία σημειώσεων → κείμενο (Google Gemini ή Claude, ανάλογα με το key). Το key μένει μόνο σε αυτή τη συσκευή.

const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.129.0/+esm';
const KEY_STORE = 'ergolav.anthropicKey';

const PROMPT = `Αυτή είναι φωτογραφία με σημειώσεις τεχνίτη (υδραυλικός / ανακαινίσεις) για τα υλικά μιας δουλειάς — συχνά χειρόγραφες, στα ελληνικά.

Μετάγραψε τι γράφουν, μία γραμμή ανά υλικό, στη μορφή «ποσότητα μονάδα υλικό περιγραφή», π.χ.:
12 μέτρα σωλήνας πολυστρωματικός
1 τεμάχιο μπαταρία νιπτήρα
15 τετραγωνικά πλακάκι δαπέδου γκρι

- Ποσότητες με ψηφία. Μονάδες ολογράφως (μέτρα, τετραγωνικά, τεμάχια, σακιά).
- Κράτα κάθε χαρακτηριστικό που γράφει (χρώμα, διάσταση, «εντοιχισμού», «νιπτήρα» κ.λπ.).
- Αν στην αρχή γράφει τι δουλειά είναι (π.χ. «ανακαίνιση μπάνιου»), γράψ' το σε πρώτη γραμμή.
- Αγνόησε τιμές, τηλέφωνα, ονόματα και μουτζούρες.
- Αν μια λέξη δεν διαβάζεται, γράψε την πιο πιθανή ανάγνωση.
- Αν η φωτογραφία δεν έχει σημειώσεις υλικών, απάντησε μόνο: ΚΑΜΙΑ ΣΗΜΕΙΩΣΗ

Απάντησε μόνο με τις γραμμές, χωρίς τίποτα άλλο.`;

export const getKey = () => { try { return localStorage.getItem(KEY_STORE) || ''; } catch { return ''; } };
// Η επικόλληση στο κινητό φέρνει συχνά κενά, αλλαγές γραμμής ή αόρατους χαρακτήρες.
export const cleanKey = k => (k || '').replace(/[\s​-‍⁠﻿"'«»]/g, '');
export const setKey = k => { k = cleanKey(k); try { k ? localStorage.setItem(KEY_STORE, k) : localStorage.removeItem(KEY_STORE); } catch {} };

/** Μικραίνει τη φωτογραφία (μεγάλη πλευρά ≤ 1568px) και τη δίνει ως base64 JPEG. */
export async function shrink(file){
  const bmp = await createImageBitmap(file, {imageOrientation: 'from-image'}).catch(() => null);
  const img = bmp || await new Promise((ok, fail) => {
    const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = URL.createObjectURL(file);
  });
  const w = img.width, h = img.height, k = Math.min(1, 1568 / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const url = c.toDataURL('image/jpeg', 0.85);
  return {url, data: url.split(',')[1]};
}

let clientPromise = null;
async function client(apiKey){
  if(!clientPromise) clientPromise = import(SDK_URL).catch(e => { clientPromise = null; throw e; });
  const { default: Anthropic } = await clientPromise;
  return {Anthropic, api: new Anthropic({apiKey, dangerouslyAllowBrowser: true})};
}

const isGoogleKey = k => k.startsWith('AIza');

/** Επιστρέφει το κείμενο των σημειώσεων ή ρίχνει Error με ελληνικό μήνυμα. */
export async function readNotes(base64, apiKey = getKey()){
  if(!apiKey) throw new Error('NO_KEY');
  const text = isGoogleKey(apiKey) ? await readWithGemini(base64, apiKey) : await readWithClaude(base64, apiKey);
  if(!text || /ΚΑΜΙΑ ΣΗΜΕΙΩΣΗ/.test(text)) throw new Error('Δεν βρήκα σημειώσεις υλικών στη φωτογραφία.');
  return text;
}

// Google Gemini (δωρεάν επίπεδο με όρια — στο δωρεάν επίπεδο η Google μπορεί να κρατά τα δεδομένα για βελτίωση).
// Η Google αλλάζει συχνά ονόματα μοντέλων: αν κάποιο δεν υπάρχει (404), δοκιμάζουμε το επόμενο.
const GEMINI_MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];
const mask = k => `${k.slice(0, 6)}…${k.slice(-4)} (${k.length} χαρακτήρες)`;

async function readWithGemini(base64, apiKey){
  if(!/^AIza[0-9A-Za-z_-]{35}$/.test(apiKey)){
    setKey('');
    throw new Error(`Το key δεν έχει τη μορφή κλειδιού Google (AIza… με 39 χαρακτήρες). Έβαλες: ${mask(apiKey)}. ` +
      'Στο AI Studio πάτα το εικονίδιο αντιγραφής δίπλα στο key — όχι το κείμενο που φαίνεται με τις τελείες.');
  }
  let r, body;
  for(const model of GEMINI_MODELS){
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'x-goog-api-key': apiKey},
        body: JSON.stringify({contents: [{parts: [
          {inline_data: {mime_type: 'image/jpeg', data: base64}},
          {text: PROMPT},
        ]}]}),
      });
    } catch { throw new Error('Δεν υπάρχει σύνδεση στο internet.'); }
    body = await r.json().catch(() => ({}));
    if(r.status !== 404) break;
  }
  if(!r.ok){
    const err = body.error || {};
    const reason = err.details?.find(d => d.reason)?.reason || err.status || '';
    const google = err.message ? ` Η Google λέει: «${err.message}»` : '';
    if(reason === 'API_KEY_INVALID'){
      setKey('');
      throw new Error(`Η Google δεν αναγνωρίζει το key ${mask(apiKey)}. Φτιάξε/αντέγραψε νέο από το aistudio.google.com/apikey.`);
    }
    if(reason === 'SERVICE_DISABLED' || /has not been used|is disabled/i.test(err.message || ''))
      throw new Error('Το key είναι από project όπου δεν είναι ενεργό το Gemini API. Φτιάξε key από το aistudio.google.com/apikey.' + google);
    if(reason === 'API_KEY_HTTP_REFERRER_BLOCKED' || reason === 'API_KEY_SERVICE_BLOCKED' || r.status === 403)
      throw new Error('Το key έχει περιορισμούς (sites/APIs) που μπλοκάρουν αυτή τη σελίδα. Βγάλε τους περιορισμούς ή φτιάξε νέο key.' + google);
    if(r.status === 429) throw new Error('Έφτασες το δωρεάν όριο της Google. Δοκίμασε σε λίγο.' + google);
    if(/location is not supported/i.test(err.message || '')) throw new Error('Η Google δεν δίνει το δωρεάν Gemini API σε αυτή τη χώρα.' + google);
    throw new Error(`Η ανάγνωση απέτυχε (${r.status}).` + google);
  }
  const cand = body.candidates?.[0];
  if(!cand || cand.finishReason === 'SAFETY') throw new Error('Η φωτογραφία δεν μπόρεσε να διαβαστεί.');
  return (cand.content?.parts || []).map(p => p.text || '').join('\n').trim();
}

async function readWithClaude(base64, apiKey){
  let Anthropic, api;
  try { ({Anthropic, api} = await client(apiKey)); }
  catch { throw new Error('Δεν φόρτωσε η υπηρεσία ανάγνωσης. Έλεγξε τη σύνδεση.'); }

  let res;
  try {
    res = await api.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      output_config: {effort: 'low'},
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      messages: [{role: 'user', content: [
        {type: 'image', source: {type: 'base64', media_type: 'image/jpeg', data: base64}},
        {type: 'text', text: PROMPT},
      ]}],
    });
  } catch (e) {
    if(e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError){
      setKey('');
      throw new Error('Το API key δεν είναι σωστό. Βάλε το ξανά.');
    }
    if(e instanceof Anthropic.RateLimitError) throw new Error('Πολλά αιτήματα μαζί. Δοκίμασε σε λίγο.');
    if(e instanceof Anthropic.APIConnectionError) throw new Error('Δεν υπάρχει σύνδεση στο internet.');
    if(e instanceof Anthropic.APIError) throw new Error(`Η ανάγνωση απέτυχε (${e.status ?? 'σφάλμα'}).`);
    throw new Error('Η ανάγνωση απέτυχε.');
  }

  if(res.stop_reason === 'refusal') throw new Error('Η φωτογραφία δεν μπόρεσε να διαβαστεί.');
  return res.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}
