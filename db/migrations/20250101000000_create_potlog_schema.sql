-- The server's schema as server/store.js (openStore) has always created it.
-- IF NOT EXISTS because databases made by earlier versions already have these tables.

-- migrate:up
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

-- migrate:down
DROP INDEX IF EXISTS docs_seq;
DROP TABLE IF EXISTS docs;
DROP TABLE IF EXISTS revoked;
DROP TABLE IF EXISTS potters;
