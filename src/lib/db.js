import Dexie from 'dexie';
import { STAGES, upgradeStage } from './stages.js';
import { addedStage, editedStage, orderAfter, reorder } from './stageEdit.js';
import { applyStage, archivePot, buildPot, editEntry, examplePots, migratePot, restorePot, undoEntry } from './pots.js';

// Dexie (free core) over IndexedDB. A pot is one row that holds the shrunk
// photo as a Blob, so the record and its photo are written in one transaction.
// Version 2 adds the `stages` table and, inside each pot, a dated history list
// (the pot and its history entries are one row, so a stage change is one write).
// Version 3 adds the In bisque kiln and In final firing stage rows (and the new
// stage order) and gives each pot an `archivedAt` (null = not archived). Pots
// keep the stage they were in; none is touched except to add that field.
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

// Version 4 gives each stage row `edited`, `hidden` and `role`. Only rows the
// potter has not edited are rewritten; pots are not touched.
db.version(4)
  .stores({
    pots: '++id, createdAt, stage, stageSince',
    stages: 'id, order',
  })
  .upgrade((tx) =>
    tx.table('stages').toCollection().modify((row) => {
      if (!row.edited) Object.assign(row, upgradeStage(row));
    }),
  );

// A brand-new install never runs the upgrade, so it gets the stages here.
db.on('populate', (tx) => tx.table('stages').bulkAdd(STAGES));

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
    if (err instanceof StorageError) throw err;
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
  return write(async () => {
    const stages = await db.stages.toArray();
    const id = await db.pots.add(buildPot({ ...fields, stages }));
    const saved = await db.pots.get(id);
    if (!saved || (fields.photo && (!saved.photo || saved.photo.size !== fields.photo.size))) {
      throw new Error('pot did not read back');
    }
    return saved;
  });
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

export function addExamples() {
  return write(async () => {
    const stages = await db.stages.toArray();
    await db.pots.bulkAdd(examplePots(stages));
  });
}
