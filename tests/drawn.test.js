import { test } from 'node:test';
import assert from 'node:assert/strict';
import { framePath, hashString, rng } from '../src/lib/drawn.js';
import { FORMS, fillTop, formOf } from '../src/lib/forms.js';

test('the hash and the generator are stable', () => {
  assert.equal(hashString('abc'), hashString('abc'));
  assert.equal(hashString(12), hashString('12'));
  assert.notEqual(hashString('1'), hashString('2'));
  const a = rng(5);
  const b = rng(5);
  assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
});

test('a pot id always gets the same form, and ids use both forms', () => {
  assert.equal(formOf(7), formOf(7));
  assert.equal(formOf(7), formOf('7'));
  const seen = new Set(Array.from({ length: 40 }, (_, i) => formOf(i).name));
  assert.deepEqual([...seen].sort(), FORMS.map((f) => f.name).sort());
});

test('the fill climbs from the bottom of the form to its top, and is clamped', () => {
  for (const form of FORMS) {
    assert.equal(fillTop(form, 0), form.bottom);
    assert.equal(fillTop(form, 1), form.top);
    assert.equal(fillTop(form, -3), form.bottom);
    assert.equal(fillTop(form, 9), form.top);
    assert.ok(fillTop(form, 0.5) > form.top && fillTop(form, 0.5) < form.bottom);
    assert.ok(form.outline.startsWith('M') && form.outline.endsWith('Z'));
  }
});

test('a frame outline is closed, repeatable and differs between seeds', () => {
  const d = framePath('pot-1', 300, 100);
  assert.equal(d, framePath('pot-1', 300, 100));
  assert.notEqual(d, framePath('pot-2', 300, 100));
  assert.ok(d.startsWith('M') && d.endsWith('Z'));
  const numbers = d.match(/-?\d+(\.\d+)?/g).map(Number);
  assert.ok(numbers.every((x) => Number.isFinite(x) && x >= -2 && x <= 302));
});
