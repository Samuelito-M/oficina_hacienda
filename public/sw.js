const CACHE = 'oficina-hacienda-v1.29';
const PESADOS = 'oficina-hacienda-caras-1.7.15';
const BASE = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && k !== PESADOS).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r)
        .then((res) => {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copia));
          return res;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }
  const ruta = new URL(r.url).pathname;
  if (/\/(modelos|vendor)\//.test(ruta)) {
    e.respondWith(
      caches.open(PESADOS).then((c) =>
        c.match(r).then(
          (hit) =>
            hit ||
            fetch(r).then((res) => {
              if (res.ok) c.put(r, res.clone());
              return res;
            })
        )
      )
    );
    return;
  }
  e.respondWith(caches.match(r).then((hit) => hit || fetch(r)));
});
