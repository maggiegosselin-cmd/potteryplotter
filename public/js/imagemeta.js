// Pure helpers for working out a photo's size without decoding it.
// Reading a few hundred KB of header is cheap; decoding a 48 MP JPEG is not.

export const MAX_EDGE = 1600;

// How many bytes from the start of a file are enough to find a JPEG's size.
export const HEADER_BYTES = 512 * 1024;

function isStartOfFrame(marker) {
  return marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
}

// EXIF orientation (1 to 8) from the APP1 segment whose payload starts at `start`.
function readExifOrientation(view, start, end) {
  try {
    if (view.getUint32(start) !== 0x45786966 || view.getUint16(start + 4) !== 0) return 1; // "Exif\0\0"
    const tiff = start + 6;
    const little = view.getUint16(tiff) === 0x4949;
    const ifd = tiff + view.getUint32(tiff + 4, little);
    const count = view.getUint16(ifd, little);
    for (let i = 0; i < count; i++) {
      const entry = ifd + 2 + i * 12;
      if (entry + 12 > end) break;
      if (view.getUint16(entry, little) === 0x0112) {
        const value = view.getUint16(entry + 8, little);
        return value >= 1 && value <= 8 ? value : 1;
      }
    }
  } catch {
    // A damaged EXIF block is not worth failing the photo for.
  }
  return 1;
}

function readJpeg(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let orientation = 1;
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = bytes[i + 1];
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      i += 2;
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) return null;
    const length = view.getUint16(i + 2);
    if (isStartOfFrame(marker)) {
      if (i + 9 > bytes.length) return null;
      return { type: 'jpeg', width: view.getUint16(i + 7), height: view.getUint16(i + 5), orientation };
    }
    if (marker === 0xe1) orientation = readExifOrientation(view, i + 4, i + 2 + length);
    i += 2 + length;
  }
  return null;
}

function readPng(bytes) {
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { type: 'png', width: view.getUint32(16), height: view.getUint32(20), orientation: 1 };
}

/** Size and EXIF orientation from the first bytes of a JPEG or PNG; null for anything else. */
export function readImageInfo(bytes) {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return readJpeg(bytes);
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return readPng(bytes);
  }
  return null;
}

/** Width and height as the photo is meant to be seen (EXIF orientation 5 to 8 turns it on its side). */
export function orientedSize({ width, height, orientation = 1 }) {
  return orientation >= 5 ? { width: height, height: width } : { width, height };
}

/** The size to shrink to: long edge at most maxEdge, never enlarged. */
export function planSize(width, height, maxEdge = MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * The sizes to draw through, as [width, height] pairs, ending at the target.
 * Each step at most halves the image, so no single step throws away much detail
 * and no canvas is bigger than half the original.
 */
export function stageSizes(srcWidth, srcHeight, target) {
  const sizes = [];
  let w = srcWidth;
  let h = srcHeight;
  while (Math.ceil(w / 2) >= target.width && Math.ceil(h / 2) >= target.height) {
    w = Math.ceil(w / 2);
    h = Math.ceil(h / 2);
    if (w === target.width && h === target.height) break;
    sizes.push([w, h]);
  }
  sizes.push([target.width, target.height]);
  return sizes;
}
