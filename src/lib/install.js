import { writable } from 'svelte/store';
import { installCase, inAppBrowser, isIosUa } from './environment.js';

export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  );
}

export function isIos() {
  return isIosUa(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
}

/** How this page was opened: 'in-app', 'ios-safari', 'ios-other' or 'android'. */
export function detectCase() {
  return installCase(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
}

/** The in-app browser's name (Instagram, Messenger, Facebook), or null. */
export const detectInAppName = () => inAppBrowser(navigator.userAgent);

/** The Android/Chrome install prompt, once the browser offers it (iPhone never does). */
export const installPrompt = writable(null);
export const installed = writable(isStandalone());

export function listenForInstall() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt.set(event);
  });
  window.addEventListener('appinstalled', () => {
    installPrompt.set(null);
    installed.set(true);
  });
}
