const CACHE_VERSION = 'talktag-pwa-20261009-guided-short-cards';
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
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(APP_SHELL.map(url=>new Request(url,{cache:'reload'})))));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('talktag-pwa-') && key !== CACHE_VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'GET_VERSION') event.ports[0]?.postMessage({version:CACHE_VERSION});
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

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
          const fresh = await fetch(request, {cache:'no-cache'});
          if (fresh.ok) {
            await cache.put(request, fresh.clone());
          }
          return fresh;
        } catch (_) {
          return cached || caches.match('/offline.html');
        }
      })
    );
    return;
  }

  const staticJson=url.pathname.endsWith('.json')&&!url.pathname.startsWith('/api/');
  if (!['style', 'script', 'image', 'font'].includes(request.destination)&&!staticJson) return;

  event.respondWith(
    caches.open(CACHE_VERSION).then(async cache => {
      try {
        const fresh=await fetch(request,{cache:'no-cache'});
        if(fresh.ok)await cache.put(request,fresh.clone());
        return fresh;
      } catch (_) {
        return await cache.match(request) || Response.error();
      }
    })
  );
});
