import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planBands } from '../src/lib/bands.js';

test('48 MP photo is cut into strips that tile the whole output', () => {
  const plan = planBands(8064, 6048);
  assert.equal(plan.outWidth, 1600);
  assert.equal(plan.outHeight, 1200);
  assert.ok(plan.bands.length > 10);
  let sy = 0;
  let dy = 0;
  for (const b of plan.bands) {
    assert.equal(b.sy, sy);
    assert.equal(b.dy, dy);
    assert.ok(b.sh * 8064 <= 3_000_000);
    sy += b.sh;
    dy += b.dh;
  }
  assert.equal(sy, 6048);
  assert.equal(dy, 1200);
});

test('small photos are not enlarged and use one strip', () => {
  const plan = planBands(800, 600);
  assert.deepEqual([plan.outWidth, plan.outHeight, plan.bands.length], [800, 600, 1]);
});

test('portrait photos keep their shape', () => {
  const plan = planBands(3024, 4032);
  assert.equal(plan.outHeight, 1600);
  assert.equal(plan.outWidth, 1200);
});

test('rejects a photo with no size', () => {
  assert.throws(() => planBands(0, 10), RangeError);
});
