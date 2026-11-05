import { writable } from 'svelte/store';
import { detectPlatform, isIosPlatform, previewFromSearch } from './platform.js';

const preview = previewFromSearch(window.location.search);

export function isStandalone() {
  return (
    preview.installed ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  );
}

/** How this visitor opened the link (see platform.js). */
export function currentPlatform() {
  return (
    preview.platform ||
    detectPlatform({ ua: navigator.userAgent, platform: navigator.platform, maxTouchPoints: navigator.maxTouchPoints })
  );
}

export function isIos() {
  return isIosPlatform(currentPlatform());
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

/** Shows the browser's own install dialog. Needs a tap, and only exists once the browser offered it. */
export async function promptInstall() {
  let event = null;
  installPrompt.subscribe((v) => (event = v))();
  if (!event) return;
  event.prompt();
  await event.userChoice;
  installPrompt.set(null);
}

/** The address to send to another browser: this page without any preview switches. */
export function shareLink() {
  return `${window.location.origin}${window.location.pathname}`;
}

/** Copies the link; resolves true when it worked. */
export async function copyLink(link = shareLink()) {
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    /* fall through to the older way */
  }
  try {
    const box = document.createElement('textarea');
    box.value = link;
    box.setAttribute('readonly', '');
    box.style.cssText = 'position:fixed;opacity:0;top:0';
    document.body.appendChild(box);
    box.select();
    const ok = document.execCommand('copy');
    box.remove();
    return ok;
  } catch {
    return false;
  }
}
