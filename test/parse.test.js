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
  const r = parse('τρία μέτρα σίτα αλουμινίου');
  assert.equal(r.lines.length, 1);
  assert.equal(r.lines[0].unknown, true);
});

test('σημειώσεις με συντομογραφίες και μία γραμμή ανά υλικό', () => {
  const r = parse('12 μ. σωλήνας\n2 τεμ. διακόπτες\n15 τ.μ. πλακάκι δαπέδου γκρι\nλεκάνη κρεμαστή');
  assert.equal(byId(r, 'pipe')[0].qty, 12);
  assert.equal(byId(r, 'valve')[0].qty, 2);
  assert.equal(byId(r, 'tile')[0].qty, 15);
  assert.equal(byId(r, 'wc')[0].qty, 1);
  assert.equal(r.lines.filter(l => l.unknown).length, 0);
});

test('λίστα με αρίθμηση/markdown και ποσότητα μετά το υλικό', () => {
  const r = parse('**Ανακαίνιση μπάνιου**\n1. Σωλήνας 12 μέτρα\n2. Διακόπτες 2 τεμάχια\n- 1 τεμάχιο λεκάνη');
  assert.equal(r.title, 'ανακαίνιση μπάνιου');
  assert.equal(byId(r, 'pipe')[0].qty, 12);
  assert.equal(byId(r, 'valve')[0].qty, 2);
  assert.equal(byId(r, 'wc')[0].qty, 1);
  assert.equal(r.lines.filter(l => l.unknown).length, 0);
});

test('υλικά εκτός καταλόγου κρατούν ποσότητα, μονάδα και περιγραφή', () => {
  const r = parse('2 τεμάχια κλιματιστικά\n5 μέτρα σίτα\nτζάκι');
  assert.deepEqual(r.lines.map(l => [l.unknown, l.qty, l.unit, l.name]),
    [[true, 2, 'τεμ.', 'Κλιματιστικά'], [true, 5, 'μ.', 'Σίτα'], [true, 1, '', 'Τζάκι']]);
});

test('συνηθισμένος τύπος όταν δεν ειπώθηκε, συγκεκριμένος όταν ειπώθηκε', () => {
  const r = parse('10 μέτρα σωλήνα, 4 μέτρα σωλήνα αποχέτευσης Φ110, μια λεκάνη, 2 διακόπτες φωτός, 3 βρύσες');
  assert.deepEqual(r.lines.map(l => [l.qty, l.name, !!l.flag]), [
    [10, 'Σωλήνας πολυστρωματικός Φ16', false],
    [4, 'Σωλήνας αποχέτευσης PVC Φ110', false],
    [1, 'Λεκάνη κρεμαστή', false],
    [2, 'Διακόπτης φωτός χωνευτός', false],
    [3, 'Βρύση απλή (κήπου/πλυντηρίου)', false],
  ]);
});

test('ανακαίνιση μπάνιου: εργασίες, οικοδομικά και ηλεκτρολογικά', () => {
  const r = parse('Αποξήλωση, 2 κάδοι μπάζα, 6 τετραγωνικά στεγάνωση, καμπίνα ντουζιέρας, μπανιέρα, 4 σποτ, 2 πρίζες, κόλλα πλακιδίων 3 σακιά');
  const ids = r.lines.map(l => l.id);
  assert.deepEqual(ids, ['demolition', 'debris', 'waterproof', 'cabin', 'bathtub', 'light', 'socket', 'glue']);
  assert.equal(byId(r, 'debris')[0].qty, 2);
  assert.equal(byId(r, 'glue')[0].qty, 3);
  assert.equal(byId(r, 'tile').length, 0, 'η «κόλλα πλακιδίων» δεν είναι πλακάκι');
});

test('διορθώσεις και αρνήσεις στην ομιλία', () => {
  assert.equal(byId(parse('12 μέτρα σωλήνα, όχι συγγνώμη, 15 μέτρα σωλήνα'), 'pipe')[0].qty, 15);
  assert.equal(byId(parse('δύο λεκάνες, όχι, τελικά μία λεκάνη'), 'wc')[0].qty, 1);
  assert.equal(byId(parse('δεν χρειάζεται θερμοσίφωνας, έχει ηλιακό'), 'heater').length, 0);
  assert.equal(byId(parse('όλα εκτός από την μπανιέρα'), 'bathtub').length, 0);
});

test('τιμές δεν γίνονται ποσότητες, παράλογες ποσότητες ζητούν επιβεβαίωση', () => {
  assert.equal(byId(parse('λεκάνη κρεμαστή 185€'), 'wc')[0].qty, 1);
  const wc = byId(parse('999 λεκάνες κρεμαστές'), 'wc')[0];
  assert.equal(wc.qty, 999);
  assert.equal(wc.qtyCheck, true);
  const tile = byId(parse('πλακάκι τοίχου λευκό'), 'tile')[0];
  assert.equal(tile.qtyMissing, true, 'δεν ειπώθηκαν τ.μ. — πρέπει να ζητηθούν');
  assert.equal(byId(parse('μία λεκάνη'), 'wc')[0].qtyMissing, undefined);
});

test('λέξεις που μοιάζουν αλλά σημαίνουν άλλο', () => {
  const r = parse('δέκα τετραγωνικά πορτοκαλί πλακάκι');
  assert.equal(byId(r, 'door').length, 0);
  assert.equal(byId(r, 'tile')[0].qty, 10);
  assert.equal(parse('να πάρω μπαταρία αυτοκινήτου').lines.filter(l => !l.unknown).length, 0);
  assert.equal(parse('θα το βρίσκεις στο ντουλάπι').lines.filter(l => l.id === 'tap').length, 0);
});

test('συνώνυμα, ορθογραφικά, αριθμοί, greeklish, αγγλικά', () => {
  assert.equal(byId(parse('ένα λαβομάνο'), 'basin').length, 1);
  assert.equal(byId(parse('ένα ρεζερβουάρ εντοιχισμού'), 'tank').length, 1);
  assert.equal(byId(parse('σολήνας 12 μετρα'), 'pipe')[0].qty, 12);
  assert.equal(byId(parse('δυόμισι μέτρα σωλήνα'), 'pipe')[0].qty, 2.5);
  assert.equal(byId(parse('εκατόν είκοσι πέντε μέτρα καλώδιο'), 'cable')[0].qty, 125);
  assert.equal(byId(parse('dwdeka metra swlina'), 'pipe')[0].qty, 12);
  const en = parse('12 meters of pipe and one toilet');
  assert.equal(byId(en, 'pipe')[0].qty, 12);
  assert.equal(byId(en, 'wc')[0].qty, 1);
});

test('καθάρισμα εξόδου μοντέλου (εισαγωγή, markdown πίνακας)', () => {
  const r = parse('Ορίστε οι σημειώσεις που διάβασα:\n| Υλικό | Ποσότητα |\n|---|---|\n| Σωλήνας | 12 μ. |\n| Λεκάνη | 1 |');
  assert.deepEqual(r.lines.map(l => [l.id, l.qty]), [['pipe', 12], ['wc', 1]]);
});
