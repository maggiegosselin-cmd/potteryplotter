import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLATFORMS, detectPlatform, isIosPlatform, previewFromSearch } from '../src/lib/platform.js';
import { GUIDE, HELP } from '../src/content/guide.js';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko)';

test('iPhone Safari is told to use Share', () => {
  assert.equal(detectPlatform({ ua: `${IPHONE} Version/17.4 Mobile/15E148 Safari/604.1` }), 'ios-safari');
});

test('an iPad asking for the desktop site is still treated as iOS', () => {
  const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
  assert.equal(detectPlatform({ ua, platform: 'MacIntel', maxTouchPoints: 5 }), 'ios-safari');
  assert.equal(detectPlatform({ ua, platform: 'MacIntel', maxTouchPoints: 0 }), 'desktop');
});

test('other iPhone browsers are steered to Safari', () => {
  for (const tag of ['CriOS/124.0 Mobile/15E148 Safari/604.1', 'FxiOS/125.0 Mobile/15E148 Safari/605.1.15', 'EdgiOS/124.0 Mobile/15E148 Safari/605.1.15']) {
    assert.equal(detectPlatform({ ua: `${IPHONE} ${tag}` }), 'ios-browser', tag);
  }
});

test('messaging and social windows on iPhone cannot install', () => {
  assert.equal(detectPlatform({ ua: `${IPHONE} Mobile/15E148 [FBAN/FBIOS;FBAV/450.0]` }), 'ios-inapp');
  assert.equal(detectPlatform({ ua: `${IPHONE} Mobile/15E148 Instagram 320.0 Safari/604.1` }), 'ios-inapp');
  // an embedded web view has no Safari/ token
  assert.equal(detectPlatform({ ua: `${IPHONE} Mobile/15E148` }), 'ios-inapp');
});

test('Android: Chrome gets the install flow, in-app windows are steered out', () => {
  assert.equal(detectPlatform({ ua: `${ANDROID} Chrome/124.0 Mobile Safari/537.36` }), 'android');
  assert.equal(detectPlatform({ ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0 Mobile Safari/537.36' }), 'android-inapp');
  assert.equal(detectPlatform({ ua: `${ANDROID} Chrome/124.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0]` }), 'android-inapp');
  assert.equal(detectPlatform({ ua: `${ANDROID} Chrome/124.0 Mobile Safari/537.36 Instagram 320.0` }), 'android-inapp');
});

test('anything else is desktop', () => {
  assert.equal(detectPlatform({ ua: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/124.0 Safari/537.36' }), 'desktop');
  assert.equal(detectPlatform(), 'desktop');
});

test('only iOS platforms get the install-before-logging guard', () => {
  assert.deepEqual(PLATFORMS.filter(isIosPlatform), ['ios-safari', 'ios-browser', 'ios-inapp']);
});

test('preview switches are read from the address and ignore unknown values', () => {
  assert.deepEqual(previewFromSearch('?platform=ios-safari&installed=1'), { platform: 'ios-safari', installed: true });
  assert.deepEqual(previewFromSearch('?platform=toaster'), { platform: null, installed: false });
  assert.deepEqual(previewFromSearch(''), { platform: null, installed: false });
});

test('every platform has guide cards and help text, and each mock-up highlights a real item', () => {
  for (const p of PLATFORMS) {
    assert.ok(GUIDE[p]?.length, `guide for ${p}`);
    assert.ok(HELP[p]?.title, `help for ${p}`);
    for (const step of GUIDE[p]) {
      assert.ok(step.title && step.text, `${p}/${step.id} has words`);
      if (step.mock) assert.ok(step.mock.items.some((i) => i.label === step.mock.highlight), `${p}/${step.id} highlight`);
    }
  }
});

test('iPhone guides end on the home-screen icon; Android guides offer Install on the last card', () => {
  for (const p of ['ios-safari', 'ios-browser', 'ios-inapp']) assert.equal(GUIDE[p].at(-1).id, 'open');
  for (const p of ['android', 'android-inapp']) assert.equal(GUIDE[p].at(-1).install, true);
});
