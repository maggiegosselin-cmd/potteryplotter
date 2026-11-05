import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

function filesUnder(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? filesUnder(full) : [full];
  });
}

function precacheList() {
  const source = readFileSync(path.join(publicDir, 'sw.js'), 'utf8');
  const match = source.match(/const PRECACHE = (\[[\s\S]*?\]);/);
  assert.ok(match, 'sw.js declares PRECACHE');
  return JSON.parse(match[1].replace(/,\s*\]$/, ']'));
}

test('the service worker precaches every file in public/ except itself', () => {
  const listed = new Set(precacheList());
  const onDisk = filesUnder(publicDir)
    .map((file) => '/' + path.relative(publicDir, file).split(path.sep).join('/'))
    .filter((url) => url !== '/sw.js');
  for (const url of onDisk) assert.ok(listed.has(url), `${url} is missing from PRECACHE (and CACHE needs a new name)`);
  for (const url of listed) {
    if (url !== '/') assert.ok(onDisk.includes(url), `${url} is listed but does not exist`);
  }
});

test('the manifest has what installing needs', () => {
  const manifest = JSON.parse(readFileSync(path.join(publicDir, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  const sizes = manifest.icons.map((icon) => icon.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  for (const icon of manifest.icons) assert.ok(statSync(path.join(publicDir, icon.src)).isFile());
});

test('the page links the manifest and the iPhone icon', () => {
  const html = readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  assert.match(html, /rel="manifest"/);
  assert.match(html, /rel="apple-touch-icon"/);
  assert.match(html, /apple-mobile-web-app-capable/);
});
