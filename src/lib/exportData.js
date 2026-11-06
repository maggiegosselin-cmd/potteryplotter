// Full export as one self-contained page. No Dexie or DOM APIs, so it runs in Node tests.
//
// buildRecords() turns one snapshot (pots, glazes, stages) into plain records, the single
// source of truth. renderExport() writes both outputs from those records: the readable
// page and, in a <script type="application/json" id="pot-log-data"> block of the same page,
// the structured copy. Photos are not in the JSON; they are <img id="..."> elements and
// the records name them by that id. Glaze layers keep their stored order (first coat
// first, top coat last); the page's "A over B" line is read from the same layers.
import { glazeLine, layerDetail, layersToStack, nameLookup } from './glazes.js';
import { clayLine } from './weight.js';
import { isArchived, isFinished, sortNewestFirst, stageMap, toDateInput } from './pots.js';

export const FORMAT = 'pot-log-export';
export const FORMAT_VERSION = 1;
export const DATA_ID = 'pot-log-data';
export const PHOTO_CHUNK = 3 * 32_768; // bytes read at a time; a multiple of 3 so chunks join as valid base64

/** A failure that must stop the export; the message is shown to the potter as is. */
export class ExportError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'ExportError';
    this.cause = cause;
  }
}

const isBlob = (v) => !!v && typeof v.size === 'number' && typeof v.slice === 'function';
const title = (pot) => pot.name || `Pot ${pot.id}`;
const day = (ts) => (Number.isFinite(ts) ? toDateInput(ts) : '');
const iso = (ts) => (Number.isFinite(ts) ? new Date(ts).toISOString() : null);

/**
 * Records for the whole snapshot. Resolves nothing asynchronously and changes nothing.
 * Returns { data, blobs }: `data` is the JSON-safe record set, `blobs` maps each photo id
 * in `data.photos` to its Blob. Throws ExportError when a pot names a photo that is not
 * there (or is empty), so a file is never written with an item quietly missing.
 */
export function buildRecords({ pots, glazes, stages, exportedAt = Date.now(), appVersion = '' }) {
  const map = stageMap(stages);
  const nameOf = nameLookup(glazes);
  const photos = [];
  const blobs = new Map();

  function addPhoto(pot, role, blob, where) {
    if (blob === null || blob === undefined) return null;
    if (!isBlob(blob) || blob.size === 0) {
      throw new ExportError(`The ${where} photo of "${title(pot)}" is missing or empty, so nothing was exported. Fix or remove that photo and try again.`);
    }
    const id = `photo-${pot.id}-${role}`;
    if (blobs.has(id)) throw new ExportError(`Two photos of "${title(pot)}" share the name ${id}, so nothing was exported.`);
    blobs.set(id, blob);
    photos.push({ id, potId: pot.id, role, type: blob.type || 'image/jpeg', bytes: blob.size });
    return id;
  }

  const records = sortNewestFirst(pots).map((pot) => {
    const stage = map.get(pot.stage);
    const history = (pot.history || []).map((e) => ({
      id: e.id,
      stage: e.stage,
      stageLabel: map.get(e.stage)?.label ?? e.stage,
      occurredAt: iso(e.occurredAt),
      enteredAt: iso(e.enteredAt),
      note: e.note || '',
      photo: addPhoto(pot, `entry-${e.id}`, e.photo, `${map.get(e.stage)?.label ?? e.stage} history`),
    }));
    const layers = (pot.glazeLayers || []).map((l) => ({
      glazeId: l.glazeId,
      glaze: nameOf(l.glazeId),
      coverage: l.coverage || '',
      method: l.method || '',
    }));
    return {
      id: pot.id,
      name: pot.name || '',
      clay: pot.clay || '',
      weight: pot.weight || null,
      notes: pot.notes || '',
      createdAt: iso(pot.createdAt),
      stage: pot.stage,
      stageLabel: stage?.label ?? pot.stage,
      stageKind: stage?.kind ?? null,
      stageSince: iso(pot.stageSince),
      archived: isArchived(pot),
      archivedAt: iso(pot.archivedAt),
      photo: addPhoto(pot, 'added', pot.photo, 'first'),
      history,
      // Stored order: layers[0] went on first, the last layer is the top coat.
      glazeLayers: layers,
      glazeLine: glazeLine(pot.glazeLayers || [], nameOf),
      finishedPhoto: addPhoto(pot, 'finished', pot.finishedPhoto, 'finished'),
      finishedFrom: pot.finishedFrom ?? null,
    };
  });

  const data = {
    format: FORMAT,
    formatVersion: FORMAT_VERSION,
    exportedAt: iso(exportedAt),
    appVersion,
    layerOrder: 'glazeLayers run first coat to top coat; glazeLine reads top coat first ("A over B" is stored B, A)',
    counts: {
      pots: records.length,
      archivedPots: records.filter((r) => r.archived).length,
      photos: photos.length,
      glazeLayers: records.reduce((n, r) => n + r.glazeLayers.length, 0),
    },
    stages: stages.map(({ id, label, kind, order, hidden }) => ({ id, label, kind, order, hidden: !!hidden })),
    glazes: glazes.map(({ id, name }) => ({ id, name })),
    pots: records,
    photos,
  };
  return { data, blobs };
}

// --- page ---------------------------------------------------------------------------

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const STYLES = `
body{margin:0;background:#f4e6d0;color:#2b211b;font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
main{max-width:960px;margin:0 auto;padding:16px}
h1{margin:.2em 0}h2{margin:1.6em 0 .5em;border-bottom:3px solid #b5583a;padding-bottom:4px}h3{margin:0}
.manifest{background:#fff;border-radius:12px;padding:12px 16px}
.manifest dl{display:grid;grid-template-columns:max-content 1fr;gap:2px 16px;margin:0}.manifest dt{font-weight:600}.manifest dd{margin:0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;list-style:none;padding:0;margin:0}
.tile{background:#fff;border-radius:12px;overflow:hidden;margin:0}
.tile img{display:block;width:100%;aspect-ratio:1;object-fit:cover;background:#e9dcc6}
.tile .none{display:grid;place-items:center;width:100%;aspect-ratio:1;background:#e9dcc6;color:#7a6a5c}
.tile figcaption{padding:8px 12px}.glaze{font-weight:600;color:#8a3d25}
.pot{background:#fff;border-radius:12px;padding:12px 16px;margin:0 0 16px}
.pot.ended{border-left:8px solid #a33a2b}.pot.archived{opacity:.92}
.badge{display:inline-block;font-size:.8rem;font-weight:700;border-radius:999px;padding:1px 10px;margin-left:6px;vertical-align:middle;background:#e9dcc6}
.badge.ended{background:#a33a2b;color:#fff}.badge.archived{background:#7a6a5c;color:#fff}
.meta{color:#6b5a4c;margin:2px 0}
.layers,.history{margin:4px 0 8px;padding-left:1.3em}
.history li{margin:0 0 10px}.history img,.pot>img{display:block;max-width:100%;max-height:420px;border-radius:8px;margin-top:6px}
.note{white-space:pre-wrap}
`;

function layerItems(rec) {
  // Reading order is top coat first, the way "A over B" is said.
  return layersToStack(rec.glazeLayers)
    .map((l) => `<li>${esc(l.glaze)}${layerDetail(l) ? ` <span class="meta">(${esc(layerDetail(l))})</span>` : ''}</li>`)
    .join('');
}

/** Opening markup: head, styles, title and the manifest section. */
function headMarkup(data) {
  const c = data.counts;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pot Log export, ${esc(day(Date.parse(data.exportedAt)))}</title>
<style>${STYLES}</style></head>
<body><main>
<h1>Pot Log</h1>
<section id="manifest" class="manifest" aria-label="Manifest"><dl>
<dt>Exported</dt><dd>${esc(day(Date.parse(data.exportedAt)))} <span class="meta">(${esc(data.exportedAt)})</span></dd>
<dt>App version</dt><dd>${esc(data.appVersion || 'unknown')}</dd>
<dt>Pots</dt><dd>${c.pots}</dd>
<dt>Archived pots</dt><dd>${c.archivedPots}</dd>
<dt>Photos</dt><dd>${c.photos}</dd>
<dt>Glaze layers</dt><dd>${c.glazeLayers}</dd>
</dl><p class="meta">The same records are in the plain data block at the end of this page (<code>script#${DATA_ID}</code>, JSON).</p></section>
`;
}

/** Finished pots (and any pot with a finished photo) are shown first; this is who they are. */
export function showcaseOf(records, stages) {
  const map = stageMap(stages);
  return records.filter((r) => isFinished(map.get(r.stage)) || r.finishedPhoto);
}

/** A string of the JSON that is safe inside a <script> element. */
export const jsonForScript = (data) => JSON.stringify(data, null, 1).replace(/</g, '\\u003c').replace(/\u2028|\u2029/g, (c) => `\\u${c.charCodeAt(0).toString(16)}`);

/** `data:` URL for one photo, read a slice at a time so the whole photo is never one string. */
export async function photoUri(blob, type) {
  const safe = /^image\/[\w.+-]+$/.test(type) ? type : 'image/jpeg';
  const parts = [`data:${safe};base64,`];
  let read = 0;
  for (let at = 0; at < blob.size; at += PHOTO_CHUNK) {
    const bytes = new Uint8Array(await blob.slice(at, at + PHOTO_CHUNK).arrayBuffer());
    read += bytes.length;
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    parts.push(btoa(binary));
  }
  if (read !== blob.size) throw new ExportError('A photo could not be read completely, so nothing was exported.');
  return new Blob(parts); // a Blob of its pieces, not one big string
}

/**
 * The export file as a Blob built from parts: static markup as strings, each photo as
 * its own small Blob that is read, encoded and dropped before the next one.
 * `onprogress(done, total)` counts photos. Throws ExportError on any failure.
 */
export async function renderExport(data, blobs, stages, { onprogress = () => {} } = {}) {
  const parts = [headMarkup(data)];
  const byId = new Map(data.photos.map((p) => [p.id, p]));
  const total = data.photos.length;
  let done = 0;
  let embedded = 0;

  async function img(id, alt) {
    const meta = byId.get(id);
    const blob = blobs.get(id);
    if (!meta || !blob) throw new ExportError(`A photo (${id}) is missing, so nothing was exported.`);
    let uri;
    try {
      uri = await photoUri(blob, meta.type);
    } catch (err) {
      throw err instanceof ExportError ? err : new ExportError('A photo could not be read, so nothing was exported.', err);
    }
    embedded += 1;
    onprogress(++done, total);
    return [`<img id="${esc(id)}" alt="${esc(alt)}" src="`, uri, '">'];
  }

  const shown = showcaseOf(data.pots, stages);
  parts.push('<h2 id="finished">Finished pots</h2>\n');
  if (!shown.length) parts.push('<p class="meta">No finished pots yet.</p>\n');
  else {
    parts.push('<ul class="grid">\n');
    for (const rec of shown) {
      parts.push(`<li><figure class="tile" id="finished-${esc(rec.id)}">`);
      if (rec.finishedPhoto) parts.push(...(await img(rec.finishedPhoto, `Finished ${title(rec)}`)));
      else parts.push('<div class="none">No finished photo</div>');
      parts.push(
        `<figcaption><div><a href="#pot-${esc(rec.id)}">${esc(title(rec))}</a>`,
        rec.archived ? '<span class="badge archived">Archived</span>' : '',
        rec.stageKind === 'end' ? `<span class="badge ended">${esc(rec.stageLabel)}</span>` : '',
        '</div>',
        rec.glazeLine ? `<div class="glaze">${esc(rec.glazeLine)}</div>` : '<div class="meta">No glaze recorded</div>',
        '</figcaption></figure></li>\n',
      );
    }
    parts.push('</ul>\n');
  }

  parts.push('<h2 id="journal">Journal of every pot</h2>\n');
  for (const rec of data.pots) {
    const ended = rec.stageKind === 'end';
    parts.push(
      `<article class="pot${ended ? ' ended' : ''}${rec.archived ? ' archived' : ''}" id="pot-${esc(rec.id)}">`,
      `<h3>${esc(title(rec))}`,
      ended ? `<span class="badge ended">${esc(rec.stageLabel)}</span>` : '',
      rec.archived ? `<span class="badge archived">Archived ${esc(day(Date.parse(rec.archivedAt)))}</span>` : '',
      '</h3>',
      `<p class="meta">${esc(rec.stageLabel)}${rec.stageSince ? ` since ${esc(day(Date.parse(rec.stageSince)))}` : ''}`,
      ` · added ${esc(day(Date.parse(rec.createdAt)))}${clayLine(rec) ? ` · ${esc(clayLine(rec))}` : ''}</p>`,
    );
    if (rec.notes) parts.push(`<p class="note">${esc(rec.notes)}</p>`);
    if (rec.glazeLayers.length) {
      parts.push(`<p><span class="glaze">${esc(rec.glazeLine)}</span> <span class="meta">(top coat first)</span></p><ul class="layers">${layerItems(rec)}</ul>`);
    }
    if (rec.finishedPhoto) parts.push(`<p class="meta"><a href="#finished-${esc(rec.id)}">Finished photo is shown above</a></p>`);
    if (rec.photo) parts.push(...(await img(rec.photo, `${title(rec)} when added`)));
    parts.push('<ol class="history">');
    for (const e of rec.history) {
      parts.push(
        `<li><strong>${esc(e.stageLabel)}</strong> <span class="meta">${esc(day(Date.parse(e.occurredAt)))}</span>`,
        e.note ? `<div class="note">${esc(e.note)}</div>` : '',
      );
      if (e.photo) parts.push(...(await img(e.photo, `${title(rec)}, ${e.stageLabel}`)));
      parts.push('</li>');
    }
    parts.push('</ol></article>\n');
    // Fold this pot's pieces into one Blob so the array never grows by one entry per photo chunk.
    parts.splice(0, parts.length, new Blob(parts));
  }

  if (embedded !== data.counts.photos) {
    throw new ExportError(`Expected ${data.counts.photos} photos but wrote ${embedded}, so nothing was exported.`);
  }
  parts.push(`</main>\n<script type="application/json" id="${DATA_ID}">\n${jsonForScript(data)}\n</script>\n</body></html>\n`);
  return new Blob(parts, { type: 'text/html;charset=utf-8' });
}

/** Whole export from one snapshot: resolves { blob, data, filename }. */
export async function buildExport(snapshot, { onprogress, appVersion = '' } = {}) {
  const exportedAt = snapshot.exportedAt ?? Date.now();
  const { data, blobs } = buildRecords({ ...snapshot, exportedAt, appVersion });
  const blob = await renderExport(data, blobs, snapshot.stages, { onprogress });
  return { blob, data, filename: `pot-log-${toDateInput(exportedAt)}.html` };
}

/** Reads the structured copy back out of an export page (used by tests and by anyone checking a file). */
export function readEmbeddedData(html) {
  const m = new RegExp(`<script type="application/json" id="${DATA_ID}">([\\s\\S]*?)</script>`).exec(html);
  if (!m) throw new ExportError('This file has no pot data block.');
  return JSON.parse(m[1]);
}
