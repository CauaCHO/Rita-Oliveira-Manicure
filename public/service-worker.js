const CACHE_NAME = 'agenda-manicure-v1';
const ASSETS = [
  './', './index.html', './css/style.css', './js/utils.js', './js/storage.js', './js/agenda-publica.js', './manifest.json'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).catch(()=>{}));
});
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
