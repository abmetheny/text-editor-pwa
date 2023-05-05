const { offlineFallback, warmStrategyCache } = require('workbox-recipes');
const { CacheFirst, NetworkOnly } = require('workbox-strategies');
const { registerRoute, setDefaultHandler } = require('workbox-routing');
const { CacheableResponsePlugin } = require('workbox-cacheable-response');
const { ExpirationPlugin } = require('workbox-expiration');
const { precacheAndRoute } = require('workbox-precaching/precacheAndRoute');

precacheAndRoute(self.__WB_MANIFEST);

const pageCache = new CacheFirst({
  cacheName: 'page-cache',
  plugins: [
    new CacheableResponsePlugin({
      statuses: [0, 200],
    }),
    new ExpirationPlugin({
      maxAgeSeconds: 30 * 24 * 60 * 60,
    }),
  ],
});

warmStrategyCache({
  urls: ['/index.html', '/'],
  strategy: pageCache,
});

registerRoute(({ request }) => request.mode === 'navigate', pageCache);

// TODO: Implement asset caching
const pageFallback = 'offline.html';
const imageFallback = false;
const fontFallback = false;

setDefaultHandler(new NetworkOnly());

self.addEventListener('install', event => {
  const files = [pageFallback];
  if (imageFallback) {
    files.push(imageFallback);
  }
  if (fontFallback) {
    files.push(fontFallback);
  }

  event.waitUntil(
    self.caches
      .open('workbox-offline-fallbacks')
      .then(cache => cache.addAll(files))
  );
});

const handler = async options => {
  const dest = options.request.destination;
  const cache = await self.caches.open('workbox-offline-fallbacks');

  if (dest === 'document') {
    return (await cache.match(pageFallback)) || Response.error();
  }

  if (dest === 'image' && imageFallback !== false) {
    return (await cache.match(imageFallback)) || Response.error();
  }

  if (dest === 'font' && fontFallback !== false) {
    return (await cache.match(fontFallback)) || Response.error();
  }

  return Response.error();
};

setCatchHandler(handler);

offlineFallback();

registerRoute();
