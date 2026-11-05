// Static file server for the built app. All pot data lives on the phone
// (IndexedDB); this process only serves the app shell and logs requests.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

export function jsonLogger(stream = process.stdout) {
  return (fields) => {
    stream.write(JSON.stringify({ time: new Date().toISOString(), ...fields }) + '\n');
  };
}

function cacheControl(urlPath) {
  // Hashed build files never change; the shell, worker and manifest must be re-checked.
  return urlPath.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache';
}

async function serveFile(root, urlPath, res) {
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  let file = resolve(root, clean);
  if (file !== root && !file.startsWith(root + sep)) return false;
  let info = await stat(file).catch(() => null);
  if (info && info.isDirectory()) {
    file = join(file, 'index.html');
    info = await stat(file).catch(() => null);
  }
  if (!info) {
    // Unknown paths without an extension are app routes: give them the shell.
    if (extname(clean)) return false;
    file = join(root, 'index.html');
  }
  const body = await readFile(file);
  res.writeHead(200, {
    'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
    'Content-Length': body.length,
    'Cache-Control': cacheControl(urlPath),
  });
  res.end(body);
  return true;
}

/**
 * Builds the HTTP server. `routes` maps a path to an async handler
 * (req, res) => void; it exists so tests can drive the error path.
 */
export function createApp({ root, log = jsonLogger(), routes = {} } = {}) {
  const webRoot = resolve(root || join(here, '..', 'dist'));

  return createServer(async (req, res) => {
    const started = process.hrtime.bigint();
    const incoming = req.headers['x-request-id'];
    const requestId = (Array.isArray(incoming) ? incoming[0] : incoming) || randomUUID();
    const path = (req.url || '/').split('?')[0];
    res.setHeader('X-Request-Id', requestId);

    res.on('finish', () => {
      log({
        level: 'info',
        msg: `${req.method} ${path} ${res.statusCode}`,
        request_id: requestId,
        method: req.method,
        path,
        status: res.statusCode,
        duration_ms: Number(process.hrtime.bigint() - started) / 1e6,
      });
    });

    try {
      if (routes[path]) {
        await routes[path](req, res);
        return;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { Allow: 'GET, HEAD' });
        res.end();
        return;
      }
      const served = await serveFile(webRoot, path, res);
      if (!served) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
      }
    } catch (err) {
      log({
        level: 'error',
        msg: 'unhandled error',
        request_id: requestId,
        error: err && err.message ? err.message : String(err),
        stack: err && err.stack ? err.stack : '',
      });
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      }
      res.end('Something went wrong');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8080;
  createApp().listen(port, '0.0.0.0', () => {
    process.stdout.write(
      JSON.stringify({ time: new Date().toISOString(), level: 'info', msg: `listening on ${port}` }) + '\n',
    );
  });
}
