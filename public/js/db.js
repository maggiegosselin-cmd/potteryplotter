// The phone's own database (IndexedDB through Dexie). Nothing here talks to a server.
//
// pots:   one row per pot.            { id, name, createdAt }
// photos: one row per photo of a pot. { id, potId, data (ArrayBuffer), type, shrunk, ... }
//
// Photos are kept as ArrayBuffer plus a MIME type, not as Blob, which avoids
// the open question about Blobs in iPhone storage. A later hop that adds
// fields or tables adds `db.version(2).stores({...})` below; never edit version 1.
import { Dexie } from '../vendor/dexie.mjs';

export const db = new Dexie('potlog');

db.version(1).stores({
  pots: '++id, createdAt',
  photos: '++id, potId',
});

/** Open the database; throws when the browser will not give us storage. */
export async function openDb() {
  await db.open();
}

/**
 * Save a pot and its photo as one unit: one transaction, so either both rows
 * are on the phone or neither is. Resolves only once the data is committed.
 */
export async function savePot({ name, photo }) {
  const createdAt = Date.now();
  return db.transaction('rw', db.pots, db.photos, async () => {
    const potId = await db.pots.add({ name: name || '', createdAt });
    await db.photos.add({
      potId,
      createdAt,
      data: photo.data,
      type: photo.type,
      shrunk: photo.shrunk,
      width: photo.width,
      height: photo.height,
      originalSize: photo.originalSize,
    });
    return potId;
  });
}

/** All pots, newest first. */
export function listPots() {
  return db.pots.orderBy('createdAt').reverse().toArray();
}

/** The first photo of a pot, or undefined. */
export function firstPhoto(potId) {
  return db.photos.where('potId').equals(potId).first();
}

/** A sentence a potter can act on, for a failed save or open. */
export function describeStorageError(err) {
  const name = (err && err.name) || '';
  if (name === 'QuotaExceededError' || /quota/i.test((err && err.message) || '')) {
    return 'The phone is out of storage space, so nothing was saved. Free some space, then tap Save again.';
  }
  if (name === 'InvalidStateError' || name === 'SecurityError' || name === 'OpenFailedError' || name === 'MissingAPIError') {
    return "This browser won't let the app keep pots (private browsing blocks it). Open Pot Log in a normal tab or from the Home Screen.";
  }
  if (name === 'AbortError' || name === 'TransactionInactiveError') {
    return 'The phone stopped the save part-way, so nothing was saved. Tap Save again.';
  }
  return `Nothing was saved: ${(err && err.message) || 'the phone could not write the pot'}. Tap Save to try again.`;
}
