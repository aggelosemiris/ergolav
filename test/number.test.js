import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAmount, toCents } from '../src/number.js';

const v = (s, o) => parseAmount(s, o).value;
const bad = (s, o) => typeof parseAmount(s, o).error === 'string' && parseAmount(s, o).value === undefined;

test('ελληνική γραφή τιμών — το σφάλμα της QA: «1.234,50» → 1.234,50 € (όχι 1,23 €)', () => {
  assert.equal(v('1.234,50'), 1234.5);
  assert.equal(toCents(v('1.234,50')), 123450);
  assert.equal(v('1234,50'), 1234.5);
  assert.equal(v('1.234.567,89'), 1234567.89);
  assert.equal(v('12,5'), 12.5);
  assert.equal(v('185'), 185);
  assert.equal(v(' 185 € '), 185);
  assert.equal(v('0,50'), 0.5);
});

test('τελεία ως υποδιαστολή (αγγλική γραφή) → μπλοκ, όχι μαντεψιά', () => {
  assert.ok(bad('12.50'));
  assert.ok(bad('1,234.56'));
  assert.equal(v('1.234.567'), 1234567, 'πολλές τελείες σε ομάδες των 3 = χιλιάδες, χωρίς αμφισημία');
});

test('αμφίσημα ή άκυρα → σφάλμα, ποτέ σιωπηλή τιμή', () => {
  assert.ok(bad('1.234'), '1.234: χίλια διακόσια τριάντα τέσσερα ή 1,234;');
  assert.ok(bad('1,234'), 'τιμή με 3 δεκαδικά');
  assert.ok(bad('1,234,567'));
  assert.ok(bad('1.23.4'));
  assert.ok(bad('12,'));
  assert.ok(bad('12a'));
  assert.ok(bad('-5'));
  assert.ok(bad('0'));
  assert.ok(bad(''));
  assert.ok(bad('1.2345,00'), 'λάθος διαχωρισμός χιλιάδων');
});

test('ποσότητες: έως 3 δεκαδικά', () => {
  assert.equal(v('2,5', {maxDecimals: 3}), 2.5);
  assert.equal(v('1,125', {maxDecimals: 3}), 1.125);
  assert.ok(bad('1,1255', {maxDecimals: 3}));
  assert.ok(bad('1.234', {maxDecimals: 3}), 'παραμένει αμφίσημο');
});
