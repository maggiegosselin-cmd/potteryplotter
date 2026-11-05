import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES } from '../src/lib/stages.js';
import {
  InputError, cleanGlazeName, cleanLayers, dropIndex, findGlaze, glazeLine, layerDetail, layersToStack, moveItem, nameLookup, stackToLayers,
} from '../src/lib/glazes.js';
import {
  applyFinish, applyGlazes, applyStage, buildPot, canGlaze, earlierStages, editEntry, examplePots, finishGaps, finishedPots, migratePot, photoOptions,
  potsWithGlaze, coverPhoto, DAY,
} from '../src/lib/pots.js';

const NOW = Date.UTC(2025, 5, 1, 12);
const shelf = [{ id: 1, name: 'Celadon' }, { id: 2, name: 'Tenmoku' }, { id: 3, name: 'Shino White' }];
const ids = shelf.map((g) => g.id);
const blob = (size = 10) => ({ size, type: 'image/jpeg' });

test('A over B is stored first coat first and read back top coat first', () => {
  // The editor lists the top coat first: Celadon over Tenmoku.
  const stack = [{ key: 'a', glazeId: 1, coverage: 'outside', method: 'dip' }, { key: 'b', glazeId: 2, coverage: '', method: '' }];
  const layers = stackToLayers(stack);
  assert.deepEqual(layers.map((l) => l.glazeId), [2, 1]);
  assert.equal(glazeLine(layers, nameLookup(shelf)), 'Celadon over Tenmoku');
  assert.deepEqual(layersToStack(layers).map((l) => l.glazeId), [1, 2]);
  assert.equal(glazeLine([], nameLookup(shelf)), '');
  assert.equal(layerDetail(layers[1]), 'Outside · Dipped');
  assert.equal(layerDetail(layers[0]), '');
});

test('renaming a glaze on the shelf renames it on every pot, because pots keep only the id', () => {
  const layers = [{ glazeId: 2, coverage: '', method: '' }, { glazeId: 1, coverage: '', method: '' }];
  const renamed = shelf.map((g) => (g.id === 1 ? { ...g, name: 'Seladon' } : g));
  assert.equal(glazeLine(layers, nameLookup(renamed)), 'Seladon over Tenmoku');
});

test('glaze names: empty is refused, spaces are tidied, a name already on the shelf is found in any case', () => {
  assert.throws(() => cleanGlazeName('   '), InputError);
  assert.throws(() => cleanGlazeName(undefined), InputError);
  assert.equal(cleanGlazeName('  Shino   White '), 'Shino White');
  assert.equal(findGlaze(shelf, ' shino white ').id, 3);
  assert.equal(findGlaze(shelf, 'shino white', 3), null);
  assert.equal(findGlaze(shelf, 'Rutile'), null);
});

test('layers must use shelf glazes and the listed coverage and method', () => {
  assert.deepEqual(cleanLayers([{ glazeId: 1, coverage: 'rim', method: 'brush', key: 'x' }], ids), [{ glazeId: 1, coverage: 'rim', method: 'brush' }]);
  assert.deepEqual(cleanLayers([{ glazeId: 1 }], ids), [{ glazeId: 1, coverage: '', method: '' }]);
  assert.throws(() => cleanLayers([{ glazeId: 99 }], ids), InputError);
  assert.throws(() => cleanLayers([{}], ids), InputError);
  assert.throws(() => cleanLayers([{ glazeId: 1, coverage: 'sideways' }], ids), InputError);
  assert.throws(() => cleanLayers([{ glazeId: 1, method: 'fling' }], ids), InputError);
  assert.throws(() => cleanLayers('Celadon', ids), InputError);
});

test('reordering moves one layer and leaves the rest in order', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 2), ['b', 'c', 'a']);
  assert.deepEqual(moveItem(['a', 'b', 'c'], 2, 1), ['a', 'c', 'b']);
  const same = ['a', 'b'];
  assert.equal(moveItem(same, 1, 1), same);
  assert.equal(moveItem(same, 0, 5), same);
  assert.equal(dropIndex([50, 150, 250], 190), 1);
  assert.equal(dropIndex([50, 150, 250], 400), 2);
  assert.equal(dropIndex([50, 150, 250], -20), 0);
});

test('a version 3 pot gains empty glazes and no finished photo without changing stage or history', () => {
  const saved = buildPot({ stage: 'glazed', now: NOW, stages: STAGES });
  for (const key of ['glazeLayers', 'finishedPhoto', 'finishedFrom']) delete saved[key];
  const pot = migratePot(saved);
  assert.deepEqual(pot.glazeLayers, []);
  assert.equal(pot.finishedPhoto, null);
  assert.equal(pot.stage, 'glazed');
  assert.equal(pot.history, saved.history);
  assert.equal(migratePot(pot), pot);
});

test('glazes can be recorded from Glazed on, and always on a finished pot', () => {
  assert.equal(canGlaze(buildPot({ stage: 'bone_dry', now: NOW, stages: STAGES }), STAGES), false);
  assert.equal(canGlaze(buildPot({ stage: 'glazed', now: NOW, stages: STAGES }), STAGES), true);
  assert.equal(canGlaze(buildPot({ stage: 'finished', now: NOW, stages: STAGES }), STAGES), true);
  const layers = [{ glazeId: 1 }];
  assert.throws(() => applyGlazes(buildPot({ stage: 'lump', now: NOW, stages: STAGES }), STAGES, layers, ids), InputError);
  const glazed = applyGlazes(buildPot({ stage: 'glazed', now: NOW, stages: STAGES }), STAGES, layers, ids);
  assert.deepEqual(glazed.glazeLayers, [{ glazeId: 1, coverage: '', method: '' }]);
});

test('a pot can be recorded after the fact as Finished or as Finished, with a flaw', () => {
  const flawed = buildPot({ stage: 'flawed', now: NOW, stages: STAGES, earlier: { glazed: NOW - 9 * DAY, bone_dry: null } });
  assert.equal(flawed.stage, 'flawed');
  assert.deepEqual(flawed.history.map((e) => e.stage), ['glazed', 'flawed']);
  assert.ok(!earlierStages('flawed', STAGES).some((s) => s.id === 'finished'));
  assert.throws(() => buildPot({ stage: 'failed', now: NOW, stages: STAGES }), RangeError);
});

test('finishing saves layers and the photo choice together, or nothing', () => {
  const pot = buildPot({ stage: 'finished', now: NOW, stages: STAGES, photo: blob(5) });
  const layers = [{ glazeId: 2 }, { glazeId: 1 }];

  const withCamera = applyFinish(pot, STAGES, { layers, photo: { blob: blob(7) } }, ids);
  assert.equal(withCamera.finishedPhoto.size, 7);
  assert.equal(withCamera.finishedFrom, 'camera');
  assert.deepEqual(withCamera.glazeLayers.map((l) => l.glazeId), [2, 1]);

  // An invalid layer stops the photo from being saved as well.
  assert.throws(() => applyFinish(pot, STAGES, { layers: [{ glazeId: 99 }], photo: { blob: blob(7) } }, ids), InputError);
  assert.equal(pot.finishedPhoto, null);

  // Omitted parts are kept as they are.
  const kept = applyFinish(withCamera, STAGES, { layers: [] }, ids);
  assert.equal(kept.finishedPhoto, withCamera.finishedPhoto);
  assert.deepEqual(kept.glazeLayers, []);
});

test('the finished photo must be one of the pot\'s own photos, or a new non-empty one', () => {
  let pot = buildPot({ stage: 'glazed', now: NOW, stages: STAGES });
  pot = applyStage(pot, 'bisque_fired', { enteredAt: NOW });
  const entry = pot.history[pot.history.length - 1];
  pot = editEntry(pot, entry.id, { photo: blob(9) });
  pot = applyStage(pot, 'finished', { enteredAt: NOW });

  const fromHistory = applyFinish(pot, STAGES, { photo: { entryId: entry.id } });
  assert.equal(fromHistory.finishedPhoto.size, 9);
  assert.equal(fromHistory.finishedFrom, entry.id);
  assert.equal(photoOptions(fromHistory).length, 1);

  assert.throws(() => applyFinish(pot, STAGES, { photo: { entryId: 'not-mine' } }), InputError);
  assert.throws(() => applyFinish(pot, STAGES, { photo: { entryId: pot.history[0].id } }), InputError); // an entry with no photo
  assert.throws(() => applyFinish(pot, STAGES, { photo: { initial: true } }), InputError); // no photo when added
  assert.throws(() => applyFinish(pot, STAGES, { photo: { blob: blob(0) } }), InputError);
  assert.throws(() => applyFinish(pot, STAGES, { photo: { blob: null } }), InputError);
});

test('changing the choice replaces the one finished photo, and removing it clears both fields', () => {
  const pot = buildPot({ stage: 'finished', now: NOW, stages: STAGES, photo: blob(5) });
  const first = applyFinish(pot, STAGES, { photo: { blob: blob(7) } });
  const second = applyFinish(first, STAGES, { photo: { initial: true } });
  assert.equal(second.finishedPhoto.size, 5);
  assert.equal(second.finishedFrom, 'initial');
  const none = applyFinish(second, STAGES, { photo: null });
  assert.equal(none.finishedPhoto, null);
  assert.equal(none.finishedFrom, null);
  assert.equal(coverPhoto(second).size, 5);
});

test('a pot that is not in a finished status cannot be given a finished photo', () => {
  for (const stage of ['glazed', 'glaze_fired']) {
    const pot = buildPot({ stage, now: NOW, stages: STAGES, photo: blob(5) });
    assert.throws(() => applyFinish(pot, STAGES, { photo: { initial: true } }), InputError, stage);
  }
});

test('the finished view lists both finished statuses, gaps first, and flags what is missing', () => {
  const mk = (id, stage, extra, added) => ({ ...buildPot({ stage, now: NOW - added * DAY, stages: STAGES }), id, name: `pot${id}`, ...extra });
  const full = { glazeLayers: [{ glazeId: 1, coverage: '', method: '' }], finishedPhoto: blob(), finishedFrom: 'camera' };
  const pots = [
    mk(1, 'finished', full, 1),
    mk(2, 'flawed', { glazeLayers: full.glazeLayers }, 5), // no photo
    mk(3, 'finished', { finishedPhoto: blob() }, 3), // no glaze
    mk(4, 'flawed', full, 2),
    mk(5, 'glazed', {}, 0), // not finished: left out
    mk(6, 'glazed', { stage: 'failed' }, 0), // ended, but not finished
    mk(7, 'finished', {}, 9), // neither
  ];
  const shown = finishedPots(pots, STAGES);
  assert.deepEqual(shown.map((p) => p.id), [3, 2, 7, 1, 4]);
  assert.deepEqual(finishGaps(pots[1]), { photo: true, glaze: false });
  assert.deepEqual(finishGaps(pots[2]), { photo: false, glaze: true });
  assert.deepEqual(finishGaps(pots[6]), { photo: true, glaze: true });
  assert.deepEqual(finishGaps(pots[0]), { photo: false, glaze: false });
  assert.deepEqual(potsWithGlaze(shown, 1).map((p) => p.id), [2, 1, 4]);
});

test('example pots carry glaze layers in stored order and finished photos, with gaps left on purpose', () => {
  const glazeIds = { Celadon: 1, Tenmoku: 2, 'Shino White': 3, 'Rutile Blue': 4, 'Ash Green': 5 };
  const pots = examplePots(STAGES, NOW, { glazeIds, photos: { Teapot: blob() } });
  const teapot = pots.find((p) => p.name === 'Teapot');
  assert.equal(glazeLine(teapot.glazeLayers, nameLookup(Object.entries(glazeIds).map(([name, id]) => ({ id, name })))), 'Celadon over Shino White');
  assert.equal(teapot.finishedFrom, 'camera');
  const finished = finishedPots(pots, STAGES);
  assert.ok(finished.some((p) => p.stage === 'flawed'));
  assert.ok(finished.some((p) => finishGaps(p).photo) && finished.some((p) => finishGaps(p).glaze));
  assert.ok(pots.every((p) => Array.isArray(p.glazeLayers)));
});
