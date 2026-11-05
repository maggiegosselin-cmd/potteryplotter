import { writable } from 'svelte/store';

/** 'unknown' | 'granted' | 'denied' | 'unsupported' */
export const persistence = writable('unknown');

export async function checkPersistence() {
  if (!navigator.storage || !navigator.storage.persisted) {
    persistence.set('unsupported');
    return;
  }
  try {
    if (await navigator.storage.persisted()) persistence.set('granted');
  } catch {
    /* leave as unknown */
  }
}

// Called after a save. Phones answer without asking the user; a "no" is shown, never hidden.
export async function requestPersistence() {
  if (!navigator.storage || !navigator.storage.persist) {
    persistence.set('unsupported');
    return;
  }
  try {
    persistence.set((await navigator.storage.persisted()) || (await navigator.storage.persist()) ? 'granted' : 'denied');
  } catch {
    persistence.set('denied');
  }
}
