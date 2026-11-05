// Asks the browser to treat the app's data as persistent, so it is not cleared
// when the phone runs low on space. The answer is a note for the potter, never a
// reason to refuse a save: a denial leaves the pot saved all the same.

/** 'granted' | 'not-granted' | 'unsupported' | 'unknown' */
export async function checkPersistence() {
  if (!navigator.storage?.persisted) return 'unsupported';
  try {
    return (await navigator.storage.persisted()) ? 'granted' : 'not-granted';
  } catch {
    return 'unknown';
  }
}

/** 'granted' | 'denied' | 'unsupported' | 'unknown' */
export async function requestPersistence() {
  if (!navigator.storage?.persist) return 'unsupported';
  try {
    if (navigator.storage.persisted && (await navigator.storage.persisted())) return 'granted';
    return (await navigator.storage.persist()) ? 'granted' : 'denied';
  } catch {
    return 'unknown';
  }
}

/** A calm sentence for each answer. */
export function persistenceNote(state) {
  switch (state) {
    case 'granted':
      return 'Your phone has agreed to keep your pots, even when space runs low.';
    case 'denied':
    case 'not-granted':
      return 'Pots are saved on this phone. If the phone runs very low on space it may clear them, so keep the app on your Home Screen and free up space when you can.';
    default:
      return 'Pots are saved on this phone. This browser cannot say whether it will keep them if space runs low.';
  }
}
