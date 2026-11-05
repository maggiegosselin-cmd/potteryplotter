// A thin wrapper over raw IndexedDB. One object store, "pots"; each record holds
// the pot's details and its shrunk photo as an ArrayBuffer plus MIME type, so a
// pot and its photo are written by one transaction: both land or neither does.
//
// Record shape (v: 1):
//   { v, id, name, createdAt, photo: { bytes: ArrayBuffer, type, width, height } | null }
// IndexedDB keeps whatever fields a record has, so later hops can add fields
// (stage, glaze, notes) without a schema change. A new store or index needs a
// version bump and a branch in onupgradeneeded below.

const DB_NAME = 'pot-log';
const DB_VERSION = 1;
const STORE = 'pots';

export class StorageError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = 'StorageError';
    this.code = code; // 'unavailable' | 'quota' | 'write' | 'read'
    this.cause = cause;
  }
}

let opening = null;

function open() {
  if (opening) return opening;
  opening = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new StorageError('unavailable', 'This browser cannot keep pots on the phone.'));
      return;
    }
    let request;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      reject(new StorageError('unavailable', 'This browser cannot keep pots on the phone.', err));
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const pots = db.createObjectStore(STORE, { keyPath: 'id' });
        pots.createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        opening = null;
      };
      db.onclose = () => {
        opening = null;
      };
      resolve(db);
    };
    request.onerror = () =>
      reject(new StorageError('unavailable', 'This browser cannot keep pots on the phone.', request.error));
    request.onblocked = () =>
      reject(new StorageError('unavailable', 'Another copy of the app is holding the pots. Close it and try again.'));
  });
  opening.catch(() => {
    opening = null;
  });
  return opening;
}

function newId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function writeError(err) {
  if (err instanceof StorageError) return err;
  if (err?.name === 'QuotaExceededError') {
    return new StorageError('quota', 'The phone is out of room for this pot.', err);
  }
  return new StorageError('write', 'The pot could not be saved on the phone.', err);
}

/**
 * Saves a pot and its photo in one transaction. Resolves with the saved record
 * only after the transaction has completed (data is written), never earlier.
 */
export async function savePot({ name, photo }) {
  const db = await open().catch((err) => {
    throw writeError(err);
  });
  const record = { v: 1, id: newId(), name, createdAt: Date.now(), photo: photo ?? null };

  return new Promise((resolve, reject) => {
    let tx;
    try {
      tx = db.transaction(STORE, 'readwrite', { durability: 'strict' });
      tx.objectStore(STORE).add(record);
    } catch (err) {
      reject(writeError(err));
      return;
    }
    tx.oncomplete = () => resolve(record);
    tx.onabort = () => reject(writeError(tx.error));
    tx.onerror = () => reject(writeError(tx.error));
  });
}

/** All pots, newest first. */
export async function listPots() {
  const db = await open();
  return new Promise((resolve, reject) => {
    try {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result.sort((a, b) => b.createdAt - a.createdAt));
      request.onerror = () => reject(new StorageError('read', 'The saved pots could not be read.', request.error));
    } catch (err) {
      reject(new StorageError('read', 'The saved pots could not be read.', err));
    }
  });
}
