const CACHE_NAME = 'dasbor-v5-stale-fix';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

// Aktifkan service worker baru segera setelah selesai di-install.
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Ambil alih halaman yang sedang terbuka dan hapus cache versi lama.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

// Tetap gunakan cache agar aplikasi cepat dibuka.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
