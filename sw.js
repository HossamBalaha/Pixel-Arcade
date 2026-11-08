/* sw.js — Pixel Arcade service worker
   Strategy:
   - precache the shell on install (offline-ready)
   - runtime: cache-first for assets (CSS/JS/images), network-first for the HTML
   - never cache cross-origin (Google Fonts, Wikipedia API, Open Trivia DB)
   - bumps CACHE_VERSION when the cached shell changes; on install the new
     cache is built and on activate every cache whose key isn't the current
     version is evicted so users always get the latest assets.
*/
const CACHE_VERSION = "v9";
const CACHE = "pixel-arcade-" + CACHE_VERSION;
const SHELL = [
  "./",
  "./index.html",
  "./404.html",
  "./css/themes.css",
  "./css/base.css",
  "./css/games.css",
  "./js/storage.js",
  "./js/audio.js",
  "./js/registry.js",
  "./js/achievements.js",
  "./js/wikifetch.js",
  "./js/wordlist.js",
  "./js/app.js",
  "./js/catalog.js",
  "./js/game-metadata.js",
  "./site.webmanifest",
  "./robots.txt",
  "./sitemap.xml",
  "./assets/icons/logo.svg",
  "./assets/icons/favicon-32x32.png",
  "./assets/icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    // Build the new cache first, then purge any cache whose key doesn't
    // match the current version so an upgrade evicts stale assets right away.
    caches.open(CACHE).then((c) => c.addAll(SHELL))
      .then(() => caches.keys())
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    // Belt-and-braces: also evict on activate so an out-of-date version
    // never lingers across browsers that didn't run the install hook.
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never cache cross-origin (fonts, Wikipedia, Open Trivia DB).
  if (url.origin !== self.location.origin) {
    return; // let the network handle it
  }

  // Network-first for HTML navigation requests (so users get latest version
  // when online, but cached version when offline).
  if (req.mode === "navigate" || req.destination === "document") {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put("./index.html", copy));
        return res;
      }).catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Cache-first for everything else (CSS, JS, images).
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});

// Optional "cache all games" request from the install banner button. The
// client posts { type: "CACHE_ALL_GAMES", urls: [...] }; we addAll them
// into the active cache and reply { ok: true|false } on the message port.
// This lets a user pre-fetch every game script once so all 300 games are
// playable offline — the default install only precaches the shell.
self.addEventListener("message", (e) => {
  const data = e.data || {};
  if (data.type !== "CACHE_ALL_GAMES") return;
  const urls = Array.isArray(data.urls) ? data.urls : [];
  const reply = (ok) => {
    if (e.source && e.source.postMessage) e.source.postMessage({ok: !!ok});
    if (e.ports && e.ports[0]) e.ports[0].postMessage({ok: !!ok});
  };
  if (!urls.length) {
    reply(true);
    return;
  }
  caches.open(CACHE).then((c) =>
    // addAll is all-or-nothing; we use individual puts so one bad URL
    // doesn't fail the whole batch.
    Promise.all(urls.map(u =>
      fetch(u, {cache: "no-store"})
        .then((res) => {
          if (res && res.status === 200) return c.put(u, res);
        })
        .catch(() => { /* ignore individual failures */
        })
    ))
  ).then(() => reply(true)).catch(() => reply(false));
});
