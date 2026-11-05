import Dexie from 'dexie';
import {
  DEFAULT_STAGES,
  applyMove,
  buildHistory,
  editEntry as editEntryOf,
  migrateV1Pot,
  nextStageKey,
  undoMove as undoMoveOf,
} from './stages.js';
import { samplePots } from './sample.js';

// Dexie (free core) over IndexedDB. A pot is one row that holds its current stage, its
// dated history, clay, notes and (optionally) the shrunk photo as a Blob, so a stage
// change and its history line are always written together in one transaction.
export const db = new Dexie('pot-log');

db.version(1).stores({
  pots: '++id, createdAt',
});

// Version 2: pots get a stage, history, clay and notes; the stage list becomes data.
// Every saved version 1 pot is kept and upgraded in place, photo included.
db.version(2)
  .stores({
    pots: '++id, createdAt, stage',
    stages: 'key, order',
  })
  .upgrade(async (tx) => {
    await tx.table('stages').bulkPut(DEFAULT_STAGES);
    await tx.table('pots').toCollection().modify((pot) => {
      Object.assign(pot, migrateV1Pot(pot));
    });
  });

// A brand-new install skips upgrades, so it gets the stage list here.
db.on('populate', (tx) => tx.table('stages').bulkAdd(DEFAULT_STAGES));

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

function explain(err) {
  if (err instanceof StorageError) return err;
  if (err && err.message === 'pot did not read back') {
    return new StorageError('unverified', 'The pot could not be confirmed in storage. Please try again.', err);
  }
  return explainStorageError(err);
}

const stageList = () => db.stages.orderBy('order').toArray();

/**
 * Saves a pot at any stage, with or without a photo. `earlier` holds the times of the earlier
 * stages the potter remembers. Writes the pot with its history in one transaction, then reads
 * it back so success is only reported once it is really in storage. Resolves the saved pot.
 */
export async function savePot({ name, clay, notes, photo, width, height, stage, stageAt, earlier }) {
  try {
    const enteredAt = Date.now();
    const stages = await stageList();
    const history = buildHistory(stages, { stage, occurredAt: stageAt ?? enteredAt, earlier, enteredAt });
    const record = {
      name: (name || '').trim(),
      clay: (clay || '').trim(),
      notes: (notes || '').trim(),
      createdAt: enteredAt,
      stage,
      stageAt: history[history.length - 1].occurredAt,
      history,
    };
    if (photo) Object.assign(record, { photo, photoType: photo.type, width, height });
    const id = await db.pots.add(record);
    const saved = await db.pots.get(id);
    if (!saved || !saved.history || saved.history.length !== history.length || (photo && (!saved.photo || saved.photo.size !== photo.size))) {
      throw new Error('pot did not read back');
    }
    return saved;
  } catch (err) {
    throw explain(err);
  }
}

// Reads a pot, changes it with a pure function and writes it back inside one transaction.
async function change(id, fn) {
  try {
    await db.transaction('rw', db.pots, db.stages, async () => {
      const pot = await db.pots.get(id);
      if (!pot) return;
      const next = await fn(pot);
      if (next && next !== pot) await db.pots.put(next);
    });
  } catch (err) {
    throw explain(err);
  }
}

/** Moves a pot to a stage; the new stage and its history line are one write. */
export const moveStage = (id, key, opts = {}) => change(id, (pot) => applyMove(pot, key, opts));

/** Moves several pots together, each to `key` or, when null, to its own next stage. One transaction for all. */
export async function moveMany(ids, key = null) {
  try {
    await db.transaction('rw', db.pots, db.stages, async () => {
      const stages = await stageList();
      const enteredAt = Date.now();
      for (const id of ids) {
        const pot = await db.pots.get(id);
        if (!pot) continue;
        const to = key || nextStageKey(stages, pot);
        if (to) await db.pots.put(applyMove(pot, to, { enteredAt }));
      }
    });
  } catch (err) {
    throw explain(err);
  }
}

export const undoMove = (id) => change(id, (pot) => undoMoveOf(pot));
export const editEntry = (id, entryId, patch) => change(id, (pot) => editEntryOf(pot, entryId, patch));

/** Edits what belongs to the pot itself: name, clay, notes, photo. */
export const updatePot = (id, patch) => change(id, (pot) => ({ ...pot, ...patch }));

/** Fills an empty shelf with fictional pots (none has a photo). */
export async function addSamplePots(now = Date.now()) {
  try {
    await db.transaction('rw', db.pots, db.stages, async () => {
      await db.pots.bulkAdd(samplePots(await stageList(), now));
    });
  } catch (err) {
    throw explain(err);
  }
}
