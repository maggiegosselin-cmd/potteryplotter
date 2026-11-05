// What differs between iPhone and Android when installing to the Home Screen.
// iPhone has no install button for web pages, so the app teaches the steps.
// Android (Chrome) offers an install prompt that the app can trigger itself.

export function detectPlatform() {
  const ua = navigator.userAgent || '';
  // iPadOS reports itself as a Mac with a touch screen.
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  const standalone = window.navigator.standalone === true
    || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  return { ios, android, standalone };
}

/** Keep Android's install prompt for later. Calls onChange(prompt or null). */
export function watchInstallPrompt(onChange) {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    onChange(event);
  });
  window.addEventListener('appinstalled', () => onChange(null));
}
