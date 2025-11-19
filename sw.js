// sw.js - Service Worker for PWA
const CACHE_NAME = 'gamehub-v2';
const urlsToCache = [
    './',
    'index.html',
    'app.js',
    'utils.js',
    'config.js',
    'style.css',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://unpkg.com/lucide@latest'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    // Cache-first strategy for assets
    if (event.request.url.includes('cdn.jsdelivr.net') || event.request.url.includes('placehold.co')) {
        event.respondWith(
            caches.match(event.request).then(response => {
                return response || fetch(event.request).then(response => {
                    // Cache for 1 hour
                    if (response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                });
            })
        );
    }
});
