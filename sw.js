const CACHE_VERSION = 'talktag-pwa-20261007-basecamp-card';
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/talktag-theme.css',
  '/talktag-theme.js',
  '/talktag-logo.png',
  '/icons/talktag-192.png',
  '/icons/talktag-512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL)));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('talktag-pwa-') && key !== CACHE_VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

const changed = (cached, fresh) => {
  if (!cached || !fresh) return false;
  const cachedTag = cached.headers.get('etag') || cached.headers.get('last-modified');
  const freshTag = fresh.headers.get('etag') || fresh.headers.get('last-modified');
  return Boolean(cachedTag && freshTag && cachedTag !== freshTag);
};

const notifyContentUpdated = url => self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  .then(clients => clients.forEach(client => client.postMessage({ type: 'CONTENT_UPDATED', url })));

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async cache => {
        const cached = await cache.match(request);
        try {
          const fresh = await fetch(request);
          if (fresh.ok) {
            if (changed(cached, fresh)) notifyContentUpdated(request.url);
            cache.put(request, fresh.clone());
          }
          return fresh;
        } catch (_) {
          return cached || caches.match('/offline.html');
        }
      })
    );
    return;
  }

  if (!['style', 'script', 'image', 'font'].includes(request.destination)) return;

  event.respondWith(
    caches.match(request).then(cached => {
      const fresh = fetch(request).then(response => {
        if (response.ok) {
          if (changed(cached, response)) notifyContentUpdated(request.url);
          caches.open(CACHE_VERSION).then(cache => cache.put(request, response.clone()));
        }
        return response;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
