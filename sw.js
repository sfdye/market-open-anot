"use strict";
// The webworker lib types `self` as a generic worker scope. Casting once gives the service
// worker surface (clients, registration, skipWaiting) without an `export {}` that would turn
// the emitted file into an ES module — this is registered as a classic worker.
const sw = self;
const CACHE_NAME = 'market-open-anot-v8';
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './market-logic.js',
    './zh-names.js',
    './dom.js',
    './push.js',
    './install-prompt.js',
    './app.js',
    './manifest.json',
    './icons/icon-192.png',
];
sw.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
    void sw.skipWaiting();
});
sw.addEventListener('activate', (event) => {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
    void sw.clients.claim();
});
sw.addEventListener('push', (event) => {
    let data = {
        title: 'Market Open Anot?',
        body: 'A market you follow has a closure coming up.',
    };
    try {
        data = event.data?.json();
    }
    catch {
        // Non-JSON payload — fall back to the generic copy above.
    }
    event.waitUntil(sw.registration.showNotification(data.title, {
        body: data.body,
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        tag: 'market-closure',
        renotify: true,
    }));
});
sw.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(sw.clients.openWindow('./'));
});
sw.addEventListener('fetch', (event) => {
    const url = event.request.url;
    // Pass through API calls to the push worker
    if (url.indexOf('workers.dev') !== -1) {
        return;
    }
    if (url.indexOf('data.gov.sg') !== -1) {
        // Stale-while-revalidate for API
        event.respondWith(caches.open(CACHE_NAME).then((cache) => cache.match(event.request).then((cached) => {
            const fetchPromise = fetch(event.request)
                .then((response) => {
                if (response.ok) {
                    void cache.put(event.request, response.clone());
                }
                return response;
            })
                .catch(() => cached);
            return cached || fetchPromise;
        })));
    }
    else {
        // Cache-first for static assets
        event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
    }
});
