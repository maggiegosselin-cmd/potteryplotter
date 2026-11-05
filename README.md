# Pot Log

Offline-first pottery log: install to the home screen, log a pot with one photo, list pots.

- Svelte single-page app built by Vite (`npm run build` → `dist/`).
- Pots live on the phone in IndexedDB through Dexie's free core; the shrunk photo is stored as a Blob in the same row, so a pot and its photo are saved as one unit.
- Photos are shrunk in horizontal strips (`src/lib/bands.js`, `src/lib/shrink.js`) so 48 MP photos stay under iOS canvas limits.
- Workbox (via `vite-plugin-pwa`) generates the service worker and precache list; `navigator.storage.persist()` is requested after a save.
- `server/server.js` serves `dist/` on `PORT` (default 8080) and logs one JSON line per request.

Run `python3 scripts/make-icons.py` to regenerate the icons. Tests: `npm test`.
