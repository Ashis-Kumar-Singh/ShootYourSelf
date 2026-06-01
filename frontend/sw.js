const CACHE = "sys-cache-v3";
const URLS = [
  "/", "/index.html", "/chat.html", "/offline.html", "/styles.css",
  "/js/app.js", "/js/chat.js", "/js/admin.js",
  "/js/community.js", "/js/vision.js", "/js/telemetry.js",
  "/js/device-memory.js", "/js/offline.js", "/js/ar.js", "/js/ecosystem.js",
  "/community.html", "/vision.html", "/telemetry.html",
  "/device-memory.html", "/offline.html", "/ar.html", "/ecosystem.html",
  "/admin.html", "/privacy.html", "/manifest.json", "/images/symbol.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).catch(() => {
        if (e.request.mode === "navigate") {
          return caches.match("/offline.html");
        }
        throw new Error("Network unavailable and no cached response exists.");
      });
    })
  );
});
