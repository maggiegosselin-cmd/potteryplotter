// The server's copy of each potter's pots: SQLite for the records, plain files beside
// it for the photos. A potter is known only by the SHA-256 of their secret. Every
// query is scoped by potter id and photos live under photos/<potter id>/, so one
// potter's records and photos are never reachable with another's secret.
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, renameSync, writeSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { SHELF_KEY, blobRefs, isSha, isUuid } from '../src/lib/wire.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const hashSecret = (secret) => createHash('sha256').update(secret).digest('hex');

export function openStore(dbPath) {
  if (!dbPath) throw new Error('DATABASE_PATH is not set: the server has nowhere to keep pots');
  mkdirSync(dirname(dbPath), { recursive: true });
  const photoRoot = join(dirname(dbPath), 'photos');
  const sql = new DatabaseSync(dbPath);
  sql.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS potters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      secret_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS revoked (secret_hash TEXT PRIMARY KEY, potter_id INTEGER, revoked_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS docs (
      potter_id INTEGER NOT NULL REFERENCES potters(id),
      key TEXT NOT NULL,
      updated_at INTEGER NOT NULL,
      seq INTEGER NOT NULL,
      doc TEXT NOT NULL,
      PRIMARY KEY (potter_id, key)
    );
    CREATE INDEX IF NOT EXISTS docs_seq ON docs (potter_id, seq);
  `);

  const q = {
    byHash: sql.prepare('SELECT id FROM potters WHERE secret_hash = ?'),
    revoked: sql.prepare('SELECT 1 AS yes FROM revoked WHERE secret_hash = ?'),
    insertPotter: sql.prepare('INSERT INTO potters (secret_hash, created_at) VALUES (?, ?)'),
    existing: sql.prepare('SELECT updated_at FROM docs WHERE potter_id = ? AND key = ?'),
    upsert: sql.prepare(
      `INSERT INTO docs (potter_id, key, updated_at, seq, doc)
       VALUES (?, ?, ?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM docs), ?)
       ON CONFLICT (potter_id, key) DO UPDATE SET updated_at = excluded.updated_at, seq = excluded.seq, doc = excluded.doc`,
    ),
    since: sql.prepare('SELECT seq, doc FROM docs WHERE potter_id = ? AND seq > ? ORDER BY seq'),
    count: sql.prepare("SELECT COUNT(*) AS n FROM docs WHERE potter_id = ? AND key <> '" + SHELF_KEY + "'"),
    potters: sql.prepare('SELECT id, created_at FROM potters ORDER BY id'),
    byId: sql.prepare('SELECT secret_hash FROM potters WHERE id = ?'),
    setHash: sql.prepare('UPDATE potters SET secret_hash = ? WHERE id = ?'),
    revoke: sql.prepare('INSERT OR REPLACE INTO revoked (secret_hash, potter_id, revoked_at) VALUES (?, ?, ?)'),
  };

  const photoDir = (potterId) => join(photoRoot, String(Number(potterId)));
  const photoPath = (potterId, sha) => {
    if (!isSha(sha)) throw new HttpError(400, 'bad photo name');
    return join(photoDir(potterId), sha);
  };

  function writeFileAtomic(file, bytes) {
    const tmp = `${file}.${randomBytes(6).toString('hex')}.tmp`;
    const fd = openSync(tmp, 'w');
    try {
      writeSync(fd, bytes);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, file);
  }

  return {
    photoPath,

    /** The potter's id for a secret. An unknown secret enrols a new potter; a stopped one is refused. */
    authenticate(secret) {
      const hash = hashSecret(secret);
      const known = q.byHash.get(hash);
      if (known) return known.id;
      if (q.revoked.get(hash)) throw new HttpError(401, 'stopped');
      return Number(q.insertPotter.run(hash, new Date().toISOString()).lastInsertRowid);
    },

    /**
     * Saves one doc and its photos together. Photos are written first, under names that
     * are their own SHA-256, so a half-finished save leaves only unreferenced files; the
     * record row is then committed in one transaction. The later updatedAt wins.
     * Resolves { stored }.
     */
    put(potterId, key, doc, blobs) {
      if (!doc || typeof doc !== 'object' || !Number.isFinite(doc.updatedAt)) throw new HttpError(400, 'doc needs updatedAt');
      if (key === SHELF_KEY ? doc.uuid !== SHELF_KEY : !isUuid(key) || doc.uuid !== key) throw new HttpError(400, 'key does not match doc');
      mkdirSync(photoDir(potterId), { recursive: true });
      for (const ref of blobRefs(doc)) {
        const file = photoPath(potterId, ref.$blob);
        const bytes = blobs.get(ref.$blob);
        if (!bytes) {
          if (!existsSync(file)) throw new HttpError(400, 'photo missing from request');
          continue;
        }
        if (createHash('sha256').update(bytes).digest('hex') !== ref.$blob) throw new HttpError(400, 'photo does not match its name');
        if (!existsSync(file)) writeFileAtomic(file, bytes);
      }
      sql.exec('BEGIN IMMEDIATE');
      try {
        const have = q.existing.get(potterId, key);
        if (have && have.updated_at >= doc.updatedAt) {
          sql.exec('ROLLBACK');
          return { stored: false };
        }
        q.upsert.run(potterId, key, doc.updatedAt, JSON.stringify(doc));
        sql.exec('COMMIT');
        return { stored: true };
      } catch (err) {
        sql.exec('ROLLBACK');
        throw err;
      }
    },

    /** Docs saved after `since`, oldest first, with the newest sequence number. */
    list(potterId, since = 0) {
      const rows = q.since.all(potterId, since);
      return { seq: rows.length ? rows[rows.length - 1].seq : since, docs: rows.map((r) => JSON.parse(r.doc)) };
    },

    countPots: (potterId) => q.count.get(potterId).n,

    // For the maintainer's script.
    createPotter(secret) {
      return Number(q.insertPotter.run(hashSecret(secret), new Date().toISOString()).lastInsertRowid);
    },
    /** Gives a potter's copy a new secret; the old one stops working at once. */
    rotateSecret(potterId, secret) {
      const old = q.byId.get(potterId);
      if (!old) throw new Error(`No potter ${potterId}`);
      q.revoke.run(old.secret_hash, potterId, new Date().toISOString());
      q.setHash.run(hashSecret(secret), potterId);
    },
    listPotters: () => q.potters.all().map((p) => ({ ...p, pots: q.count.get(p.id).n })),
    close: () => sql.close(),
  };
}
