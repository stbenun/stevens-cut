/* The Cut — service worker: Web Push (iOS 16.4+ home-screen PWA + others) AND offline.
 *
 * ⛔ THE ONE RULE THAT OUTRANKS OFFLINE: THE UPDATE PATH MUST KEEP WORKING.
 * checkUpdate() in index.html fetches the page with cache:'no-store' and a ?u= buster, reads the
 * served `const BUILD` and compares it against the running one. If this worker ever answers THAT
 * request from the cache, the app compares the cached build against itself, the "Update ready" bar
 * never appears again, and nothing deployed reaches his phone. A silently un-updatable app is
 * strictly worse than one that needs a signal to start — so that request is passed straight to the
 * network and never cached, and navigations are network-FIRST with the cache only as a fallback.
 *
 * WHAT THIS BUYS: with no signal the app opens from the last copy it successfully loaded, instead of
 * not opening at all. What it deliberately does NOT do is serve the page from cache while online —
 * that would make cold starts instant, and it is a separate decision, because it means the version
 * he sees is the version he last downloaded rather than the one on the server.
 */
const CACHE = 'thecut-v1';
const CORE = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

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

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;                      /* never interfere with a write */
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;       /* the gist sync and the push service are not ours */

  /* ⛔ THE UPDATE CHECK GOES TO THE NETWORK, ALWAYS. See the header. Both conditions are checked:
     the fetch asks for no-store, and it carries ?u= — either one alone identifies it, and relying on
     one would make this hinge on a detail of how checkUpdate happens to be written today. */
  if (req.cache === 'no-store' || url.searchParams.has('u')) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        /* keep the last good copy of anything same-origin we successfully fetched */
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        /* ignoreSearch: after tapping "Update ready" the app loads itself as ?v=<build>, so the
           cached entry's query string will not match the next request's */
        caches.match(req, { ignoreSearch: true })
          .then(hit => hit || caches.match('index.html', { ignoreSearch: true }))
          .then(hit => hit || Response.error())
      )
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
