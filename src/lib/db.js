import Dexie from 'dexie';

// Dexie (free core) over IndexedDB. A pot is one row that holds the shrunk
// photo as a Blob, so the record and its photo are written in one transaction.
// Later hops add fields or tables with db.version(2).stores(...).upgrade(...).
export const db = new Dexie('pot-log');

db.version(1).stores({
  pots: '++id, createdAt',
});

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

/**
 * Saves a pot and its photo together, then reads it back so success is only
 * reported once the photo is really in storage. Resolves the saved pot.
 */
export async function savePot({ name, photo, width, height }) {
  try {
    const id = await db.pots.add({
      name: (name || '').trim(),
      createdAt: Date.now(),
      photo,
      photoType: photo.type,
      width,
      height,
    });
    const saved = await db.pots.get(id);
    if (!saved || !saved.photo || saved.photo.size !== photo.size) {
      throw new Error('pot did not read back');
    }
    return saved;
  } catch (err) {
    if (err instanceof StorageError) throw err;
    if (err && err.message === 'pot did not read back') {
      throw new StorageError('unverified', "The pot could not be confirmed in storage. Please try again.", err);
    }
    throw explainStorageError(err);
  }
}
