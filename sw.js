const CACHE_NAME = 'smarta-kokboken-v1.12';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './css/style.css',
  './js/main.js',
  './js/state.js',
  './js/dom.js',
  './js/utils.js',
  './js/storage.js',
  './js/router.js',
  './js/api.js',
  './js/views/dashboard.js',
  './js/views/tinder.js',
  './js/views/library.js',
  './js/views/shopping.js',
  './js/views/settings.js',
  './js/modals/recipeDetail.js',
  './js/modals/recipeForm.js',
  './js/modals/dayChooser.js',
  './js/modals/quickPantry.js',
  './js/modals/shoppingBuilder.js',
  'https://unpkg.com/lucide@latest',
  'https://unpkg.com/qrcode@1.4.4/build/qrcode.min.js'
];

// Install Service Worker
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static shell');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Service Worker & Clean Old Caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Stale-While-Revalidate Fetch Pattern
self.addEventListener('fetch', (e) => {
  // Only handle standard GET requests (e.g. skip Google POST API calls)
  if (e.request.method !== 'GET') return;
  
  // Skip browser extension requests
  if (e.request.url.startsWith('chrome-extension://')) return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached resource immediately, fetch update in background
        fetch(e.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(e.request, networkResponse);
              });
            }
          })
          .catch(() => {
            // Silently ignore background fetch errors (e.g. if offline)
          });
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(e.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });

        return networkResponse;
      });
    })
  );
});
