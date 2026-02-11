// sw.js
// v3 — безопасный режим: никаких "залипаний" UI после апдейтов

const CACHE = "kb-fullscreen-v3";

// ВАЖНО: кешируем только статические файлы.
// "./" лучше НЕ кешировать, чтобы не ловить странные редиректы/пути на GitHub Pages.
const ASSETS = [
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./favicon.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE ? caches.delete(k) : null)));
    await self.clients.claim();

    // заставляем все вкладки обновиться на новую версию
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    clients.forEach((client) => client.navigate(client.url));
  })());
});

// HTML — network-first (чтобы всегда получать свежий index.html)
// CSS/JS/SVG/manifest — stale-while-revalidate (быстро + обновляется в фоне)
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // игнорим чужие домены (расширения/аналитика)
  if (url.origin !== location.origin) return;

  const isHTML =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html") ||
    url.pathname.endsWith("/index.html");

  if (isHTML) {
    e.respondWith(networkFirst(req));
    return;
  }

  e.respondWith(staleWhileRevalidate(req));
});

async function networkFirst(req) {
  try {
    const fresh = await fetch(req, { cache: "no-store" });
    const c = await caches.open(CACHE);
    c.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await caches.match(req);
    return cached || caches.match("./index.html");
  }
}

async function staleWhileRevalidate(req) {
  const cached = await caches.match(req);
  const fetchPromise = fetch(req)
    .then(async (fresh) => {
      const c = await caches.open(CACHE);
      c.put(req, fresh.clone());
      return fresh;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}
