import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HANDED_IN_STAGES, STAGES, TYPICAL_DAYS } from '../src/lib/stages.js';
import { DAY, applyStage, buildPot, examplePots } from '../src/lib/pots.js';
import { groupForWalk, handInCandidates, handInMoves, waitDays, waitedLong } from '../src/lib/shelf.js';

const NOW = Date.UTC(2025, 5, 1, 12);

let nextId = 1;
const pot = (stage, daysAgo, extra = {}) => ({
  ...buildPot({ stage, now: NOW, stages: STAGES, occurredAt: NOW - daysAgo * DAY }),
  id: nextId++,
  ...extra,
});

test('the strip holds staff and kiln pots only, longest wait first across the three stages', () => {
  const pots = [
    pot('bisque_kiln', 2), pot('waiting_staff', 9), pot('final_firing', 5), pot('glazed', 30), pot('finished', 40), pot('formed', 1),
  ];
  const { strip } = groupForWalk(pots, STAGES);
  assert.deepEqual(strip.map((p) => [p.stage, waitDays(p, NOW)]), [['waiting_staff', 9], ['final_firing', 5], ['bisque_kiln', 2]]);
  assert.deepEqual(HANDED_IN_STAGES, ['waiting_staff', 'bisque_kiln', 'final_firing']);
});

test('other path stages become sections in stage order, longest wait first, empty ones left out', () => {
  const pots = [pot('glazed', 3), pot('formed', 1), pot('glazed', 15), pot('bone_dry', 12), pot('bisque_kiln', 1)];
  const { sections } = groupForWalk(pots, STAGES);
  assert.deepEqual(sections.map((g) => g.stage.id), ['formed', 'bone_dry', 'glazed']);
  assert.deepEqual(sections[2].pots.map((p) => waitDays(p, NOW)), [15, 3]);
});

test('finished pots and every end state go last, none in the strip or sections', () => {
  const pots = [pot('failed', 3), pot('finished', 5), pot('given', 8), pot('lump', 1), pot('flawed', 2)];
  const { strip, sections, ended } = groupForWalk(pots, STAGES);
  assert.equal(strip.length, 0);
  assert.deepEqual(sections.map((g) => g.stage.id), ['lump']);
  assert.deepEqual(ended.map((p) => p.stage), ['finished', 'flawed', 'failed', 'given']);
});

test('pots with a missing or equal stage date sort last or by age, never jump around', () => {
  const a = pot('glazed', 4, { createdAt: 200 });
  const b = pot('glazed', 4, { createdAt: 100 });
  const c = pot('glazed', 4, { stageSince: undefined });
  const [g] = groupForWalk([c, a, b], STAGES).sections;
  assert.deepEqual(g.pots.map((p) => p.id), [b.id, a.id, c.id]);
  assert.equal(waitDays(c, NOW), null);
  assert.equal(waitedLong(c, NOW), false);
});

test('the long-wait mark starts at twice the typical time and only for stages with a typical time', () => {
  const typical = TYPICAL_DAYS.bone_dry;
  assert.equal(waitedLong(pot('bone_dry', typical * 2 - 1), NOW), false);
  assert.equal(waitedLong(pot('bone_dry', typical * 2), NOW), true);
  assert.equal(waitedLong(pot('waiting_staff', 12), NOW), true);
  assert.equal(waitedLong(pot('finished', 400), NOW), false);
  assert.equal(waitedLong(pot('failed', 400), NOW), false);
  assert.equal(waitedLong(pot('glazed', 6), NOW, { glazed: 3 }, 3), false);
  assert.equal(waitedLong(pot('glazed', 9), NOW, { glazed: 3 }, 3), true);
});

test('typical times name only real stages', () => {
  const ids = new Set(STAGES.map((s) => s.id));
  assert.ok(Object.keys(TYPICAL_DAYS).every((id) => ids.has(id)));
});

test('hand-in lists pots at the stage before a kiln, longest wait first', () => {
  const pots = [pot('glazed', 3), pot('bone_dry', 12), pot('formed', 20), pot('waiting_staff', 4), pot('bisque_kiln', 9)];
  assert.deepEqual(handInCandidates(pots, STAGES).map((p) => [p.stage, waitDays(p, NOW)]), [['bone_dry', 12], ['glazed', 3]]);
});

test('hand-in moves only the checked candidates, each to waiting on staff', () => {
  const dry = pot('bone_dry', 12);
  const glazed = pot('glazed', 3);
  const other = pot('formed', 2);
  const moves = handInMoves([dry, glazed, other], new Set([dry.id, other.id]), STAGES);
  assert.deepEqual(moves.map((m) => [m.pot.id, m.to]), [[dry.id, 'waiting_staff']]);
  assert.equal(handInMoves([dry, glazed], new Set(), STAGES).length, 0);
  // applying the move leaves the pot in the strip
  const moved = applyStage(dry, moves[0].to, { enteredAt: NOW });
  assert.equal(groupForWalk([moved], STAGES).strip.length, 1);
});

test('example pots spread across strip, sections and the ended group', () => {
  const pots = examplePots(STAGES, NOW).filter((p) => !p.archivedAt).map((p, i) => ({ ...p, id: i + 1 }));
  const { strip, sections, ended } = groupForWalk(pots, STAGES);
  assert.equal(strip.length, 3);
  assert.ok(sections.length >= 4);
  assert.equal(ended.length, 2);
  assert.ok(strip.some((p) => waitedLong(p, NOW)));
});
