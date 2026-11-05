import Dexie from 'dexie';
import { DEFAULT_STAGES, buildPot, byId, moveToStage, revertLast } from './stages.js';
import { v2Fields } from './migrate.js';
import { samplePots } from './sampleData.js';

// Dexie (free core) over IndexedDB. A pot is one row: current stage, a dated
// stage history, clay, notes and (optionally) the shrunk photo as a Blob. A
// stage change and its history entry are one row write inside one transaction.
export const db = new Dexie('pot-log');

db.version(1).stores({
  pots: '++id, createdAt',
});

// Version 2: every saved pot is kept, set to the first stage, and gains a
// history, clay and notes; the stages become a table.
db.version(2)
  .stores({
    pots: '++id, createdAt, stageId',
    stages: 'id, sort',
  })
  .upgrade(async (tx) => {
    await tx.table('stages').bulkPut(DEFAULT_STAGES);
    await tx.table('pots').toCollection().modify((pot) => {
      Object.assign(pot, v2Fields(pot));
    });
  });

// A brand-new install skips the upgrade, so it gets the stages here.
db.on('populate', (tx) => {
  tx.table('stages').bulkPut(DEFAULT_STAGES);
});

/** The stages in order; the built-in list if the table is empty or unreadable. */
export async function loadStages() {
  try {
    const rows = await db.stages.orderBy('sort').toArray();
    return rows.length ? rows : DEFAULT_STAGES;
  } catch {
    return DEFAULT_STAGES;
  }
}

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

function failure(err) {
  if (err instanceof StorageError) return err;
  if (err && err.message === 'pot did not read back') {
    return new StorageError('unverified', "The pot could not be confirmed in storage. Please try again.", err);
  }
  return explainStorageError(err);
}

/**
 * Saves a pot (a photo is optional), then reads it back so success is only
 * reported once it is really in storage. Resolves the saved pot.
 */
export async function savePot(fields) {
  try {
    const pot = buildPot(fields, await loadStages());
    const id = await db.pots.add(pot);
    const saved = await db.pots.get(id);
    if (!saved || saved.history.length !== pot.history.length || (pot.photo && (!saved.photo || saved.photo.size !== pot.photo.size))) {
      throw new Error('pot did not read back');
    }
    return saved;
  } catch (err) {
    throw failure(err);
  }
}

/**
 * Moves a pot to another stage. The history entry and the new stage are one
 * write in one transaction. `fromStageId` is the stage the potter saw: if the
 * pot has moved since (a double tap), nothing changes and null comes back.
 * Resolves { pot, enteredAt } so the move can be undone.
 */
export async function movePot(id, fromStageId, toStageId, { stageDate } = {}) {
  try {
    return await db.transaction('rw', db.pots, db.stages, async () => {
      const pot = await db.pots.get(id);
      if (!pot || pot.stageId !== fromStageId) return null;
      if (!byId(await loadStages()).has(toStageId)) throw new RangeError(`Unknown stage ${toStageId}`);
      const now = Date.now();
      const moved = moveToStage(pot, toStageId, { now, stageDate });
      await db.pots.put(moved);
      return { pot: moved, enteredAt: now };
    });
  } catch (err) {
    throw failure(err);
  }
}

/** Undoes a move made by movePot, unless something has happened to the pot since. */
export async function undoMove(id, enteredAt) {
  try {
    return await db.transaction('rw', db.pots, async () => {
      const pot = await db.pots.get(id);
      const reverted = pot && revertLast(pot, enteredAt);
      if (!reverted) return null;
      await db.pots.put(reverted);
      return reverted;
    });
  } catch (err) {
    throw failure(err);
  }
}

/** Adds or replaces a pot's photo. */
export async function setPhoto(id, { blob, width, height }) {
  try {
    await db.pots.update(id, { photo: blob, photoType: blob.type, width, height });
  } catch (err) {
    throw failure(err);
  }
}

/** Fills an empty shelf with fictional pots, for trying the app out. */
export async function addSamplePots() {
  try {
    await db.pots.bulkAdd(samplePots(await loadStages()));
  } catch (err) {
    throw failure(err);
  }
}
