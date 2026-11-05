# Pot log

A home-screen web app for logging pots with a photo, working with no signal.
Plain HTML, CSS and ES modules in `public/`: no build step, no dependencies.

- `public/js/app.js` the one screen
- `public/js/db.js` raw IndexedDB: a pot and its shrunk photo (ArrayBuffer + MIME type) in one transaction
- `public/js/shrink.js`, `imagemeta.js` photo shrinking to about 1600 px JPEG at quality 80, in stages
- `public/js/storage.js` `navigator.storage.persist()` and the status note
- `public/js/install.js` iPhone Share-menu steps and the Android Install button
- `public/sw.js` precaches a fixed file list, cache-first. **When you change any file in `public/`, rename `CACHE`** so phones fetch the new files.
- `server.js` serves `public/` on `PORT` (default 8080) and logs one JSON line per request

Run: `npm start`. Test: `npm test`. Service workers need HTTPS or `localhost`.
