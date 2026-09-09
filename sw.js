/* The Cut — service worker: Web Push (iOS 16.4+ home-screen PWA + others), offline, and fast opens.
 *
 * ⛔ THE RULE THAT OUTRANKS EVERYTHING HERE: THE UPDATE PATH MUST KEEP WORKING.
 * checkUpdate() in index.html fetches the page with cache:'no-store' and a ?u= buster, reads the
 * served `const BUILD` and compares it against the running one. If this worker ever answers THAT
 * request from the cache, the app compares the cached build against itself, the "Update ready" bar
 * never appears again, and nothing deployed reaches his phone — silently, and permanently. So that
 * request is passed straight to the network and is never cached.
 *
 * WHY CACHE-FIRST IS SAFE HERE, AND IT IS ONLY SAFE BECAUSE OF THAT. The app carries its own
 * freshness check, 1.5 s after load, on a request this worker refuses to touch. So serving the page
 * from cache costs him a tap on the Update bar, not correctness — and buys an instant open instead of
 * ~950 KB down the wire every time. Take the check away and cache-first becomes indefensible.
 *
 * ⛔ THE SUBTLE ONE, and the reason PAGE exists. Tapping the Update bar reloads the app as
 * ?v=<build>. If that response were cached under its OWN key, the next plain open would still hit
 * the old entry: the update would appear to apply, then silently revert on the following open. The
 * document therefore has exactly ONE cache key, and every document response is written to it.
 */
const CACHE = 'thecut-v2';
const PAGE  = new URL('index.html', self.location.href).href;   /* the document's ONE cache key */
const CORE  = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE).catch(() => {}))   /* a missing asset must not abort the install */
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function store(key, res){
  if(!res || !res.ok || res.type !== 'basic') return Promise.resolve();
  const copy = res.clone();
  return caches.open(CACHE).then(c => c.put(key, copy)).catch(() => {});
}
function fromCache(key){
  return caches.match(key, { ignoreSearch: true })
    .then(hit => hit || caches.match(PAGE, { ignoreSearch: true }))
    .then(hit => hit || Response.error());
}
function isDoc(req, url){
  if(req.mode === 'navigate') return true;
  return url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;                      /* never interfere with a write */
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;       /* the gist sync and the push service are not ours */

  /* ⛔ THE UPDATE CHECK GOES TO THE NETWORK, ALWAYS. See the header. Both conditions are tested: the
     fetch asks for no-store AND carries ?u=. Either identifies it, and Safari does not reliably
     expose request.cache — which is exactly why the ?u= test is not optional. */
  if (req.cache === 'no-store' || url.searchParams.has('u')) return;

  const doc = isDoc(req, url);
  const key = doc ? PAGE : req;

  /* APPLYING an update: the reload carries ?v=<build> and must come from the network, or tapping the
     bar would serve the same cached copy and the update could never land. */
  if (doc && url.searchParams.has('v')) {
    event.respondWith(
      fetch(req).then(res => { store(key, res); return res; }).catch(() => fromCache(key))
    );
    return;
  }

  event.respondWith(
    caches.match(key, { ignoreSearch: true }).then(hit => {
      if (hit) {
        /* revalidate quietly, so the NEXT open is current even if he never taps the bar */
        event.waitUntil(fetch(req).then(res => store(key, res)).catch(() => {}));
        return hit;
      }
      return fetch(req).then(res => { store(key, res); return res; }).catch(() => fromCache(key));
    })
  );
});

self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; }
  catch (e) { d = { title: 'The Cut', body: event.data ? event.data.text() : '' }; }
  const title = d.title || "The Cut";
  const options = {
    body: d.body || '',
    icon: d.icon || 'icon-192.png',
    badge: 'icon-192.png',
    tag: d.tag || 'thecut',
    renotify: true,
    data: { url: d.url || './' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
