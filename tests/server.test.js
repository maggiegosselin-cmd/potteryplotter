import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server/server.js';

function start(routes) {
  const root = mkdtempSync(join(tmpdir(), 'potlog-'));
  writeFileSync(join(root, 'index.html'), '<!doctype html><title>Pot Log</title>');
  const lines = [];
  const server = createApp({ root, routes, log: (f) => lines.push({ time: 't', ...f }) });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, lines, base: `http://127.0.0.1:${server.address().port}` }));
  });
}

test('serves / with 200 and logs one request line', async () => {
  const { server, lines, base } = await start();
  const res = await fetch(base + '/?x=1', { headers: { 'X-Request-Id': 'abc-123' } });
  assert.equal(res.status, 200);
  await res.text();
  server.close();
  const line = lines.find((l) => l.path === '/');
  assert.equal(line.status, 200);
  assert.equal(line.request_id, 'abc-123');
  assert.equal(typeof line.duration_ms, 'number');
  assert.equal(line.method, 'GET');
});

test('app routes get the shell, missing files get 404', async () => {
  const { server, base } = await start();
  assert.equal((await fetch(base + '/some/route')).status, 200);
  assert.equal((await fetch(base + '/missing.js')).status, 404);
  server.close();
});

test('an unhandled error is logged with request_id and stack', async () => {
  const { server, lines, base } = await start({
    '/boom': async () => {
      throw new Error('kaboom');
    },
  });
  const res = await fetch(base + '/boom');
  assert.equal(res.status, 500);
  await res.text();
  server.close();
  const err = lines.find((l) => l.level === 'error');
  assert.equal(err.error, 'kaboom');
  assert.match(err.stack, /kaboom/);
  assert.equal(err.request_id, res.headers.get('x-request-id'));
  const req = lines.find((l) => l.path === '/boom' && l.level === 'info');
  assert.equal(req.status, 500);
  assert.equal(req.request_id, err.request_id);
});
