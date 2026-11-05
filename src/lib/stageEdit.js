// Pure editing of the potter's stage rows: no browser or Dexie APIs, so it runs in
// Node tests. Every function takes the rows and returns new rows to save with
// db.saveStages(); none of them removes a row. A pot and its history point at a
// stage by id, so renaming, hiding, reordering or restoring a stage never touches
// a pot. "Removing" a stage is hiding it: pots sitting there keep their label.
import { STAGES } from './stages.js';
import { newId } from './pots.js';

const RANK = { path: 0, waiting: 1, end: 2 };
const seedOf = (id) => STAGES.find((s) => s.id === id);

export const isSeeded = (stage) => !!seedOf(stage.id);
export const canHide = (stage) => !stage.terminal; // Finished ends the path, so it stays
export const canAddAfter = (stage) => stage.kind !== 'waiting' && !stage.terminal;
export const canDrag = (stage) => !stage.terminal;

/** The author's list as rows to store on a new phone. */
export const seedRows = () => STAGES.map((s) => ({ ...s, hidden: false }));

/** Author's rows whose ids this phone does not have yet. Existing rows are never replaced. */
export function seedMissing(existing, seeds = STAGES) {
  const have = new Set(existing.map((s) => s.id));
  return seeds.filter((s) => !have.has(s.id)).map((s) => ({ ...s, hidden: false }));
}

/** Rows in list order: path stages, then the waiting state, then end states. */
export function ordered(stages) {
  return stages
    .map((s, i) => [s, i])
    .sort((a, b) => RANK[a[0].kind] - RANK[b[0].kind] || a[0].order - b[0].order || a[1] - b[1])
    .map(([s]) => s);
}

export const groupOf = (stages, kind) => ordered(stages).filter((s) => s.kind === kind);

/**
 * Puts a row list in its final shape: kinds stay together, the stage that ends the
 * path stays last on it (nothing can come after it), and `order` is renumbered
 * 1..n so it always matches the list position.
 */
function settle(rows) {
  const out = [];
  for (const kind of ['path', 'waiting', 'end']) {
    const group = rows.filter((s) => s.kind === kind);
    out.push(...group.filter((s) => !s.terminal), ...group.filter((s) => s.terminal));
  }
  return out.map((s, i) => (s.order === i + 1 ? s : { ...s, order: i + 1 }));
}

const replace = (stages, id, patch) => stages.map((s) => (s.id === id ? { ...s, ...patch } : s));

/** Renames a stage in place. A blank name is ignored. */
export function renameStage(stages, id, label) {
  const text = (label || '').trim();
  const stage = stages.find((s) => s.id === id);
  if (!stage || !text || text === stage.label) return stages;
  return settle(replace(ordered(stages), id, { label: text }));
}

/** Hides or shows a stage. The stage that ends the path cannot be hidden. */
export function setHidden(stages, id, hidden) {
  const stage = stages.find((s) => s.id === id);
  if (!stage || !!stage.hidden === hidden || (hidden && !canHide(stage))) return stages;
  return settle(replace(ordered(stages), id, { hidden }));
}

/**
 * Moves a stage within its own kind to a gap: 0 is before the first row of that
 * kind, n is after the last (the gap the drop line shows). Returns the same rows
 * when the stage would stay where it is.
 */
export function moveStage(stages, id, gap) {
  const rows = ordered(stages);
  const stage = rows.find((s) => s.id === id);
  if (!stage || !canDrag(stage)) return stages;
  const group = rows.filter((s) => s.kind === stage.kind);
  const from = group.findIndex((s) => s.id === id);
  if (gap === from || gap === from + 1) return stages;
  const rest = group.filter((s) => s.id !== id);
  rest.splice(gap > from ? gap - 1 : gap, 0, stage);
  return settle([...rows.filter((s) => s.kind !== stage.kind), ...rest]);
}

/**
 * Adds a stage of the same kind right after `afterId` (waiting has one stage only).
 * Returns { stages, added } where added is the new row, or the same rows and null.
 */
export function addAfter(stages, afterId, label = 'New stage') {
  const rows = ordered(stages);
  const at = rows.findIndex((s) => s.id === afterId);
  if (at < 0 || !canAddAfter(rows[at])) return { stages, added: null };
  const added = { id: `custom_${newId()}`, label: label.trim() || 'New stage', kind: rows[at].kind, order: 0, hidden: false };
  rows.splice(at + 1, 0, added);
  const next = settle(rows);
  return { stages: next, added: next.find((s) => s.id === added.id) };
}

/** Adds a stage at the end of a kind: on the path, just before the stage that ends it. */
export function addAtEnd(stages, kind = 'path', label = 'New stage') {
  const group = groupOf(stages, kind).filter((s) => !s.terminal);
  const last = group[group.length - 1];
  if (last) return addAfter(stages, last.id, label);
  const added = { id: `custom_${newId()}`, label: label.trim() || 'New stage', kind, order: 0, hidden: false };
  const next = settle([...ordered(stages), added]);
  return { stages: next, added: next.find((s) => s.id === added.id) };
}

/** True when a seeded stage differs from the author's name or visibility. */
export function isChanged(stage) {
  const seed = seedOf(stage.id);
  return !!seed && (stage.label !== seed.label || !!stage.hidden);
}

/** Puts one seeded stage's name and visibility back. Its place in the list is kept. */
export function restoreStage(stages, id) {
  const seed = seedOf(id);
  if (!seed || !stages.some((s) => s.id === id)) return stages;
  return settle(replace(ordered(stages), id, { ...seed, order: stages.find((s) => s.id === id).order, hidden: false }));
}

/**
 * Puts the author's whole list back: seeded stages get their names, places and
 * visibility again (missing ones are added). Stages the potter added are hidden,
 * not deleted, so pots in them keep their label and history.
 */
export function restoreAll(stages) {
  const list = ordered(stages);
  const sorted = STAGES.map((s) => ({ ...s, hidden: false }));
  list.forEach((s, i) => {
    if (seedOf(s.id)) return;
    // Keep it after the row it followed (a seeded stage, or a custom one placed just before).
    const anchor = i > 0 ? sorted.findIndex((x) => x.id === list[i - 1].id) : -1;
    sorted.splice(anchor + 1, 0, { ...s, hidden: true });
  });
  return settle(sorted);
}
