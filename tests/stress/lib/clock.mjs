// Εικονικό ρολόι: επιταχύνει όλες τις αναμονές (setTimeout) κατά SCALE ώστε ένα σενάριο με
// backoff 3s + 8s να τρέχει σε κλάσματα του δευτερολέπτου, και καταγράφει ποιες αναμονές ζήτησε
// ο κώδικας της εφαρμογής. Δεν αλλάζει τον κώδικα της εφαρμογής· αντικαθιστά μόνο το global
// setTimeout όσο τρέχει ένα σενάριο.

const realSetTimeout = globalThis.setTimeout;

export function installClock(scale){
  const t0 = performance.now();
  const now = () => (performance.now() - t0) / scale;
  const waits = [];                               // αναμονές ≥ 500ms που ζήτησε η εφαρμογή (= backoff)
  globalThis.setTimeout = (fn, ms = 0, ...args) => {
    if(ms >= 500) waits.push({at: now(), ms});
    return realSetTimeout(fn, ms * scale, ...args);
  };
  return {
    now, waits, scale,
    /** Αναμονή του ίδιου του harness/mock — δεν καταγράφεται ως backoff της εφαρμογής. */
    sleep: ms => new Promise(ok => realSetTimeout(ok, ms * scale)),
    uninstall(){ globalThis.setTimeout = realSetTimeout; },
  };
}

export const realSleep = ms => new Promise(ok => realSetTimeout(ok, ms));
