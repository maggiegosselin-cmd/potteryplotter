import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES } from '../src/lib/stages.js';
import {
  DAY, agoLabel, applyStage, archivePot, buildPot, canArchive, countByStage, daysInStage, editEntry, endStages, examplePots,
  fromDateInput, groupByStage, isArchived, leadOrder, migratePot, nextStageId, pathStages, progressOf, restorePot, sortNewestFirst, toDateInput, undoEntry,
} from '../src/lib/pots.js';
import { swipeThreshold } from '../src/lib/swipe.js';

const NOW = Date.UTC(2025, 5, 1, 12);

test('stages are data: ten on the path (two of them kiln stages), one waiting state, five end states', () => {
  assert.deepEqual(
    pathStages(STAGES).map((s) => s.id).slice(3, 9),
    ['bone_dry', 'bisque_kiln', 'bisque_fired', 'glazed', 'final_firing', 'glaze_fired'],
  );
  assert.equal(pathStages(STAGES).length, 10);
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
  assert.equal(pot.archivedAt, null);
  assert.equal(migratePot(pot), pot);
});

test('a saved version 2 pot keeps its stage and history when it gains archivedAt', () => {
  const saved = buildPot({ stage: 'bisque_fired', now: NOW, stages: STAGES });
  delete saved.archivedAt;
  const pot = migratePot(saved);
  assert.equal(pot.stage, 'bisque_fired');
  assert.equal(pot.history, saved.history);
  assert.equal(pot.archivedAt, null);
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

test('bone dry goes to waiting on staff, into the bisque kiln, then bisque fired; glazed likewise', () => {
  let pot = buildPot({ stage: 'bone_dry', now: NOW, stages: STAGES });
  assert.equal(nextStageId(pot, STAGES), 'waiting_staff');
  pot = applyStage(pot, 'waiting_staff', { enteredAt: NOW });
  assert.equal(nextStageId(pot, STAGES), 'bisque_kiln');
  pot = applyStage(pot, 'bisque_kiln', { enteredAt: NOW });
  assert.equal(nextStageId(pot, STAGES), 'bisque_fired');
  pot = applyStage(pot, 'bisque_fired', { enteredAt: NOW });
  assert.equal(nextStageId(pot, STAGES), 'glazed');
  pot = applyStage(pot, 'glazed', { enteredAt: NOW });
  assert.equal(nextStageId(pot, STAGES), 'waiting_staff');
  pot = applyStage(pot, 'waiting_staff', { enteredAt: NOW });
  assert.equal(nextStageId(pot, STAGES), 'final_firing');
  pot = applyStage(pot, 'final_firing', { enteredAt: NOW });
  assert.equal(nextStageId(pot, STAGES), 'glaze_fired');
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

test('list is newest first by date added, not by last stage change', () => {
  const pots = examplePots(STAGES, NOW).map((p, i) => ({ ...p, id: i + 1 }));
  const order = sortNewestFirst(pots);
  assert.equal(order[0].name, 'Pinch bowl');
  assert.equal(order[order.length - 1].name, 'Cracked jar');
  assert.ok(order.every((p, i) => i === 0 || order[i - 1].createdAt >= p.createdAt));
  // moving a pot on does not change where it sits
  const moved = pots.map((p) => (p.name === 'Cracked jar' ? applyStage(p, 'abandoned', { enteredAt: NOW }) : p));
  assert.equal(sortNewestFirst(moved).at(-1).name, 'Cracked jar');
});

test('only an ended pot can be archived; the archive keeps stage and history and records the date', () => {
  const inProgress = buildPot({ stage: 'glazed', now: NOW, stages: STAGES });
  assert.equal(canArchive(inProgress, STAGES), false);
  assert.equal(archivePot(inProgress, STAGES, NOW), inProgress);

  for (const end of ['finished', 'flawed', 'failed', 'reclaimed', 'abandoned']) {
    const ended = end === 'finished' ? buildPot({ stage: 'finished', now: NOW, stages: STAGES }) : applyStage(inProgress, end, { enteredAt: NOW });
    assert.equal(canArchive(ended, STAGES), true, end);
    const archived = archivePot(ended, STAGES, NOW + DAY);
    assert.equal(archived.archivedAt, NOW + DAY);
    assert.equal(archived.stage, end);
    assert.equal(archived.history, ended.history);
    assert.equal(canArchive(archived, STAGES), false);
    const back = restorePot(archived);
    assert.equal(isArchived(back), false);
    assert.equal(back.stage, end);
  }
});

test('example pots: archived ones are left out of the stage counts, and the new stages have counts', () => {
  const pots = examplePots(STAGES, NOW);
  assert.equal(pots.filter(isArchived).length, 2);
  assert.ok(pots.filter(isArchived).every((p) => canArchive({ ...p, archivedAt: null }, STAGES)));
  const counts = countByStage(pots.filter((p) => !isArchived(p)));
  assert.equal(counts.get('bisque_kiln'), 1);
  assert.equal(counts.get('final_firing'), 1);
  assert.equal(counts.get('failed'), undefined);
});

test('how long ago a pot was added reads naturally', () => {
  assert.equal(agoLabel(NOW, NOW), 'today');
  assert.equal(agoLabel(NOW - 3 * DAY, NOW), '3 days ago');
  assert.equal(agoLabel(NOW - 21 * DAY, NOW), '3 weeks ago');
});

test('the silhouette fills along the path', () => {
  assert.equal(progressOf(buildPot({ stage: 'lump', now: NOW, stages: STAGES }), STAGES), 0);
  assert.equal(progressOf(buildPot({ stage: 'finished', now: NOW, stages: STAGES }), STAGES), 1);
  // the kiln stages are steps along the path: 4 of 9 gaps for In bisque kiln
  assert.equal(progressOf(buildPot({ stage: 'bisque_kiln', now: NOW, stages: STAGES }), STAGES), 4 / 9);
  assert.equal(progressOf(buildPot({ stage: 'final_firing', now: NOW, stages: STAGES }), STAGES), 7 / 9);
});

test('dates round-trip through the date input form', () => {
  assert.equal(toDateInput(fromDateInput('2025-03-09')), '2025-03-09');
  assert.equal(fromDateInput(''), null);
});

test('a swipe needs a wide drag', () => {
  assert.equal(swipeThreshold(200), 110);
  assert.ok(swipeThreshold(600) > 200);
});

const potAt = (id, stage, days, extra = {}) => ({
  ...buildPot({ stage: 'formed', now: NOW, stages: STAGES }),
  id, name: `Pot ${id}`, stage, stageSince: NOW - days * DAY, createdAt: NOW - id * DAY, ...extra,
});

test('shelf walk: sections follow the path from lump to finished, then waiting, then end states', () => {
  const pots = [
    potAt(1, 'given', 2), potAt(2, 'finished', 1), potAt(3, 'waiting_staff', 4), potAt(4, 'lump', 1),
    potAt(5, 'failed', 3), potAt(6, 'glazed', 5), potAt(7, 'flawed', 1),
  ];
  const groups = groupByStage(pots, STAGES, NOW);
  assert.deepEqual(groups.map((g) => g.id), ['lump', 'glazed', 'finished', 'waiting_staff', 'flawed', 'failed', 'given']);
  assert.deepEqual(groups.map((g) => g.id), leadOrder(STAGES).map((s) => s.id).filter((id) => groups.some((g) => g.id === id)));
});

test('shelf walk: longest-waiting first inside a group, with the count and longest wait', () => {
  const pots = [potAt(1, 'glazed', 3), potAt(2, 'glazed', 15), potAt(3, 'glazed', 7)];
  const [group] = groupByStage(pots, STAGES, NOW);
  assert.deepEqual(group.pots.map((p) => p.id), [2, 3, 1]);
  assert.equal(group.count, 3);
  assert.equal(group.longestDays, 15);
});

test('shelf walk: equal dates fall back to date added, and a missing date sorts last', () => {
  const pots = [potAt(3, 'formed', 2), potAt(1, 'formed', 2), potAt(2, 'formed', 2, { stageSince: undefined }), potAt(4, 'formed', 2)];
  const [group] = groupByStage(pots, STAGES, NOW);
  // added later = bigger id = older createdAt first
  assert.deepEqual(group.pots.map((p) => p.id), [4, 3, 1, 2]);
  assert.equal(groupByStage([potAt(9, 'formed', 0, { stageSince: undefined })], STAGES, NOW)[0].longestDays, null);
});

test('shelf walk: archived pots stay out, empty sections are hidden, unknown stages come last', () => {
  const pots = [potAt(1, 'finished', 3, { archivedAt: NOW }), potAt(2, 'bone_dry', 1), potAt(3, 'mystery', 1)];
  const groups = groupByStage(pots, STAGES, NOW);
  assert.deepEqual(groups.map((g) => g.id), ['bone_dry', '']);
  assert.ok(groups.every((g) => g.pots.every((p) => !isArchived(p))));
});

test('shelf walk: the example pots group without losing any active pot', () => {
  const pots = examplePots(STAGES, NOW).map((p, i) => ({ ...p, id: i + 1 }));
  const groups = groupByStage(pots, STAGES, NOW);
  assert.equal(groups.reduce((n, g) => n + g.count, 0), pots.filter((p) => !isArchived(p)).length);
  assert.equal(groups.at(-1).id, 'reclaimed');
  assert.equal(groups.find((g) => g.id === 'glazed').pots[0].name, 'Spoon rest');
});
