import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES } from '../src/lib/stages.js';
import {
  ValidationError, cleanLayers, glazeLine, glazeNames, makeLayer, matchesGlaze, moveLayer, removeLayer, suggest,
} from '../src/lib/glaze.js';
import {
  DAY, applyFinishing, applyStage, archivePot, buildPot, editEntry, examplePots, finishedGaps, finishedView, gapsText, migratePot, undoEntry,
} from '../src/lib/pots.js';

const NOW = Date.UTC(2025, 5, 1, 12);
const L = (id, name, extra = {}) => makeLayer({ id, name, ...extra });
const blob = (tag) => ({ tag }); // stands in for a Blob: the logic only moves it around

function finishedPot({ glaze = [], photoOn = null, stage = 'finished' } = {}) {
  let pot = buildPot({ stage: 'glazed', now: NOW, stages: STAGES });
  pot = applyStage(pot, stage, { enteredAt: NOW, entryId: 'fin' });
  if (photoOn) pot = editEntry(pot, photoOn, { photo: blob('p') });
  return { ...pot, id: 1, glazeLayers: glaze };
}

test('layers are stored bottom first and read top first: A over B', () => {
  const layers = cleanLayers([L('b', 'Tenmoku'), L('a', 'Ash')]);
  assert.deepEqual(layers.map((l) => l.name), ['Tenmoku', 'Ash']);
  assert.equal(glazeLine(layers), 'Ash over Tenmoku');
  assert.equal(glazeLine([]), '');
  assert.equal(glazeLine([L('x', 'Celadon')]), 'Celadon');
});

test('layers can be reordered and removed, and the ends stay put', () => {
  const layers = [L('1', 'A'), L('2', 'B'), L('3', 'C')];
  assert.deepEqual(moveLayer(layers, '3', -1).map((l) => l.id), ['1', '3', '2']);
  assert.equal(moveLayer(layers, '1', -1), layers);
  assert.equal(moveLayer(layers, '3', 1), layers);
  assert.deepEqual(removeLayer(layers, '2').map((l) => l.id), ['1', '3']);
});

test('layer validation: names are required and trimmed, placement and method are optional but must be known', () => {
  assert.throws(() => cleanLayers([L('1', 'Ash'), L('2', '   ')]), ValidationError);
  assert.throws(() => cleanLayers([L('1', 'Ash', { coverage: 'underneath' })]), ValidationError);
  assert.throws(() => cleanLayers([L('1', 'Ash', { method: 'fling' })]), ValidationError);
  assert.throws(() => cleanLayers([L('1', 'Ash'), L('1', 'Ash')]), ValidationError);
  const [one] = cleanLayers([L('1', '  Ash ', { coverage: 'rim', method: 'brush' })]);
  assert.deepEqual(one, { id: '1', name: 'Ash', coverage: 'rim', method: 'brush' });
});

test('name suggestions: distinct across other pots, one spelling, most used first, never this pot', () => {
  const pots = [
    { id: 1, glazeLayers: [L('a', 'Celadon'), L('b', 'Ash')] },
    { id: 2, glazeLayers: [L('a', 'celadon')] },
    { id: 3, glazeLayers: [L('a', 'Only here')] },
    { id: 4 },
  ];
  assert.deepEqual(glazeNames(pots, 3), ['Celadon', 'Ash']);
  assert.deepEqual(suggest(['Celadon', 'Ash', 'Shino'], 'sh'), ['Ash', 'Shino']);
  assert.deepEqual(suggest(['Celadon'], 'celadon'), []);
  assert.deepEqual(suggest(['Celadon', 'Ash'], ''), ['Celadon', 'Ash']);
});

test('search matches any layer of the glaze, ignoring case', () => {
  const pot = { glazeLayers: [L('1', 'Tenmoku'), L('2', 'Ash')] };
  assert.equal(matchesGlaze(pot, 'tenm'), true);
  assert.equal(matchesGlaze(pot, 'ASH'), true);
  assert.equal(matchesGlaze(pot, 'celadon'), false);
  assert.equal(matchesGlaze(pot, ''), true);
  assert.equal(matchesGlaze({}, 'ash'), false);
});

test('a new pot has no glaze and no finished photo; an old pot gains them without other changes', () => {
  const fresh = buildPot({ stage: 'formed', now: NOW, stages: STAGES });
  assert.deepEqual(fresh.glazeLayers, []);
  assert.equal(fresh.finishedPhoto, null);
  const old = { ...fresh };
  delete old.glazeLayers;
  delete old.finishedPhoto;
  delete old.finishedPhotoFrom;
  const pot = migratePot(old);
  assert.deepEqual(pot.glazeLayers, []);
  assert.equal(pot.finishedPhoto, null);
  assert.equal(pot.stage, old.stage);
  assert.equal(pot.history, old.history);
  assert.equal(migratePot(pot), pot);
});

test('gaps are derived for both finished statuses and for no other stage', () => {
  for (const stage of ['finished', 'flawed']) {
    assert.deepEqual(finishedGaps(finishedPot({ stage })), { glaze: true, photo: true });
    assert.deepEqual(finishedGaps(finishedPot({ stage, glaze: [L('1', 'Ash')] })), { glaze: false, photo: true });
    const full = finishedPot({ stage, glaze: [L('1', 'Ash')], photoOn: 'fin' });
    assert.deepEqual(finishedGaps(full), { glaze: false, photo: false });
  }
  assert.equal(finishedGaps(buildPot({ stage: 'glazed', now: NOW, stages: STAGES })), null);
  assert.equal(gapsText({ glaze: true, photo: true }), 'glaze and finished photo');
  assert.equal(gapsText({ glaze: false, photo: true }), 'finished photo');
  assert.equal(gapsText({ glaze: false, photo: false }), '');
});

test('a photo taken at finished or flawed becomes the finished photo; elsewhere it does not', () => {
  for (const stage of ['finished', 'flawed']) {
    const pot = finishedPot({ stage, photoOn: 'fin' });
    assert.deepEqual(pot.finishedPhoto, blob('p'));
    assert.equal(pot.finishedPhotoFrom, 'fin');
  }
  const glazed = editEntry(buildPot({ stage: 'glazed', now: NOW, stages: STAGES }), buildPot({ stage: 'glazed', now: NOW, stages: STAGES }).history[0].id, { photo: blob('x') });
  assert.equal(glazed.finishedPhoto, null);
});

test('a pot added already finished with a photo has it as its finished photo', () => {
  const pot = buildPot({ stage: 'flawed', now: NOW, stages: STAGES, photo: blob('added'), width: 1, height: 1 });
  assert.deepEqual(pot.finishedPhoto, blob('added'));
  assert.equal(buildPot({ stage: 'glazed', now: NOW, stages: STAGES, photo: blob('added') }).finishedPhoto, null);
});

test('starring a history photo replaces the finished photo; removing clears it', () => {
  let pot = finishedPot({ photoOn: 'fin' });
  pot = { ...pot, history: [{ ...pot.history[0], id: 'early', photo: blob('early') }, ...pot.history.slice(1)] };
  const starred = applyFinishing(pot, { starEntryId: 'early' });
  assert.deepEqual(starred.finishedPhoto, blob('early'));
  assert.equal(starred.finishedPhotoFrom, 'early');
  const cleared = applyFinishing(starred, { starEntryId: null });
  assert.equal(cleared.finishedPhoto, null);
  assert.equal(cleared.finishedPhotoFrom, null);
});

test('finishing is all or nothing: bad glaze, a photo not on the pot, or a pot not finished all throw', () => {
  const pot = finishedPot({ photoOn: 'fin' });
  const good = [L('1', 'Ash')];
  assert.throws(() => applyFinishing(pot, { layers: [L('1', '')] }), ValidationError);
  assert.throws(() => applyFinishing(pot, { layers: good, starEntryId: 'nope' }), ValidationError);
  assert.throws(() => applyFinishing(pot, { layers: good, starEntryId: pot.history[0].id }), ValidationError); // no photo on that entry
  const glazed = buildPot({ stage: 'glazed', now: NOW, stages: STAGES });
  const withPhoto = { ...glazed, history: [{ ...glazed.history[0], photo: blob('g') }] };
  assert.throws(() => applyFinishing(withPhoto, { starEntryId: glazed.history[0].id }), ValidationError);
  // glaze alone is fine on any pot, and layers and star go in together
  assert.equal(applyFinishing(glazed, { layers: good }).glazeLayers.length, 1);
  const both = applyFinishing(pot, { layers: good, starEntryId: 'fin' });
  assert.equal(both.glazeLayers.length, 1);
  assert.equal(both.finishedPhotoFrom, 'fin');
  assert.equal(pot.glazeLayers.length, 0); // the original is untouched
});

test('taking a stage back, or removing a photo, clears a finished photo copied from it', () => {
  const pot = finishedPot({ photoOn: 'fin' });
  assert.equal(undoEntry(pot, 'fin').finishedPhoto, null);
  assert.equal(editEntry(pot, 'fin', { photo: null }).finishedPhoto, null);
  assert.deepEqual(editEntry(pot, 'fin', { note: 'x' }).finishedPhoto, blob('p'));
});

test('finished-pots view: both statuses, archived left out, incomplete first, filters count, search by any layer', () => {
  const ok = { ...finishedPot({ glaze: [L('1', 'Tenmoku'), L('2', 'Ash')], photoOn: 'fin' }), id: 1, createdAt: NOW - 9 * DAY };
  const noPhoto = { ...finishedPot({ glaze: [L('1', 'Celadon')], stage: 'flawed' }), id: 2, createdAt: NOW - 8 * DAY };
  const noGlaze = { ...finishedPot({ photoOn: 'fin' }), id: 3, createdAt: NOW - 7 * DAY };
  const neither = { ...finishedPot({}), id: 4, createdAt: NOW - 6 * DAY };
  const archived = archivePot({ ...finishedPot({}), id: 5 }, STAGES, NOW);
  const inProgress = { ...buildPot({ stage: 'glazed', now: NOW, stages: STAGES }), id: 6 };
  const pots = [ok, noPhoto, noGlaze, neither, archived, inProgress];

  const all = finishedView(pots);
  assert.deepEqual(all.rows.map((r) => r.pot.id), [4, 3, 2, 1]);
  assert.deepEqual(all.counts, { all: 4, glaze: 2, photo: 2, complete: 1 });
  assert.deepEqual(finishedView(pots, { filter: 'glaze' }).rows.map((r) => r.pot.id), [4, 3]);
  assert.deepEqual(finishedView(pots, { filter: 'photo' }).rows.map((r) => r.pot.id), [4, 2]);
  assert.deepEqual(finishedView(pots, { filter: 'complete' }).rows.map((r) => r.pot.id), [1]);
  const ash = finishedView(pots, { query: 'ash' });
  assert.deepEqual(ash.rows.map((r) => r.pot.id), [1]); // matches on any layer, not only the top one
  assert.equal(ash.counts.all, 4); // counts ignore the search
  assert.deepEqual(finishedView(pots, { query: 'tenmoku' }).rows.map((r) => r.pot.id), [1]);
});

test('example pots show every state the finished-pots view tells apart', () => {
  const photos = { teal: blob('t'), brown: blob('b') };
  const { rows, counts } = finishedView(examplePots(STAGES, NOW, photos).map((p, i) => ({ ...p, id: i + 1 })));
  assert.ok(counts.complete >= 1 && counts.glaze >= 1 && counts.photo >= 1);
  assert.ok(rows.some((r) => r.pot.stage === 'flawed') && rows.some((r) => r.pot.stage === 'finished'));
  assert.ok(rows.every((r) => !r.pot.finishedPhoto || r.pot.history.some((e) => e.id === r.pot.finishedPhotoFrom)));
  // without photos the example pots still build, and none claims a finished photo
  assert.ok(examplePots(STAGES, NOW).every((p) => p.finishedPhoto === null));
});
