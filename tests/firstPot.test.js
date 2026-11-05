import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coachStep } from '../src/lib/firstPot.js';

const flag = { key: 'firstPot' };
const base = { flag, installed: true, potCount: 0, adding: false };

test('the coach points at Add, then the photo, on the installed first open', () => {
  assert.equal(coachStep(base), 'add');
  assert.equal(coachStep({ ...base, adding: true }), 'photo');
});

test('no coach in a browser tab, without the flag, or once a pot exists', () => {
  assert.equal(coachStep({ ...base, installed: false }), null);
  assert.equal(coachStep({ ...base, flag: undefined }), null);
  assert.equal(coachStep({ ...base, potCount: 1 }), null);
});

test('"Not now" hides the coach for the session', () => {
  assert.equal(coachStep({ ...base, skipped: true }), null);
});

test('right after the first save the coach points at moving the pot on', () => {
  assert.equal(coachStep({ ...base, flag: undefined, potCount: 1, justSaved: true }), 'next');
  assert.equal(coachStep({ ...base, installed: false, justSaved: true }), null);
});
