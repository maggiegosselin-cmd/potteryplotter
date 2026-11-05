// Precaches a fixed list of files and answers from the cache first, so the app
// opens and runs with no signal. When any listed file changes, change CACHE:
// the new name makes the phone fetch the whole list again and drop the old one.
// (test/precache.test.js fails if a file in public/ is missing from this list.)

const CACHE = "pot-log-v1";

const PRECACHE = [
  "/",
  "/index.html",
  "/styles.css",
  "/manifest.webmanifest",
  "/js/app.js",
  "/js/db.js",
  "/js/imagemeta.js",
  "/js/install.js",
  "/js/shrink.js",
  "/js/storage.js",
  "/icons/apple-touch-icon.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: "reload" })))),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("pot-log-") && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: request.mode === "navigate" }).then(
      (hit) =>
        hit ||
        fetch(request).catch(() =>
          request.mode === "navigate" ? caches.match("/index.html") : Response.error(),
        ),
    ),
  );
});
