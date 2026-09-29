import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../src/parse.js';

const byId = (r, id) => r.lines.filter(l => l.id === id);

test('η φράση του demo', () => {
  const r = parse('Ανακαίνιση μπάνιου. Δώδεκα μέτρα σωλήνα πολυστρωματικό, μια μπαταρία νιπτήρα, λεκάνη κρεμαστή με καζανάκι εντοιχισμού, και δώδεκα τετραγωνικά πλακάκι τοίχου.');
  assert.equal(r.title, 'ανακαίνιση μπάνιου');
  assert.equal(byId(r, 'pipe')[0].qty, 12);
  const mixer = byId(r, 'mixer')[0];
  assert.equal(mixer.flag, undefined);
  assert.match(mixer.name, /νιπτήρα/);
  assert.equal(byId(r, 'basin').length, 0, 'το «μπαταρία νιπτήρα» δεν είναι νιπτήρας');
  assert.equal(byId(r, 'wc')[0].qty, 1);
  assert.match(byId(r, 'tank')[0].name, /εντοιχισμού/);
  const tile = byId(r, 'tile')[0];
  assert.equal(tile.qty, 12);
  assert.equal(tile.flag, true);
  assert.equal(tile.name, 'Πλακάκι τοίχου');
  const glue = byId(r, 'glue')[0];
  assert.equal(glue.suggest, true);
  assert.equal(glue.qty, 3);
  assert.equal(r.lines.filter(l => l.unknown).length, 0);
});

test('ομιλία χωρίς στίξη, ψηφία και σύνθετοι αριθμοί', () => {
  const r = parse('25 μέτρα σωλήνα και είκοσι πέντε τετραγωνικά πλακάκι δαπέδου γκρι και δύο διακόπτες');
  assert.equal(byId(r, 'pipe')[0].qty, 25);
  const tile = byId(r, 'tile')[0];
  assert.equal(tile.qty, 25);
  assert.equal(tile.flag, undefined);
  assert.match(tile.name, /δαπέδου 30×60 γκρι/);
  assert.equal(byId(r, 'valve')[0].qty, 2);
});

test('δεκαδικά και ενώνει ίδια υλικά', () => {
  const r = parse('3,5 μέτρα σωλήνα, 2 μέτρα σωλήνα');
  assert.equal(byId(r, 'pipe').length, 1);
  assert.equal(byId(r, 'pipe')[0].qty, 5.5);
});

test('κόλλα που ειπώθηκε δεν προτείνεται ξανά', () => {
  const r = parse('δέκα τετραγωνικά πλακάκι λευκό και πέντε σακιά κόλλα');
  const glue = byId(r, 'glue');
  assert.equal(glue.length, 1);
  assert.equal(glue[0].qty, 5);
  assert.equal(glue[0].suggest, undefined);
});

test('ό,τι δεν αναγνωρίζεται βγαίνει για έλεγχο', () => {
  const r = parse('τρία μέτρα καλώδιο ρεύματος');
  assert.equal(r.lines.length, 1);
  assert.equal(r.lines[0].unknown, true);
});
