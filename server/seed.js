// Fills the server's copy with fictional potters for the demo and prints how to open each.
// Run on the server after it has started (DATABASE_PATH must point at the same database):
//   npm run seed
// Never run at startup.
import { deflateSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { openStore } from './store.js';
import { STAGES } from '../src/lib/stages.js';
import { EXAMPLE_GLAZES, examplePhotoNames, examplePots } from '../src/lib/pots.js';
import { SHELF_KEY } from '../src/lib/wire.js';

export const DEMO_SECRET = '00112233445566778899aabbccddeeff';
export const OTHER_SECRET = 'ffeeddccbbaa99887766554433221100';
const COLORS = [[111, 163, 160], [122, 74, 43], [201, 185, 154], [63, 111, 165], [108, 138, 75], [181, 104, 60]];

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => (buf.reduce((c, b) => CRC[(c ^ b) & 255] ^ (c >>> 8), 0xffffffff) ^ 0xffffffff) >>> 0;

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

/** A small solid-colour PNG: a stand-in for a pot photo. */
export function solidPng([r, g, b], size = 96) {
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: size }, () => [r, g, b]).flat())]);
  const head = Buffer.alloc(13);
  head.writeUInt32BE(size, 0);
  head.writeUInt32BE(size, 4);
  head.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', head),
    chunk('IDAT', deflateSync(Buffer.concat(Array.from({ length: size }, () => row)))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const uuidFor = (potter, i) => `00000000-0000-4000-8000-${String(potter).padStart(4, '0')}${String(i).padStart(8, '0')}`;

function seedPotter(store, secret, potterNo, names) {
  const id = store.authenticate(secret);
  const now = Date.now();
  const glazeIds = Object.fromEntries(EXAMPLE_GLAZES.map((name, i) => [name, i + 1]));
  const blobs = new Map();
  const photos = {};
  for (const [i, name] of examplePhotoNames().entries()) {
    const bytes = solidPng(COLORS[i % COLORS.length]);
    const sha = createHash('sha256').update(bytes).digest('hex');
    blobs.set(sha, bytes);
    photos[name] = { $blob: sha, type: 'image/png' };
  }
  const pots = examplePots(STAGES, now, { glazeIds, photos }).filter((p) => !names || names.includes(p.name));
  pots.forEach((pot, i) => {
    const doc = { ...pot, uuid: uuidFor(potterNo, i), updatedAt: now - i * 1000 };
    const mine = new Map([...blobs].filter(([sha]) => JSON.stringify(doc).includes(sha)));
    store.put(id, doc.uuid, doc, mine);
  });
  store.put(id, SHELF_KEY, {
    uuid: SHELF_KEY,
    updatedAt: now,
    stages: STAGES,
    glazes: EXAMPLE_GLAZES.map((name, i) => ({ id: i + 1, name })),
  }, new Map());
  return pots.length;
}

export function seed(store, out = console.log) {
  const mine = seedPotter(store, DEMO_SECRET, 1);
  const other = seedPotter(store, OTHER_SECRET, 2, ['Egg cup', 'Pasta bowl']);
  out(`Seeded 2 potters: ${mine} pots with photos and a glaze shelf, and ${other} pots for another potter.`);
  out(`Open the app with  /#key=${DEMO_SECRET}  to see the first potter's pots on a new phone.`);
  out(`Open the app with  /#key=${OTHER_SECRET}  to see the other potter's pots.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const store = openStore(process.env.DATABASE_PATH);
  seed(store);
  store.close();
}
