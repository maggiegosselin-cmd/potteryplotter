// HTTP routes for the copy of a potter's pots. Everything needs `Authorization: Bearer <secret>`.
//   PUT /api/pots/:key      one frame (pot + its photos) -> { stored }
//   GET /api/pots?since=N   docs saved after sequence N -> { seq, docs }
//   GET /api/photos/:sha    one photo of the caller's own
import { createReadStream, existsSync, statSync } from 'node:fs';
import { HttpError } from './store.js';
import { isSecret, unpackFrame } from '../src/lib/wire.js';

const MAX_BODY = 40 * 1024 * 1024;
const COOKIE = 'potlog_key';

function send(res, status, body, headers = {}) {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(text), 'Cache-Control': 'no-store', ...headers });
  res.end(text);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new HttpError(413, 'too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const cookieValue = (req) => /(?:^|;\s*)potlog_key=([0-9a-f]{32})/.exec(req.headers.cookie || '')?.[1];

export function createApi({ store }) {
  /** Handles /api/... requests; resolves once the response is sent. */
  return async function api(req, res) {
    try {
      const url = new URL(req.url, 'http://localhost');
      const match = /^Bearer ([0-9a-f]{32})$/.exec(req.headers.authorization || '');
      if (!match || !isSecret(match[1])) throw new HttpError(401, 'missing secret');
      const secret = match[1];
      const potter = store.authenticate(secret);
      // First open in a browser: leave the secret in a cookie so the installed app can pick it up once.
      const headers = {};
      if (cookieValue(req) !== secret) {
        const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
        headers['Set-Cookie'] = `${COOKIE}=${secret}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
      }

      const path = url.pathname;
      let m;
      if (req.method === 'GET' && path === '/api/pots') {
        const since = Math.max(0, Number(url.searchParams.get('since')) || 0);
        return send(res, 200, store.list(potter, since), headers);
      }
      if (req.method === 'PUT' && (m = /^\/api\/pots\/([0-9a-f-]{36}|shelf)$/.exec(path))) {
        let frame;
        try {
          frame = unpackFrame(await readBody(req));
        } catch (err) {
          if (err instanceof HttpError) throw err;
          throw new HttpError(400, 'bad request body');
        }
        return send(res, 200, store.put(potter, m[1], frame.doc, frame.blobs), headers);
      }
      if (req.method === 'GET' && (m = /^\/api\/photos\/([0-9a-f]{64})$/.exec(path))) {
        const file = store.photoPath(potter, m[1]);
        if (!existsSync(file)) throw new HttpError(404, 'no such photo');
        res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': statSync(file).size, 'Cache-Control': 'private, max-age=31536000, immutable', ...headers });
        createReadStream(file).pipe(res);
        return;
      }
      throw new HttpError(404, 'no such route');
    } catch (err) {
      if (!(err instanceof HttpError)) throw err;
      send(res, err.status, { error: err.message });
    }
  };
}
