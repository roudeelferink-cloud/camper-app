// Camper Compagnon — service worker, cache-first, volledig offline.
const VERSION = 'v1.4.0';
const CACHE_NAME = 'camper-compagnon-' + VERSION;

const APP_SHELL = [
  './',
  './index.html',
  './app.js',
  './weights.js',
  './countries.js',
  './style.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.startsWith('camper-compagnon-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isOwn = url.origin === self.location.origin;
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  // Firebase SDK-modules van gstatic cachen, zodat de app offline blijft
  // opstarten (de Firestore-data zelf zit in IndexedDB, niet in deze cache).
  const isFirebaseSdk = url.hostname === 'www.gstatic.com' && url.pathname.indexOf('/firebasejs/') === 0;
  if (!isOwn && !isFont && !isFirebaseSdk) return; // API-calls e.d. nooit cachen

  // Cache-first: eigen bestanden en fonts.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      }).catch(() => {
        // Offline en niet in cache: voor navigaties de app-shell teruggeven.
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});
