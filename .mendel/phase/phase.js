#!/usr/bin/env node
// /mendel/phase: reports the persistent store this application has, builds and
// drops a structure-only copy of it beside production, and runs one part of a
// migration (with dbmate, as db/migrations are run) in that copy or in production.
//
// The store is found exactly as server/server.js finds it: process.env.DATABASE_PATH,
// a SQLite file. SQLite has no "database" inside a file and no users, so a sandbox is
// a second SQLite file beside the first, named <name>.db in the same directory.
const { DatabaseSync } = require('node:sqlite');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PREFIX = 'mendel_sandbox_';
const BOOKKEEPING = 'schema_migrations'; // dbmate's own record of applied migrations

class Fail extends Error {}
const fail = (msg) => {
  throw new Fail(msg);
};

// ---- where the store is -------------------------------------------------------------

function productionPath() {
  const p = process.env.DATABASE_PATH;
  if (!p) fail('DATABASE_PATH is not set: cannot tell where the application keeps its database');
  return p;
}
const storeName = (p) => path.basename(p, path.extname(p));

function sandboxPath(name) {
  const prod = productionPath();
  if (typeof name !== 'string' || !name.startsWith(PREFIX)) fail(`refusing "${name}": a sandbox name must begin with ${PREFIX}`);
  if (!/^[A-Za-z0-9_]+$/.test(name)) fail(`refusing "${name}": a sandbox name is letters, digits and underscores only`);
  if (name === storeName(prod) || name === path.basename(prod)) fail(`refusing "${name}": that is the application's own store`);
  const file = path.join(path.dirname(prod), `${name}.db`);
  if (path.resolve(file) === path.resolve(prod)) fail(`refusing "${name}": that is the application's own store`);
  return file;
}

const sandboxFiles = (file) => [file, `${file}-wal`, `${file}-shm`, `${file}-journal`];

function openReadOnly(file) {
  if (!fs.existsSync(file)) fail(`no database at ${file}`);
  return new DatabaseSync(file, { readOnly: true });
}

// dbmate takes a URL; escape the path so characters like ? and # stay in the file name.
const dbmateUrl = (file) => {
  if (file.includes('?')) fail(`${file} contains "?", which dbmate cannot take in a SQLite path`);
  return 'sqlite:' + file.split('/').map(encodeURIComponent).join('/');
};

// SQLite has no grants: what a sandbox needs is the file system's.
function needRights(prod) {
  const dir = path.dirname(prod);
  const missing = [];
  try {
    fs.accessSync(dir, fs.constants.R_OK | fs.constants.W_OK | fs.constants.X_OK);
  } catch {
    missing.push(`create, write and delete files in ${dir}`);
  }
  try {
    fs.accessSync(prod, fs.constants.R_OK);
  } catch {
    missing.push(`read ${prod}`);
  }
  if (!missing.length) return;
  let user = null;
  try {
    user = os.userInfo().username;
  } catch {}
  const uid = typeof process.getuid === 'function' ? process.getuid() : null;
  const account = user || (uid !== null ? String(uid) : 'the account running this');
  fail(
    `the account ${account}${uid !== null ? ` (uid ${uid})` : ''} cannot ${missing.join(' or ')}. ` +
      `SQLite has no grants, so the right is a file-system permission, and a file system cannot limit it to names ` +
      `beginning ${PREFIX}; this program only ever creates and removes ${dir}/${PREFIX}*.db and its -wal, -shm and -journal files. ` +
      `An administrator can give it all at once with: setfacl -m u:${user || uid}:rwx '${dir}' '${prod}'`,
  );
}

// ---- describing a store ---------------------------------------------------------------

const quoteId = (s) => '"' + String(s).replace(/"/g, '""') + '"';
const squash = (s) => String(s).replace(/\s+/g, ' ').trim();

function checks(sql) {
  const out = [];
  const re = /\bCHECK\s*\(/gi;
  let m;
  while ((m = re.exec(sql))) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < sql.length && depth) {
      if (sql[i] === '(') depth++;
      else if (sql[i] === ')') depth--;
      i++;
    }
    out.push(squash(sql.slice(m.index, i)));
  }
  return out;
}

function describe(db) {
  const collections = {};
  const objects = db
    .prepare("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite\\_%' ESCAPE '\\' ORDER BY name")
    .all();
  const tables = objects.filter((o) => o.type === 'table' || o.type === 'view');
  for (const t of tables) {
    const q = quoteId(t.name);
    const fields = {};
    const pk = [];
    for (const c of db.prepare(`PRAGMA table_xinfo(${q})`).all()) {
      let text = squash(c.type || '').toLowerCase();
      if (c.notnull) text += ' NOT NULL';
      if (c.dflt_value !== null && c.dflt_value !== undefined) text += ` DEFAULT ${c.dflt_value}`;
      if (c.hidden === 2 || c.hidden === 3) text += ' GENERATED';
      fields[c.name] = text.trim();
      if (c.pk > 0) pk.push([c.pk, c.name]);
    }
    const indexes = {};
    const constraints = {};
    if (t.type === 'table') {
      for (const ix of db.prepare(`PRAGMA index_list(${q})`).all()) {
        if (ix.origin === 'pk') continue;
        const cols = db
          .prepare(`PRAGMA index_xinfo(${quoteId(ix.name)})`)
          .all()
          .filter((c) => c.key)
          .map((c) => (c.name === null ? null : c.name + (c.desc ? ' DESC' : '')));
        let def;
        if (cols.includes(null)) {
          const sql = objects.find((o) => o.type === 'index' && o.name === ix.name);
          def = sql && sql.sql ? squash(sql.sql).replace(/^CREATE\s+(UNIQUE\s+)?INDEX\s+\S+\s+ON\s+/i, ix.unique ? 'UNIQUE ' : '') : '(expression)';
        } else {
          def = `${ix.unique ? 'UNIQUE ' : ''}(${cols.join(', ')})`;
          if (ix.partial) {
            const sql = objects.find((o) => o.type === 'index' && o.name === ix.name);
            const w = sql && sql.sql && /\sWHERE\s([\s\S]*)$/i.exec(sql.sql);
            def += ` WHERE ${w ? squash(w[1]) : '?'}`;
          }
        }
        if (ix.origin === 'u') constraints[ix.name] = def;
        else indexes[ix.name] = def;
      }
      const fks = new Map();
      for (const f of db.prepare(`PRAGMA foreign_key_list(${q})`).all()) {
        if (!fks.has(f.id)) fks.set(f.id, []);
        fks.get(f.id).push(f);
      }
      for (const rows of fks.values()) {
        rows.sort((a, b) => a.seq - b.seq);
        const f = rows[0];
        const refs = rows.map((r) => r.to).filter((c) => c !== null);
        constraints[`foreign_key_${rows.map((r) => r.from).join('_')}`] =
          `FOREIGN KEY (${rows.map((r) => r.from).join(', ')}) REFERENCES ${f.table}${refs.length ? ` (${refs.join(', ')})` : ''}` +
          ` ON UPDATE ${f.on_update} ON DELETE ${f.on_delete}`;
      }
      checks(t.sql || '').forEach((c, i) => {
        constraints[`check_${i + 1}`] = c;
      });
    }
    for (const tr of objects.filter((o) => o.type === 'trigger' && o.tbl_name === t.name)) {
      constraints[`trigger_${tr.name}`] = squash(tr.sql);
    }
    const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
    collections[t.name] = {
      fields, // column order is the table's own and is kept
      identity: pk.sort((a, b) => a[0] - b[0]).map((p) => p[1]),
      indexes: sorted(indexes),
      constraints: sorted(constraints),
    };
  }
  return { collections };
}

// ---- what a migration of this store looks like ---------------------------------------

const MIGRATION_CONTRACT = {
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['up', 'down'],
    properties: {
      up: { $ref: '#/$defs/up' },
      down: { $ref: '#/$defs/down' },
    },
    $defs: {
      up: {
        type: 'object',
        additionalProperties: false,
        required: ['version', 'name', 'sql'],
        description: 'A dbmate migration: the file <version>_<name>.sql whose migrate:up section is sql.',
        properties: {
          version: { type: 'string', pattern: '^[0-9]{14}$', description: 'UTC timestamp YYYYMMDDHHMMSS, later than every version already in db/migrations.' },
          name: { type: 'string', pattern: '^[a-z][a-z0-9_]*$', description: 'Short snake_case name for the file.' },
          sql: { type: 'string', description: 'SQLite statements that apply the change, separated by semicolons.' },
        },
      },
      down: {
        type: 'object',
        additionalProperties: false,
        required: ['version', 'sql'],
        description: 'The migrate:down section of the same migration.',
        properties: {
          version: { type: 'string', pattern: '^[0-9]{14}$', description: 'Exactly the version of up.' },
          sql: { type: 'string', description: 'SQLite statements that undo up completely, separated by semicolons.' },
        },
      },
    },
  },
  description:
    'A migration is {up, down}, run by dbmate against the SQLite database. up is {version, name, sql}: it is written as ' +
    'the file <version>_<name>.sql with sql as its migrate:up section and applied with dbmate migrate, which records ' +
    'version in the schema_migrations table. down is {version, sql}: sql is the migrate:down section of that same ' +
    'file, run with dbmate rollback, which undoes the most recent migration and deletes its schema_migrations row; ' +
    'down.version must equal up.version and be the newest applied version. Each section runs in one transaction. ' +
    'The parts are run exactly as given, on the sandbox copy first and on production later; nothing is repaired or retried.',
  example: {
    up: {
      version: '20250601000000',
      name: 'add_potter_display_name',
      sql: 'ALTER TABLE potters ADD COLUMN display_name TEXT;',
    },
    down: {
      version: '20250601000000',
      sql: 'ALTER TABLE potters DROP COLUMN display_name;',
    },
  },
};

// ---- the steps ------------------------------------------------------------------------

const out = (doc) => process.stdout.write(JSON.stringify(doc) + '\n');

function probe() {
  const prod = productionPath();
  const db = openReadOnly(prod);
  let version;
  try {
    version = db.prepare('SELECT sqlite_version() AS v').get().v;
  } finally {
    db.close();
  }
  if (!version) fail('the server did not report a version');
  out({
    stores: [{ name: storeName(prod), engine: 'sqlite', version: String(version), role: 'record' }],
    migration_contract: MIGRATION_CONTRACT,
  });
}

function dropFiles(file) {
  for (const f of sandboxFiles(file)) {
    if (fs.existsSync(f)) fs.rmSync(f, { force: true });
  }
}

function sandboxBuild(name) {
  const file = sandboxPath(name);
  const prod = productionPath();
  needRights(prod);
  dropFiles(file);
  const src = openReadOnly(prod);
  const copied = [];
  let dst;
  try {
    dst = new DatabaseSync(file);
    const rank = { table: 0, index: 1, view: 2, trigger: 3 };
    const objects = src
      .prepare("SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\'")
      .all()
      .sort((a, b) => rank[a.type] - rank[b.type] || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const o of objects) dst.exec(o.sql);
    const hasBook = objects.some((o) => o.type === 'table' && o.name === BOOKKEEPING);
    if (hasBook) {
      // The migration tool decides what to run from this table, so it is copied whole.
      const q = quoteId(BOOKKEEPING);
      const rows = src.prepare(`SELECT * FROM ${q}`).all();
      if (rows.length) {
        const cols = Object.keys(rows[0]);
        const ins = dst.prepare(`INSERT INTO ${q} (${cols.map(quoteId).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`);
        for (const r of rows) ins.run(...cols.map((c) => r[c]));
      }
      copied.push({ collection: BOOKKEEPING, records: rows.length });
    } else {
      // Production has not been migrated yet; the tool will create its table here on first use,
      // so make it now, empty, so that the sandbox's structure is the same before and after.
      dst.exec(`CREATE TABLE IF NOT EXISTS ${quoteId(BOOKKEEPING)} (version varchar(128) primary key)`);
    }
  } catch (err) {
    try {
      if (dst) dst.close();
    } catch {}
    dropFiles(file);
    throw err;
  } finally {
    src.close();
  }
  dst.close();
  out({ reference_collections: copied });
}

function sandboxDrop(name) {
  const file = sandboxPath(name);
  if (!sandboxFiles(file).some((f) => fs.existsSync(f))) return;
  needRights(productionPath());
  dropFiles(file);
}

function sandboxDescribe(name) {
  const db = openReadOnly(sandboxPath(name));
  try {
    out(describe(db));
  } finally {
    db.close();
  }
}

function productionDescribe() {
  const db = openReadOnly(productionPath());
  try {
    out(describe(db));
  } finally {
    db.close();
  }
}

// Runs one part (read from stdin) with dbmate against `file`. dbmate rolls back by
// finding the file for the newest applied version, so each part is written as that file.
function runPart(file, direction) {
  if (!fs.existsSync(file)) fail(`no database at ${file}`);
  let part;
  try {
    part = JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch (err) {
    fail(`stdin is not JSON: ${err.message}`);
  }
  const need = direction === 'up' ? ['version', 'name', 'sql'] : ['version', 'sql'];
  const keys = part && typeof part === 'object' && !Array.isArray(part) ? Object.keys(part) : [];
  if (keys.length !== need.length || !need.every((k) => typeof part[k] === 'string' && keys.includes(k))) {
    fail(`the ${direction} part must be exactly {${need.join(', ')}}, each a string`);
  }
  if (!/^[0-9]{14}$/.test(part.version)) fail('version must be 14 digits');
  if (direction === 'up' && !/^[a-z][a-z0-9_]*$/.test(part.name)) fail('name must be snake_case');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase-'));
  try {
    const body = direction === 'up' ? `-- migrate:up\n${part.sql}\n\n-- migrate:down\n` : `-- migrate:up\n\n-- migrate:down\n${part.sql}\n`;
    fs.writeFileSync(path.join(dir, `${part.version}_${direction === 'up' ? part.name : 'down'}.sql`), body);
    const args = ['--url', dbmateUrl(file), '--migrations-dir', dir, '--no-dump-schema', direction === 'up' ? 'migrate' : 'rollback'];
    const run = spawnSync('dbmate', args, { encoding: 'utf8', cwd: dir });
    if (run.stdout) process.stderr.write(run.stdout);
    if (run.stderr) process.stderr.write(run.stderr);
    if (run.error) fail(`could not run dbmate: ${run.error.message}`);
    if (run.status !== 0) fail(`dbmate ${direction === 'up' ? 'migrate' : 'rollback'} exited with status ${run.status}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function main(argv) {
  const [cmd, ...rest] = argv;
  const named = ['sandbox-build', 'sandbox-drop', 'sandbox-describe', 'sandbox-up', 'sandbox-down'];
  if (cmd === 'probe' && rest.length === 0) return probe();
  if (named.includes(cmd) && rest.length === 1) {
    const name = rest[0];
    if (cmd === 'sandbox-build') return sandboxBuild(name);
    if (cmd === 'sandbox-drop') return sandboxDrop(name);
    if (cmd === 'sandbox-describe') return sandboxDescribe(name);
    const file = sandboxPath(name);
    return runPart(file, cmd === 'sandbox-up' ? 'up' : 'down');
  }
  if (rest.length === 0 && cmd === 'production-describe') return productionDescribe();
  if (rest.length === 0 && (cmd === 'production-up' || cmd === 'production-down')) {
    return runPart(productionPath(), cmd === 'production-up' ? 'up' : 'down');
  }
  console.error(`phase: '${argv.join(' ')}' is not implemented`);
  process.exit(2);
}

try {
  main(process.argv.slice(2));
} catch (err) {
  console.error(`phase: ${err instanceof Fail ? err.message : err && err.stack ? err.stack : err}`);
  process.exit(1);
}
