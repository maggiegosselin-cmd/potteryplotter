import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/server.js';
import { openStore } from '../server/store.js';
import { run } from '../server/issue-secret.js';
import { seed, DEMO_SECRET, OTHER_SECRET } from '../server/seed.js';
import { newSecret, newUuid, packFrame, toDoc } from '../src/lib/wire.js';

async function start() {
  const dir = mkdtempSync(join(tmpdir(), 'potlog-sync-'));
  writeFileSync(join(dir, 'index.html'), '<title>Pot Log</title>');
  const store = openStore(join(dir, 'data', 'potlog.db'));
  const lines = [];
  const server = createApp({ root: dir, store, log: (f) => lines.push(f) });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { dir, store, server, lines, base: `http://127.0.0.1:${server.address().port}` };
}

const auth = (secret) => ({ Authorization: `Bearer ${secret}` });

async function putPot(base, secret, pot) {
  const { doc, blobs } = await toDoc(pot);
  const res = await fetch(`${base}/api/pots/${doc.uuid}`, { method: 'PUT', headers: auth(secret), body: await packFrame(doc, blobs) });
  return { res, body: await res.json() };
}

const makePot = (over = {}) => ({
  uuid: newUuid(), name: 'Mug', updatedAt: 100, photo: new Blob(['photo-bytes'], { type: 'image/jpeg' }),
  finishedPhoto: null, history: [{ id: 'a', stage: 'formed' }], ...over,
});

test('a pot and its photo are saved together and read back, with a cookie left behind', async () => {
  const { server, store, base } = await start();
  const secret = newSecret();
  const pot = makePot();
  const { res, body } = await putPot(base, secret, pot);
  assert.equal(body.stored, true);
  assert.match(res.headers.get('set-cookie'), new RegExp(`potlog_key=${secret}`));
  const list = await (await fetch(`${base}/api/pots?since=0`, { headers: auth(secret) })).json();
  assert.equal(list.docs.length, 1);
  const sha = list.docs[0].photo.$blob;
  const photo = await fetch(`${base}/api/photos/${sha}`, { headers: auth(secret) });
  assert.equal(await photo.text(), 'photo-bytes');
  assert.equal((await (await fetch(`${base}/api/pots?since=${list.seq}`, { headers: auth(secret) })).json()).docs.length, 0);
  server.close();
  store.close();
});

test('the later updatedAt replaces the earlier, never the other way round', async () => {
  const { server, store, base } = await start();
  const secret = newSecret();
  const pot = makePot();
  await putPot(base, secret, pot);
  assert.equal((await putPot(base, secret, { ...pot, name: 'Older', updatedAt: 50 })).body.stored, false);
  assert.equal((await putPot(base, secret, { ...pot, name: 'Newer', updatedAt: 200 })).body.stored, true);
  const list = await (await fetch(`${base}/api/pots?since=0`, { headers: auth(secret) })).json();
  assert.equal(list.docs[0].name, 'Newer');
  server.close();
  store.close();
});

test('one potter cannot see another potter\'s pots or photos', async () => {
  const { server, store, base } = await start();
  const mine = newSecret();
  const theirs = newSecret();
  await putPot(base, mine, makePot());
  const list = await (await fetch(`${base}/api/pots?since=0`, { headers: auth(theirs) })).json();
  assert.equal(list.docs.length, 0);
  const mineList = await (await fetch(`${base}/api/pots?since=0`, { headers: auth(mine) })).json();
  const sha = mineList.docs[0].photo.$blob;
  assert.equal((await fetch(`${base}/api/photos/${sha}`, { headers: auth(theirs) })).status, 404);
  assert.equal((await fetch(`${base}/api/pots?since=0`)).status, 401);
  server.close();
  store.close();
});

test('a photo that does not match its name saves nothing', async () => {
  const { server, store, base, dir } = await start();
  const secret = newSecret();
  const { doc, blobs } = await toDoc(makePot());
  const [sha] = [...blobs.keys()];
  const bad = new Map([[sha.replace(/.$/, (c) => (c === '0' ? '1' : '0')), blobs.get(sha)]]);
  doc.photo.$blob = [...bad.keys()][0];
  doc.history = [];
  const res = await fetch(`${base}/api/pots/${doc.uuid}`, { method: 'PUT', headers: auth(secret), body: await packFrame(doc, bad) });
  assert.equal(res.status, 400);
  const list = await (await fetch(`${base}/api/pots?since=0`, { headers: auth(secret) })).json();
  assert.equal(list.docs.length, 0);
  assert.equal(readdirSync(join(dir, 'data', 'photos', '1')).length, 0);
  server.close();
  store.close();
});

test('issuing a fresh secret keeps the pots and stops the old secret', async () => {
  const { server, store, base } = await start();
  const old = newSecret();
  await putPot(base, old, makePot());
  const lines = [];
  run(['replace', '1'], store, (l) => lines.push(l), 'https://example.org');
  const fresh = /secret: ([0-9a-f]{32})/.exec(lines.join('\n'))[1];
  assert.match(lines.join('\n'), /link:   https:\/\/example\.org\/#key=/);
  assert.equal((await fetch(`${base}/api/pots?since=0`, { headers: auth(old) })).status, 401);
  const list = await (await fetch(`${base}/api/pots?since=0`, { headers: auth(fresh) })).json();
  assert.equal(list.docs.length, 1);
  server.close();
  store.close();
});

test('the seed fills two potters apart from each other', async () => {
  const { server, store, base } = await start();
  const said = [];
  seed(store, (l) => said.push(l));
  const mine = await (await fetch(`${base}/api/pots?since=0`, { headers: auth(DEMO_SECRET) })).json();
  const other = await (await fetch(`${base}/api/pots?since=0`, { headers: auth(OTHER_SECRET) })).json();
  assert.equal(mine.docs.filter((d) => d.uuid !== 'shelf').length, 19);
  assert.equal(other.docs.filter((d) => d.uuid !== 'shelf').length, 2);
  assert.match(said[0], /Seeded 2 potters/);
  server.close();
  store.close();
});

test('a server error on an api route is logged with request_id and stack', async () => {
  const { server, store, base, lines } = await start();
  store.put = () => {
    throw new Error('disk full');
  };
  const { doc, blobs } = await toDoc(makePot());
  const res = await fetch(`${base}/api/pots/${doc.uuid}`, { method: 'PUT', headers: auth(newSecret()), body: await packFrame(doc, blobs) });
  assert.equal(res.status, 500);
  await res.text();
  server.close();
  const err = lines.find((l) => l.level === 'error');
  assert.equal(err.error, 'disk full');
  assert.match(err.stack, /disk full/);
  assert.ok(err.request_id);
  store.close();
});
