// The pot silhouettes. Each form is data: an outline that the progress fill is clipped to,
// open detail lines drawn over it, and the y range (in the 64 x 64 box) the fill climbs through.
// To add a form, add an entry to FORMS; nothing else needs to change. A pot's form is picked
// from a hash of its id, so it is stable but says nothing about the pot's real shape.
import { hashString } from './drawn.js';

export const BOX = 64;

export const FORMS = [
  {
    name: 'bowl',
    outline: 'M5 19C20 21 44 21 59 19C58 38 50 49 41 52L43 58H21L23 52C14 49 6 38 5 19Z',
    details: ['M8 26C22 28 42 28 56 26'],
    top: 19,
    bottom: 58,
  },
  {
    name: 'mug',
    outline: 'M13 13C22 12 36 14 45 12L46 50C46 55 42 58 37 58H21C16 58 12 54 13 49Z',
    details: ['M46 21C56 19 59 24 58 31C57 38 52 41 46 42', 'M13 22C24 23 36 21 46 22'],
    top: 12,
    bottom: 58,
  },
];

/** The form for a pot id: the same id always gets the same form. */
export const formOf = (id) => FORMS[hashString(id) % FORMS.length];

/** The y the fill reaches at `progress` (0 empty, 1 full). */
export function fillTop(form, progress) {
  const p = Math.min(1, Math.max(0, progress));
  return form.top + (form.bottom - form.top) * (1 - p);
}
