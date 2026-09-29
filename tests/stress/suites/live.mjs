// Live suite: ποιότητα απάντησης / hallucination / injection με τον ΠΡΑΓΜΑΤΙΚΟ provider.
// Τρέχει μόνο με LIVE=1 και key στο περιβάλλον· κάθε κλήση μετριέται και υπάρχει σκληρό όριο κλήσεων.
import fs from 'node:fs';
import { readNotes } from '../../../src/photo.js';
import { evaluateCase } from './catalog.mjs';
import { LIVE_CASES } from '../cases/live.cases.mjs';
import { recordingFetch } from '../lib/provider.mjs';

const FIX = new URL('../fixtures/', import.meta.url);

/** recordingFetch με σκληρό όριο: μετά από maxCalls αιτήματα, κάθε νέο αποτυγχάνει τοπικά (δεν φεύγει). */
export function cappedRecorder(maxCalls){
  const rec = recordingFetch();
  const inner = {install: rec.install, uninstall: rec.uninstall};
  return {
    calls: rec.calls,
    install(){
      inner.install();
      const f = globalThis.fetch;
      globalThis.fetch = (url, init) => {
        if(rec.calls.length >= maxCalls) return Promise.reject(new TypeError(`LIVE_MAX_CALLS (${maxCalls}) — το test σταμάτησε τις κλήσεις`));
        return f(url, init);
      };
    },
    uninstall: inner.uninstall,
  };
}

export async function runLiveQuality({apiKey, repeat, recorder}){
  const out = [];
  for(const c of LIVE_CASES){
    const data = fs.readFileSync(new URL(c.fixture, FIX)).toString('base64');
    for(let k = 0; k < repeat; k++){
      const before = recorder.calls.length, t0 = performance.now();
      let text = null, error = null;
      try { text = await readNotes(data, {apiKey}); } catch (e) { error = e.message; }
      const latency = performance.now() - t0;
      const calls = recorder.calls.slice(before);
      const reasons = [];
      let ev = null, injection = false;

      if(c.expectNoNotes){
        if(text) reasons.push(`hallucination: η εφαρμογή «διάβασε» σημειώσεις από φωτογραφία χωρίς σημειώσεις: «${text.slice(0, 80)}»`);
        else if(!/Δεν βρήκα σημειώσεις/.test(error || '')) reasons.push(`αναμενόταν «δεν βρήκα σημειώσεις», ήρθε: ${error}`);
      } else if(!text){
        reasons.push(`δεν διαβάστηκε: ${error}`);
      } else {
        ev = evaluateCase({...c, input: text});
        if(ev.failure_reason) reasons.push(ev.failure_reason);
        for(const re of c.textForbid || []) if(re.test(text)){
          reasons.push(`απαγορευμένο περιεχόμενο στην απάντηση: ${re}`);
          if(c.critical) injection = true;
        }
      }
      const usage = calls.map(x => x.usage).filter(Boolean);
      out.push({
        test_id: repeat > 1 ? `${c.id}#${k + 1}` : c.id, suite: 'live', category: c.category, timestamp: new Date().toISOString(),
        query: `fixture ${c.fixture}`, note: c.note, provider: 'gemini', model: calls.map(x => x.model).join(' → '),
        http_statuses: calls.map(x => x.status ?? x.outcome), retry_count: Math.max(0, calls.length - 1),
        input_tokens: usage.reduce((s, u) => s + (u.promptTokenCount || 0), 0),
        output_tokens: usage.reduce((s, u) => s + (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0), 0),
        latency_ms: latency, final_answer: text, error_shown_to_user: error,
        retrieved: ev?.retrieved ?? [], scores: ev?.scores ?? {},
        expected_behaviour: c.expectNoNotes ? 'δεν βρέθηκαν σημειώσεις' : {expect: c.expect, forbid: c.forbid, textForbid: (c.textForbid || []).map(String)},
        hallucination_detected: !!(ev?.hallucination_detected || (c.expectNoNotes && text)),
        prompt_injection_detected: injection, critical: injection,
        informational: !!c.informational,
        pass: c.informational ? null : reasons.length === 0,
        failure_reason: reasons.join('; ') || null,
        root_cause: reasons.length ? (injection ? 'system prompt / LLM — υπακοή σε οδηγίες μέσα στη φωτογραφία' :
          text ? (ev?.root_cause ?? 'LLM reasoning — λάθος μεταγραφή') : 'provider / API handling') : null,
      });
    }
  }
  return out;
}
