import Dexie from 'dexie';
import { STAGES, upgradeStage } from './stages.js';
import { addedStage, editedStage, orderAfter, reorder } from './stageEdit.js';
import {
  applyFinish, applyGlazes, applyStage, archivePot, buildPot, editEntry, examplePhotoNames, examplePots, EXAMPLE_GLAZES, isFinished,
  migratePot, restorePot, stageMap, undoEntry,
} from './pots.js';
import { InputError, cleanGlazeName, findGlaze, usesGlaze } from './glazes.js';
import { makeSwatchPhoto } from './samplePhoto.js';
import { FIRST_POT } from './firstPot.js';

// Dexie (free core) over IndexedDB. A pot is one row that holds the shrunk
// photo as a Blob, so the record and its photo are written in one transaction.
// Version 2 adds the `stages` table and, inside each pot, a dated history list
// (the pot and its history entries are one row, so a stage change is one write).
// Version 3 adds the In bisque kiln and In final firing stage rows (and the new
// stage order) and gives each pot an `archivedAt` (null = not archived). Pots
// keep the stage they were in; none is touched except to add that field.
// Version 4 adds the potter's `glazes` shelf (id, name), which starts empty, and
// gives each pot `glazeLayers` (glaze ids with coverage and method) and a
// `finishedPhoto` Blob, both in the pot's own row. Pots keep their stage.
// Version 5 adds `edited`, `hidden` and `role` to the stage rows (see below).
// Version 6 adds the small `flags` table (key). It holds one row, `firstPot`, that
// leads the first-open coach until the first pot is saved; no pot or stage changes.
export const db = new Dexie('pot-log');

db.version(1).stores({
  pots: '++id, createdAt',
});

db.version(2)
  .stores({
    pots: '++id, createdAt, stage, stageSince',
    stages: 'id, order',
  })
  .upgrade(async (tx) => {
    await tx.table('stages').bulkPut(STAGES);
    await tx.table('pots').toCollection().modify((pot) => {
      Object.assign(pot, migratePot(pot));
    });
  });

db.version(3)
  .stores({
    pots: '++id, createdAt, stage, stageSince',
    stages: 'id, order',
  })
  .upgrade(async (tx) => {
    await tx.table('stages').bulkPut(STAGES);
    await tx.table('pots').toCollection().modify((pot) => {
      Object.assign(pot, migratePot(pot));
    });
  });

db.version(4)
  .stores({
    pots: '++id, createdAt, stage, stageSince',
    stages: 'id, order',
    glazes: '++id, name',
  })
  .upgrade(async (tx) => {
    await tx.table('stages').bulkPut(STAGES);
    await tx.table('pots').toCollection().modify((pot) => {
      Object.assign(pot, migratePot(pot));
    });
  });

// Version 5 gives each stage row `edited`, `hidden` and `role`. Only rows the
// potter has not edited are rewritten; pots are not touched.
db.version(5)
  .stores({
    pots: '++id, createdAt, stage, stageSince',
    stages: 'id, order',
    glazes: '++id, name',
  })
  .upgrade((tx) =>
    tx.table('stages').toCollection().modify((row) => {
      if (!row.edited) Object.assign(row, upgradeStage(row));
    }),
  );

// Version 6 adds the `flags` table. A phone that already holds pots is left alone;
// one with none yet gets the first-open coach too.
db.version(6)
  .stores({
    pots: '++id, createdAt, stage, stageSince',
    stages: 'id, order',
    glazes: '++id, name',
    flags: 'key',
  })
  .upgrade(async (tx) => {
    if ((await tx.table('pots').count()) === 0) await tx.table('flags').put({ key: FIRST_POT, since: Date.now() });
  });

// A brand-new install never runs the upgrade, so it gets the stages and the first-open flag here.
db.on('populate', (tx) =>
  tx.table('stages').bulkAdd(STAGES).then(() => tx.table('flags').put({ key: FIRST_POT, since: Date.now() })),
);

export class StorageError extends Error {
  /** kind: 'quota' | 'unavailable' | 'unverified' | 'unknown' */
  constructor(kind, message, cause) {
    super(message);
    this.name = 'StorageError';
    this.kind = kind;
    this.cause = cause;
  }
}

function names(err) {
  const out = [];
  for (let e = err; e && out.length < 5; e = e.inner || e.cause) out.push(e.name);
  return out;
}

export function explainStorageError(err) {
  const n = names(err);
  if (n.includes('QuotaExceededError')) {
    return new StorageError('quota', "Your phone is out of space, so this pot was not saved. Free up some space and try again.", err);
  }
  if (n.some((x) => ['OpenFailedError', 'InvalidStateError', 'SecurityError', 'DatabaseClosedError', 'UnknownError'].includes(x))) {
    return new StorageError(
      'unavailable',
      "This browser won't let the app keep pots (private browsing?). Open Pot Log from the home screen and try again.",
      err,
    );
  }
  return new StorageError('unknown', 'The pot was not saved. Please try again.', err);
}

// Runs a write, turning storage failures into messages the potter can act on.
async function write(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof StorageError || err instanceof InputError) throw err;
    if (err && err.message === 'pot did not read back') {
      throw new StorageError('unverified', "The pot could not be confirmed in storage. Please try again.", err);
    }
    throw explainStorageError(err);
  }
}

/**
 * Saves a new pot (photo optional, any stage) with its history, then reads it
 * back so success is only reported once it is really in storage.
 */
export function savePot(fields) {
  return write(() =>
    db.transaction('rw', db.pots, db.stages, db.glazes, async () => {
      const stages = await db.stages.toArray();
      let pot = buildPot({ ...fields, stages });
      // A finished pot can be saved with its glaze layers and finished photo in the same write.
      const { layers, finishedPhoto } = fields;
      if (isFinished(stageMap(stages).get(pot.stage)) && (layers?.length || finishedPhoto)) {
        const glazeIds = (await db.glazes.toArray()).map((g) => g.id);
        pot = applyFinish(pot, stages, { layers: layers?.length ? layers : undefined, photo: finishedPhoto || undefined }, glazeIds);
      }
      const id = await db.pots.add(pot);
      const saved = await db.pots.get(id);
      const lost = (blob, got) => blob && (!got || got.size !== blob.size);
      if (!saved || lost(pot.photo, saved.photo) || lost(pot.finishedPhoto, saved.finishedPhoto)) {
        throw new Error('pot did not read back');
      }
      return saved;
    }),
  );
}

/**
 * Moves pots on, each with its history entry, in one transaction: either every
 * pot changes or none does. changes: [{ potId, to, entryId, occurredAt? }].
 * Resolves the changes that were applied.
 */
export function changeStages(changes) {
  return write(() =>
    db.transaction('rw', db.pots, async () => {
      const done = [];
      for (const c of changes) {
        const pot = await db.pots.get(c.potId);
        if (!pot) continue;
        await db.pots.put(applyStage(pot, c.to, { entryId: c.entryId, occurredAt: c.occurredAt }));
        done.push(c);
      }
      return done;
    }),
  );
}

/** Takes back changes made by changeStages, newest entry first. */
export function undoChanges(changes) {
  return write(() =>
    db.transaction('rw', db.pots, async () => {
      for (const c of changes) {
        const pot = await db.pots.get(c.potId);
        if (pot) await db.pots.put(undoEntry(pot, c.entryId));
      }
    }),
  );
}

/**
 * Archives pots that have ended, in one transaction. Pots still in progress are
 * left alone. Resolves the ids that were archived.
 */
export function archivePots(ids, at = Date.now()) {
  return write(() =>
    db.transaction('rw', db.pots, db.stages, async () => {
      const stages = await db.stages.toArray();
      const done = [];
      for (const id of ids) {
        const pot = await db.pots.get(id);
        if (!pot) continue;
        const next = archivePot(pot, stages, at);
        if (next === pot) continue;
        await db.pots.put(next);
        done.push(id);
      }
      return done;
    }),
  );
}

/** Brings archived pots back to the main list. Resolves the ids that were restored. */
export function restorePots(ids) {
  return write(() =>
    db.transaction('rw', db.pots, async () => {
      const done = [];
      for (const id of ids) {
        const pot = await db.pots.get(id);
        if (!pot) continue;
        const next = restorePot(pot);
        if (next === pot) continue;
        await db.pots.put(next);
        done.push(id);
      }
      return done;
    }),
  );
}

export function editPot(potId, patch) {
  return write(() =>
    db.transaction('rw', db.pots, async () => {
      const pot = await db.pots.get(potId);
      if (!pot) return;
      const next = { ...pot };
      for (const key of ['name', 'clay', 'notes']) if (typeof patch[key] === 'string') next[key] = patch[key].trim();
      await db.pots.put(next);
    }),
  );
}

/** Edits one history line (date, note, photo). */
export function updateEntry(potId, entryId, patch) {
  return write(() =>
    db.transaction('rw', db.pots, async () => {
      const pot = await db.pots.get(potId);
      if (pot) await db.pots.put(editEntry(pot, entryId, patch));
    }),
  );
}

/** Renames or retags one stage. Its id never changes, so pots and history keep pointing at it. */
export function saveStage(id, patch) {
  return write(() =>
    db.transaction('rw', db.stages, async () => {
      const row = await db.stages.get(id);
      if (row) await db.stages.put(editedStage(row, patch));
    }),
  );
}

/** Adds a stage right after another one in the list. Resolves the new row. */
export function addStage(afterId, fields) {
  return write(() =>
    db.transaction('rw', db.stages, async () => {
      const order = orderAfter(await db.stages.toArray(), afterId);
      const row = addedStage({ ...fields, order });
      await db.stages.add(row);
      return row;
    }),
  );
}

/** Moves a stage one place earlier (-1) or later (1) by swapping order with its neighbour. */
export function moveStage(id, dir) {
  return write(() =>
    db.transaction('rw', db.stages, async () => {
      for (const c of reorder(await db.stages.toArray(), id, dir)) {
        await db.stages.update(c.id, { order: c.order, edited: true });
      }
    }),
  );
}

/** Ends the first-open coach. Safe to call again; it never touches a pot. */
export function clearFirstPot() {
  return write(() => db.flags.delete(FIRST_POT));
}

export const countPotsAt = (stageId) => db.pots.where('stage').equals(stageId).count();

/**
 * Hides a stage (never deletes it). With `moveTo`, the pots sitting in it move
 * on to that stage, each with a history entry, in the same transaction.
 * Resolves how many pots moved.
 */
export function hideStage(id, moveTo = null) {
  return write(() =>
    db.transaction('rw', db.stages, db.pots, async () => {
      await db.stages.update(id, { hidden: true, edited: true });
      if (!moveTo) return 0;
      const pots = await db.pots.where('stage').equals(id).toArray();
      for (const pot of pots) await db.pots.put(applyStage(pot, moveTo));
      return pots.length;
    }),
  );
}

export function showStage(id) {
  return write(() => db.stages.update(id, { hidden: false, edited: true }));
}

/** Puts a glaze on the shelf and resolves it; a name already there (any case) resolves the existing one. */
export function addGlaze(name) {
  return write(() =>
    db.transaction('rw', db.glazes, async () => {
      const clean = cleanGlazeName(name);
      const same = findGlaze(await db.glazes.toArray(), clean);
      if (same) return same;
      return { id: await db.glazes.add({ name: clean }), name: clean };
    }),
  );
}

/** Renames a shelf glaze; every pot that uses it shows the new name, because pots keep only its id. */
export function renameGlaze(id, name) {
  return write(() =>
    db.transaction('rw', db.glazes, async () => {
      const clean = cleanGlazeName(name);
      if (findGlaze(await db.glazes.toArray(), clean, id)) throw new InputError('Another glaze on your shelf already has that name.');
      if (!(await db.glazes.update(id, { name: clean }))) throw new InputError('That glaze is no longer on your shelf.');
    }),
  );
}

/** Takes a glaze off the shelf. A glaze still used by a pot stays, so no pot loses its glaze name. */
export function removeGlaze(id) {
  return write(() =>
    db.transaction('rw', db.pots, db.glazes, async () => {
      const using = (await db.pots.toArray()).filter((p) => usesGlaze(p, id)).length;
      if (using) {
        throw new InputError(`This glaze is on ${using === 1 ? '1 pot' : `${using} pots`}. Take it off ${using === 1 ? 'that pot' : 'those pots'} first.`);
      }
      await db.glazes.delete(id);
    }),
  );
}

/** Replaces a pot's glaze layers (stored order, first coat first). */
export function setGlazeLayers(potId, layers) {
  return write(() =>
    db.transaction('rw', db.pots, db.stages, db.glazes, async () => {
      const pot = await db.pots.get(potId);
      if (!pot) throw new InputError('This pot is no longer here.');
      const stages = await db.stages.toArray();
      const glazeIds = (await db.glazes.toArray()).map((g) => g.id);
      await db.pots.put(applyGlazes(pot, stages, layers, glazeIds));
    }),
  );
}

/**
 * Saves a finished pot's glaze layers and finished photo choice in one transaction:
 * both are written or neither. `photo`: a new { blob }, { initial: true } or
 * { entryId } to use a photo the pot already has, null to remove it, or leave it
 * out to keep it.
 */
export function finishPot(potId, { layers, photo }) {
  return write(() =>
    db.transaction('rw', db.pots, db.stages, db.glazes, async () => {
      const pot = await db.pots.get(potId);
      if (!pot) throw new InputError('This pot is no longer here.');
      const stages = await db.stages.toArray();
      const glazeIds = (await db.glazes.toArray()).map((g) => g.id);
      await db.pots.put(applyFinish(pot, stages, { layers, photo }, glazeIds));
    }),
  );
}

const EXAMPLE_COLORS = ['#6fa3a0', '#7a4a2b', '#c9b99a', '#3f6fa5', '#6c8a4b', '#b5683c'];

export async function addExamples() {
  // Pictures are drawn first: a Dexie transaction cannot wait on the canvas.
  const photos = {};
  for (const [i, name] of examplePhotoNames().entries()) photos[name] = await makeSwatchPhoto(EXAMPLE_COLORS[i % EXAMPLE_COLORS.length]);
  return write(() =>
    db.transaction('rw', db.pots, db.stages, db.glazes, async () => {
      const stages = await db.stages.toArray();
      const shelf = await db.glazes.toArray();
      const glazeIds = {};
      for (const name of EXAMPLE_GLAZES) {
        const same = findGlaze(shelf, name);
        glazeIds[name] = same ? same.id : await db.glazes.add({ name });
      }
      await db.pots.bulkAdd(examplePots(stages, Date.now(), { glazeIds, photos }));
    }),
  );
}
