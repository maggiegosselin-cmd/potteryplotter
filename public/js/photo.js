// Shrinks a phone photo to about 1600 px on the long side before it is stored.
//
// Big photos (48 MP) are never drawn at full size, because iPhone Safari
// refuses canvases over 16.7 million pixels. Instead:
//   1. createImageBitmap decodes straight to 1600 px wide, so the full-size
//      picture is never held as a canvas.
//   2. A canvas at most 1600 px on the long side takes the long edge down.
//   3. The canvas is encoded as JPEG.
// If any step throws or returns nothing, the original file is kept as it is,
// with no small copy. A photo is never lost to a failed shrink.

export const MAX_SIDE = 1600;
export const JPEG_QUALITY = 0.82;

/** Size to fit width x height inside max x max, never enlarging. */
export function fitWithin(width, height, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Try to make the small copy. Resolves {blob, width, height}, or null on any failure. */
async function shrink(file) {
  if (typeof createImageBitmap !== 'function') return null;
  let bitmap = null;
  let canvas = null;
  try {
    // Only the width is given; the browser keeps the aspect ratio.
    bitmap = await createImageBitmap(file, { resizeWidth: MAX_SIDE, resizeQuality: 'high' });
    if (!bitmap || !bitmap.width || !bitmap.height) return null;
    const size = fitWithin(bitmap.width, bitmap.height);
    canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, size.width, size.height);
    const blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY);
    if (!blob || !blob.size) return null;
    return { blob, width: size.width, height: size.height };
  } catch (err) {
    console.warn('Photo shrink failed, keeping the original', err);
    return null;
  } finally {
    if (bitmap && bitmap.close) bitmap.close();
    if (canvas) { canvas.width = 0; canvas.height = 0; } // hand the memory back (iPhone)
  }
}

/**
 * Turn a chosen file into what gets stored.
 * Resolves {data: ArrayBuffer, type, shrunk, width, height, originalSize, note}.
 * Rejects only when the file cannot be read at all.
 */
export async function preparePhoto(file) {
  const small = await shrink(file);
  // A "small" copy that is not smaller (a tiny original) is not worth keeping.
  if (small && small.blob.size < file.size) {
    return {
      data: await small.blob.arrayBuffer(),
      type: 'image/jpeg',
      shrunk: true,
      width: small.width,
      height: small.height,
      originalSize: file.size,
      note: '',
    };
  }
  let data;
  try {
    data = await file.arrayBuffer();
  } catch (err) {
    throw new Error("The photo couldn't be read. Please take or choose it again.");
  }
  return {
    data,
    type: file.type || 'image/jpeg',
    shrunk: false,
    width: null,
    height: null,
    originalSize: file.size,
    note: small ? '' : "Couldn't shrink this photo, so the original is kept as it is.",
  };
}
