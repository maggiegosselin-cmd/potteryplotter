// Maintainer's tool, run on the server (DATABASE_PATH must point at the same database):
//   node server/issue-secret.js list              potters and how many pots each has
//   node server/issue-secret.js new               a fresh potter and secret for a friend
//   node server/issue-secret.js replace <id>      a fresh secret for an existing copy; the old one stops
// It prints the secret and a link that, opened on the phone, hands the secret to the app.
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { openStore } from './store.js';
import { newSecret } from '../src/lib/wire.js';

export function run(args, store, out = console.log, base = process.env.APP_BASE_URL || 'https://<your-app-address>') {
  const [cmd, arg] = args;
  if (cmd === 'list') {
    for (const p of store.listPotters()) out(`potter ${p.id}: ${p.pots} pots, since ${p.created_at}`);
    return 0;
  }
  if (cmd === 'new' || cmd === 'replace') {
    const secret = newSecret();
    let id;
    if (cmd === 'new') id = store.createPotter(secret);
    else {
      id = Number(arg);
      if (!Number.isInteger(id)) throw new Error('replace needs a potter id (see: list)');
      store.rotateSecret(id, secret);
    }
    out(`potter ${id}${cmd === 'replace' ? ' (old secret stopped)' : ''}`);
    out(`secret: ${secret}`);
    out(`link:   ${base}/#key=${secret}`);
    return 0;
  }
  out('usage: node server/issue-secret.js list | new | replace <potter id>');
  return 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const store = openStore(process.env.DATABASE_PATH);
  const code = run(process.argv.slice(2), store);
  store.close();
  process.exit(code);
}
