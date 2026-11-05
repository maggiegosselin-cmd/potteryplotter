// Stages and the pure rules around them. No browser or database APIs, so the
// whole file is unit-tested in Node.
//
// The stage list is DATA: it is written into the `stages` table of the offline
// store and the app reads it back from there, so a later hop can let potters
// rename, add or reorder stages without touching the rules below.
//   kind 'path'    – a step on the way from lump to out of the kiln
//   kind 'waiting' – the pot is out of the potter's hands, waiting on studio staff
//   kind 'end'     – a place a pot can finish; reachable from anywhere
//   handoff        – after this path stage the next step is the waiting state
//   default        – the end state offered after the last path stage

export const DAY = 86_400_000;

export const DEFAULT_STAGES = [
  { key: 'lump', label: 'Lump', glyph: 'Lu', ink: 'umber', kind: 'path' },
  { key: 'formed', label: 'Formed', glyph: 'Fo', ink: 'umber', kind: 'path' },
  { key: 'leather_hard', label: 'Leather hard', glyph: 'LH', ink: 'moss', kind: 'path' },
  { key: 'bone_dry', label: 'Bone dry', glyph: 'BD', ink: 'moss', kind: 'path', handoff: true },
  { key: 'waiting_firing', label: 'Waiting for firing', glyph: '⋯', ink: 'plum', kind: 'waiting' },
  { key: 'bisque_fired', label: 'Bisque fired', glyph: 'Bq', ink: 'vermilion', kind: 'path' },
  { key: 'glazed', label: 'Glazed', glyph: 'Gz', ink: 'indigo', kind: 'path', handoff: true },
  { key: 'glaze_fired', label: 'Glaze fired', glyph: 'GF', ink: 'vermilion', kind: 'path' },
  { key: 'out_of_kiln', label: 'Out of the kiln', glyph: 'Ok', ink: 'indigo', kind: 'path' },
  { key: 'finished', label: 'Finished', glyph: '✓', ink: 'moss', kind: 'end', default: true },
  { key: 'finished_flaw', label: 'Finished, with a flaw', glyph: '~', ink: 'umber', kind: 'end' },
  { key: 'failed', label: 'Failed', glyph: '✕', ink: 'vermilion', kind: 'end', failure: true },
  { key: 'reclaimed', label: 'Reclaimed', glyph: '↺', ink: 'indigo', kind: 'end' },
  { key: 'abandoned', label: 'Abandoned', glyph: '–', ink: 'charcoal', kind: 'end' },
].map((stage, i) => ({ ...stage, order: i + 1 }));

// What went wrong, offered as chips after a pot is marked failed.
export const FAILURE_CAUSES = [
  'Drying crack',
  'Cracked in the firing',
  'Handle or part came off',
  'Glaze crawled',
  'Glaze ran',
  'Pinholes',
  'Broke while handling',
  'Not sure',
];

const byOrder = (a, b) => a.order - b.order;

export const sortStages = (stages) => [...stages].sort(byOrder);
export const findStage = (stages, key) => stages.find((s) => s.key === key) || null;
export const railStages = (stages) => sortStages(stages).filter((s) => s.kind !== 'end');
export const endStages = (stages) => sortStages(stages).filter((s) => s.kind === 'end');

/** The last step of the pot's history that was on the path (not waiting, not an end). */
function lastPathKey(stages, pot) {
  for (let i = (pot.history || []).length - 1; i >= 0; i--) {
    const s = findStage(stages, pot.history[i].stage);
    if (s && s.kind === 'path') return s.key;
  }
  return null;
}

/** Where the big button takes a pot next; null when the pot is at an end state. */
export function nextStageKey(stages, pot) {
  const sorted = sortStages(stages);
  const path = sorted.filter((s) => s.kind === 'path');
  const cur = findStage(sorted, pot.stage);
  if (!cur || cur.kind === 'end') return null;
  const endKey = (sorted.find((s) => s.kind === 'end' && s.default) || {}).key || null;
  if (cur.kind === 'path' && cur.handoff) {
    const wait = sorted.find((s) => s.kind === 'waiting');
    if (wait) return wait.key;
  }
  const from = cur.kind === 'waiting' ? lastPathKey(sorted, pot) : cur.key;
  const at = path.findIndex((s) => s.key === from);
  const next = path[at + 1];
  return next ? next.key : endKey;
}

/** A pot moved to a stage: new current stage plus one dated history line, as one value. */
export function applyMove(pot, key, { occurredAt, enteredAt, cause, note } = {}) {
  const entered = enteredAt ?? Date.now();
  const history = pot.history || [];
  const entry = {
    id: `${entered}-${history.length}`,
    stage: key,
    occurredAt: occurredAt ?? entered, // when it happened
    enteredAt: entered, // when it was typed in
  };
  if (cause) entry.cause = cause;
  if (note) entry.note = note;
  return { ...pot, stage: key, stageAt: entry.occurredAt, history: [...history, entry] };
}

/** Takes back the latest move. A pot's first history line cannot be undone. */
export function undoMove(pot) {
  const history = pot.history || [];
  if (history.length < 2) return pot;
  const rest = history.slice(0, -1);
  const prev = rest[rest.length - 1];
  return { ...pot, stage: prev.stage, stageAt: prev.occurredAt, history: rest };
}

/** Edits one history line (when it happened, a note, a cause) and keeps the lines in order. */
export function editEntry(pot, entryId, patch) {
  const history = (pot.history || []).map((e) => {
    if (e.id !== entryId) return e;
    const next = { ...e };
    for (const field of ['occurredAt', 'note', 'cause', 'photo', 'photoType']) {
      if (!(field in patch)) continue;
      if (patch[field] === undefined || patch[field] === '' || patch[field] === null) delete next[field];
      else next[field] = patch[field];
    }
    return next;
  });
  const sorted = history
    .map((e, i) => [e, i])
    .sort((a, b) => a[0].occurredAt - b[0].occurredAt || a[1] - b[1])
    .map(([e]) => e);
  const current = [...sorted].reverse().find((e) => e.stage === pot.stage);
  return { ...pot, history: sorted, stageAt: current ? current.occurredAt : pot.stageAt };
}

/**
 * History for a pot that starts life at any stage. `earlier` maps a path stage key to the
 * time it was reached, for the earlier stages the potter remembers; the rest are left out.
 */
export function buildHistory(stages, { stage, occurredAt, earlier = {}, enteredAt }) {
  const sorted = sortStages(stages);
  const target = findStage(sorted, stage);
  const lines = [];
  for (const s of sorted) {
    if (!target || s.order >= target.order) break;
    if (s.kind !== 'path' || !(earlier[s.key] > 0)) continue;
    lines.push({ stage: s.key, occurredAt: earlier[s.key] });
  }
  lines.push({ stage, occurredAt });
  return lines.map((l, i) => ({ id: `${enteredAt}-${i}`, ...l, enteredAt }));
}

/** Whole days a pot has been at its current stage; counted from when it happened, not when typed in. */
export function daysIn(pot, now) {
  return Math.max(0, Math.floor((now - (pot.stageAt ?? pot.createdAt)) / DAY));
}

/** Weeks since the pot came out of the final firing, from the stage's own date. Null if it never did. */
export function weeksOfUse(stages, pot, now) {
  const entry = (pot.history || []).find((e) => {
    const s = findStage(stages, e.stage);
    return s && s.kind === 'end' && s.default;
  });
  if (!entry) return null;
  return Math.max(0, Math.floor((now - entry.occurredAt) / (7 * DAY)));
}

/** Pots out of the potter's hands, longest wait first. */
export function waitingPots(stages, pots) {
  const waiting = new Set(stages.filter((s) => s.kind === 'waiting').map((s) => s.key));
  return pots.filter((p) => waiting.has(p.stage)).sort((a, b) => a.stageAt - b.stageAt);
}

/** Non-empty stage groups in stage order; inside a group the longest-sitting pot comes first. */
export function groupByStage(stages, pots) {
  const groups = sortStages(stages).map((stage) => ({ stage, pots: [] }));
  const index = new Map(groups.map((g) => [g.stage.key, g]));
  for (const pot of pots) (index.get(pot.stage) || { pots: [] }).pots.push(pot);
  for (const g of groups) g.pots.sort((a, b) => a.stageAt - b.stageAt);
  return groups.filter((g) => g.pots.length);
}

/** Brings a version 1 pot (name, photo, createdAt only) up to the version 2 record. */
export function migrateV1Pot(pot) {
  const at = pot.createdAt || Date.now();
  return {
    clay: pot.clay ?? '',
    notes: pot.notes ?? '',
    stage: 'formed',
    stageAt: at,
    history: [{ id: `${at}-0`, stage: 'formed', occurredAt: at, enteredAt: at, note: 'Saved before stages existed' }],
  };
}
