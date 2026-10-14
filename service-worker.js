const CACHE_VERSION = '1.2.9';
const CACHE_NAME = `stokika-v${CACHE_VERSION}`;
const RUNTIME_CACHE = `stokika-runtime-v${CACHE_VERSION}`;

// Only cache files that definitely exist and are critical
const STATIC_ASSETS = [
  '/dalana.html',
  '/css/styles.css',
  '/js/script.js',
  '/assets/logos/logo-dark.png',
  '/assets/logos/favicon.ico.png'
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching static assets');
        // Cache files one by one to handle failures gracefully
        return Promise.allSettled(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(err => {
              console.warn(`[Service Worker] Failed to cache ${url}:`, err);
              return Promise.resolve();
            })
          )
        );
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[Service Worker] Installation failed:', err);
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => !name.includes(CACHE_VERSION))
          .map(name => {
            console.log(`[Service Worker] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => {
      console.log('[Service Worker] Activated');
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // Don't cache:
  // - API calls
  // - Supabase requests
  // - External CDN resources
  // - Non-same-origin requests
  if (url.hostname !== self.location.hostname ||
      url.pathname.includes('/api/') ||
      url.pathname.includes('/functions/') ||
      url.hostname.includes('supabase.co') ||
      url.hostname.includes('cdn.jsdelivr.net') ||
      url.hostname.includes('cdnjs.cloudflare.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        console.log(`[Service Worker] Serving from cache: ${event.request.url}`);
        return cachedResponse;
      }

      // Network first for dynamic content
      return fetch(event.request)
        .then(response => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone response for caching
          const responseToCache = response.clone();

          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(err => {
          console.error(`[Service Worker] Fetch failed for ${event.request.url}:`, err);
          
          // Return offline page if available
          return caches.match('/offline.html').then(offlineResponse => {
            return offlineResponse || new Response('Offline - No cached content available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        });
    })
  );
});

console.log('[Service Worker] Registered');




