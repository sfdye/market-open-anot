var CACHE_NAME = 'market-open-anot-v3';
var STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './market-logic.js',
  './zh-names.js',
  './push.js',
  './app.js',
  './manifest.json',
  './icons/icon-192.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('push', function (event) {
  var data = { title: 'Market Open Anot?', body: 'A market you follow has a closure coming up.' };
  try {
    data = event.data.json();
  } catch (e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      tag: 'market-closure',
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('./')
  );
});

self.addEventListener('fetch', function (event) {
  var url = event.request.url;

  // Pass through API calls to the push worker
  if (url.indexOf('workers.dev') !== -1) {
    return;
  }

  if (url.indexOf('data.gov.sg') !== -1) {
    // Stale-while-revalidate for API
    event.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(event.request).then(function (cached) {
          var fetchPromise = fetch(event.request).then(function (response) {
            if (response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(function () {
            return cached;
          });
          return cached || fetchPromise;
        });
      })
    );
  } else {
    // Cache-first for static assets
    event.respondWith(
      caches.match(event.request).then(function (cached) {
        return cached || fetch(event.request);
      })
    );
  }
});
