# Pot Log

An offline-first home-screen app: log a pot with one photo, see the list. Records and photos live on the phone (IndexedDB through Dexie); the server only hands out the app's files.

- **No build step.** Preact + htm and Dexie are plain module files in `public/vendor/`, fetched once by `scripts/vendor.sh` (the Dockerfile runs it). Our own code is in `public/js/` and loads as written.
- **Run:** `sh scripts/vendor.sh && python3 server.py` (listens on `PORT`, default 8080). Service workers need `localhost` or https.
- **Test:** `python3 -m unittest discover -s tests`.
- **Icons:** `python3 scripts/make_icons.py`.

## Layout

- `public/js/db.js` – Dexie schema (`pots`, `photos`) and the one-transaction save. Later hops add `db.version(2)`.
- `public/js/photo.js` – shrink to ~1600 px with `createImageBitmap`; falls back to the original file.
- `public/js/storage.js` – `navigator.storage.persist()` and its status note.
- `public/js/install.js` – iPhone / Android differences for install.
- `public/sw.js` – hand-written service worker, cache-first precache.
