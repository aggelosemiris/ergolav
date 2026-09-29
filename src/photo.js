// Φωτογραφία σημειώσεων → κείμενο με το Claude (vision). Το API key μένει μόνο σε αυτή τη συσκευή.

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
export const setKey = k => { try { k ? localStorage.setItem(KEY_STORE, k) : localStorage.removeItem(KEY_STORE); } catch {} };

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

/** Επιστρέφει το κείμενο των σημειώσεων ή ρίχνει Error με ελληνικό μήνυμα. */
export async function readNotes(base64, apiKey = getKey()){
  if(!apiKey) throw new Error('NO_KEY');
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
  const text = res.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  if(!text || /ΚΑΜΙΑ ΣΗΜΕΙΩΣΗ/.test(text)) throw new Error('Δεν βρήκα σημειώσεις υλικών στη φωτογραφία.');
  return text;
}
