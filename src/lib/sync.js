import { writable } from 'svelte/store';
import { db, onSaved } from './db.js';
import { SHELF_KEY, blobRefs, fromDoc, isSecret, newSecret, packFrame, remoteWins, toDoc } from './wire.js';

// Copies pots to the server and brings back what is missing. Pots are always saved on
// the phone first; this runs on launch, when signal returns, and after each save.
// Pull, then push: a pot the other copy changed later replaces the local one (photos
// are fetched before anything is written, in one transaction per pot), and every pot
// whose updatedAt is ahead of its `syncedAt` mark goes up with its photos in one request.
// The "last copy" time is written only when a whole pull and push finished.

/** phase: 'idle' | 'copying' | 'offline' | 'failed' | 'stopped' */
export const syncState = writable({ phase: 'idle', lastCopyAt: null, error: '' });

class SyncError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

const getMeta = async (key) => (await db.meta.get(key))?.value;
const setMeta = (key, value) => db.meta.put({ key, value });

const cookieKey = () => /(?:^|;\s*)potlog_key=([0-9a-f]{32})/.exec(document.cookie || '')?.[1];

/**
 * The potter's secret, made on first launch and kept in IndexedDB. Order: a key handed
 * over in the address (#key=..., from a QR or the maintainer's link), the stored one,
 * the cookie the server left in the browser, else a new one.
 */
async function ensureSecret() {
  const handed = /[#&]key=([0-9a-f]{32})(?:&|$)/.exec(location.hash)?.[1];
  const stored = await getMeta('secret');
  if (handed) {
    history.replaceState(null, '', location.pathname + location.search);
    if (handed !== stored) {
      await db.transaction('rw', db.meta, async () => {
        await setMeta('secret', handed);
        await db.meta.bulkDelete(['cursor', 'shelfPushed', 'lastCopyAt']); // start the new copy afresh
      });
      await db.pots.toCollection().modify((p) => delete p.syncedAt);
    }
    return handed;
  }
  if (stored) return stored;
  const secret = cookieKey() || newSecret();
  await setMeta('secret', secret);
  return secret;
}

/** The secret, for showing as a QR on the old phone. */
export async function currentKey() {
  return (await getMeta('secret')) || (await ensureSecret());
}

async function call(secret, path, init = {}) {
  const res = await fetch(path, { ...init, headers: { ...init.headers, Authorization: `Bearer ${secret}` } });
  if (res.status === 401) throw new SyncError('stopped', 'This copy was stopped. Ask for a new link.');
  if (!res.ok) throw new SyncError('failed', `The server said ${res.status}.`);
  return res;
}

async function applyShelf(doc) {
  if (!remoteWins({ updatedAt: (await getMeta('shelfUpdatedAt')) || 0 }, doc)) return;
  await db.transaction('rw', db.stages, db.glazes, db.meta, async () => {
    await db.stages.bulkPut(doc.stages);
    await db.glazes.clear();
    await db.glazes.bulkPut(doc.glazes);
    await setMeta('shelfUpdatedAt', doc.updatedAt);
    await setMeta('shelfPushed', doc.updatedAt);
  });
}

async function applyPot(secret, doc) {
  const had = await db.pots.where('uuid').equals(doc.uuid).first();
  if (!remoteWins(had, doc)) return;
  const fetched = new Map();
  for (const ref of blobRefs(doc)) {
    if (fetched.has(ref.$blob)) continue;
    const res = await call(secret, `/api/photos/${ref.$blob}`);
    fetched.set(ref.$blob, new Blob([await res.arrayBuffer()], { type: ref.type || '' }));
  }
  const pot = { ...fromDoc(doc, (sha) => fetched.get(sha)), syncedAt: doc.updatedAt };
  await db.transaction('rw', db.pots, async () => {
    const now = await db.pots.where('uuid').equals(doc.uuid).first();
    if (!remoteWins(now, doc)) return; // edited here while the photos came down
    await db.pots.put(now ? { ...pot, id: now.id } : pot);
  });
}

async function pull(secret) {
  const cursor = (await getMeta('cursor')) || 0;
  const { seq, docs } = await (await call(secret, `/api/pots?since=${cursor}`)).json();
  for (const doc of docs) await (doc.uuid === SHELF_KEY ? applyShelf(doc) : applyPot(secret, doc));
  if (seq !== cursor) await setMeta('cursor', seq);
}

async function put(secret, doc, blobs) {
  await call(secret, `/api/pots/${doc.uuid}`, { method: 'PUT', body: await packFrame(doc, blobs) });
}

async function push(secret) {
  const dirty = (await db.pots.toArray()).filter((p) => p.uuid && p.updatedAt > (p.syncedAt || 0));
  for (const pot of dirty) {
    const { syncedAt, ...clean } = pot;
    const { doc, blobs } = await toDoc(clean);
    await put(secret, doc, blobs);
    await db.transaction('rw', db.pots, async () => {
      const now = await db.pots.get(pot.id);
      if (now && now.updatedAt === pot.updatedAt) await db.pots.update(pot.id, { syncedAt: pot.updatedAt });
    });
  }
  const shelfAt = (await getMeta('shelfUpdatedAt')) || 0;
  if (shelfAt > ((await getMeta('shelfPushed')) || 0)) {
    const doc = { uuid: SHELF_KEY, updatedAt: shelfAt, stages: await db.stages.toArray(), glazes: await db.glazes.toArray() };
    await put(secret, doc, new Map());
    await setMeta('shelfPushed', shelfAt);
  }
}

let running = false;
let again = false;

/** Copies now. A request that arrives mid-copy makes one more pass when it ends. */
export async function syncNow() {
  if (running) {
    again = true;
    return;
  }
  running = true;
  try {
    do {
      again = false;
      await copyOnce();
    } while (again);
  } finally {
    running = false;
  }
}

async function copyOnce() {
  const keep = (extra) => syncState.update((s) => ({ ...s, ...extra }));
  if (navigator.onLine === false) return keep({ phase: 'offline' });
  keep({ phase: 'copying', error: '' });
  try {
    const secret = await ensureSecret();
    await pull(secret);
    await push(secret);
    const at = Date.now();
    await setMeta('lastCopyAt', at);
    keep({ phase: 'idle', lastCopyAt: at });
  } catch (err) {
    if (err instanceof SyncError) keep({ phase: err.kind, error: err.message });
    else if (err instanceof TypeError) keep({ phase: 'offline' }); // fetch could not reach the server
    else keep({ phase: 'failed', error: 'The copy did not finish. It will try again.' });
  }
}

let timer = 0;

export async function startSync() {
  try {
    syncState.update((s) => ({ ...s, lastCopyAt: null }));
    const at = await getMeta('lastCopyAt');
    if (at) syncState.update((s) => ({ ...s, lastCopyAt: at }));
  } catch {
    /* the database may be unavailable; the header will say not copied */
  }
  window.addEventListener('online', syncNow);
  onSaved(() => {
    clearTimeout(timer);
    timer = setTimeout(syncNow, 1500);
  });
  return syncNow();
}
