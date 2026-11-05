import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES } from '../src/lib/stages.js';
import { applyStage, buildPot, nextStageId, pathStages, progressOf } from '../src/lib/pots.js';
import {
  addAfter, addAtEnd, groupOf, isChanged, moveStage, ordered, renameStage, restoreAll, restoreStage, seedMissing, seedRows, setHidden,
} from '../src/lib/stageEdit.js';
import { flagText, skippedSteps } from '../src/lib/flags.js';
import { dropGap, edgeScroll } from '../src/lib/dragRows.js';

const seeded = () => seedRows();
const ids = (rows, kind) => groupOf(rows, kind).map((s) => s.id);
const orders = (rows) => ordered(rows).map((s) => s.order);

test('rename changes only the label: the id, kind and place stay, a blank name is ignored', () => {
  const next = renameStage(seeded(), 'bisque_kiln', '  Cone 06 firing ');
  const row = next.find((s) => s.id === 'bisque_kiln');
  assert.equal(row.label, 'Cone 06 firing');
  assert.equal(row.order, 5);
  assert.equal(next.length, STAGES.length);
  const rows = seeded();
  assert.equal(renameStage(rows, 'bisque_kiln', '   '), rows);
});

test('add after this puts a stage of the same kind next, with order renumbered 1..n', () => {
  const { stages, added } = addAfter(seeded(), 'glaze_fired', 'Raku firing');
  assert.equal(added.kind, 'path');
  assert.deepEqual(ids(stages, 'path').slice(-3), ['glaze_fired', added.id, 'finished']);
  assert.deepEqual(orders(stages), stages.map((_, i) => i + 1));
  assert.equal(new Set(stages.map((s) => s.id)).size, stages.length);
  // The stage that ends the path takes no stage after it, and waiting takes none at all.
  assert.equal(addAfter(seeded(), 'finished', 'x').added, null);
  assert.equal(addAfter(seeded(), 'waiting_staff', 'x').added, null);
});

test('the big add button adds before Finished on the path and at the end of end states', () => {
  const path = addAtEnd(seeded(), 'path', 'Soda firing');
  assert.deepEqual(ids(path.stages, 'path').slice(-2), [path.added.id, 'finished']);
  const end = addAtEnd(seeded(), 'end', 'Fired off-studio');
  assert.equal(ids(end.stages, 'end').at(-1), end.added.id);
  assert.equal(end.added.kind, 'end');
});

test('moving a stage to a gap reorders within its kind, and nothing goes below Finished', () => {
  const down = moveStage(seeded(), 'bone_dry', 6);
  assert.deepEqual(ids(down, 'path').slice(2, 7), ['leather_hard', 'bisque_kiln', 'bisque_fired', 'bone_dry', 'glazed']);
  const up = moveStage(seeded(), 'glazed', 3);
  assert.deepEqual(ids(up, 'path').slice(2, 5), ['leather_hard', 'glazed', 'bone_dry']);
  const rows = seeded();
  assert.equal(moveStage(rows, 'formed', 1), rows); // already there
  assert.equal(moveStage(rows, 'finished', 0), rows); // the end of the path does not move
  assert.equal(ids(moveStage(rows, 'formed', 10), 'path').at(-1), 'finished');
  assert.deepEqual(orders(down), down.map((_, i) => i + 1));
});

test('hidden stages are skipped on the way on but a pot sitting in one moves on and keeps its history', () => {
  const rows = setHidden(seeded(), 'leather_hard', true);
  const pot = buildPot({ stage: 'formed', stages: rows });
  assert.equal(nextStageId(pot, rows), 'bone_dry');
  const inside = applyStage(buildPot({ stage: 'leather_hard', stages: rows }), 'leather_hard');
  assert.equal(nextStageId(inside, rows), 'bone_dry');
  assert.equal(inside.stage, 'leather_hard');
  assert.equal(rows.find((s) => s.id === 'leather_hard').label, 'Leather hard');
  assert.ok(progressOf(inside, rows) > 0);
  assert.equal(setHidden(seeded(), 'finished', true).find((s) => s.id === 'finished').hidden, false);
});

test('hiding the waiting state sends a hand-in straight to the kiln stage', () => {
  const rows = setHidden(seeded(), 'waiting_staff', true);
  assert.equal(nextStageId(buildPot({ stage: 'bone_dry', stages: rows }), rows), 'bisque_kiln');
});

test('stages added by the potter sit on the path in order', () => {
  const { stages, added } = addAfter(seeded(), 'bisque_fired', 'Soda');
  const pot = buildPot({ stage: 'bisque_fired', stages });
  assert.equal(nextStageId(pot, stages), added.id);
  assert.equal(nextStageId(applyStage(pot, added.id), stages), 'glazed');
});

test('restore one puts back the name and visibility but keeps the place; restore all hides added stages', () => {
  let rows = renameStage(seeded(), 'glazed', 'Glaze on');
  rows = setHidden(rows, 'glazed', true);
  assert.ok(isChanged(rows.find((s) => s.id === 'glazed')));
  const one = restoreStage(moveStage(rows, 'glazed', 0), 'glazed');
  const glazed = one.find((s) => s.id === 'glazed');
  assert.equal(glazed.label, 'Glazed');
  assert.equal(glazed.hidden, false);
  assert.equal(ids(one, 'path')[0], 'glazed');

  const withCustom = addAfter(moveStage(rows, 'formed', 5), 'lump', 'Soda').stages;
  const all = restoreAll(withCustom);
  assert.deepEqual(all.filter((s) => STAGES.some((x) => x.id === s.id)).map((s) => s.label), ordered(seeded()).map((s) => s.label));
  assert.deepEqual(ids(all, 'path').filter((id) => !id.startsWith('custom_')), STAGES.filter((s) => s.kind === 'path').map((s) => s.id));
  assert.equal(all.length, STAGES.length + 1); // nothing deleted
  assert.equal(all.find((s) => s.id.startsWith('custom_')).hidden, true);
  assert.ok(all.filter((s) => !s.id.startsWith('custom_')).every((s) => !s.hidden));
});

test('the upgrade adds only the author stages a phone lacks and never replaces a row', () => {
  const have = seeded().filter((s) => s.id !== 'reclaimed').map((s) => (s.id === 'lump' ? { ...s, label: 'Clay ball' } : s));
  const missing = seedMissing(have);
  assert.deepEqual(missing.map((s) => s.id), ['reclaimed']);
  assert.equal(missing[0].hidden, false);
  assert.equal(seedMissing(seeded()).length, 0);
});

test('a skipped drying or glazing step is found by seeded id, so renames and custom stages still count', () => {
  let rows = renameStage(seeded(), 'bone_dry', 'Dry');
  rows = renameStage(rows, 'bisque_kiln', 'Cone 06');
  const pot = buildPot({ stage: 'leather_hard', stages: rows });
  assert.deepEqual(skippedSteps(pot, 'bisque_kiln', rows).map((r) => r.needs), ['bone_dry']);
  assert.equal(flagText([{ pot, to: 'bisque_kiln' }], rows), 'Dry was skipped before Cone 06.');
  assert.equal(skippedSteps(pot, 'bone_dry', rows).length, 0);
  assert.equal(skippedSteps(buildPot({ stage: 'bone_dry', stages: rows }), 'bisque_kiln', rows).length, 0);
  const glazing = buildPot({ stage: 'bisque_fired', stages: rows });
  assert.deepEqual(skippedSteps(glazing, 'final_firing', rows).map((r) => r.needs), ['glazed']);
  assert.equal(flagText([{ pot: glazing, to: 'final_firing' }, { pot: glazing, to: 'final_firing' }], rows), 'Glazed was skipped for 2 pots before In final firing.');
  // A step the potter has hidden is not expected.
  assert.equal(skippedSteps(pot, 'bisque_kiln', setHidden(rows, 'bone_dry', true)).length, 0);
  // Reordering so drying comes after the firing makes the plain next move a skip.
  const swapped = moveStage(seeded(), 'bone_dry', 6);
  const leather = buildPot({ stage: 'leather_hard', stages: swapped });
  assert.equal(nextStageId(leather, swapped), 'bisque_kiln');
  assert.equal(skippedSteps(leather, 'bisque_kiln', swapped).length, 1);
});

test('the drop line sits at the nearest gap and the list scrolls near its edges', () => {
  const rects = [0, 1, 2].map((i) => ({ top: i * 100, bottom: i * 100 + 90 }));
  assert.equal(dropGap(rects, 10), 0);
  assert.equal(dropGap(rects, 60), 1);
  assert.equal(dropGap(rects, 500), 3);
  assert.equal(dropGap(rects, 500, 2), 2);
  assert.equal(edgeScroll(400, 0, 800), 0);
  assert.ok(edgeScroll(10, 0, 800) < 0);
  assert.ok(edgeScroll(790, 0, 800) > 0);
  assert.ok(edgeScroll(790, 0, 800) > edgeScroll(730, 0, 800));
  assert.equal(pathStages(seeded()).length, 10);
});
