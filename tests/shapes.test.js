import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { bowlPath, mugPath, FORMS, SILHOUETTE } from '../src/lib/shapes.js';

const root = new URL('../', import.meta.url);

test('a bowl is one closed path', () => {
  const d = bowlPath({ cx: 30, rim: 10, a: 20, depth: 15 });
  assert.match(d, /^M10 10H50C/);
  assert.ok(d.endsWith('Z'));
  assert.equal(d.match(/M/g).length, 1);
});

test('a bowl without a foot ends at its belly', () => {
  assert.ok(!bowlPath({ cx: 30, rim: 10, a: 20, depth: 15, footH: 0 }).includes('V'));
});

test('the silhouette bowl spans the range the progress fill climbs through', () => {
  assert.deepEqual(SILHOUETTE, { top: 6, bottom: 58 });
  assert.ok(FORMS.bowl.body.startsWith('M5 6H59'));
  assert.ok(FORMS.bowl.body.includes('V58'));
});

test('a mug has a body and a handle on the chosen side', () => {
  const left = mugPath({ x: 100, base: 108, w: 28, h: 44, handle: 'left' });
  const right = mugPath({ x: 100, base: 108, w: 28, h: 44, handle: 'right' });
  assert.ok(left.grip.startsWith('M100 '));
  assert.ok(right.grip.startsWith('M128 '));
});

test('the Fraunces files the stylesheet names are bundled', () => {
  const css = readFileSync(new URL('src/app.css', root), 'utf8');
  for (const file of ['Fraunces-normal.woff2', 'Fraunces-italic.woff2']) {
    assert.ok(css.includes(`/fonts/${file}`), file);
    assert.ok(existsSync(new URL(`public/fonts/${file}`, root)), file);
  }
  assert.ok(!/https?:\/\//.test(css));
});
