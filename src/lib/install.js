import { writable } from 'svelte/store';

export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  );
}

export function isIos() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

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
