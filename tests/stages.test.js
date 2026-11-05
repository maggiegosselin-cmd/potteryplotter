import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY,
  DEFAULT_STAGES,
  applyMove,
  buildHistory,
  daysIn,
  editEntry,
  groupByStage,
  migrateV1Pot,
  nextStageKey,
  undoMove,
  waitingPots,
  weeksOfUse,
} from '../src/lib/stages.js';
import { samplePots } from '../src/lib/sample.js';
import { dateToMs, msToDate } from '../src/lib/dates.js';

const S = DEFAULT_STAGES;
const NOW = Date.UTC(2025, 5, 15, 12);
const fresh = (stage = 'lump') => ({ name: 'x', createdAt: NOW, stage, stageAt: NOW, history: [] });

test('the stage list is data: eight path stages, one waiting state, five end states', () => {
  assert.equal(S.filter((s) => s.kind === 'path').length, 8);
  assert.equal(S.filter((s) => s.kind === 'waiting').length, 1);
  assert.equal(S.filter((s) => s.kind === 'end').length, 5);
  assert.equal(new Set(S.map((s) => s.key)).size, S.length);
});

test('the big button walks the path, via the waiting state after each hand-in', () => {
  const walked = [];
  let pot = { ...fresh('lump'), history: [{ id: 'a', stage: 'lump', occurredAt: NOW, enteredAt: NOW }] };
  for (let key = nextStageKey(S, pot); key; key = nextStageKey(S, pot)) {
    walked.push(key);
    pot = applyMove(pot, key, { enteredAt: NOW });
  }
  assert.deepEqual(walked, [
    'formed', 'leather_hard', 'bone_dry', 'waiting_firing', 'bisque_fired',
    'glazed', 'waiting_firing', 'glaze_fired', 'out_of_kiln', 'finished',
  ]);
  assert.equal(pot.stage, 'finished');
});

test('a pot at an end state has no next stage', () => {
  assert.equal(nextStageKey(S, fresh('failed')), null);
});

test('a move writes the stage and its history line together, entry time apart from stage time', () => {
  const when = NOW - 20 * DAY;
  const pot = applyMove(fresh(), 'bone_dry', { occurredAt: when, enteredAt: NOW, cause: undefined });
  assert.equal(pot.stage, 'bone_dry');
  assert.equal(pot.stageAt, when);
  assert.equal(pot.history.length, 1);
  assert.equal(pot.history[0].occurredAt, when);
  assert.equal(pot.history[0].enteredAt, NOW);
  assert.equal(daysIn(pot, NOW), 20);
});

test('undo restores the previous stage and its date', () => {
  let pot = applyMove(fresh(), 'formed', { occurredAt: NOW - 3 * DAY, enteredAt: NOW });
  pot = applyMove(pot, 'leather_hard', { occurredAt: NOW - DAY, enteredAt: NOW });
  const back = undoMove(pot);
  assert.equal(back.stage, 'formed');
  assert.equal(back.stageAt, NOW - 3 * DAY);
  assert.equal(back.history.length, 1);
  assert.equal(undoMove(back), back);
});

test('editing a line changes when it happened and re-sorts the history', () => {
  let pot = applyMove(fresh(), 'formed', { occurredAt: NOW - 5 * DAY, enteredAt: NOW });
  pot = applyMove(pot, 'leather_hard', { occurredAt: NOW - 2 * DAY, enteredAt: NOW });
  const edited = editEntry(pot, pot.history[0].id, { occurredAt: NOW - 1 * DAY, note: 'late' });
  assert.deepEqual(edited.history.map((e) => e.stage), ['leather_hard', 'formed']);
  assert.equal(edited.history[1].note, 'late');
  assert.equal(edited.history[1].enteredAt, NOW);
  const current = editEntry(pot, pot.history[1].id, { occurredAt: NOW - 4 * DAY });
  assert.equal(current.stageAt, NOW - 4 * DAY);
});

test('a pot can start at any stage, back-filled only as far as remembered', () => {
  const lines = buildHistory(S, {
    stage: 'glazed',
    occurredAt: NOW - DAY,
    earlier: { lump: NOW - 60 * DAY, bone_dry: NOW - 30 * DAY, finished: NOW },
    enteredAt: NOW,
  });
  assert.deepEqual(lines.map((l) => l.stage), ['lump', 'bone_dry', 'glazed']);
  assert.ok(lines.every((l) => l.enteredAt === NOW));
  const bare = buildHistory(S, { stage: 'lump', occurredAt: NOW, enteredAt: NOW });
  assert.equal(bare.length, 1);
});

test('weeks of use count from the finished line date, not from when it was typed in', () => {
  let pot = applyMove(fresh('out_of_kiln'), 'finished', { occurredAt: NOW - 15 * DAY, enteredAt: NOW });
  assert.equal(weeksOfUse(S, pot, NOW), 2);
  assert.equal(weeksOfUse(S, fresh('glazed'), NOW), null);
});

test('waiting pots come longest-waiting first; groups follow stage order and skip empty ones', () => {
  const pots = [
    { ...fresh('waiting_firing'), id: 1, stageAt: NOW - 2 * DAY },
    { ...fresh('waiting_firing'), id: 2, stageAt: NOW - 9 * DAY },
    { ...fresh('failed'), id: 3 },
    { ...fresh('lump'), id: 4 },
  ];
  assert.deepEqual(waitingPots(S, pots).map((p) => p.id), [2, 1]);
  assert.deepEqual(groupByStage(S, pots).map((g) => g.stage.key), ['lump', 'waiting_firing', 'failed']);
  assert.deepEqual(groupByStage(S, pots)[1].pots.map((p) => p.id), [2, 1]);
});

test('a saved version 1 pot is upgraded without losing its fields', () => {
  const v1 = { id: 7, name: 'Old mug', createdAt: NOW - 9 * DAY, photo: 'blob', photoType: 'image/jpeg', width: 10, height: 8 };
  const up = { ...v1, ...migrateV1Pot(v1) };
  assert.equal(up.photo, 'blob');
  assert.equal(up.name, 'Old mug');
  assert.equal(up.stage, 'formed');
  assert.equal(up.stageAt, v1.createdAt);
  assert.equal(up.history.length, 1);
  assert.equal(up.history[0].occurredAt, v1.createdAt);
});

test('sample pots are deterministic, use known stages and cover waiting and end states', () => {
  const a = samplePots(S, NOW);
  assert.deepEqual(a, samplePots(S, NOW));
  const known = new Set(S.map((s) => s.key));
  assert.ok(a.every((p) => known.has(p.stage) && p.history.every((e) => e.enteredAt <= NOW)));
  const kinds = new Set(a.map((p) => S.find((s) => s.key === p.stage).kind));
  assert.deepEqual([...kinds].sort(), ['end', 'path', 'waiting']);
  assert.ok(a.filter((p) => p.stage === 'failed').every((p) => p.history.at(-1).cause));
});

test('date inputs round-trip and never land in the future', () => {
  const now = new Date(2025, 5, 15, 9).getTime();
  assert.equal(msToDate(dateToMs('2025-06-01', now)), '2025-06-01');
  assert.equal(dateToMs('2025-06-15', now), now);
  assert.equal(dateToMs('', now), null);
  assert.ok(dateToMs('2025-06-20', now) <= now);
});
