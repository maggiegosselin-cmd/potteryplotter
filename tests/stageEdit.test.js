import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, upgradeStage } from '../src/lib/stages.js';
import { addedStage, editedStage, moveNotes, orderAfter, orderNotes, potNotes, reorder } from '../src/lib/stageEdit.js';
import { applyStage, buildPot, nextStageId, pathStages } from '../src/lib/pots.js';

const NOW = Date.UTC(2025, 5, 1, 12);
const clone = () => STAGES.map((s) => ({ ...s }));

test('the author\'s list carries roles and starts unedited and visible', () => {
  const roles = Object.fromEntries(STAGES.filter((s) => s.role).map((s) => [s.id, s.role]));
  assert.deepEqual(roles, { bone_dry: 'drying', bisque_kiln: 'firing', glazed: 'glazing', final_firing: 'firing' });
  assert.ok(STAGES.every((s) => s.edited === false && s.hidden === false));
});

test('the version 4 upgrade fills fields on an old row and is safe to repeat', () => {
  const old = { id: 'glazed', label: 'Glazed', kind: 'path', order: 7 };
  const up = upgradeStage(old);
  assert.equal(up.role, 'glazing');
  assert.equal(up.edited, false);
  assert.equal(up.hidden, false);
  assert.deepEqual(upgradeStage(up), up);
  assert.equal(upgradeStage({ id: 'lump', label: 'Lump', kind: 'path', order: 1 }).role, null);
});

test('renaming keeps the id; a pot keeps its stage and history', () => {
  const pot = buildPot({ stage: 'glazed', now: NOW, stages: STAGES });
  const row = STAGES.find((s) => s.id === 'glazed');
  const next = editedStage(row, { label: 'Glaze applied', role: 'none' });
  assert.equal(next.id, 'glazed');
  assert.equal(next.label, 'Glaze applied');
  assert.equal(next.role, null);
  assert.equal(next.edited, true);
  assert.equal(pot.stage, next.id);
  assert.equal(editedStage(row, { label: '   ' }).label, 'Glazed');
});

test('the waiting row cannot change kind; the photo offer keeps an existing open camera', () => {
  const waiting = STAGES.find((s) => s.kind === 'waiting');
  assert.equal(editedStage(waiting, { kind: 'end' }).kind, 'waiting');
  const failed = STAGES.find((s) => s.id === 'failed');
  assert.equal(editedStage(failed, { photo: true }).photo, 'open');
  assert.equal('photo' in editedStage(failed, { photo: false }), false);
});

test('reorder swaps with the neighbour and does nothing at the ends', () => {
  const [a, b] = reorder(STAGES, 'formed', -1);
  assert.deepEqual([a.id, a.order, b.id, b.order], ['formed', 1, 'lump', 2]);
  assert.deepEqual(reorder(STAGES, 'lump', -1), []);
  assert.deepEqual(reorder(STAGES, 'given', 1), []);
});

test('a new firing lands right after the chosen stage and is reachable by swipe', () => {
  const stages = clone();
  const order = orderAfter(stages, 'bisque_fired');
  assert.ok(order > 6 && order < 7);
  const raku = addedStage({ label: ' Raku firing ', kind: 'path', role: 'firing', order });
  assert.match(raku.id, /^s_/);
  assert.equal(raku.label, 'Raku firing');
  stages.push(raku);
  const pot = buildPot({ stage: 'bisque_fired', now: NOW, stages });
  assert.equal(nextStageId(pot, stages), raku.id);
  assert.equal(nextStageId(applyStage(pot, raku.id), stages), 'glazed');
});

test('a hidden stage is skipped by the swipe, but a pot sitting there can move on', () => {
  const stages = clone();
  stages.find((s) => s.id === 'formed').hidden = true;
  assert.equal(nextStageId({ stage: 'lump', history: [] }, stages), 'leather_hard');
  assert.equal(nextStageId({ stage: 'formed', history: [] }, stages), 'leather_hard');
  assert.equal(pathStages(stages).length, 10);
});

test('the default list gives no order notes; removing drying or glazing does', () => {
  assert.deepEqual(orderNotes(STAGES), []);
  const noDrying = clone();
  noDrying.find((s) => s.id === 'bone_dry').hidden = true;
  assert.equal(orderNotes(noDrying).length, 1);
  assert.match(orderNotes(noDrying)[0], /drying/);
  const noGlaze = clone();
  noGlaze.find((s) => s.id === 'glazed').role = null;
  assert.match(orderNotes(noGlaze)[0], /glazing/);
});

test('notes follow roles, not names', () => {
  const stages = clone();
  const dry = stages.find((s) => s.id === 'bone_dry');
  dry.label = 'Shelf time';
  dry.role = null;
  assert.match(orderNotes(stages)[0], /“In bisque kiln”/);
  dry.role = 'drying';
  assert.deepEqual(orderNotes(stages), []);
});

test('a move that skips drying or glazing is noted; a complete pot is not', () => {
  const formed = buildPot({ stage: 'formed', now: NOW, stages: STAGES });
  const notes = moveNotes(formed, 'bisque_kiln', STAGES);
  assert.equal(notes.length, 1);
  assert.match(notes[0], /Bone dry/);

  let pot = formed;
  for (const to of ['leather_hard', 'bone_dry', 'bisque_kiln', 'bisque_fired']) pot = applyStage(pot, to);
  assert.deepEqual(potNotes(pot, STAGES), []);
  assert.match(moveNotes(pot, 'final_firing', STAGES)[0], /Glazed/);
  assert.deepEqual(moveNotes(applyStage(pot, 'glazed'), 'final_firing', STAGES), []);
  assert.deepEqual(potNotes(applyStage(applyStage(pot, 'bisque_fired'), 'final_firing'), STAGES).length, 1);
});

test('a pot added part-way is not blamed for stages before where it started', () => {
  const pot = buildPot({ stage: 'bisque_kiln', now: NOW, stages: STAGES });
  assert.deepEqual(potNotes(pot, STAGES), []);
});
