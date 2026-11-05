// Pure glaze logic: no browser or Dexie APIs, so it runs in Node tests.
//
// A pot keeps its glaze as `glazeLayers`, a list in the order the glazes went on:
// index 0 is the BOTTOM layer, the last one is on top. Each layer is
//   { id, name, coverage, method }
// where coverage ('' | 'all' | 'inside' | 'rim' | 'outside') and method
// ('' | 'dip' | 'brush' | 'pour' | 'spray') are optional. "A over B" is stored as
// [B, A] and read back, top first, by glazeLine().

export const COVERAGES = [
  { id: 'all', label: 'All over' },
  { id: 'inside', label: 'Inside' },
  { id: 'rim', label: 'Rim' },
  { id: 'outside', label: 'Outside' },
];

export const METHODS = [
  { id: 'dip', label: 'Dip' },
  { id: 'brush', label: 'Brush' },
  { id: 'pour', label: 'Pour' },
  { id: 'spray', label: 'Spray' },
];

/** The two stages where a pot is done and can have a finished photo. */
export const FINISHED_STAGE_IDS = ['finished', 'flawed'];

/** A problem with what the potter entered; the message can be shown as it is. */
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

const has = (list, id) => list.some((x) => x.id === id);

export function makeLayer({ id, name = '', coverage = '', method = '' }) {
  return { id, name, coverage, method };
}

/** A plain copy of the layers, safe to edit without touching the original. */
export const cloneLayers = (layers) => (layers || []).map(makeLayer);

/**
 * The layers as they will be stored: names trimmed, nothing empty, only known
 * placements and methods. Throws ValidationError rather than guessing.
 */
export function cleanLayers(layers) {
  if (!Array.isArray(layers)) throw new ValidationError('Glaze layers must be a list.');
  const seen = new Set();
  return layers.map((layer, i) => {
    const name = typeof layer?.name === 'string' ? layer.name.trim() : '';
    if (!name) throw new ValidationError(`Glaze layer ${i + 1} needs a name. Name it or remove it.`);
    const coverage = layer.coverage || '';
    const method = layer.method || '';
    if (coverage && !has(COVERAGES, coverage)) throw new ValidationError(`Glaze layer ${i + 1} has an unknown placement.`);
    if (method && !has(METHODS, method)) throw new ValidationError(`Glaze layer ${i + 1} has an unknown way of applying it.`);
    if (!layer.id || seen.has(layer.id)) throw new ValidationError(`Glaze layer ${i + 1} is not identified.`);
    seen.add(layer.id);
    return makeLayer({ id: layer.id, name, coverage, method });
  });
}

/** Moves a layer one place along the list (-1 = earlier / lower, +1 = later / higher). */
export function moveLayer(layers, id, delta) {
  const from = layers.findIndex((l) => l.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= layers.length) return layers;
  const next = [...layers];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export const removeLayer = (layers, id) => layers.filter((l) => l.id !== id);

/** "Ash over Tenmoku": the top layer first. Empty when there is no glaze. */
export function glazeLine(layers) {
  return (layers || [])
    .map((l) => (l.name || '').trim())
    .filter(Boolean)
    .reverse()
    .join(' over ');
}

const same = (a, b) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

/**
 * Distinct glaze names used on other pots, most used first. Spelling follows the
 * first pot that used the name, so "celadon" and "Celadon" are one suggestion.
 */
export function glazeNames(pots, excludeId) {
  const found = [];
  for (const pot of pots) {
    if (pot.id === excludeId) continue;
    for (const layer of pot.glazeLayers || []) {
      const name = (layer.name || '').trim();
      if (!name) continue;
      const hit = found.find((f) => same(f.name, name));
      if (hit) hit.count += 1;
      else found.push({ name, count: 1 });
    }
  }
  return found.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).map((f) => f.name);
}

/** Names containing what was typed, leaving out one already typed in full. */
export function suggest(names, typed, limit = 6) {
  const q = (typed || '').trim().toLocaleLowerCase();
  return names.filter((n) => !q || (n.toLocaleLowerCase().includes(q) && !same(n, q))).slice(0, limit);
}

/** True when any layer's glaze name contains the search text; empty text matches all. */
export function matchesGlaze(pot, query) {
  const q = (query || '').trim().toLocaleLowerCase();
  if (!q) return true;
  return (pot.glazeLayers || []).some((l) => (l.name || '').toLocaleLowerCase().includes(q));
}
