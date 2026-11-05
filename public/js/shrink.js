// Shrinks a phone photo to about 1600 px on the long side as a JPEG, in pieces.
//
// A 48 MP photo is 192 MB once decoded, and iPhone Safari limits a canvas to
// about 16.7 M pixels. So:
//   1. read the photo's size from its header, without decoding it;
//   2. ask the browser to decode it already shrunk (createImageBitmap resize
//      options), so the full-size picture is never drawn on a canvas;
//   3. if the browser ignores those options, step down by at most half at a
//      time, drawing each step in bands of rows, and free every canvas as we go;
//   4. encode once, at the end.

import { HEADER_BYTES, MAX_EDGE, orientedSize, planSize, readImageInfo, stageSizes } from './imagemeta.js';

export const JPEG_QUALITY = 0.8;
const BAND_ROWS = 256;
const SIZE_TOLERANCE = 2;

export class ShrinkError extends Error {
  constructor(code, message, cause) {
    super(message);
    this.name = 'ShrinkError';
    this.code = code;
    this.cause = cause;
  }
}

async function sniffSize(file) {
  try {
    const bytes = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer());
    const info = readImageInfo(bytes);
    return info && info.width > 0 && info.height > 0 ? orientedSize(info) : null;
  } catch {
    return null;
  }
}

// For formats we cannot read the header of (HEIC, WebP): let the browser tell us.
function probeSize(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const done = (size) => {
      URL.revokeObjectURL(url);
      img.src = '';
      resolve(size);
    };
    img.onload = () => done(img.naturalWidth > 0 ? { width: img.naturalWidth, height: img.naturalHeight } : null);
    img.onerror = () => done(null);
    img.src = url;
  });
}

function loadWithImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ source: img, width: img.naturalWidth, height: img.naturalHeight, close() {} });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image element could not load the photo'));
    };
    img.src = url;
  });
}

function wrapBitmap(bitmap) {
  return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
}

function nearlySame(a, b) {
  return Math.abs(a.width - b.width) <= SIZE_TOLERANCE && Math.abs(a.height - b.height) <= SIZE_TOLERANCE;
}

function sameShape(a, b) {
  return Math.abs(a.width / a.height - b.width / b.height) < 0.02;
}

// Decode the photo, as small as the browser will make it.
async function decode(file, original, target) {
  if (typeof createImageBitmap === 'function') {
    if (original && (target.width < original.width || target.height < original.height)) {
      try {
        const bitmap = await createImageBitmap(file, {
          resizeWidth: target.width,
          resizeHeight: target.height,
          resizeQuality: 'high',
          imageOrientation: 'from-image',
        });
        if (nearlySame(bitmap, target) || sameShape(bitmap, original)) return wrapBitmap(bitmap);
        bitmap.close();
      } catch {
        // Resize options unsupported here; decode normally below.
      }
    }
    try {
      return wrapBitmap(await createImageBitmap(file));
    } catch {
      // Fall through to the image element.
    }
  }
  return loadWithImageElement(file);
}

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    release(canvas);
    throw new ShrinkError('canvas', 'The browser could not make room to shrink the photo.');
  }
  ctx.fillStyle = '#ffffff'; // transparent PNGs become white, not black, in a JPEG
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
}

function release(canvas) {
  canvas.width = 0;
  canvas.height = 0;
}

function drawInBands(ctx, source, srcWidth, srcHeight, width, height) {
  for (let y = 0; y < height; y += BAND_ROWS) {
    const bandHeight = Math.min(BAND_ROWS, height - y);
    const sy = Math.round((y * srcHeight) / height);
    const sh = Math.round(((y + bandHeight) * srcHeight) / height) - sy;
    ctx.drawImage(source, 0, sy, srcWidth, Math.max(1, sh), 0, y, width, bandHeight);
  }
}

function drawInStages(decoded, target) {
  let current = decoded.source;
  let currentWidth = decoded.width;
  let currentHeight = decoded.height;
  let currentCanvas = null;

  for (const [width, height] of stageSizes(currentWidth, currentHeight, target)) {
    const { canvas, ctx } = makeCanvas(width, height);
    try {
      drawInBands(ctx, current, currentWidth, currentHeight, width, height);
    } catch (err) {
      release(canvas);
      if (currentCanvas) release(currentCanvas);
      throw new ShrinkError('draw', 'The photo could not be shrunk.', err);
    }
    if (currentCanvas) release(currentCanvas);
    current = currentCanvas = canvas;
    currentWidth = width;
    currentHeight = height;
  }
  return currentCanvas;
}

function encodeJpeg(canvas) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.type === 'image/jpeg') resolve(blob);
          else reject(new ShrinkError('encode', 'The browser could not save the shrunk photo.'));
        },
        'image/jpeg',
        JPEG_QUALITY,
      );
    } catch (err) {
      reject(new ShrinkError('encode', 'The browser could not save the shrunk photo.', err));
    }
  });
}

/**
 * Shrinks a photo File. Resolves with { bytes: ArrayBuffer, type, width, height, originalBytes }.
 * Rejects with a ShrinkError; nothing is kept on failure.
 */
export async function shrinkPhoto(file) {
  if (!file || (file.type && !file.type.startsWith('image/'))) {
    throw new ShrinkError('not-image', 'That file is not a photo.');
  }

  const original = (await sniffSize(file)) || (await probeSize(file));
  const target = original ? planSize(original.width, original.height, MAX_EDGE) : null;

  let decoded;
  try {
    decoded = await decode(file, original, target);
  } catch (err) {
    throw new ShrinkError('decode', 'The photo could not be opened.', err);
  }

  let canvas;
  try {
    const finalTarget = target && sameShape(target, decoded) ? target : planSize(decoded.width, decoded.height, MAX_EDGE);
    canvas = drawInStages(decoded, finalTarget);
    const blob = await encodeJpeg(canvas);
    const bytes = await blob.arrayBuffer();
    return {
      bytes,
      type: 'image/jpeg',
      width: canvas.width,
      height: canvas.height,
      originalBytes: file.size,
    };
  } catch (err) {
    if (err instanceof ShrinkError) throw err;
    throw new ShrinkError('draw', 'The photo could not be shrunk.', err);
  } finally {
    decoded.close();
    if (canvas) release(canvas);
  }
}
