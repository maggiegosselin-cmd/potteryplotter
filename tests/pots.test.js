import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES } from '../src/lib/stages.js';
import {
  DAY, applyStage, buildPot, daysInStage, editEntry, endStages, examplePots, fromDateInput, migratePot, nextStageId,
  pathStages, progressOf, sortOldestFirst, toDateInput, undoEntry,
} from '../src/lib/pots.js';
import { swipeThreshold } from '../src/lib/swipe.js';

const NOW = Date.UTC(2025, 5, 1, 12);

test('stages are data: eight on the path, one waiting state, five end states', () => {
  assert.equal(pathStages(STAGES).length, 8);
  assert.equal(STAGES.filter((s) => s.kind === 'waiting').length, 1);
  assert.equal(endStages(STAGES).length, 5);
});

test('a version 1 pot migrates without losing anything, twice over', () => {
  const old = { id: 3, name: 'Mug', createdAt: NOW - 5 * DAY, photo: 'blob', photoType: 'image/jpeg', width: 10, height: 20 };
  const pot = migratePot(old);
  assert.equal(pot.name, 'Mug');
  assert.equal(pot.photo, 'blob');
  assert.equal(pot.stage, 'formed');
  assert.equal(pot.stageSince, old.createdAt);
  assert.equal(pot.history.length, 1);
  assert.equal(migratePot(pot), pot);
});

test('a pot can start at any stage with no photo, earlier stages back-filled as remembered', () => {
  const pot = buildPot({ stage: 'glazed', now: NOW, stages: STAGES, occurredAt: NOW - 2 * DAY, earlier: { formed: NOW - 20 * DAY, bone_dry: null } });
  assert.equal(pot.photo, null);
  assert.deepEqual(pot.history.map((e) => e.stage), ['formed', 'glazed']);
  assert.equal(pot.stage, 'glazed');
  assert.equal(pot.stageSince, NOW - 2 * DAY);
  assert.ok(pot.history.every((e) => e.enteredAt === NOW));
});

test('time in stage counts from when it happened, not when it was entered', () => {
  const pot = buildPot({ stage: 'bone_dry', now: NOW, stages: STAGES, occurredAt: NOW - 9 * DAY });
  assert.equal(daysInStage(pot, NOW), 9);
  assert.equal(pot.history[0].enteredAt, NOW);
});

test('bone dry goes to waiting on staff, then on to bisque fired; glazed likewise', () => {
  let pot = buildPot({ stage: 'bone_dry', now: NOW, stages: STAGES });
  assert.equal(nextStageId(pot, STAGES), 'waiting_staff');
  pot = applyStage(pot, 'waiting_staff', { enteredAt: NOW });
  assert.equal(nextStageId(pot, STAGES), 'bisque_fired');
  pot = applyStage(pot, 'bisque_fired', { enteredAt: NOW });
  assert.equal(nextStageId(pot, STAGES), 'glazed');
  assert.equal(nextStageId(buildPot({ stage: 'glazed', now: NOW, stages: STAGES }), STAGES), 'waiting_staff');
});

test('finished and end states have no next stage', () => {
  assert.equal(nextStageId(buildPot({ stage: 'finished', now: NOW, stages: STAGES }), STAGES), null);
  const failed = applyStage(buildPot({ stage: 'formed', now: NOW, stages: STAGES }), 'failed', { enteredAt: NOW });
  assert.equal(nextStageId(failed, STAGES), null);
});

test('a stage change adds a history entry, and undo takes exactly it back', () => {
  const start = buildPot({ stage: 'formed', now: NOW - DAY, stages: STAGES });
  const moved = applyStage(start, 'leather_hard', { enteredAt: NOW, entryId: 'e1' });
  assert.equal(moved.history.length, 2);
  assert.equal(moved.stage, 'leather_hard');
  assert.equal(undoEntry(moved, 'other'), moved);
  const back = undoEntry(moved, 'e1');
  assert.equal(back.stage, 'formed');
  assert.equal(back.stageSince, start.stageSince);
});

test('editing a history date moves the stage clock but not the entry time', () => {
  const pot = applyStage(buildPot({ stage: 'formed', now: NOW - 10 * DAY, stages: STAGES }), 'leather_hard', { enteredAt: NOW, entryId: 'e1' });
  const edited = editEntry(pot, 'e1', { occurredAt: NOW - 4 * DAY });
  assert.equal(daysInStage(edited, NOW), 4);
  assert.equal(edited.history[1].enteredAt, NOW);
});

test('list is longest-waiting first with finished and end states last', () => {
  const pots = examplePots(STAGES, NOW).map((p, i) => ({ ...p, id: i + 1 }));
  const order = sortOldestFirst(pots, STAGES);
  const ids = order.map((p) => p.name);
  assert.equal(ids[0], 'Spoon rest');
  assert.deepEqual(ids.slice(-2), ['Cracked jar', 'Serving dish']);
  assert.ok(order.findIndex((p) => p.stage === 'failed') > order.findIndex((p) => p.stage === 'lump'));
});

test('the silhouette fills along the path', () => {
  assert.equal(progressOf(buildPot({ stage: 'lump', now: NOW, stages: STAGES }), STAGES), 0);
  assert.equal(progressOf(buildPot({ stage: 'finished', now: NOW, stages: STAGES }), STAGES), 1);
});

test('dates round-trip through the date input form', () => {
  assert.equal(toDateInput(fromDateInput('2025-03-09')), '2025-03-09');
  assert.equal(fromDateInput(''), null);
});

test('a swipe needs a wide drag', () => {
  assert.equal(swipeThreshold(200), 110);
  assert.ok(swipeThreshold(600) > 200);
});
