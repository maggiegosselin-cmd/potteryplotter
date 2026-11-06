// Pure helpers for the hand-drawn look: a stable hash, and the outline of an ink
// frame that is slightly different for every seed. No browser APIs, so it runs in
// Node tests.

/** A stable 32-bit hash of any id (FNV-1a, then a final mix so near ids spread out). */
export function hashString(value) {
  let h = 0x811c9dc5;
  for (const ch of String(value)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** A small seeded generator (mulberry32): the same seed always gives the same numbers in [0, 1). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (x) => Math.round(x * 100) / 100;

/**
 * The outline of a drawn rectangle in a `w` by `h` box (in viewBox units): four corners with
 * their own radii, edges that bow a little, and sides that sit up to ~1.6 units in from the box.
 * Radii are in the same units on both axes, so pick `w` as (typical width / typical height) * h.
 */
export function framePath(seed, w = 300, h = 100) {
  const rnd = rng(hashString(seed));
  const between = (lo, hi) => lo + rnd() * (hi - lo);
  const bow = () => between(-1.1, 1.1);
  const left = between(0, 1.6);
  const top = between(0, 1.6);
  const right = w - between(0, 1.6);
  const bottom = h - between(0, 1.6);
  const [r1, r2, r3, r4] = [0, 0, 0, 0].map(() => between(5, 10));
  const midX = (a, b) => (a + b) / 2;
  const parts = [
    `M${n(left + r1)} ${n(top)}`,
    `Q${n(midX(left + r1, right - r2))} ${n(top + bow())} ${n(right - r2)} ${n(top)}`,
    `Q${n(right)} ${n(top)} ${n(right)} ${n(top + r2)}`,
    `Q${n(right + bow())} ${n(midX(top + r2, bottom - r3))} ${n(right)} ${n(bottom - r3)}`,
    `Q${n(right)} ${n(bottom)} ${n(right - r3)} ${n(bottom)}`,
    `Q${n(midX(left + r4, right - r3))} ${n(bottom + bow())} ${n(left + r4)} ${n(bottom)}`,
    `Q${n(left)} ${n(bottom)} ${n(left)} ${n(bottom - r4)}`,
    `Q${n(left + bow())} ${n(midX(top + r1, bottom - r4))} ${n(left)} ${n(top + r1)}`,
    `Q${n(left)} ${n(top)} ${n(left + r1)} ${n(top)}Z`,
  ];
  return parts.join('');
}
