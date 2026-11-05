import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_STAGES,
  buildPot,
  currentEntry,
  dateInputToTime,
  daysInStage,
  describeDays,
  earlierStages,
  groupByStage,
  moveToStage,
  nextStage,
  reopenStage,
  revertLast,
} from '../src/lib/stages.js';
import { samplePots } from '../src/lib/sampleData.js';

const DAY = 86_400_000;
const NOW = new Date(2025, 5, 15, 12).getTime();

test('the stage data holds the eight-step path, the waiting state and five end states', () => {
  const kinds = (k) => DEFAULT_STAGES.filter((s) => s.kind === k);
  assert.equal(kinds('path').length, 8);
  assert.equal(kinds('waiting').length, 1);
  assert.equal(kinds('end').length, 5);
  assert.equal(new Set(DEFAULT_STAGES.map((s) => s.id)).size, DEFAULT_STAGES.length);
});

test('a new pot walks the whole path, going through waiting before each firing', () => {
  let pot = buildPot({}, DEFAULT_STAGES, NOW);
  const seen = [pot.stageId];
  for (let next = nextStage(DEFAULT_STAGES, pot); next; next = nextStage(DEFAULT_STAGES, pot)) {
    pot = moveToStage(pot, next.id, { now: NOW });
    seen.push(pot.stageId);
  }
  assert.deepEqual(seen, [
    'lump', 'formed', 'leather-hard', 'bone-dry', 'waiting', 'bisque', 'glazed', 'waiting', 'glaze-fired', 'finished',
  ]);
});

test('an ended pot has no next stage but can be put back', () => {
  let pot = buildPot({ stageId: 'leather-hard' }, DEFAULT_STAGES, NOW);
  pot = moveToStage(pot, 'failed', { now: NOW });
  assert.equal(nextStage(DEFAULT_STAGES, pot), null);
  assert.equal(reopenStage(DEFAULT_STAGES, pot).id, 'leather-hard');
});

test('waiting with no recorded firing assumes the first one', () => {
  const pot = buildPot({ stageId: 'waiting' }, DEFAULT_STAGES, NOW);
  assert.equal(nextStage(DEFAULT_STAGES, pot).id, 'bisque');
});

test('back-filled stages keep stageDate apart from enteredAt', () => {
  const pot = buildPot({ stageId: 'glazed', stageDate: NOW - 21 * DAY, earlier: ['lump', 'formed', 'bone-dry'] }, DEFAULT_STAGES, NOW);
  assert.deepEqual(pot.history.map((h) => h.stageId), ['lump', 'formed', 'bone-dry', 'glazed']);
  assert.ok(pot.history.every((h) => h.enteredAt === NOW));
  assert.equal(pot.history[0].stageDate, null);
  assert.equal(currentEntry(pot).stageDate, NOW - 21 * DAY);
  // Weeks in the stage count from when it happened, not when it was typed in.
  assert.equal(daysInStage(pot, NOW), 21);
  assert.equal(describeDays(21), '3 weeks');
});

test('earlier stages exclude waiting and end states', () => {
  assert.deepEqual(earlierStages(DEFAULT_STAGES, 'bisque').map((s) => s.id), ['lump', 'formed', 'leather-hard', 'bone-dry']);
  assert.deepEqual(earlierStages(DEFAULT_STAGES, 'lump'), []);
});

test('undo drops only the latest move', () => {
  const pot = buildPot({}, DEFAULT_STAGES, NOW);
  const moved = moveToStage(pot, 'formed', { now: NOW + 5 });
  assert.equal(revertLast(moved, NOW + 5).stageId, 'lump');
  assert.equal(revertLast(moved, NOW + 5).history.length, 1);
  assert.equal(revertLast(moved, NOW + 6), null);
  assert.equal(revertLast(pot, NOW), null);
});

test('photo is optional on a new pot', () => {
  const pot = buildPot({ name: ' Mug ', clay: 'Porcelain' }, DEFAULT_STAGES, NOW);
  assert.equal(pot.name, 'Mug');
  assert.equal('photo' in pot, false);
  assert.throws(() => buildPot({ stageId: 'nope' }, DEFAULT_STAGES, NOW), RangeError);
});

test('dates from the picker', () => {
  assert.equal(dateInputToTime('2025-06-15', NOW), NOW);
  assert.equal(dateInputToTime('2030-01-01', NOW), NOW);
  assert.equal(dateInputToTime('', NOW), NOW);
  const past = dateInputToTime('2025-05-01', NOW);
  assert.ok(past < NOW - 40 * DAY);
});

test('the shelf walk groups by stage, ends last, longest-waiting first', () => {
  const pots = samplePots(DEFAULT_STAGES, NOW).map((p, i) => ({ ...p, id: i + 1 }));
  const groups = groupByStage(DEFAULT_STAGES, pots);
  const sorts = groups.map((g) => g.stage.sort);
  assert.deepEqual(sorts, [...sorts].sort((a, b) => a - b));
  assert.equal(groups.reduce((n, g) => n + g.pots.length, 0), pots.length);
  assert.equal(groups.at(-1).stage.kind, 'end');
  const waiting = groups.find((g) => g.stage.id === 'waiting');
  assert.equal(waiting.pots.length, 3);
  assert.ok(currentEntry(waiting.pots[0]).stageDate < currentEntry(waiting.pots[1]).stageDate);
  assert.ok(new Set(groups.map((g) => g.stage.kind)).size === 3);
});
