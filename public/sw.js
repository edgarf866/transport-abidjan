/**
 * TransportMap — Service Worker v2
 * Cache les assets statiques, tuiles de carte et donnees API
 * pour le mode hors-ligne. Notification de mise a jour integree.
 */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `transportmap-${CACHE_VERSION}`;
const API_CACHE = `transportmap-api-${CACHE_VERSION}`;
const TILE_CACHE = `transportmap-tiles-${CACHE_VERSION}`;

// Limite de taille du cache de tuiles (500 tuiles max)
const MAX_TILE_CACHE = 500;

// Assets statiques a pre-cacher
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/offline.html',
];

// ─── Install ───
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ─── Activate — nettoyage des anciens caches ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => {
            // Supprimer les caches des anciennes versions
            return (key.startsWith('transportmap-') &&
              key !== CACHE_NAME &&
              key !== API_CACHE &&
              key !== TILE_CACHE);
          })
          .map((key) => caches.delete(key))
      );
    }).then(() => {
      // Notifier tous les clients qu'une nouvelle version est active
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION });
        });
      });
    })
  );
  self.clients.claim();
});

// ─── Helpers ───
async function trimCache(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxSize) {
    // Supprimer les plus anciens
    const toDelete = keys.slice(0, keys.length - maxSize);
    await Promise.all(toDelete.map(key => cache.delete(key)));
  }
}

// ─── Fetch — strategies de cache ───
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorer les requetes non-GET
  if (event.request.method !== 'GET') return;

  // 1. Tuiles de carte — cache-first (les tuiles ne changent pas souvent)
  if (
    url.hostname.includes('basemaps.cartocdn.com') ||
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('tiles.stadiamaps.com')
  ) {
    event.respondWith(
      caches.open(TILE_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) {
              cache.put(event.request, response.clone());
              // Nettoyer le cache de tuiles periodiquement
              trimCache(TILE_CACHE, MAX_TILE_CACHE);
            }
            return response;
          }).catch(() => {
            return new Response('', { status: 408, statusText: 'Offline - tile unavailable' });
          });
        });
      })
    );
    return;
  }

  // 2. API — network-first avec cache fallback
  if (url.pathname.startsWith('/api/')) {
    // Ne pas cacher les requetes d'itineraire (trop specifiques)
    const shouldCache = !url.pathname.includes('/itineraire') &&
                        !url.pathname.includes('/nearby') &&
                        !url.pathname.includes('/lines-at-point');

    event.respondWith(
      caches.open(API_CACHE).then((cache) => {
        return fetch(event.request)
          .then((response) => {
            if (response.ok && shouldCache) {
              cache.put(event.request, response.clone());
            }
            return response;
          })
          .catch(() => {
            // Offline — retourner les donnees en cache
            return cache.match(event.request).then((cached) => {
              if (cached) return cached;
              return new Response(
                JSON.stringify({
                  type: 'FeatureCollection',
                  features: [],
                  _offline: true,
                  _message: 'Donnees hors-ligne non disponibles'
                }),
                {
                  status: 200,
                  headers: { 'Content-Type': 'application/json' }
                }
              );
            });
          });
      })
    );
    return;
  }

  // 3. Nominatim geocoding — network only, pas de cache
  if (url.hostname.includes('nominatim.openstreetmap.org')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify([]),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // 4. Assets statiques de l'app — stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fetchPromise = fetch(event.request).then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response.clone());
            });
          }
          return response;
        }).catch(() => null);

        // Retourner le cache immediatement, mais rafraichir en arriere-plan
        if (cached) {
          return cached;
        }

        return fetchPromise.then(response => {
          if (response) return response;
          // Offline total — page de fallback pour les documents
          if (event.request.destination === 'document') {
            return caches.match('/offline.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
    );
    return;
  }

  // 5. Tout le reste — network only
  event.respondWith(fetch(event.request));
});

// ─── Message handler — pour forcer la mise a jour ───
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CLEAR_CACHES') {
    caches.keys().then(keys => {
      Promise.all(keys.map(key => caches.delete(key)));
    });
  }
});
