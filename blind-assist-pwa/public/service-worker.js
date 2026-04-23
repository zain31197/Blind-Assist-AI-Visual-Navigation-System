// public/service-worker.js
// Caches the app shell and TF.js model weights for offline use
// After first load, the app works without internet

const CACHE_NAME = 'blind-assist-v1';
const MODEL_CACHE = 'blind-assist-models-v1';

// App shell resources to cache immediately
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// TF.js model URLs to cache (COCO-SSD mobilenet_v2)
const MODEL_URL_PATTERNS = [
  'tfhub.dev',
  'storage.googleapis.com/tfjs-models',
  'cdn.jsdelivr.net/npm/@tensorflow',
];

// ---- Install: cache app shell ----------------------------
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

// ---- Activate: clean old caches -------------------------
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== MODEL_CACHE)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ---- Fetch: serve from cache when offline ----------------
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // TF.js model weights — cache-first (they never change for a given version)
  const isModelAsset = MODEL_URL_PATTERNS.some(pattern => url.includes(pattern));
  if (isModelAsset) {
    event.respondWith(
      caches.open(MODEL_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      })
    );
    return;
  }

  // App shell — network-first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
