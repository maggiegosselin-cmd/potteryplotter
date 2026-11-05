// Pure helpers for copying pots to the server: no Dexie, no fetch, so they run in
// Node tests. A pot travels as a "doc": the pot row without its local `id`, with
// every photo Blob replaced by { $blob: <sha256 hex>, type }. The doc and the
// photo bytes it names go in ONE request body (a "frame"), so the server can
// save the record and its photos together.
//
// Frame: 4 bytes (big endian) header length, the header JSON { doc, blobs: [{ sha, size }] },
// then the photo bytes back to back in the order the header lists them.
// Merge: the copy with the later updatedAt replaces the other, whole.

export const SHELF_KEY = 'shelf'; // the one non-pot doc: the stage rows and the glaze shelf
export const STALE_AFTER = 2 * 86_400_000; // a copy older than this earns a nudge

export function newUuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const b = globalThis.crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** A 128-bit secret as 32 hex characters. */
export function newSecret() {
  return [...globalThis.crypto.getRandomValues(new Uint8Array(16))].map((x) => x.toString(16).padStart(2, '0')).join('');
}

export const isSecret = (s) => typeof s === 'string' && /^[0-9a-f]{32}$/.test(s);
export const isUuid = (s) => typeof s === 'string' && /^[0-9a-f-]{36}$/.test(s);
export const isSha = (s) => typeof s === 'string' && /^[0-9a-f]{64}$/.test(s);

/** Every write refreshes updatedAt, and it always moves forward even if the clock does not. */
export function stamp(pot, now = Date.now()) {
  return { ...pot, updatedAt: Math.max(now, (pot.updatedAt || 0) + 1) };
}

/** True when the remote copy should replace the local one (later updatedAt wins; a tie keeps local). */
export const remoteWins = (local, remote) => !local || (remote.updatedAt || 0) > (local.updatedAt || 0);

const isBlob = (v) => typeof Blob !== 'undefined' && v instanceof Blob;

export async function sha256Hex(blob) {
  const hash = await globalThis.crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(hash)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/** Turns a stored pot into { doc, blobs: Map sha -> Blob }. */
export async function toDoc(pot) {
  const blobs = new Map();
  const ref = async (b) => {
    if (!isBlob(b)) return b ?? null;
    const sha = await sha256Hex(b);
    blobs.set(sha, b);
    return { $blob: sha, type: b.type };
  };
  const { id, ...rest } = pot;
  const doc = {
    ...rest,
    photo: await ref(pot.photo),
    finishedPhoto: await ref(pot.finishedPhoto),
    history: await Promise.all(pot.history.map(async (e) => (e.photo ? { ...e, photo: await ref(e.photo) } : e))),
  };
  return { doc, blobs };
}

/** The photo references a pot doc holds: [{ $blob, type }]. */
export function blobRefs(doc) {
  const refs = [doc.photo, doc.finishedPhoto, ...(doc.history || []).map((e) => e.photo)];
  return refs.filter((r) => r && typeof r === 'object' && r.$blob);
}

/** Puts Blobs back into a doc. `get(sha, type)` gives the Blob for a reference. */
export function fromDoc(doc, get) {
  const back = (r) => (r && typeof r === 'object' && r.$blob ? get(r.$blob, r.type) : r ?? null);
  return {
    ...doc,
    photo: back(doc.photo),
    finishedPhoto: back(doc.finishedPhoto),
    history: (doc.history || []).map((e) => (e.photo ? { ...e, photo: back(e.photo) } : e)),
  };
}

export async function packFrame(doc, blobs = new Map()) {
  const order = [...blobs.keys()];
  const head = new TextEncoder().encode(JSON.stringify({ doc, blobs: order.map((sha) => ({ sha, size: blobs.get(sha).size })) }));
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, head.length);
  return new Blob([len, head, ...order.map((sha) => blobs.get(sha))]);
}

/** Reads a frame (Buffer or Uint8Array). Throws on a body that is cut short or malformed. */
export function unpackFrame(bytes) {
  const buf = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (buf.length < 4) throw new RangeError('frame too short');
  const headLen = new DataView(buf.buffer, buf.byteOffset, buf.byteLength).getUint32(0);
  if (4 + headLen > buf.length) throw new RangeError('frame header cut short');
  const head = JSON.parse(new TextDecoder().decode(buf.subarray(4, 4 + headLen)));
  let at = 4 + headLen;
  const blobs = new Map();
  for (const { sha, size } of head.blobs || []) {
    if (!Number.isInteger(size) || size < 0 || at + size > buf.length) throw new RangeError('frame photo cut short');
    blobs.set(sha, buf.subarray(at, at + size));
    at += size;
  }
  if (at !== buf.length) throw new RangeError('frame has extra bytes');
  return { doc: head.doc, blobs };
}

/** How old the last completed copy is: { text, stale }. `at` is null when none has finished yet. */
export function copyAge(at, now = Date.now()) {
  if (!at) return { text: 'Not copied yet', stale: true };
  const mins = Math.max(0, Math.floor((now - at) / 60_000));
  let text;
  if (mins < 1) text = 'just now';
  else if (mins < 60) text = `${mins} min ago`;
  else if (mins < 1440) text = `${Math.floor(mins / 60)} h ago`;
  else text = `${Math.floor(mins / 1440)} days ago`;
  return { text: `Last copy ${text}`, stale: now - at > STALE_AFTER };
}
