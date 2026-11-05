// Pure glaze logic: no browser or Dexie APIs, so it runs in Node tests.
//
// The potter's glaze shelf is the Dexie `glazes` table: { id, name }. A pot keeps
// its layers as `glazeLayers: [{ glazeId, coverage, method }, ...]`, stored in the
// order they went onto the pot: index 0 is the first coat on the bare pot, the
// last one is on top. "A over B" is therefore stored as [B, A]. Pots hold only the
// glaze id, so renaming a glaze on the shelf renames it on every pot.
// The layer editor works top first (the way the line reads); stackToLayers and
// layersToStack are the only places the two orders meet.

export class InputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InputError';
  }
}

export const COVERAGES = [
  { id: 'whole', label: 'Whole pot' },
  { id: 'outside', label: 'Outside' },
  { id: 'inside', label: 'Inside' },
  { id: 'top_third', label: 'Top third' },
  { id: 'rim', label: 'Rim' },
];

export const METHODS = [
  { id: 'dip', label: 'Dipped' },
  { id: 'pour', label: 'Poured' },
  { id: 'brush', label: 'Brushed' },
  { id: 'spray', label: 'Sprayed' },
];

export const MAX_NAME = 60;
export const REMOVED_NAME = 'a removed glaze';

/** A glaze name with spaces tidied. Throws InputError when it is empty or too long. */
export function cleanGlazeName(name) {
  const clean = String(name ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) throw new InputError('Type a glaze name first.');
  if (clean.length > MAX_NAME) throw new InputError(`Keep a glaze name under ${MAX_NAME + 1} letters.`);
  return clean;
}

/** The shelf entry with this name (ignoring case), optionally ignoring one id. */
export function findGlaze(glazes, name, exceptId) {
  const key = String(name ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
  return glazes.find((g) => g.id !== exceptId && g.name.toLowerCase() === key) || null;
}

export const sortShelf = (glazes) => [...glazes].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

/** A function from glaze id to its current name. */
export function nameLookup(glazes) {
  const names = new Map(glazes.map((g) => [g.id, g.name]));
  return (id) => names.get(id) ?? REMOVED_NAME;
}

const label = (list, id) => list.find((x) => x.id === id)?.label || '';

/** Checks layers against the shelf and returns them in their stored shape. */
export function cleanLayers(layers, glazeIds) {
  if (!Array.isArray(layers)) throw new InputError('Glaze layers must be a list.');
  const known = new Set(glazeIds);
  return layers.map((layer) => {
    if (!layer || !known.has(layer.glazeId)) throw new InputError('Every layer needs a glaze from your shelf.');
    const coverage = layer.coverage || '';
    const method = layer.method || '';
    if (coverage && !label(COVERAGES, coverage)) throw new InputError('That part of the pot is not one of the choices.');
    if (method && !label(METHODS, method)) throw new InputError('That way of applying is not one of the choices.');
    return { glazeId: layer.glazeId, coverage, method };
  });
}

/** Editor order (top coat first) to stored order (first coat first). */
export const stackToLayers = (stack) => [...stack].reverse().map(({ glazeId, coverage, method }) => ({ glazeId, coverage, method }));
/** Stored order to editor order. */
export const layersToStack = (layers) => [...(layers || [])].reverse();

/** Names top coat first: ['A', 'B'] for A over B. */
export function glazeNames(layers, nameOf) {
  return layersToStack(layers).map((l) => nameOf(l.glazeId));
}

/** "A over B over C" (top coat first), or '' when there are no layers. */
export function glazeLine(layers, nameOf) {
  return glazeNames(layers, nameOf).join(' over ');
}

/** "Outside · Brushed", or '' when neither is set. */
export function layerDetail(layer) {
  return [label(COVERAGES, layer.coverage), label(METHODS, layer.method)].filter(Boolean).join(' · ');
}

export const usesGlaze = (pot, glazeId) => (pot.glazeLayers || []).some((l) => l.glazeId === glazeId);

/** A copy of the list with the item at `from` moved to `to`. */
export function moveItem(list, from, to) {
  if (from === to || from < 0 || from >= list.length || to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** While a card is dragged: the slot whose centre is nearest to `y`. */
export function dropIndex(centers, y) {
  let best = 0;
  for (let i = 1; i < centers.length; i++) {
    if (Math.abs(centers[i] - y) < Math.abs(centers[best] - y)) best = i;
  }
  return best;
}
