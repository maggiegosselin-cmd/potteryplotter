import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp, resolvePublicPath } from '../server.js';

function start(options = {}) {
  const lines = [];
  const server = createApp({ out: { write: (line) => lines.push(JSON.parse(line)) }, ...options });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, lines, base: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

const stop = (server) => new Promise((resolve) => server.close(resolve));
const nextTick = () => new Promise((resolve) => setTimeout(resolve, 20));

test('serves the app at / and logs the request as one JSON line', async () => {
  const { server, lines, base } = await start();
  try {
    const res = await fetch(`${base}/?utm=x`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Pot log/);
    await nextTick();
    const line = lines.find((l) => l.path === '/');
    assert.ok(line, 'a log line for /');
    assert.equal(line.status, 200);
    assert.equal(line.method, 'GET');
    assert.equal(line.level, 'info');
    assert.equal(typeof line.duration_ms, 'number');
    assert.ok(line.request_id);
    assert.ok(line.time);
    assert.equal(res.headers.get('x-request-id'), line.request_id);
  } finally {
    await stop(server);
  }
});

test('keeps an incoming X-Request-Id', async () => {
  const { server, lines, base } = await start();
  try {
    await fetch(`${base}/healthz`, { headers: { 'X-Request-Id': 'abc-123' } });
    await nextTick();
    assert.equal(lines[0].request_id, 'abc-123');
  } finally {
    await stop(server);
  }
});

test('serves the manifest and service worker with the right types', async () => {
  const { server, base } = await start();
  try {
    const manifest = await fetch(`${base}/manifest.webmanifest`);
    assert.match(manifest.headers.get('content-type'), /application\/manifest\+json/);
    const sw = await fetch(`${base}/sw.js`);
    assert.match(sw.headers.get('content-type'), /javascript/);
    assert.equal(sw.headers.get('cache-control'), 'no-cache');
  } finally {
    await stop(server);
  }
});

test('404 for unknown files, 405 for writes, nothing outside public/', async () => {
  const { server, base } = await start();
  try {
    assert.equal((await fetch(`${base}/nope.js`)).status, 404);
    assert.equal((await fetch(`${base}/`, { method: 'POST' })).status, 405);
    // ".." cannot climb out: the request resolves to a (missing) file inside public/.
    assert.equal(resolvePublicPath('/srv/public', '/../server.js'), '/srv/public/server.js');
    assert.equal(resolvePublicPath('/srv/public', '/%2e%2e/server.js'), '/srv/public/server.js');
    assert.equal(resolvePublicPath('/srv/public', '/a\0b'), null);
    assert.equal((await fetch(`${base}/..%2fserver.js`)).status, 404);
    assert.equal(resolvePublicPath('/srv/public', '/%zz'), null);
    assert.equal(resolvePublicPath('/srv/public', '/'), '/srv/public/index.html');
  } finally {
    await stop(server);
  }
});

test('an unhandled error answers 500 and logs an error line with request_id and stack', async () => {
  const handler = (req, res, url) => {
    if (url.pathname === '/boom') throw new Error('kaboom');
    return false;
  };
  const { server, lines, base } = await start({ handler });
  try {
    const res = await fetch(`${base}/boom`, { headers: { 'X-Request-Id': 'req-boom' } });
    assert.equal(res.status, 500);
    await nextTick();
    const errorLine = lines.find((l) => l.level === 'error');
    assert.ok(errorLine, 'an error line');
    assert.equal(errorLine.request_id, 'req-boom');
    assert.equal(errorLine.error, 'kaboom');
    assert.match(errorLine.stack, /kaboom/);
    const requestLine = lines.find((l) => l.level === 'info' && l.path === '/boom');
    assert.equal(requestLine.status, 500);
    assert.equal(requestLine.request_id, 'req-boom');
  } finally {
    await stop(server);
  }
});
