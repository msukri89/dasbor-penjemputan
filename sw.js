const CACHE_NAME = 'dasbor-v6-clearwhite'; // Ganti nama agar versi lama tergantikan
const urlsToCache = [
  './',
  './index.html',
  './style.css?v=2', 
  './app.js?v=2',
  './manifest.json'
];

// 1. Fase Install: Menyimpan memori baru
self.addEventListener('install', event => {
  self.skipWaiting(); // Memaksa Service Worker baru ini untuk langsung bekerja tanpa antre
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// 2. Fase Activate: MENGHAPUS MEMORI USANG (Ini yang kurang di kode Anda sebelumnya)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Menghapus cache lama:', cacheName);
            return caches.delete(cacheName); 
          }
        })
      );
    }).then(() => self.clients.claim()) // Langsung ambil kendali layar saat itu juga
  );
});

// 3. Fase Fetch: STRATEGI "NETWORK FIRST" (Lebih cocok agar UI selalu up-to-date)
self.addEventListener('fetch', event => {
  event.respondWith(
    // Coba ambil file terbaru dari internet dulu...
    fetch(event.request).catch(() => {
      // ...Jika ternyata offline/tidak ada sinyal, baru ambil dari memori HP (Cache)
      return caches.match(event.request);
    })
  );
});
