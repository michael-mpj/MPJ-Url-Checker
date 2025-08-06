const CACHE_NAME = 'mpj-url-checker-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/qr-codes.html',
  '/main.js',
  '/qr-generator.js',
  '/manifest.json',
  // Only add files that exist!
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});