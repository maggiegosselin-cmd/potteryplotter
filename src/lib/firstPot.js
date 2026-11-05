// The first-open coach. It is led by one row in the Dexie `flags` table (key
// FIRST_POT), written when the phone's store is created and cleared once the
// first pot is saved. This file only decides which of the three coach steps to
// show; the wording lives in src/content/guide.js.

export const FIRST_POT = 'firstPot';

/**
 * 'add'   — on the list, pointing at the big Add button
 * 'photo' — on the Add screen, pointing at the photo button
 * 'next'  — right after the first pot is saved, pointing at the way to move it on
 * null    — no coach
 *
 * flag: the flags row (or undefined); installed: running from the home screen;
 * potCount: pots in the store; adding: the Add screen is open;
 * justSaved: the first pot was saved in this session; skipped: "Not now" was tapped.
 */
export function coachStep({ flag, installed, potCount, adding, justSaved = false, skipped = false }) {
  if (!installed || skipped) return null;
  if (justSaved) return 'next';
  if (!flag || potCount > 0) return null;
  return adding ? 'photo' : 'add';
}
