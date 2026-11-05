// The stages a pot passes through, as data. They are stored in the Dexie
// `stages` table (see db.js) so a later hop can let potters rename, add or
// reorder them; nothing else in the app names a stage except through these rows.
//
// kind:        'path' (the ten-step journey, kiln stages included), 'waiting' (out of the potter's
//              hands) or 'end' (a pot that left the path).
// viaWaiting:  moving on from here first goes to the waiting state (the hand-in
//              before a kiln stage); moving on from waiting lands in the next
//              path stage, which is the kiln stage.
// terminal:    a path stage that finishes the pot.
// role:        optional tag the order notes read: 'drying', 'firing' or 'glazing' (null = none).
// edited:      true once the potter has changed the row; upgrades only rewrite unedited rows.
// hidden:      true when the potter has hidden the stage. Rows are never deleted, so a pot
//              sitting in a hidden stage still shows its label.
// photo:       'offer' = after moving here, offer a skippable camera button;
//              'open'  = open the camera at once (the photo is still optional).
const DEFAULT_STAGES = [
  { id: 'lump', label: 'Lump of clay', kind: 'path', order: 1 },
  { id: 'formed', label: 'Formed', kind: 'path', order: 2 },
  { id: 'leather_hard', label: 'Leather hard', kind: 'path', order: 3, photo: 'offer' },
  { id: 'bone_dry', label: 'Bone dry', kind: 'path', order: 4, viaWaiting: true, role: 'drying' },
  { id: 'bisque_kiln', label: 'In bisque kiln', kind: 'path', order: 5, role: 'firing' },
  { id: 'bisque_fired', label: 'Bisque fired', kind: 'path', order: 6, photo: 'offer' },
  { id: 'glazed', label: 'Glazed', kind: 'path', order: 7, viaWaiting: true, role: 'glazing' },
  { id: 'final_firing', label: 'In final firing', kind: 'path', order: 8, role: 'firing' },
  { id: 'glaze_fired', label: 'Glaze fired', kind: 'path', order: 9 },
  { id: 'finished', label: 'Finished', kind: 'path', order: 10, terminal: true, photo: 'offer' },
  { id: 'waiting_staff', label: 'Waiting on staff', kind: 'waiting', order: 20 },
  { id: 'flawed', label: 'Finished, with a flaw', kind: 'end', order: 30, photo: 'offer' },
  { id: 'failed', label: 'Failed', kind: 'end', order: 31, photo: 'open' },
  { id: 'reclaimed', label: 'Reclaimed', kind: 'end', order: 32 },
  { id: 'abandoned', label: 'Abandoned', kind: 'end', order: 33 },
  { id: 'given', label: 'Gifted or sold', kind: 'end', order: 34 },
];

export const WAITING_ID = 'waiting_staff';

const ROLE_BY_ID = Object.fromEntries(DEFAULT_STAGES.filter((s) => s.role).map((s) => [s.id, s.role]));

/** The author's list as rows: every stage unedited, visible, with its role (or null). */
export const STAGES = DEFAULT_STAGES.map((s) => ({ role: null, ...s, edited: false, hidden: false }));

/** Version 4 shape for a stored row that has not been edited (safe to run twice). */
export function upgradeStage(row) {
  return { ...row, edited: false, hidden: row.hidden ?? false, role: row.role ?? ROLE_BY_ID[row.id] ?? null };
}
