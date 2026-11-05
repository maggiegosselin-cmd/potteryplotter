import { test } from 'node:test';
import assert from 'node:assert/strict';
import { v2Fields } from '../src/lib/migrate.js';

test('a version 1 pot keeps its fields and gains a stage, history, clay and notes', () => {
  const photo = { size: 3 };
  const v1 = { id: 4, name: 'Cup', createdAt: 1000, photo, photoType: 'image/jpeg', width: 10, height: 20 };
  const pot = { ...v1, ...v2Fields(v1) };
  assert.equal(pot.stageId, 'lump');
  assert.deepEqual(pot.history, [{ stageId: 'lump', stageDate: 1000, enteredAt: 1000 }]);
  assert.equal(pot.clay, '');
  assert.equal(pot.notes, '');
  assert.equal(pot.photo, photo);
  assert.equal(pot.name, 'Cup');
});

test('running the upgrade twice changes nothing', () => {
  const once = { name: 'Cup', createdAt: 5, ...v2Fields({ createdAt: 5 }), clay: 'Porcelain' };
  assert.deepEqual({ ...once, ...v2Fields(once) }, once);
});
