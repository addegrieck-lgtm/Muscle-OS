/* MUSCLEOS — service worker : fonctionnement 100 % hors-ligne.
   - navigation : réseau d'abord, repli sur le cache (index.html)
   - fichiers statiques (JS/CSS/icônes) : cache d'abord, mis à jour en arrière-plan */
const VERSION = 'muscleos-v1.0.1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'];

// À l'installation : cœur de l'app + bundles JS/CSS référencés par index.html (noms hachés par Vite).
async function precache() {
  const cache = await caches.open(VERSION);
  await cache.addAll(CORE);
  try {
    const html = await (await fetch('./index.html', { cache: 'no-cache' })).text();
    const assets = [...html.matchAll(/(?:src|href)="(\.?\/?assets\/[^"]+)"/g)].map((m) => m[1]);
    await cache.addAll(assets);
  } catch (e) {
    /* hors-ligne pendant l'installation : les fichiers seront mis en cache au premier usage */
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // ex. Ollama sur le réseau local : jamais mis en cache

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./'))),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
