// Which way a visitor opened the link, from the user agent. Pure, so it is tested
// without a browser. Each result is one of PLATFORMS and picks a guide in
// src/content/guide.js.
//
//   ios-safari    iPhone/iPad Safari: Share → Add to Home Screen
//   ios-browser   another iPhone browser (Chrome, Firefox, Edge…): steer to Safari
//   ios-inapp     a messaging/social app's own window on iPhone: cannot install, steer to Safari
//   android       Android browser: Install button when offered, else the menu
//   android-inapp a messaging/social app's own window on Android: steer to Chrome
//   desktop       anything else
export const PLATFORMS = ['ios-safari', 'ios-browser', 'ios-inapp', 'android', 'android-inapp', 'desktop'];

// Apps that open links in their own window. None of them can add to the home screen.
const IN_APP = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger|Line\/|MicroMessenger|Snapchat|Twitter|TikTok|musical_ly|Bytedance|LinkedInApp|Pinterest|GSA\//i;
const IOS_OTHER_BROWSER = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|DuckDuckGo|Brave|YaBrowser/i;

/** env: { ua, platform, maxTouchPoints } as read from `navigator`. */
export function detectPlatform({ ua = '', platform = '', maxTouchPoints = 0 } = {}) {
  const ios = /iPhone|iPad|iPod/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
  if (ios) {
    if (IN_APP.test(ua)) return 'ios-inapp';
    if (IOS_OTHER_BROWSER.test(ua)) return 'ios-browser';
    // Real Safari always says "Safari/"; an app's embedded web view does not.
    if (!/Safari\//.test(ua)) return 'ios-inapp';
    return 'ios-safari';
  }
  if (/Android/i.test(ua)) return IN_APP.test(ua) || /; wv\)/.test(ua) ? 'android-inapp' : 'android';
  return 'desktop';
}

export const isIosPlatform = (platform) => platform.startsWith('ios');

/**
 * Preview switches read from the address, so every guide can be looked at from any
 * device: ?platform=ios-safari, and ?installed=1 for the installed first open.
 */
export function previewFromSearch(search = '') {
  const params = new URLSearchParams(search);
  const platform = params.get('platform');
  return {
    platform: PLATFORMS.includes(platform) ? platform : null,
    installed: params.get('installed') === '1',
  };
}
