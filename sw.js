// ImageL Service Worker: cache stale-while-revalidate APENAS dos arquivos estaticos da casca (html/js/css/imagens).
// Nao toca em: requisicoes com Range (CheerpJ le os JARs por faixas), jars/wasm, cross-origin, nao-GET.
const VERSION = '0.6.0-alpha.28';
const CACHE = 'imagel-shell-' + VERSION;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('imagel-shell-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

function cacheable(url, req) {
  if (req.method !== 'GET' || req.headers.has('range')) return false;
  if (url.origin !== self.location.origin) return false;
  if (/\/lib\/ImageJ\//.test(url.pathname)) return false;
  return /\.(?:html|js|mjs|css|png|svg|gif|ico|json)$/.test(url.pathname) || url.pathname.endsWith('/');
}

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (!cacheable(url, req)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    const net = fetch(req).then(res => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { event.waitUntil(net); return hit; }
    return (await net) || new Response('Offline', { status: 503 });
  })());
});
