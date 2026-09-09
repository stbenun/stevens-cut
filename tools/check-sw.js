#!/usr/bin/env node
/* check-sw.js — EXECUTE the service worker's routing decisions against fake requests.
 *
 * WHY THIS IS NOT A REGEX CHECK. sw.js decides, per request, whether to answer from the cache. The
 * one decision that matters cannot be read off the source with confidence: checkUpdate() fetches the
 * page with cache:'no-store' and ?u=, and if this worker ever answers THAT from the cache, the app
 * compares the cached BUILD against itself — the "Update ready" bar never appears again and nothing
 * deployed reaches his phone. An app that cannot be updated is worse than an app that needs signal.
 * So the handler is loaded into a sandbox with fake caches/fetch and actually called, and what it
 * does is asserted. jsdom has no ServiceWorker, which is why this is its own tool.
 *
 * ⛔ THE FAKE CACHE IS STRICT ON PURPOSE, and three plants are the reason. Its first version stripped
 * the query string on every lookup, so it hit whether or not the worker passed ignoreSearch — and the
 * plant that DROPS ignoreSearch sailed through. A permissive double is a test that agrees with
 * anything. Exact key, and ignoreSearch only when the worker actually asks for it. Relative keys are
 * resolved against the worker's own URL, the way a browser does.
 *
 * ⛔ EMPTY OUTPUT IS A CRASH, NOT A PASS. The last line always prints.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* --file <path> points every check at a COPY, so the plant harness can break it without touching
   the real worker — the same convention probe.js and check-food.js already use. */
const SW = (function(){
  const i = process.argv.indexOf('--file');
  return i > -1 && process.argv[i+1] ? path.resolve(process.argv[i+1])
                                     : path.resolve(__dirname, '..', 'sw.js');
})();
const ORIGIN = 'https://stbenun.github.io';
const SCOPE  = ORIGIN + '/stevens-cut/';
const PAGE   = SCOPE + 'index.html';
let failed = 0;
const ok   = (n, m) => console.log('  ok    [' + n + '] ' + m);
const fail = (n, m) => { failed++; console.log('  FAIL  [' + n + '] ' + m); };

const urlOf = r => (typeof r === 'string' ? r : r.url);
const abs   = u => { try { return new URL(u, SCOPE + 'sw.js').href; } catch(e){ return u; } };
const strip = u => abs(u).split('?')[0];

function boot(){
  const state = {
    handlers: {}, cachePuts: [], cacheReads: [], networkCalls: [], store: new Map(),
    net: () => Promise.reject(new Error('offline')),      /* every clause may override this */
  };
  const cacheObj = {
    addAll: () => Promise.resolve(),
    put: (req, res) => { const u = abs(urlOf(req)); state.cachePuts.push(u); state.store.set(u, res); return Promise.resolve(); },
    delete: () => Promise.resolve(true),
  };
  const sandbox = {
    self: {
      addEventListener: (t, f) => { state.handlers[t] = f; },
      skipWaiting: () => Promise.resolve(),
      clients: { claim: () => Promise.resolve(), matchAll: () => Promise.resolve([]), openWindow: () => Promise.resolve() },
      location: { origin: ORIGIN, href: SCOPE + 'sw.js' },
      registration: { showNotification: () => Promise.resolve() },
    },
    caches: {
      open: () => Promise.resolve(cacheObj),
      keys: () => Promise.resolve([]),
      delete: () => Promise.resolve(true),
      /* STRICT: exact key, unless the worker asked for ignoreSearch */
      match: (req, opts) => {
        const want = abs(urlOf(req));
        state.cacheReads.push(want + (opts && opts.ignoreSearch ? ' (ignoreSearch)' : ' (exact)'));
        let hit = state.store.get(want);
        if(!hit && opts && opts.ignoreSearch){
          for(const [k, v] of state.store){ if(strip(k) === strip(want)){ hit = v; break; } }
        }
        return Promise.resolve(hit || undefined);
      },
    },
    fetch: (req) => { state.networkCalls.push(abs(urlOf(req))); return state.net(req); },
    Response: { error: () => ({ __responseError: true }) },
    URL, Promise, console, setTimeout, setImmediate,
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(SW, 'utf8'), sandbox, { filename: 'sw.js' });
  if(!state.handlers.fetch) throw new Error('sw.js registered no fetch handler — nothing to check');
  return state;
}

/* a fake FetchEvent: records whether the worker took the request over */
function fire(state, req){
  let taken = null;
  const event = { request: req, respondWith: p => { taken = p; }, waitUntil: () => {} };
  state.handlers.fetch(event);
  return taken;                     /* null = passed through to the browser untouched */
}
const REQ = (url, extra) => Object.assign({ url, method: 'GET', cache: 'default' }, extra || {});
const RES = (tag) => ({ ok: true, type: 'basic', __tag: tag, clone: () => ({ __tag: tag + ':copy' }) });

(async () => {
  /* ---- 1. the update check must NEVER be answered from cache --------------------------- */
  {
    const bad = [];
    const cases = [
      ['?u= plus no-store', REQ(PAGE + '?u=0.123', { cache: 'no-store' })],
      ['?u= alone',         REQ(PAGE + '?u=0.999')],
      ['no-store alone',    REQ(PAGE, { cache: 'no-store' })],
    ];
    for(const [label, req] of cases){
      const s = boot();
      s.net = () => Promise.resolve(RES('network'));
      /* a populated cache is the dangerous case — an empty one hides a cache-first worker */
      s.store.set(PAGE, RES('cache'));
      if(fire(s, req) !== null) bad.push('the ' + label + ' update check was taken over by the worker');
    }
    if (bad.length) fail('sw-update-path', bad.join(' | ') + '  — an app that cannot update is worse than one that needs signal');
    else ok('sw-update-path', 'the update check reaches the network all three ways (?u= + no-store, ?u= alone, no-store alone), even with a populated cache — the Update-ready bar cannot be starved');
  }

  /* ---- 2. what the worker must not touch at all ---------------------------------------- */
  {
    const bad = [];
    const cases = [
      ['a POST',                        REQ(PAGE, { method: 'POST' }), 'writes must never be cached or replayed'],
      ['the gist sync (cross-origin)',  REQ('https://api.github.com/gists/abc'), 'his data sync is not ours to cache'],
      ['the push endpoint',             REQ('https://web.push.apple.com/QHdq'), 'the push service is not ours to cache'],
    ];
    for(const [label, req, why] of cases){
      const s = boot();
      s.net = () => Promise.resolve(RES('network'));
      if(fire(s, req) !== null) bad.push(label + ' was intercepted — ' + why);
    }
    if (bad.length) fail('sw-scope', bad.join(' | '));
    else ok('sw-scope', 'POSTs and cross-origin traffic pass straight through — his gist sync and the push service are untouched');
  }

  /* ---- 3. online: network FIRST, with a POPULATED cache -------------------------------- */
  {
    const s = boot();
    const net = RES('network');
    s.net = () => Promise.resolve(net);
    /* ⛔ SEED THE CACHE. With an empty one a cache-first worker falls through to the network and
       looks identical to a network-first worker — the plant proved that, by passing. */
    s.store.set(PAGE, RES('cache'));
    const taken = fire(s, REQ(PAGE));
    const bad = [];
    if (taken === null) bad.push('a normal page load was not handled at all');
    else {
      const got = await taken;
      if (got !== net) bad.push('served the ' + (got && got.__tag) + ' copy, not the network one — this is supposed to be network-FIRST, so he sees what is deployed');
      if (!s.networkCalls.length) bad.push('the network was never called');
      await new Promise(r => setImmediate(r));
      if (!s.cachePuts.length) bad.push('nothing was written to the cache, so there is no copy to fall back on');
    }
    if (bad.length) fail('sw-online', bad.join(' | '));
    else ok('sw-online', 'online, a page load is served from the network even when a cached copy exists, and the fresh copy replaces it');
  }

  /* ---- 4. offline: the stored copy is served ------------------------------------------- */
  {
    const s = boot();
    const cached = RES('cache');
    s.store.set(PAGE, cached);
    s.net = () => Promise.reject(new Error('offline'));
    const taken = fire(s, REQ(PAGE));
    const bad = [];
    if (taken === null) bad.push('offline, the page load was not handled — the app would simply not open');
    else {
      const got = await taken;
      if (got !== cached) bad.push('offline, the cached copy was not served (got ' + JSON.stringify(got) + ')');
      if (!s.cacheReads.length) bad.push('the cache was never consulted');
    }
    if (bad.length) fail('sw-offline', bad.join(' | '));
    else ok('sw-offline', 'offline, the last good copy is served — the app opens with no signal');
  }

  /* ---- 5. offline AFTER an update tap: ?v=<build> must still resolve ------------------- */
  {
    const s = boot();
    const cached = RES('cache');
    s.store.set(PAGE, cached);                 /* stored WITHOUT a query, as a normal load would */
    s.net = () => Promise.reject(new Error('offline'));
    /* tapping "Update ready" reloads as ?v=<build>; with no signal that must not dead-end */
    const taken = fire(s, REQ(PAGE + '?v=b1788957337'));
    const bad = [];
    if (taken === null) bad.push('a ?v= reload was not handled offline');
    else {
      const got = await taken;
      if (got && got.__responseError)
        bad.push('a ?v= reload dead-ends offline — tapping Update with no signal would show a blank screen. TWO things resolve that URL and BOTH are gone: ignoreSearch on the first lookup, and the literal index.html fallback. Either one alone is enough, so check both lines.');
      else if (got !== cached) bad.push('a ?v= reload served ' + JSON.stringify(got) + ' rather than the cached page');
    }
    if (bad.length) fail('sw-update-reload', bad.join(' | '));
    else ok('sw-update-reload', 'a ?v= update reload still finds the cached page offline (ignoreSearch), so tapping Update with no signal cannot brick the app');
  }

  console.log(failed ? '\n' + failed + ' CHECK(S) FAILED' : '\nall service-worker checks passed');
  process.exit(failed ? 1 : 0);
})();
