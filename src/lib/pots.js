// Pure record logic for pots: no browser or Dexie APIs, so it runs in Node tests.
//
// A pot (version 2) is one row:
//   { id, name, clay, notes, createdAt, photo|null, photoType, width, height,
//     stage, stageSince, history: [entry, ...], archivedAt }
// `archivedAt` is null, or the time an ended pot was moved to the archive. It is
// separate from the stage: an archived pot keeps its end state, photos and history.
// `glazeLayers` is the glaze, bottom layer first (see glaze.js). `finishedPhoto` is
// null or a Blob copy of one photo of the pot as it finished, with
// `finishedPhotoFrom` the id of the history entry it was copied from (null when it
// came from the photo taken as the pot was added). Both live in this one row, so
// a glaze change and a photo choice are one write.
// An entry is { id, stage, occurredAt, enteredAt, note, photo? }.
//   occurredAt = when the stage really happened (may be back-filled, editable)
//   enteredAt  = when the entry was typed into the app (never edited)
// `stage` and `stageSince` copy the last entry so the list can be indexed;
// every change goes through withCurrent() to keep them in step. Time in a
// stage and weeks of use are counted from occurredAt, never enteredAt.
import { WAITING_ID } from './stages.js';
import { FINISHED_STAGE_IDS, ValidationError, cleanLayers, matchesGlaze } from './glaze.js';

export const DAY = 86_400_000;

const byOrder = (a, b) => a.order - b.order;

export const stageMap = (stages) => new Map(stages.map((s) => [s.id, s]));
export const pathStages = (stages) => stages.filter((s) => s.kind === 'path').sort(byOrder);
export const endStages = (stages) => stages.filter((s) => s.kind === 'end').sort(byOrder);
export const isDone = (stage) => !!stage && (stage.kind === 'end' || !!stage.terminal);

export function newId() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
}

export function makeEntry({ stage, occurredAt, enteredAt, id = newId(), note = '' }) {
  return { id, stage, occurredAt, enteredAt, note };
}

export const currentEntry = (pot) => pot.history[pot.history.length - 1];

function withCurrent(pot, history) {
  const last = history[history.length - 1];
  return { ...pot, history, stage: last.stage, stageSince: last.occurredAt };
}

/** A new pot at any stage; `earlier` maps earlier stage ids to the dates remembered (or null). */
export function buildPot({ name, clay, notes, photo, width, height, stage, occurredAt, earlier = {}, now = Date.now(), stages }) {
  const path = pathStages(stages);
  const at = path.findIndex((s) => s.id === stage);
  if (at < 0) throw new RangeError(`Cannot start a pot at ${stage}`);
  const history = [];
  for (const s of path.slice(0, at)) {
    const when = earlier[s.id];
    if (when) history.push(makeEntry({ stage: s.id, occurredAt: when, enteredAt: now }));
  }
  history.push(makeEntry({ stage, occurredAt: occurredAt ?? now, enteredAt: now }));
  return withCurrent(
    {
      name: (name || '').trim(),
      clay: (clay || '').trim(),
      notes: (notes || '').trim(),
      createdAt: now,
      photo: photo || null,
      photoType: photo ? photo.type : '',
      width: photo ? width : 0,
      height: photo ? height : 0,
      archivedAt: null,
      glazeLayers: [],
      // A pot added already finished, with a photo: that photo is the finished one.
      finishedPhoto: photo && FINISHED_STAGE_IDS.includes(stage) ? photo : null,
      finishedPhotoFrom: null,
    },
    history,
  );
}

/**
 * Upgrades a saved pot to the current shape: a version 1 pot (name, photo,
 * createdAt) gets a history, and every pot gets `archivedAt`, `glazeLayers` and
 * `finishedPhoto`. The stage a pot is
 * in is never changed. Safe to run twice.
 */
export function migratePot(pot) {
  let next = pot;
  if (!Array.isArray(pot.history) || !pot.history.length) {
    const entry = makeEntry({ stage: 'formed', occurredAt: pot.createdAt, enteredAt: pot.createdAt });
    next = { ...withCurrent(pot, [entry]), clay: pot.clay || '', notes: pot.notes || '' };
  }
  if (next.archivedAt === undefined) next = { ...next, archivedAt: null };
  if (next.glazeLayers === undefined) next = { ...next, glazeLayers: [] };
  if (next.finishedPhoto === undefined) next = { ...next, finishedPhoto: null, finishedPhotoFrom: null };
  return next;
}

export const isArchived = (pot) => !!pot.archivedAt;

/** Only a pot that has ended (an end state, or Finished) can be archived. */
export function canArchive(pot, stages) {
  return !isArchived(pot) && isDone(stageMap(stages).get(pot.stage));
}

/** Archives an ended pot, recording when. Returns the same pot if it cannot be archived. */
export function archivePot(pot, stages, at = Date.now()) {
  return canArchive(pot, stages) ? { ...pot, archivedAt: at } : pot;
}

/** Brings an archived pot back. Returns the same pot if it is not archived. */
export function restorePot(pot) {
  return isArchived(pot) ? { ...pot, archivedAt: null } : pot;
}

/** The path stage a pot last passed through (what a waiting pot is waiting to leave). */
export function lastPathStageId(pot, stages) {
  const map = stageMap(stages);
  for (let i = pot.history.length - 1; i >= 0; i--) {
    if (map.get(pot.history[i].stage)?.kind === 'path') return pot.history[i].stage;
  }
  return null;
}

/** The stage one swipe moves a pot to, or null when it has nowhere further to go. */
export function nextStageId(pot, stages) {
  const map = stageMap(stages);
  const current = map.get(pot.stage);
  if (!current || isDone(current)) return null;
  if (current.kind === 'path' && current.viaWaiting && map.has(WAITING_ID)) return WAITING_ID;
  const path = pathStages(stages);
  const from = current.kind === 'waiting' ? lastPathStageId(pot, stages) : current.id;
  const at = path.findIndex((s) => s.id === from);
  return at >= 0 && at < path.length - 1 ? path[at + 1].id : null;
}

/** Moves a pot to a stage, adding its history entry. Returns the new pot. */
export function applyStage(pot, to, { occurredAt, enteredAt = Date.now(), entryId } = {}) {
  const entry = makeEntry({ stage: to, occurredAt: occurredAt ?? enteredAt, enteredAt, id: entryId });
  return withCurrent(pot, [...pot.history, entry]);
}

/** Takes back the last entry (only if it is `entryId`, and not the pot's first). */
export function undoEntry(pot, entryId) {
  const last = currentEntry(pot);
  if (pot.history.length < 2 || last.id !== entryId) return pot;
  const back = withCurrent(pot, pot.history.slice(0, -1));
  // A finished photo copied from the entry that is taken back goes with it.
  return pot.finishedPhotoFrom === entryId ? { ...back, finishedPhoto: null, finishedPhotoFrom: null } : back;
}

/** Changes the date, note or photo of one history line; enteredAt is left alone. */
export function editEntry(pot, entryId, patch) {
  const history = pot.history.map((e) => {
    if (e.id !== entryId) return e;
    const next = { ...e };
    if (Number.isFinite(patch.occurredAt)) next.occurredAt = patch.occurredAt;
    if (typeof patch.note === 'string') next.note = patch.note;
    if (patch.photo !== undefined) next.photo = patch.photo;
    return next;
  });
  let next = withCurrent(pot, history);
  if (patch.photo !== undefined) {
    const entry = history.find((e) => e.id === entryId);
    if (patch.photo && entry && FINISHED_STAGE_IDS.includes(entry.stage)) {
      // A photo taken at finished or flawed becomes the finished photo.
      next = { ...next, finishedPhoto: patch.photo, finishedPhotoFrom: entryId };
    } else if (!patch.photo && pot.finishedPhotoFrom === entryId) {
      next = { ...next, finishedPhoto: null, finishedPhotoFrom: null };
    }
  }
  return next;
}

export const isFinishedStatus = (pot) => FINISHED_STAGE_IDS.includes(pot.stage);

/**
 * What a finished pot (Finished, or Finished with a flaw) is still missing:
 * { glaze, photo } as booleans, or null when the pot is not in a finished status.
 * Derived from the record every time, never stored, so it cannot go stale.
 */
export function finishedGaps(pot) {
  if (!isFinishedStatus(pot)) return null;
  return { glaze: !(pot.glazeLayers && pot.glazeLayers.length), photo: !pot.finishedPhoto };
}

/** "glaze and finished photo", "glaze", ... for a pot's gaps; '' when nothing is missing. */
export function gapsText(gaps) {
  const parts = [];
  if (gaps?.glaze) parts.push('glaze');
  if (gaps?.photo) parts.push('finished photo');
  return parts.join(' and ');
}

/**
 * One validated change to the glaze and the finished photo, for one write.
 *   layers:       the whole glaze list (every layer needs a name)
 *   starEntryId:  a history entry id to copy as the finished photo, or null to remove it
 * Either or both may be given; nothing is changed unless all of it is valid.
 * A finished photo only belongs to a pot that is Finished or Finished with a flaw,
 * and only to a photo that is on that pot's own history.
 */
export function applyFinishing(pot, { layers, starEntryId } = {}) {
  let next = { ...pot };
  if (layers !== undefined) next.glazeLayers = cleanLayers(layers);
  if (starEntryId === null) {
    next = { ...next, finishedPhoto: null, finishedPhotoFrom: null };
  } else if (starEntryId !== undefined) {
    if (!isFinishedStatus(pot)) throw new ValidationError('Only a finished pot can have a finished photo.');
    const entry = pot.history.find((e) => e.id === starEntryId);
    if (!entry || !entry.photo) throw new ValidationError('That photo is not on this pot.');
    next = { ...next, finishedPhoto: entry.photo, finishedPhotoFrom: entry.id };
  }
  return next;
}

export const FINISHED_FILTERS = ['all', 'glaze', 'photo', 'complete'];

/**
 * The finished-pots view: pots in a finished status that are not archived, each
 * with its gaps, those missing something first (newest first within each group).
 * `filter` is one of FINISHED_FILTERS ('glaze' = no glaze, 'photo' = no finished
 * photo); `query` matches any layer's glaze name. Counts ignore the search text.
 */
export function finishedView(pots, { filter = 'all', query = '' } = {}) {
  const all = sortNewestFirst(pots.filter((p) => !isArchived(p) && isFinishedStatus(p))).map((pot) => {
    const gaps = finishedGaps(pot);
    return { pot, gaps, incomplete: gaps.glaze || gaps.photo };
  });
  const counts = {
    all: all.length,
    glaze: all.filter((r) => r.gaps.glaze).length,
    photo: all.filter((r) => r.gaps.photo).length,
    complete: all.filter((r) => !r.incomplete).length,
  };
  const keep = {
    all: () => true,
    glaze: (r) => r.gaps.glaze,
    photo: (r) => r.gaps.photo,
    complete: (r) => !r.incomplete,
  }[filter] || (() => true);
  const rows = all.filter((r) => keep(r) && matchesGlaze(r.pot, query));
  return { rows: [...rows.filter((r) => r.incomplete), ...rows.filter((r) => !r.incomplete)], counts };
}

export function daysInStage(pot, now = Date.now()) {
  return Math.max(0, Math.floor((now - pot.stageSince) / DAY));
}

export function daysLabel(days) {
  if (days === 0) return 'today';
  return days === 1 ? '1 day' : `${days} days`;
}

/** Most recently added first (by when the pot was added, not when it last moved). */
export function sortNewestFirst(pots) {
  return [...pots].sort((a, b) => b.createdAt - a.createdAt || b.id - a.id);
}

/** "today", "3 days ago", "3 weeks ago", ... for how long ago a pot was added. */
export function agoLabel(ts, now = Date.now()) {
  const days = Math.max(0, Math.floor((now - ts) / DAY));
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 730) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

/** 0..1 along the path, for the filling silhouette. */
export function progressOf(pot, stages) {
  const path = pathStages(stages);
  const id = lastPathStageId(pot, stages);
  const at = path.findIndex((s) => s.id === id);
  return at < 0 || path.length < 2 ? 0 : at / (path.length - 1);
}

/** Newest photo in the history, else the one taken when the pot was added. */
export function coverPhoto(pot) {
  for (let i = pot.history.length - 1; i >= 0; i--) if (pot.history[i].photo) return pot.history[i].photo;
  return pot.photo || null;
}

export function countByStage(pots) {
  const counts = new Map();
  for (const p of pots) counts.set(p.stage, (counts.get(p.stage) || 0) + 1);
  return counts;
}

/**
 * Fictional pots for trying the app out. Two of them are archived. Some finished
 * pots have glaze and a finished photo, some only one of them, some neither, so
 * the finished-pots view shows its gaps. `photos` maps a colour name to a Blob
 * (see samplePhoto.js); without it the example pots have no photos.
 */
export function examplePots(stages, now = Date.now(), photos = {}) {
  const layer = (id, name, coverage = '', method = '') => ({ id, name, coverage, method });
  // [name, clay, stage, days in that stage, days since added, archived, extras]
  // extras: glaze (bottom first), photo (a colour for the photo at this stage), star (the photo is the finished one)
  const specs = [
    ['Pinch bowl', 'Speckled buff', 'bisque_kiln', 2, 0],
    ['Wedged lump', 'Porcelain', 'lump', 1, 1],
    ['Tall mug', 'Stoneware', 'formed', 2, 2],
    ['Tall vase', 'Stoneware', 'glazed', 3, 3, false, { glaze: [layer('g1', 'Celadon', 'all', 'dip')] }],
    ['Coil planter', 'Terracotta', 'bisque_fired', 4, 6],
    ['Slab vase', 'Stoneware', 'bone_dry', 12, 8],
    ['Mug set', 'Stoneware', 'final_firing', 2, 9],
    ['Tea set cup', 'Porcelain', 'waiting_staff', 9, 14],
    ['Celadon bowl', 'Porcelain', 'finished', 6, 12, false, { glaze: [layer('g2', 'Celadon', 'all', 'dip')], photo: 'teal', star: true }],
    ['Ash jar', 'Stoneware', 'flawed', 4, 16, false, {
      glaze: [layer('g3', 'Tenmoku', 'all', 'dip'), layer('g4', 'Ash', 'outside', 'brush')], photo: 'brown', star: true,
    }],
    ['Spoon rest', 'Stoneware', 'glazed', 15, 18, false, { glaze: [layer('g5', 'Tenmoku', 'all', 'dip'), layer('g6', 'Shino white', 'rim', 'brush')] }],
    ['Teapot', 'Stoneware', 'finished', 5, 21, false, { photo: 'teal' }],
    ['Rim cup', 'Stoneware', 'finished', 8, 25, false, { glaze: [layer('g7', 'Shino white', 'all', 'dip'), layer('g8', 'Iron red', 'rim', 'brush')] }],
    ['Tea bowl', 'Stoneware', 'flawed', 11, 30, false, { photo: 'brown', star: true }],
    ['Bud vase', 'Porcelain', 'reclaimed', 10, 28],
    ['Serving dish', 'Speckled buff', 'finished', 3, 40, true],
    ['Cracked jar', 'Stoneware', 'failed', 20, 55, true],
  ];
  // Where a pot that is not on the path (or is waiting) came from.
  const from = { waiting_staff: 'bone_dry', failed: 'leather_hard', reclaimed: 'formed' };
  const path = pathStages(stages);
  return specs.map(([name, clay, stage, days, added, archived, extras = {}], i) => {
    const entered = now - added * DAY - i * 60_000;
    const since = now - days * DAY;
    const upto = from[stage] || stage;
    const steps = path.slice(0, path.findIndex((s) => s.id === upto) + 1).map((s) => s.id);
    if (from[stage]) steps.push(stage);
    const history = steps.map((id, k) =>
      makeEntry({
        stage: id,
        occurredAt: k === steps.length - 1 ? since : since - (steps.length - 1 - k) * 3 * DAY,
        enteredAt: entered,
        id: `${name}-${id}`,
      }),
    );
    const photo = extras.photo ? photos[extras.photo] || null : null;
    if (photo) history[history.length - 1].photo = photo;
    const starred = photo && extras.star;
    return withCurrent(
      {
        name, clay, notes: '', createdAt: entered, photo: null, photoType: '', width: 0, height: 0,
        archivedAt: archived ? now - 2 * DAY : null,
        glazeLayers: extras.glaze || [],
        finishedPhoto: starred ? photo : null,
        finishedPhotoFrom: starred ? history[history.length - 1].id : null,
      },
      history,
    );
  });
}

const pad = (n) => String(n).padStart(2, '0');

/** yyyy-mm-dd in local time, for <input type="date">. */
export function toDateInput(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Local noon of a yyyy-mm-dd string, or null when it is empty or not a date. */
export function fromDateInput(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text || '');
  if (!m) return null;
  const ts = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12).getTime();
  return Number.isFinite(ts) ? ts : null;
}
