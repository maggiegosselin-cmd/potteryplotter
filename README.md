# Pot Log

Offline-first pottery log: install to the home screen, follow each pot from lump to finished (photo optional), walk the shelves by stage.

- Svelte single-page app built by Vite (`npm run build` → `dist/`).
- Pots live on the phone in IndexedDB through Dexie's free core. Version 2 of the store adds a `stages` table (the stage list is data: eight path stages, a waiting-for-firing state, five end states; `src/lib/stages.js`) and gives each pot a current stage, a dated `history` list, clay and notes. Saved version 1 pots are upgraded in place. A history line keeps `occurredAt` (when it happened) apart from `enteredAt` (when it was typed in), so back-filled pots don't distort time-in-stage or weeks of use.
- A stage change and its history line are one write in one transaction (`src/lib/db.js`). The photo, when there is one, is a Blob in the same row.
- Ink-and-paper look: stamped stage seals, a stage rail on the pot screen, hold-to-move buttons (half-second hold, ring fills, sliding off cancels), a strip of pots waiting on studio staff above stage sections, and a select mode that moves many pots together.
- Photos are shrunk in horizontal strips (`src/lib/bands.js`, `src/lib/shrink.js`) so 48 MP photos stay under iOS canvas limits.
- Workbox (via `vite-plugin-pwa`) generates the service worker and precache list; `navigator.storage.persist()` is requested after a save.
- `server/server.js` serves `dist/` on `PORT` (default 8080) and logs one JSON line per request.

Run `python3 scripts/make-icons.py` to regenerate the icons. Tests: `npm test`.
