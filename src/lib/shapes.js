// Thin-line pottery shapes, drawn as SVG path data. Silhouette.svelte and
// PotsIllustration.svelte both draw from here, so a new form is one function.

const n = (v) => Math.round(v * 100) / 100;

/**
 * One closed bowl: flat rim across the top, a round belly and a small foot.
 * `cx` is the middle, `rim` the y of the rim, `a` half the rim width, `depth`
 * how far the belly goes below the rim, and `foot`/`footH` the foot's half width
 * and height (footH 0 leaves it out, for a bowl nested in another).
 */
export function bowlPath({ cx, rim, a, depth, foot = a * 0.42, footH = 4 }) {
  const base = rim + depth;
  const left = cx - a;
  const right = cx + a;
  const feet = footH
    ? `V${n(base + footH)}H${n(cx - foot)}V${n(base)}`
    : `L${n(cx - foot)} ${n(base)}`;
  return [
    `M${n(left)} ${n(rim)}H${n(right)}`,
    `C${n(right)} ${n(rim + depth * 0.72)} ${n(cx + a * 0.5)} ${n(base)} ${n(cx + foot)} ${n(base)}`,
    feet,
    `C${n(cx - a * 0.5)} ${n(base)} ${n(left)} ${n(rim + depth * 0.72)} ${n(left)} ${n(rim)}Z`,
  ].join('');
}

/** A curve just under the rim, which makes a flat bowl read as a hollow one. */
export function rimLinePath({ cx, rim, a, lip = 5 }) {
  return `M${n(cx - a + 2)} ${n(rim + lip)}Q${n(cx)} ${n(rim + lip + 5)} ${n(cx + a - 2)} ${n(rim + lip)}`;
}

/** A mug standing on y = `base`, `x` its left edge. `handle` is the side the handle is on. */
export function mugPath({ x, base, w, h, handle = 'right' }) {
  const top = base - h;
  const r = Math.min(8, w / 3);
  const body = `M${n(x)} ${n(top)}H${n(x + w)}V${n(base - r)}Q${n(x + w)} ${n(base)} ${n(x + w - r)} ${n(base)}H${n(x + r)}Q${n(x)} ${n(base)} ${n(x)} ${n(base - r)}Z`;
  const side = handle === 'left' ? -1 : 1;
  const edge = handle === 'left' ? x : x + w;
  const y1 = top + h * 0.22;
  const y2 = top + h * 0.66;
  const out = 15 * side;
  const grip = `M${n(edge)} ${n(y1)}C${n(edge + out)} ${n(y1)} ${n(edge + out)} ${n(y2)} ${n(edge)} ${n(y2)}`;
  return { body, grip };
}

// The pot silhouette is drawn in a 64 x 64 box. The rim sits at y = 6 and the
// foot ends at y = 58, which is the range the progress fill climbs through.
export const SILHOUETTE = { top: 6, bottom: 58 };

// Every pot is a bowl for now. A form for mugs or vases would be one more
// entry here, chosen by the pot's form where Silhouette is drawn.
export const FORMS = {
  bowl: {
    body: bowlPath({ cx: 32, rim: SILHOUETTE.top, a: 27, depth: 46, foot: 11, footH: 6 }),
    rim: rimLinePath({ cx: 32, rim: SILHOUETTE.top, a: 27, lip: 6 }),
  },
};
