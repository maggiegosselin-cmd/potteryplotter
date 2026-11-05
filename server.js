// Static file server for the app. It only hands out files from public/;
// everything the app stores stays on the phone.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PUBLIC_DIR = path.join(here, 'public');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function requestIdFor(req) {
  const incoming = req.headers['x-request-id'];
  if (typeof incoming === 'string' && /^[\w.-]{1,128}$/.test(incoming)) return incoming;
  return randomUUID();
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Length': Buffer.byteLength(body), ...headers });
  res.end(body);
}

// Maps a request path to a file inside publicDir, or null when it would escape it.
export function resolvePublicPath(publicDir, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  const relative = decoded === '/' ? '/index.html' : decoded;
  const full = path.join(publicDir, path.normalize(relative));
  return full.startsWith(publicDir + path.sep) ? full : null;
}

async function serveFile(req, res, publicDir, pathname) {
  const file = resolvePublicPath(publicDir, pathname);
  if (!file) return send(res, 400, 'Bad request\n', { 'Content-Type': 'text/plain; charset=utf-8' });

  let info;
  try {
    info = await stat(file);
  } catch {
    return send(res, 404, 'Not found\n', { 'Content-Type': 'text/plain; charset=utf-8' });
  }
  if (!info.isFile()) return send(res, 404, 'Not found\n', { 'Content-Type': 'text/plain; charset=utf-8' });

  res.writeHead(200, {
    'Content-Type': CONTENT_TYPES[path.extname(file)] || 'application/octet-stream',
    'Content-Length': info.size,
    // The service worker does the real caching; the browser must always ask
    // whether sw.js and the files it lists have changed.
    'Cache-Control': 'no-cache',
  });
  if (req.method === 'HEAD') return res.end();
  await new Promise((resolve, reject) => {
    const stream = createReadStream(file);
    stream.on('error', reject);
    res.on('close', resolve);
    stream.pipe(res);
  });
}

/**
 * Builds the HTTP server.
 *   out      where log lines go (anything with write(string)); defaults to stdout
 *   publicDir the folder of files to serve
 *   handler  optional (req, res, url) => boolean|Promise<boolean>, tried first;
 *            returns true when it answered. Used by tests to exercise the error path.
 */
export function createApp({ out = process.stdout, publicDir: dir = DEFAULT_PUBLIC_DIR, handler } = {}) {
  const publicDir = path.resolve(dir);
  const log = (fields) => out.write(JSON.stringify({ time: new Date().toISOString(), ...fields }) + '\n');

  return createServer(async (req, res) => {
    const requestId = requestIdFor(req);
    const started = process.hrtime.bigint();
    const url = new URL(req.url, 'http://localhost');
    res.setHeader('X-Request-Id', requestId);

    res.on('finish', () => {
      log({
        level: 'info',
        msg: `${req.method} ${url.pathname} ${res.statusCode}`,
        request_id: requestId,
        method: req.method,
        path: url.pathname,
        status: res.statusCode,
        duration_ms: Number(process.hrtime.bigint() - started) / 1e6,
      });
    });

    try {
      if (handler && (await handler(req, res, url))) return;
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return send(res, 405, 'Method not allowed\n', {
          Allow: 'GET, HEAD',
          'Content-Type': 'text/plain; charset=utf-8',
        });
      }
      if (url.pathname === '/healthz') {
        return send(res, 200, 'ok\n', { 'Content-Type': 'text/plain; charset=utf-8' });
      }
      await serveFile(req, res, publicDir, url.pathname);
    } catch (err) {
      log({
        level: 'error',
        msg: 'unhandled error',
        request_id: requestId,
        error: err?.message ?? String(err),
        stack: err?.stack ?? '',
      });
      if (!res.headersSent) {
        send(res, 500, 'Something went wrong\n', { 'Content-Type': 'text/plain; charset=utf-8' });
      } else {
        res.destroy();
      }
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8080;
  createApp().listen(port, '0.0.0.0', () => {
    process.stdout.write(
      JSON.stringify({ time: new Date().toISOString(), level: 'info', msg: `listening on ${port}` }) + '\n',
    );
  });
}
