import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blobRefs, copyAge, fromDoc, newSecret, newUuid, packFrame, remoteWins, isSecret, stamp, toDoc, unpackFrame } from '../src/lib/wire.js';

const pot = (over = {}) => ({
  id: 7, uuid: newUuid(), name: 'Mug', updatedAt: 100,
  photo: new Blob(['abc'], { type: 'image/jpeg' }), finishedPhoto: null,
  history: [{ id: 'a', stage: 'formed', photo: new Blob(['abc'], { type: 'image/jpeg' }) }, { id: 'b', stage: 'bone_dry' }],
  ...over,
});

test('secrets are 128-bit hex and uuids are distinct', () => {
  assert.ok(isSecret(newSecret()));
  assert.notEqual(newUuid(), newUuid());
});

test('stamp always moves updatedAt forward', () => {
  assert.equal(stamp({ updatedAt: 500 }, 100).updatedAt, 501);
  assert.equal(stamp({}, 100).updatedAt, 100);
});

test('the later updatedAt wins, a tie keeps the local pot', () => {
  assert.equal(remoteWins(null, { updatedAt: 1 }), true);
  assert.equal(remoteWins({ updatedAt: 5 }, { updatedAt: 6 }), true);
  assert.equal(remoteWins({ updatedAt: 6 }, { updatedAt: 6 }), false);
  assert.equal(remoteWins({ updatedAt: 7 }, { updatedAt: 6 }), false);
});

test('a pot and its photos make one frame and come back whole', async () => {
  const { doc, blobs } = await toDoc(pot());
  assert.equal(doc.id, undefined);
  assert.equal(blobs.size, 1); // the same photo twice is sent once
  assert.equal(blobRefs(doc).length, 2);
  const frame = await packFrame(doc, blobs);
  const back = unpackFrame(new Uint8Array(await frame.arrayBuffer()));
  assert.deepEqual(back.doc, doc);
  const [sha, bytes] = [...back.blobs][0];
  const whole = fromDoc(back.doc, (s, type) => new Blob([back.blobs.get(s)], { type }));
  assert.equal(await whole.photo.text(), 'abc');
  assert.equal(whole.photo.type, 'image/jpeg');
  assert.equal(whole.history[1].photo, undefined);
  assert.equal(bytes.length, 3);
  assert.equal(sha.length, 64);
});

test('a cut-short frame is refused', async () => {
  const { doc, blobs } = await toDoc(pot());
  const bytes = new Uint8Array(await (await packFrame(doc, blobs)).arrayBuffer());
  assert.throws(() => unpackFrame(bytes.subarray(0, bytes.length - 1)), RangeError);
});

test('the copy age is shown, and nudges when old or missing', () => {
  const now = 10 * 86_400_000;
  assert.deepEqual(copyAge(null, now), { text: 'Not copied yet', stale: true });
  assert.deepEqual(copyAge(now - 5 * 60_000, now), { text: 'Last copy 5 min ago', stale: false });
  assert.equal(copyAge(now - 3 * 86_400_000, now).stale, true);
});
