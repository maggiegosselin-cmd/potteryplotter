import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inAppBrowser, installCase, isIosUa } from '../src/lib/environment.js';
import { GUIDE } from '../src/content/guide.js';

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0 Mobile/15E148 Safari/604.1';
const IPHONE_INSTAGRAM = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21E219 Instagram 330.0.0.20.114';
const IPHONE_FACEBOOK = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21E219 [FBAN/FBIOS;FBAV/450.0;]';
const IPHONE_MESSENGER = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/21E219 [FBAN/MessengerForiOS;FBAV/450.0;]';
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Mobile Safari/537.36';
const ANDROID_INSTAGRAM = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Mobile Safari/537.36 Instagram 330.0.0.0.0 Android';

test('each way of opening the link gets its own install case', () => {
  assert.equal(installCase(IPHONE_SAFARI), 'ios-safari');
  assert.equal(installCase(IPHONE_CHROME), 'ios-other');
  assert.equal(installCase(IPHONE_INSTAGRAM), 'in-app');
  assert.equal(installCase(IPHONE_FACEBOOK), 'in-app');
  assert.equal(installCase(IPHONE_MESSENGER), 'in-app');
  assert.equal(installCase(ANDROID_CHROME), 'android');
  assert.equal(installCase(ANDROID_INSTAGRAM), 'in-app');
});

test('in-app browsers are named', () => {
  assert.equal(inAppBrowser(IPHONE_INSTAGRAM), 'Instagram');
  assert.equal(inAppBrowser(IPHONE_MESSENGER), 'Messenger');
  assert.equal(inAppBrowser(IPHONE_FACEBOOK), 'Facebook');
  assert.equal(inAppBrowser(IPHONE_SAFARI), null);
});

test('an iPad that asks for the desktop site still counts as iOS', () => {
  assert.equal(isIosUa('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5), true);
  assert.equal(isIosUa('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0), false);
});

test('the guide content has a picture name, title and text for every step', () => {
  for (const list of [GUIDE.ios, GUIDE.androidPrompt, GUIDE.androidMenu, GUIDE.inApp]) {
    assert.ok(list.steps.length > 0);
    for (const step of list.steps) assert.ok(step.art && step.title && step.text);
  }
  assert.equal(GUIDE.ios.steps.length, 3);
});
