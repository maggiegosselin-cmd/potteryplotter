// Applies every outstanding migration in db/migrations to the database at
// DATABASE_PATH, with dbmate, and exits. The database is chosen exactly as
// server/server.js chooses it: process.env.DATABASE_PATH, no default here.
const { spawnSync } = require('node:child_process');
const { mkdirSync } = require('node:fs');
const { dirname } = require('node:path');

const dbPath = process.env.DATABASE_PATH;
if (!dbPath) {
  console.error('DATABASE_PATH is not set: the server has nowhere to keep pots');
  process.exit(1);
}
try {
  mkdirSync(dirname(dbPath), { recursive: true });
} catch (err) {
  console.error(`cannot create ${dirname(dbPath)}: ${err.message}`);
  process.exit(1);
}
if (dbPath.includes('?')) {
  console.error(`DATABASE_PATH ${dbPath} contains "?", which dbmate cannot take in a SQLite path`);
  process.exit(1);
}
// dbmate reads a URL; escape the path so characters like ? and # stay in the file name.
const url = 'sqlite:' + dbPath.split('/').map(encodeURIComponent).join('/');
const run = spawnSync(
  'dbmate',
  ['--url', url, '--migrations-dir', '/app/db/migrations', '--no-dump-schema', 'up'],
  { stdio: 'inherit' },
);
if (run.error) {
  console.error(`could not run dbmate: ${run.error.message}`);
  process.exit(1);
}
process.exit(run.status === null ? 1 : run.status);
