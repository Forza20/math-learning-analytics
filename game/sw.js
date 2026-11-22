// Service worker for Math Trail: makes the game installable and playable offline.
//
// It only handles the game's own files. Everything else (the dashboard, dbt docs,
// and the answer events sent to Supabase) goes straight to the network.
// Bump CACHE when any of the files below change, so players get the new version.

const CACHE = "math-trail-v8";
const APP_SHELL = [
  "./",
  "./index.html",
  "./sound.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];
const SHELL_URLS = new Set(APP_SHELL.map((p) => new URL(p, self.registration.scope).href));

self.addEventListener("install", (event) => {
  // cache: "reload" skips the browser's HTTP cache, so a new version never stores old files.
  event.waitUntil(caches.open(CACHE)
    .then((cache) => cache.addAll(APP_SHELL.map((p) => new Request(p, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("math-trail-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first for the app shell: online players always get the newest version
// (stale-while-revalidate showed the old game on the first visit after a deploy).
// Offline, or if the network fails, the cached copy is used.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  url.hash = "";
  url.search = "";
  if (!SHELL_URLS.has(url.href)) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      try {
        const res = await fetch(req.url, { cache: "no-cache" });
        if (res.ok) {
          cache.put(url.href, res.clone());
          return res;
        }
        return (await cache.match(url.href)) || res;
      } catch (err) {
        const cached = await cache.match(url.href);
        if (cached) return cached;
        throw err;
      }
    })
  );
});
