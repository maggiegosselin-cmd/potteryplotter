// Hand-written service worker: the app's files are stored once at install and
// then always answered from that store first, so the app opens with no signal.
// The server swaps __BUILD__ for a hash of the shipped files; a changed file
// gives a new cache name and the old cache is dropped on activate.
const BUILD = '__BUILD__';
const CACHE = `potlog-${BUILD}`;

const PRECACHE = [
  '/',
  '/styles.css',
  '/manifest.webmanifest',
  '/js/app.js',
  '/js/db.js',
  '/js/photo.js',
  '/js/storage.js',
  '/js/install.js',
  '/js/sample.js',
  '/vendor/dexie.mjs',
  '/vendor/preact-htm.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // 'reload' skips the browser's HTTP cache so the store holds fresh copies.
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('potlog-') && key !== CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).catch(() => {
        // Opening the app at any address with no signal still gives the app.
        if (request.mode === 'navigate') return caches.match('/');
        return Response.error();
      });
    })
  );
});
