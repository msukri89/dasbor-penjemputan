const CACHE_NAME = 'dasbor-v7-clearwhite'; 
const urlsToCache = [
  './',
  './index.html',
  './style.css?v=4', 
  './app.js?v=4',
  './manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName); 
          }
        })
      );
    }).then(() => self.clients.claim()) 
  );
});

self.addEventListener('fetch', event => {
  // PERBAIKAN: Jangan pernah simpan data Google Script ke dalam Cache!
  if (event.request.url.includes('script.google.com') || event.request.url.includes('script.googleusercontent.com')) {
    return; // Biarkan langsung mengambil data asli dari internet
  }
  
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
