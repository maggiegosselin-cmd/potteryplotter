// Pure planning for shrinking a photo in horizontal strips. No browser APIs,
// so it can be unit-tested in Node.

export const MAX_EDGE = 1600; // long side of the saved photo, in pixels
export const BAND_PIXELS = 3_000_000; // source pixels decoded per strip (iOS canvas limit is ~16.7M)

/**
 * Plans the strips for a width x height source.
 * Returns the output size and, for each strip, the source rows to crop
 * (sy, sh) and where the scaled strip lands on the output (dy, dh).
 */
export function planBands(width, height, { maxEdge = MAX_EDGE, bandPixels = BAND_PIXELS } = {}) {
  if (!(width > 0) || !(height > 0)) throw new RangeError('Photo has no size');
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const outWidth = Math.max(1, Math.round(width * scale));
  const outHeight = Math.max(1, Math.round(height * scale));
  const rows = Math.max(1, Math.min(height, Math.floor(bandPixels / width)));

  const bands = [];
  for (let sy = 0; sy < height; sy += rows) {
    const sh = Math.min(rows, height - sy);
    const top = Math.round((sy / height) * outHeight);
    const bottom = sy + sh >= height ? outHeight : Math.round(((sy + sh) / height) * outHeight);
    if (bottom - top > 0) bands.push({ sy, sh, dy: top, dh: bottom - top });
  }
  return { outWidth, outHeight, bands };
}
