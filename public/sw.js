// ReplayFlix Service Worker v1
// Estratégia:
//  - Bundle (JS/CSS/fontes/ícones): Cache First (offline shell)
//  - Vídeos, thumbs, API: sempre rede (network only)
//  - HTML: Network First (com fallback pro cache se offline)

const CACHE = 'replayflix-v1';

const NEVER_CACHE = [
  '/api/',
  'supabase.co',
  'replayflix-backend.onrender.com'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;
  const method = e.request.method;

  if (method !== 'GET') return;

  // Nunca cachear API / vídeos / thumbs
  if (NEVER_CACHE.some(p => url.includes(p))) {
    return; // rede direto, sem interceptação
  }

  // HTML: Network First
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return resp;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Assets estáticos: Cache First
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (resp.ok && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      });
    })
  );
});
