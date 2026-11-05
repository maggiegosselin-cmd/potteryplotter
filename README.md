# Pot Log

Offline-first pottery log: install to the home screen, log a pot (photo optional, any stage), move it along its stages with a swipe, and walk the shelf with the longest-waiting pots first.

- Svelte single-page app built by Vite (`npm run build` → `dist/`).
- Pots live on the phone in IndexedDB through Dexie's free core; the shrunk photo is stored as a Blob in the same row, so a pot and its photo are saved as one unit.
- Stages are rows in the Dexie `stages` table (`src/lib/stages.js`): eight path stages, a waiting-on-staff state and five end states. Each pot carries its current stage and a dated `history` list; every entry stores `occurredAt` (when it happened, editable) apart from `enteredAt` (when it was typed in). Dexie version 2 adds the table and upgrades saved pots in place (`src/lib/db.js`). Record logic is pure and tested (`src/lib/pots.js`).
- The list is photo-led and ordered by days in the current stage, end states last. Swipe a card (pointer events, wide threshold, `src/lib/swipe.js`) to move it on; long press to select several and send them to waiting on staff or on after firing.
- Photos are shrunk in horizontal strips (`src/lib/bands.js`, `src/lib/shrink.js`) so 48 MP photos stay under iOS canvas limits.
- Workbox (via `vite-plugin-pwa`) generates the service worker and precache list; `navigator.storage.persist()` is requested after a save.
- `server/server.js` serves `dist/` on `PORT` (default 8080) and logs one JSON line per request.

Run `python3 scripts/make-icons.py` to regenerate the icons. Tests: `npm test`.
