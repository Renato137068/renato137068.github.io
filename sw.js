// FinançasPro MVP v1.0 — Service Worker (PWA Offline)

const CACHE_NAME = 'financaspro-v1';
const urlsParaCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/config.js',
  '/js/dados.js',
  '/js/utils.js',
  '/js/transacoes.js',
  '/js/orcamento.js',
  '/js/render.js',
  '/js/config-user.js',
  '/js/init.js'
];

// INSTALL
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsParaCache).catch(() => {});
    })
  );
  self.skipWaiting();
});

// ACTIVATE
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// FETCH
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.method === 'GET') {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || new Response('Offline', { status: 503 });
        });
      })
  );
});
