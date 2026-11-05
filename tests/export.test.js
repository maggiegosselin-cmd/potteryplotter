import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES } from '../src/lib/stages.js';
import { EXAMPLE_GLAZES, examplePhotoNames, examplePots } from '../src/lib/pots.js';
import { ExportError, buildExport, buildRecords, readEmbeddedData } from '../src/lib/exportData.js';

const NOW = Date.UTC(2025, 5, 1, 12);

function snapshot() {
  const glazes = EXAMPLE_GLAZES.map((name, i) => ({ id: i + 1, name }));
  const glazeIds = Object.fromEntries(glazes.map((g) => [g.name, g.id]));
  const photos = Object.fromEntries(
    examplePhotoNames().map((name, i) => [name, new Blob([new Uint8Array(100_000 + i).fill(i + 1)], { type: 'image/jpeg' })]),
  );
  const pots = examplePots(STAGES, NOW, { glazeIds, photos }).map((p, i) => ({ ...p, id: i + 1 }));
  return { pots, glazes, stages: STAGES, exportedAt: NOW };
}

async function exported(snap = snapshot()) {
  const out = await buildExport(snap, { appVersion: '9.9.9' });
  return { ...out, html: await out.blob.text(), snap };
}

test('the embedded JSON parses back to every pot, archived and failed ones included', async () => {
  const { html, data, snap } = await exported();
  const back = readEmbeddedData(html);
  assert.deepEqual(back, JSON.parse(JSON.stringify(data)));
  assert.equal(back.pots.length, snap.pots.length);
  assert.equal(back.counts.pots, snap.pots.length);
  assert.equal(back.counts.archivedPots, 2);
  assert.ok(back.pots.some((p) => p.stage === 'failed' && p.archived));
  assert.equal(back.appVersion, '9.9.9');
  assert.equal(back.counts.glazeLayers, back.pots.reduce((n, p) => n + p.glazeLayers.length, 0));
  // every pot has its own journal entry in the page
  for (const p of snap.pots) assert.ok(html.includes(`id="pot-${p.id}"`));
});

test('glaze layers keep the stored order, top coat last, and the page reads "A over B"', async () => {
  const { html, data, snap } = await exported();
  const teapot = data.pots.find((p) => p.name === 'Teapot');
  assert.deepEqual(teapot.glazeLayers.map((l) => l.glaze), ['Shino White', 'Celadon']);
  const stored = snap.pots.find((p) => p.name === 'Teapot').glazeLayers.map((l) => l.glazeId);
  assert.deepEqual(teapot.glazeLayers.map((l) => l.glazeId), stored);
  assert.equal(teapot.glazeLine, 'Celadon over Shino White');
  assert.ok(html.includes('Celadon over Shino White'));
});

test('finished pots with their glaze come before the journal, and each photo is embedded once', async () => {
  const { html, data } = await exported();
  assert.ok(html.indexOf('id="finished"') < html.indexOf('id="journal"'));
  assert.equal(data.counts.photos, data.photos.length);
  for (const p of data.photos) {
    const tags = html.match(new RegExp(`<img id="${p.id}"[^>]*src="data:image/jpeg;base64,([A-Za-z0-9+/=]+)"`, 'g'));
    assert.equal(tags?.length, 1, p.id);
    const b64 = /base64,([^"]+)"/.exec(tags[0])[1];
    assert.equal(Buffer.from(b64, 'base64').length, p.bytes);
  }
  assert.equal((html.match(/<img /g) || []).length, data.photos.length);
});

test('an empty or unreadable photo stops the export instead of leaving it out', async () => {
  const snap = snapshot();
  snap.pots[0] = { ...snap.pots[0], photo: new Blob([], { type: 'image/jpeg' }) };
  await assert.rejects(() => buildExport(snap), ExportError);
  const bad = snapshot();
  bad.pots[1] = { ...bad.pots[1], finishedPhoto: 'not a blob' };
  assert.throws(() => buildRecords(bad), ExportError);
});

test('pot text cannot break out of the page or the data block', async () => {
  const snap = snapshot();
  snap.pots[0] = { ...snap.pots[0], name: 'Mug </script><b>', notes: 'a & b <i>' };
  const { html } = await exported(snap);
  assert.ok(!html.includes('Mug </script>'));
  assert.equal(readEmbeddedData(html).pots.filter((p) => p.name === 'Mug </script><b>').length, 1);
});
