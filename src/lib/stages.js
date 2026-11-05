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
// hidden:      added on the potter's phone (see stageEdit.js). A hidden stage is skipped
//              when a pot moves on, but pots sitting there and history lines keep it.
// photo:       'offer' = after moving here, offer a skippable camera button;
//              'open'  = open the camera at once (the photo is still optional).
export const STAGES = [
  { id: 'lump', label: 'Lump of clay', kind: 'path', order: 1 },
  { id: 'formed', label: 'Formed', kind: 'path', order: 2 },
  { id: 'leather_hard', label: 'Leather hard', kind: 'path', order: 3, photo: 'offer' },
  { id: 'bone_dry', label: 'Bone dry', kind: 'path', order: 4, viaWaiting: true },
  { id: 'bisque_kiln', label: 'In bisque kiln', kind: 'path', order: 5 },
  { id: 'bisque_fired', label: 'Bisque fired', kind: 'path', order: 6, photo: 'offer' },
  { id: 'glazed', label: 'Glazed', kind: 'path', order: 7, viaWaiting: true },
  { id: 'final_firing', label: 'In final firing', kind: 'path', order: 8 },
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

// Order checks for the gentle skip note (see flags.js). They name the seeded ids,
// not labels, so a renamed stage still counts. Moving a pot into `to` without its
// history ever holding `needs` is a skipped step.
export const SKIP_RULES = [
  { to: 'bisque_kiln', needs: 'bone_dry' }, // drying before the first firing
  { to: 'final_firing', needs: 'glazed' }, // glazing before the glaze firing
];
