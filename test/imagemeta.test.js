import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orientedSize, planSize, readImageInfo, stageSizes } from '../public/js/imagemeta.js';
import { detectPlatform } from '../public/js/install.js';

function u16(n) {
  return [(n >> 8) & 0xff, n & 0xff];
}

// A JPEG header: optional EXIF orientation (little-endian), then a start-of-frame segment.
function jpegHeader(width, height, orientation) {
  const bytes = [0xff, 0xd8];
  if (orientation) {
    const tiff = [0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 1, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0, orientation, 0, 0, 0, 0, 0, 0, 0];
    const payload = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff];
    bytes.push(0xff, 0xe1, ...u16(payload.length + 2), ...payload);
  }
  bytes.push(0xff, 0xc0, ...u16(17), 8, ...u16(height), ...u16(width), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1);
  return new Uint8Array(bytes);
}

test('reads JPEG size', () => {
  assert.deepEqual(readImageInfo(jpegHeader(8000, 6000)), { type: 'jpeg', width: 8000, height: 6000, orientation: 1 });
});

test('reads EXIF orientation and swaps the size for a sideways photo', () => {
  const info = readImageInfo(jpegHeader(8000, 6000, 6));
  assert.equal(info.orientation, 6);
  assert.deepEqual(orientedSize(info), { width: 6000, height: 8000 });
});

test('reads PNG size and ignores other formats', () => {
  const png = new Uint8Array(33);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  new DataView(png.buffer).setUint32(16, 640);
  new DataView(png.buffer).setUint32(20, 480);
  assert.deepEqual(readImageInfo(png), { type: 'png', width: 640, height: 480, orientation: 1 });
  assert.equal(readImageInfo(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])), null);
});

test('a truncated JPEG header gives null rather than throwing', () => {
  assert.equal(readImageInfo(new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0xff, 0xff])), null);
});

test('plans about 1600 px on the long side and never enlarges', () => {
  assert.deepEqual(planSize(8000, 6000), { width: 1600, height: 1200 });
  assert.deepEqual(planSize(6000, 8000), { width: 1200, height: 1600 });
  assert.deepEqual(planSize(800, 600), { width: 800, height: 600 });
});

test('steps down by at most half at a time and ends at the target', () => {
  assert.deepEqual(stageSizes(8000, 6000, { width: 1600, height: 1200 }), [
    [4000, 3000],
    [2000, 1500],
    [1600, 1200],
  ]);
  assert.deepEqual(stageSizes(3200, 2400, { width: 1600, height: 1200 }), [[1600, 1200]]);
  assert.deepEqual(stageSizes(1600, 1200, { width: 1600, height: 1200 }), [[1600, 1200]]);
});

test('tells iPhone, iPad and Android apart', () => {
  assert.deepEqual(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 'iPhone', 5), { ios: true, android: false });
  assert.deepEqual(detectPlatform('Mozilla/5.0 (Macintosh)', 'MacIntel', 5), { ios: true, android: false });
  assert.deepEqual(detectPlatform('Mozilla/5.0 (Macintosh)', 'MacIntel', 0), { ios: false, android: false });
  assert.deepEqual(detectPlatform('Mozilla/5.0 (Linux; Android 14)', 'Linux armv8l', 5), { ios: false, android: true });
});
