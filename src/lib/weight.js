// Clay weight: a number plus the unit it was entered in, kept exactly as entered
// ({ amount: 2.5, unit: 'lb' }). Switching the unit never rewrites the number.
// Pure helpers, plus the last-used unit, which is remembered on this phone only.

export const WEIGHT_UNITS = ['g', 'lb'];
export const DEFAULT_UNIT = 'g';
const UNIT_KEY = 'potlog.weightUnit';

/** { amount, unit } from what was typed, or null when there is no usable weight (blank, zero, negative, not a number). */
export function parseWeight(amount, unit) {
  if (amount === null || amount === undefined) return null;
  const text = String(amount).trim().replace(',', '.');
  if (!text) return null;
  const n = Number(text);
  if (!Number.isFinite(n) || n <= 0 || !WEIGHT_UNITS.includes(unit)) return null;
  return { amount: n, unit };
}

/** "500 g" or "2.5 lb"; empty for a pot without a weight (old pots have none). */
export function weightLabel(weight) {
  return weight && Number.isFinite(weight.amount) && WEIGHT_UNITS.includes(weight.unit) ? `${weight.amount} ${weight.unit}` : '';
}

/** "Stoneware · 500 g": the clay type and weight as shown on a pot card. */
export const clayLine = (pot) => [pot.clay, weightLabel(pot.weight)].filter(Boolean).join(' · ');

/** The unit last used on this phone, or grams. */
export function lastUnit(storage = globalThis.localStorage) {
  try {
    const unit = storage?.getItem(UNIT_KEY);
    return WEIGHT_UNITS.includes(unit) ? unit : DEFAULT_UNIT;
  } catch {
    return DEFAULT_UNIT;
  }
}

export function rememberUnit(unit, storage = globalThis.localStorage) {
  if (!WEIGHT_UNITS.includes(unit)) return;
  try {
    storage?.setItem(UNIT_KEY, unit);
  } catch {
    // private mode or a full store: the unit just isn't remembered
  }
}
