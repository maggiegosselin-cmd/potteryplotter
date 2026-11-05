// Which way the link was opened, read from the user agent. Pure (no window access), so it runs in Node tests.

const IN_APP = [
  ['Instagram', /Instagram/i],
  ['Messenger', /MessengerForiOS|FB_IAB\/MESSENGER|Orca-Android|\bMessenger\b/i],
  ['Facebook', /FBAN|FBAV|FB_IAB|FBIOS/],
];

/** The name of the in-app browser (Instagram, Messenger, Facebook) the page is open in, or null. */
export function inAppBrowser(ua = '') {
  const hit = IN_APP.find(([, pattern]) => pattern.test(ua));
  return hit ? hit[0] : null;
}

export function isIosUa(ua = '', platform = '', touchPoints = 0) {
  return /iPhone|iPad|iPod/.test(ua) || (platform === 'MacIntel' && touchPoints > 1);
}

/** An iPhone browser that is not Safari (Chrome, Firefox, Edge, Opera, DuckDuckGo, Google app). */
export function isOtherIosBrowser(ua = '') {
  return /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|DuckDuckGo|GSA\//.test(ua);
}

/**
 * The install path for this visitor: 'in-app' (cannot install from here), 'ios-safari',
 * 'ios-other' (an iPhone browser that is not Safari) or 'android' (Android, and anything else).
 */
export function installCase(ua = '', platform = '', touchPoints = 0) {
  if (inAppBrowser(ua)) return 'in-app';
  if (isIosUa(ua, platform, touchPoints)) return isOtherIosBrowser(ua) ? 'ios-other' : 'ios-safari';
  return 'android';
}
