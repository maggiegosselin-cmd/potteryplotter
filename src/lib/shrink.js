import { planBands } from './bands.js';

const QUALITY = 0.8;

export class PhotoError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'PhotoError';
    this.cause = cause;
  }
}

// Reads the (orientation-corrected) size without keeping a decoded copy.
function readSize(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = { width: img.naturalWidth, height: img.naturalHeight };
      img.src = '';
      URL.revokeObjectURL(url);
      resolve(size);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image failed to load'));
    };
    img.src = url;
  });
}

function toBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('encoding gave nothing'))), type, quality);
  });
}

/**
 * Shrinks a camera photo to a JPEG with a 1600 px long side.
 * The photo is cropped into horizontal strips with createImageBitmap; each strip is
 * decoded already scaled down, drawn onto one small output canvas and released before
 * the next, so a 48 MP original never needs a full-size canvas or bitmap.
 * Resolves { blob, width, height }; rejects with PhotoError.
 */
export async function shrinkPhoto(file) {
  if (typeof createImageBitmap !== 'function') {
    throw new PhotoError('This browser cannot resize photos. Please update your phone.');
  }
  let canvas;
  try {
    const { width, height } = await readSize(file);
    const plan = planBands(width, height);

    canvas = document.createElement('canvas');
    canvas.width = plan.outWidth;
    canvas.height = plan.outHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas context');

    for (const band of plan.bands) {
      const bitmap = await createImageBitmap(file, 0, band.sy, width, band.sh, {
        resizeWidth: plan.outWidth,
        resizeHeight: band.dh,
        resizeQuality: 'high',
      });
      try {
        ctx.drawImage(bitmap, 0, band.dy);
      } finally {
        bitmap.close();
      }
    }

    const blob = await toBlob(canvas, 'image/jpeg', QUALITY);
    return { blob, width: plan.outWidth, height: plan.outHeight };
  } catch (err) {
    throw new PhotoError("Couldn't shrink that photo. Try taking it again.", err);
  } finally {
    if (canvas) {
      // Let iOS free the canvas memory straight away.
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}
