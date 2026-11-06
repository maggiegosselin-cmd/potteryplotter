import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES } from '../src/lib/stages.js';
import { buildPot, examplePots, migratePot } from '../src/lib/pots.js';
import { buildRecords } from '../src/lib/exportData.js';
import { clayLine, lastUnit, parseWeight, rememberUnit, weightLabel } from '../src/lib/weight.js';
import { toDoc, fromDoc } from '../src/lib/wire.js';

const NOW = Date.UTC(2025, 5, 1, 12);
const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

test('a weight is kept exactly as entered, decimals included', () => {
  assert.deepEqual(parseWeight('2.5', 'lb'), { amount: 2.5, unit: 'lb' });
  assert.deepEqual(parseWeight(500, 'g'), { amount: 500, unit: 'g' });
  assert.deepEqual(parseWeight('2,5', 'lb'), { amount: 2.5, unit: 'lb' });
});

test('a blank, zero, negative or unknown-unit weight is no weight', () => {
  for (const [a, u] of [['', 'g'], [null, 'g'], ['0', 'g'], ['-3', 'lb'], ['abc', 'g'], ['5', 'kg']]) assert.equal(parseWeight(a, u), null);
});

test('the card line reads "Stoneware · 500 g", and old pots without a weight still work', () => {
  assert.equal(clayLine({ clay: 'Stoneware', weight: { amount: 500, unit: 'g' } }), 'Stoneware · 500 g');
  assert.equal(clayLine({ clay: '', weight: { amount: 2.5, unit: 'lb' } }), '2.5 lb');
  assert.equal(clayLine({ clay: 'Porcelain' }), 'Porcelain');
  assert.equal(weightLabel(undefined), '');
});

test('the last-used unit is remembered and defaults to grams', () => {
  const storage = memory();
  assert.equal(lastUnit(storage), 'g');
  rememberUnit('lb', storage);
  assert.equal(lastUnit(storage), 'lb');
  rememberUnit('stone', storage);
  assert.equal(lastUnit(storage), 'lb');
});

test('a new pot stores the weight, an old pot migrates without one, and switching unit keeps the number', () => {
  const pot = buildPot({ name: 'Lump', clay: 'Stoneware', weight: { amount: 2.5, unit: 'lb' }, stage: 'lump', now: NOW, stages: STAGES });
  assert.deepEqual(pot.weight, { amount: 2.5, unit: 'lb' });
  assert.equal(buildPot({ stage: 'lump', now: NOW, stages: STAGES }).weight, null);
  const old = migratePot({ id: 1, name: 'Mug', createdAt: NOW, photo: null });
  assert.equal(clayLine(old), '');
  const switched = parseWeight(pot.weight.amount, 'g');
  assert.deepEqual(switched, { amount: 2.5, unit: 'g' });
});

test('the weight travels in the off-phone copy and the export', async () => {
  const pots = examplePots(STAGES, NOW).map((p, i) => ({ ...p, id: i + 1 }));
  const lump = pots.find((p) => p.name === 'Wedged lump');
  assert.deepEqual(lump.weight, { amount: 500, unit: 'g' });
  const { doc } = await toDoc(lump);
  assert.deepEqual(fromDoc(JSON.parse(JSON.stringify(doc)), () => null).weight, { amount: 500, unit: 'g' });
  const { data } = buildRecords({ pots, glazes: [], stages: STAGES, exportedAt: NOW, appVersion: 't' });
  assert.deepEqual(data.pots.find((r) => r.name === 'Wedged lump').weight, { amount: 500, unit: 'g' });
});
