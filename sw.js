const CACHE_NAME = 'gamehub-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/admin.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    // Add common placeholder images
    '/assets/default.png',
    '/assets/flappy.png',
    '/assets/snake.png',
    '/assets/tetris.png',
    '/assets/run3.png'
    // ... add your actual image paths here
];

self.addEventListener('install', event => {
    // Perform install steps
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                // Not in cache - fetch from network
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
