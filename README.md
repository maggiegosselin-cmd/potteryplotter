# Pot Log

Offline-first pottery log: install to the home screen, log a pot (photo optional, at any stage), move it on with one big tap, walk the shelf by stage.

- Svelte single-page app built by Vite (`npm run build` → `dist/`).
- Stages are data (`src/lib/stages.js`, the `stages` table): an eight-stage path, a waiting-for-firing state and five end states. Each pot stores its current `stageId` and a `history` whose entries keep `stageDate` (when it happened) apart from `enteredAt` (when it was typed in), so back-filled history never distorts time-in-stage.
- Dexie version 2 (`src/lib/db.js`, `src/lib/migrate.js`) keeps every saved pot, sets it to the first stage and adds the history, clay and notes. A stage change and its history entry are one transaction; Undo removes the entry it added.
- Home lists pots in stage sections with counts, each card with a big next-stage button, a separate Failed button and an Undo bar. The camera only opens when asked for.
- Pots live on the phone in IndexedDB through Dexie's free core; the shrunk photo is stored as a Blob in the same row, so a pot and its photo are saved as one unit.
- Photos are shrunk in horizontal strips (`src/lib/bands.js`, `src/lib/shrink.js`) so 48 MP photos stay under iOS canvas limits.
- Workbox (via `vite-plugin-pwa`) generates the service worker and precache list; `navigator.storage.persist()` is requested after a save.
- `server/server.js` serves `dist/` on `PORT` (default 8080) and logs one JSON line per request.

Run `python3 scripts/make-icons.py` to regenerate the icons. Tests: `npm test`.
