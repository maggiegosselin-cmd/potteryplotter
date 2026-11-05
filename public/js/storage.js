// Asks the browser to keep the app's data when the phone runs low on space.
// Both iPhone and Android answer without a prompt, from their own rules, and
// the answer can be "no", so the result is shown to the potter, not hidden.

/** Resolves {state: 'granted' | 'denied' | 'unsupported' | 'error', message}. */
function describe(state) {
  const messages = {
    granted: 'Your pots are protected: the phone will not clear them to make room.',
    denied: 'The phone has not promised to keep your pots if it runs low on space. Installing Pot Log on the Home Screen and keeping some space free helps.',
    unsupported: "This browser can't promise to keep your pots if the phone runs low on space. Keep some space free.",
    error: "Couldn't check whether the phone will keep your pots. Keep some space free.",
  };
  return { state, message: messages[state] };
}

export async function persistenceState() {
  try {
    if (!navigator.storage || !navigator.storage.persisted) return describe('unsupported');
    return describe((await navigator.storage.persisted()) ? 'granted' : 'denied');
  } catch (err) {
    return describe('error');
  }
}

/** Ask for protection (call after a save). Never throws. */
export async function requestPersistence() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return describe('unsupported');
    if (await navigator.storage.persisted()) return describe('granted');
    return describe((await navigator.storage.persist()) ? 'granted' : 'denied');
  } catch (err) {
    return describe('error');
  }
}
