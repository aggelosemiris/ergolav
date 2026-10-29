import { test } from 'node:test';
import assert from 'node:assert/strict';

// Ψεύτικο localStorage ανά test (όπως στο key-storage.test.js)· broken: κάθε κλήση πετάει.
function env(initial = {}, {broken = false} = {}){
  const data = {...initial};
  const fail = () => { throw new Error('SecurityError'); };
  globalThis.localStorage = broken ? {getItem: fail, setItem: fail, removeItem: fail}
    : {getItem: k => data[k] ?? null, setItem: (k, v) => { data[k] = String(v); }, removeItem: k => { delete data[k]; }};
  return data;
}
const m = await import('../src/profile.js');

test('πρώτη φορά: δεν υπάρχουν στοιχεία', () => {
  env();
  assert.equal(m.loadProfile(), null);
});

test('αποθήκευση και ξαναδιάβασμα (μία φορά, μένουν)', () => {
  const data = env();
  const r = m.saveProfile({name: '  Νίκος   Παπαδάκης ', trade: 'Υδραυλικός', phone: '691 234 5678', afm: '123 456 789'});
  assert.deepEqual(r, {profile: {name: 'Νίκος Παπαδάκης', trade: 'Υδραυλικός', phone: '691 234 5678', afm: '123456789'}, saved: true});
  assert.ok(data[m.PROFILE]);
  assert.deepEqual(m.loadProfile(), r.profile);
});

test('άδειο όνομα δεν αποθηκεύεται', () => {
  const data = env();
  for(const name of ['', '   ', undefined]){
    const r = m.saveProfile({name, trade: 'Υδραυλικός'});
    assert.equal(r.field, 'name');
    assert.match(r.error, /όνομα/);
  }
  assert.deepEqual(Object.keys(data), []);
});

test('τηλέφωνο / ΑΦΜ που δεν στέκουν δεν μπαίνουν σιωπηλά στο PDF', () => {
  env();
  assert.equal(m.saveProfile({name: 'Α', phone: '12345'}).field, 'phone');
  assert.equal(m.saveProfile({name: 'Α', phone: 'καλέστε με'}).field, 'phone');
  assert.equal(m.saveProfile({name: 'Α', afm: '12345678'}).field, 'afm');
  assert.equal(m.saveProfile({name: 'Α', afm: '12345678a'}).field, 'afm');
  assert.equal(m.saveProfile({name: 'Α', phone: '+30 210 123 4567', afm: ''}).profile.phone, '+30 210 123 4567');
});

test('αρχικά: δύο πρώτες λέξεις, κεφαλαία χωρίς τόνους', () => {
  assert.equal(m.initials('Νίκος Παπαδάκης'), 'ΝΠ');
  assert.equal(m.initials('Ηλίας Ζαχαρίου Υδραυλικά'), 'ΗΖ');
  assert.equal(m.initials('Άγγελος'), 'ΑΓ');
  assert.equal(m.initials('ergolav plumbing'), 'EP');
  assert.equal(m.initials('«Θέρμη» Α.Ε.'), 'ΘΑ');
});

test('αριθμός προσφοράς: 1, 2, 3… αποθηκευμένος', () => {
  const data = env();
  assert.equal(m.lastQuoteNo(), 0);
  assert.equal(m.takeQuoteNo(), 1);
  assert.equal(m.takeQuoteNo(), 2);
  assert.equal(data[m.COUNTER], '2');
  assert.equal(m.lastQuoteNo(), 2);
});

test('χαλασμένο localStorage δεν ρίχνει τίποτα', () => {
  env({[m.PROFILE]: '{χαλασμένο', [m.COUNTER]: 'abc'});
  assert.equal(m.loadProfile(), null);
  assert.equal(m.takeQuoteNo(), 1, 'άκυρος μετρητής = από την αρχή');
  env({[m.PROFILE]: JSON.stringify({name: 42, trade: ['x']}), [m.COUNTER]: '-5'});
  assert.equal(m.loadProfile(), null, 'όνομα που δεν είναι κείμενο = χωρίς στοιχεία');
  assert.equal(m.lastQuoteNo(), 0);
  env({[m.PROFILE]: 'null'});
  assert.equal(m.loadProfile(), null);
  env({}, {broken: true});
  assert.equal(m.loadProfile(), null);
  assert.deepEqual(m.saveProfile({name: 'Νίκος'}), {profile: {name: 'Νίκος', trade: '', phone: '', afm: ''}, saved: false}, 'δεκτά για τώρα, με ένδειξη ότι δεν αποθηκεύτηκαν');
  assert.equal(m.takeQuoteNo(), 1);
  delete globalThis.localStorage;
  assert.equal(m.loadProfile(), null, 'χωρίς localStorage καθόλου');
});
