// Service worker for Math Trail: makes the game installable and playable offline.
//
// It only handles the game's own files. Everything else (the dashboard, dbt docs,
// and the answer events sent to Supabase) goes straight to the network.
// Bump CACHE when any of the files below change, so players get the new version.

const CACHE = "math-trail-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png"
];
const SHELL_URLS = new Set(APP_SHELL.map((p) => new URL(p, self.registration.scope).href));

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("math-trail-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate for the app shell: open instantly from the cache,
// and refresh the cached copy in the background when online.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  url.hash = "";
  url.search = "";
  if (!SHELL_URLS.has(url.href)) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(url.href);
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(url.href, res.clone());
          return res;
        })
        .catch(() => cached);
      if (cached) {
        event.waitUntil(fresh);
        return cached;
      }
      return fresh;
    })
  );
});
