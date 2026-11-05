// Pure logic for editing the potter's stages and for the gentle order notes.
// No browser or Dexie APIs, so it runs in Node tests. A stage is only ever
// identified by its `id`; names, order, hidden state and roles can all change
// without touching any pot's history.
import { newId, pathStages, stageMap } from './pots.js';

export const ROLES = [
  { id: 'drying', label: 'Drying' },
  { id: 'firing', label: 'Firing' },
  { id: 'glazing', label: 'Glazing' },
];
const ROLE_IDS = ROLES.map((r) => r.id);

/** Chips offered when adding a stage after another one. */
export const SUGGESTIONS = [
  { label: 'Raku firing', kind: 'path', role: 'firing' },
  { label: 'Soda firing', kind: 'path', role: 'firing' },
  { label: 'Wood firing', kind: 'path', role: 'firing' },
  { label: 'Pit firing', kind: 'path', role: 'firing' },
  { label: 'Off-studio firing', kind: 'path', role: 'firing' },
];

const byOrder = (a, b) => a.order - b.order;

/** The kind as the potter sees it. */
export const kindLabel = (kind) => ({ path: 'On the path', waiting: 'Waiting', end: 'Ends the pot' })[kind] || kind;

/** The order changes that move a stage one place earlier (-1) or later (1): a swap with its neighbour. */
export function reorder(stages, id, dir) {
  const list = [...stages].sort(byOrder);
  const i = list.findIndex((s) => s.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return [];
  return [
    { id, order: list[j].order },
    { id: list[j].id, order: list[i].order },
  ];
}

/** An order value that puts a new stage straight after `afterId`. */
export function orderAfter(stages, afterId) {
  const list = [...stages].sort(byOrder);
  const i = list.findIndex((s) => s.id === afterId);
  if (i < 0) return (list.length ? list[list.length - 1].order : 0) + 1;
  const next = list[i + 1];
  return next ? (list[i].order + next.order) / 2 : list[i].order + 1;
}

/** A brand-new stage row with a fresh id. `kind` is 'path' or 'end'. */
export function addedStage({ label, kind, photo, role, order }) {
  return {
    id: `s_${newId()}`,
    label: (label || '').trim(),
    kind: kind === 'end' ? 'end' : 'path',
    order,
    ...(photo ? { photo: 'offer' } : {}),
    role: ROLE_IDS.includes(role) ? role : null,
    edited: true,
    hidden: false,
  };
}

/** The row with the potter's changes applied and marked edited. The id is never changed. */
export function editedStage(row, patch) {
  const next = { ...row, edited: true };
  if (typeof patch.label === 'string' && patch.label.trim()) next.label = patch.label.trim();
  if ((patch.kind === 'path' || patch.kind === 'end') && row.kind !== 'waiting') next.kind = patch.kind;
  if ('photo' in patch) {
    if (patch.photo) next.photo = row.photo || 'offer';
    else delete next.photo;
  }
  if ('role' in patch) next.role = ROLE_IDS.includes(patch.role) ? patch.role : null;
  return next;
}

const visiblePath = (stages) => pathStages(stages).filter((s) => !s.hidden);

/**
 * Notes about the list itself, read from role tags (never from names): drying
 * before the first firing, glazing before a later firing. Empty when all is well.
 */
export function orderNotes(stages) {
  const path = visiblePath(stages);
  const firings = path.filter((s) => s.role === 'firing');
  const notes = [];
  if (!firings.length) return notes;
  const first = firings[0];
  if (!path.some((s) => s.role === 'drying' && s.order < first.order)) {
    notes.push(`No stage tagged drying comes before “${first.label}”, so pots can go into the first firing undried.`);
  }
  const last = firings[firings.length - 1];
  if (last !== first && !path.some((s) => s.role === 'glazing' && s.order < last.order)) {
    notes.push(`No stage tagged glazing comes before “${last.label}”, so pots can go into it unglazed.`);
  }
  return notes;
}

/**
 * Notes about one history entry that went into a firing: a drying or glazing
 * stage that is in the list before it but that this pot never had. Stages
 * before the pot's own first entry do not count.
 */
export function skipNotes(history, index, stages) {
  const map = stageMap(stages);
  const target = map.get(history[index]?.stage);
  if (index < 1 || !target || target.kind !== 'path' || target.role !== 'firing') return [];
  const path = visiblePath(stages);
  const start = map.get(history[0].stage)?.order ?? -Infinity;
  const seen = new Set(history.slice(0, index).map((e) => e.stage));
  const wanted = path.some((s) => s.role === 'firing' && s.order < target.order) ? 'glazing' : 'drying';
  const options = path.filter((s) => s.role === wanted && s.order > start && s.order < target.order);
  if (!options.length || options.some((s) => seen.has(s.id))) return [];
  const missed = options[options.length - 1];
  return [`“${missed.label}” (${wanted}) was skipped before “${target.label}”.`];
}

/** Notes for moving a pot to `to`, shown with the move. */
export function moveNotes(pot, to, stages) {
  return skipNotes([...pot.history, { stage: to }], pot.history.length, stages);
}

/** Notes for everything in a pot's history, shown on the pot. */
export function potNotes(pot, stages) {
  return [...new Set(pot.history.flatMap((_, i) => skipNotes(pot.history, i, stages)))];
}
