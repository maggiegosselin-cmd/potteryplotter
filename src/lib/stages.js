// Stages as data, plus the pure functions that move a pot between them.
// No browser APIs and no Dexie here, so everything can be unit-tested in Node.
//
// A stage row: { id, name, kind, sort, next, hold, color }
//   kind  'path'    a step on the way from lump to finished
//         'waiting' the pot is handed in and waits for a firing
//         'end'     the pot has left the path for good (failed, reclaimed, ...)
//   next  the id a path stage moves on to (null at the end of the path)
//   hold  a path stage whose next move goes through this waiting stage first
//   color the clay-state colour of the card's band
// The names, order and set are candidates from discovery/pot-journey-stages;
// a later hop can let a potter edit the rows in the `stages` table.
export const DEFAULT_STAGES = [
  { id: 'lump', name: 'Lump', kind: 'path', sort: 10, next: 'formed', color: '#a8643f' },
  { id: 'formed', name: 'Formed', kind: 'path', sort: 20, next: 'leather-hard', color: '#97583a' },
  { id: 'leather-hard', name: 'Leather hard', kind: 'path', sort: 30, next: 'bone-dry', color: '#b98a6a' },
  { id: 'bone-dry', name: 'Bone dry', kind: 'path', sort: 40, next: 'bisque', hold: 'waiting', color: '#dcc3a3' },
  { id: 'waiting', name: 'Waiting for firing', kind: 'waiting', sort: 45, next: null, color: '#c9b48f' },
  { id: 'bisque', name: 'Bisque fired', kind: 'path', sort: 50, next: 'glazed', color: '#e0a283' },
  { id: 'glazed', name: 'Glazed', kind: 'path', sort: 60, next: 'glaze-fired', hold: 'waiting', color: '#7ea39d' },
  { id: 'glaze-fired', name: 'Glaze fired', kind: 'path', sort: 70, next: 'finished', color: '#46767a' },
  { id: 'finished', name: 'Finished', kind: 'path', sort: 80, next: null, color: '#5f8a4e' },
  { id: 'finished-flawed', name: 'Finished, with a flaw', kind: 'end', sort: 90, next: null, color: '#c0913a' },
  { id: 'failed', name: 'Failed', kind: 'end', sort: 91, next: null, color: '#a3271c' },
  { id: 'reclaimed', name: 'Reclaimed', kind: 'end', sort: 92, next: null, color: '#8a7f73' },
  { id: 'abandoned', name: 'Abandoned', kind: 'end', sort: 93, next: null, color: '#9a9a94' },
  { id: 'given', name: 'Given or sold', kind: 'end', sort: 94, next: null, color: '#8f7a5a' },
];

export const FIRST_STAGE_ID = 'lump';
export const FAILED_STAGE_ID = 'failed';

const DAY = 86_400_000;

export const byId = (stages) => new Map(stages.map((s) => [s.id, s]));
export const bySort = (stages) => [...stages].sort((a, b) => a.sort - b.sort);
export const endStages = (stages) => bySort(stages).filter((s) => s.kind === 'end');

/** The stage a pot is in now, from its latest history entry (entry time never decides). */
export const currentEntry = (pot) => pot.history[pot.history.length - 1];

/** The stage a "next" tap would move the pot to, or null for a finished or ended pot. */
export function nextStage(stages, pot) {
  const all = byId(stages);
  const cur = all.get(pot.stageId);
  if (!cur || cur.kind === 'end') return null;
  if (cur.kind === 'waiting') {
    // Resume after whichever path stage the pot was handed in from.
    const from = [...pot.history].reverse().map((e) => all.get(e.stageId)).find((s) => s && s.kind === 'path' && s.hold === cur.id);
    const via = from || bySort(stages).find((s) => s.kind === 'path' && s.hold === cur.id);
    return (via && all.get(via.next)) || null;
  }
  if (cur.hold && all.has(cur.hold)) return all.get(cur.hold);
  return (cur.next && all.get(cur.next)) || null;
}

/** Where "put it back" sends an ended pot: the last stage it held before it ended. */
export function reopenStage(stages, pot) {
  const all = byId(stages);
  const cur = all.get(pot.stageId);
  if (!cur || cur.kind !== 'end') return null;
  const before = [...pot.history].reverse().map((e) => all.get(e.stageId)).find((s) => s && s.kind !== 'end');
  return before || null;
}

/** Path stages that come before `id`: what a pot starting there has been through. */
export function earlierStages(stages, id) {
  const target = byId(stages).get(id);
  if (!target) return [];
  return bySort(stages).filter((s) => s.kind === 'path' && s.sort < target.sort);
}

/**
 * Appends a history entry and makes it current. `stageDate` is when the pot
 * really reached the stage (back-fillable); `enteredAt` is when it was typed in.
 */
export function moveToStage(pot, toId, { now = Date.now(), stageDate = now } = {}) {
  return {
    ...pot,
    stageId: toId,
    history: [...pot.history, { stageId: toId, stageDate, enteredAt: now }],
  };
}

/** Undo of the latest move: drops its entry, only if it is still the latest. Otherwise null. */
export function revertLast(pot, enteredAt) {
  const last = currentEntry(pot);
  if (pot.history.length < 2 || last.enteredAt !== enteredAt) return null;
  const history = pot.history.slice(0, -1);
  return { ...pot, stageId: history[history.length - 1].stageId, history };
}

/**
 * A new pot record. `earlier` are stage ids the potter remembers it passing
 * through: they get history entries with no stageDate (unknown), entered now.
 */
export function buildPot(
  { name = '', clay = '', notes = '', stageId = FIRST_STAGE_ID, stageDate, earlier = [], photo, width, height } = {},
  stages = DEFAULT_STAGES,
  now = Date.now(),
) {
  const all = byId(stages);
  if (!all.has(stageId)) throw new RangeError(`Unknown stage ${stageId}`);
  const before = bySort(stages).filter((s) => earlier.includes(s.id) && s.id !== stageId);
  const history = [
    ...before.map((s) => ({ stageId: s.id, stageDate: null, enteredAt: now })),
    { stageId, stageDate: stageDate ?? now, enteredAt: now },
  ];
  const pot = {
    name: String(name).trim(),
    clay: String(clay).trim(),
    notes: String(notes).trim(),
    createdAt: now,
    stageId,
    history,
  };
  if (photo) Object.assign(pot, { photo, photoType: photo.type, width, height });
  return pot;
}

/** Whole days the pot has been in its current stage, by when it got there (not when it was typed in). */
export function daysInStage(pot, now = Date.now()) {
  const e = currentEntry(pot);
  const since = e.stageDate ?? e.enteredAt;
  return Math.max(0, Math.floor((now - since) / DAY));
}

export function describeDays(days) {
  if (days < 1) return 'today';
  if (days === 1) return '1 day';
  if (days < 14) return `${days} days`;
  return `${Math.floor(days / 7)} weeks`;
}

/** 'YYYY-MM-DD' from a date input to a time: now for today, else midday that local day. */
export function dateInputToTime(value, now = Date.now()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!m) return now;
  const t = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12).getTime();
  const today = new Date(now);
  const sameDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).getTime() === t;
  return sameDay || t > now ? now : t;
}

/**
 * Sections for the shelf walk: one per stage that holds pots, in stage order
 * (end states last). The pot that has waited longest comes first in each.
 */
export function groupByStage(stages, pots) {
  const all = byId(stages);
  const groups = new Map();
  for (const pot of pots) {
    const stage = all.get(pot.stageId) || { id: pot.stageId, name: 'Other', kind: 'path', sort: Infinity, color: '#9a9a94' };
    if (!groups.has(stage.id)) groups.set(stage.id, { stage, pots: [] });
    groups.get(stage.id).pots.push(pot);
  }
  const since = (p) => currentEntry(p).stageDate ?? currentEntry(p).enteredAt;
  for (const g of groups.values()) g.pots.sort((a, b) => since(a) - since(b) || a.id - b.id);
  return [...groups.values()].sort((a, b) => a.stage.sort - b.stage.sort);
}
