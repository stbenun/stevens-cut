#!/usr/bin/env node
/* check-sw.plant.js — plants real defects into a COPY of sw.js and proves check-sw.js catches each.
 *
 * The only thing that tests a test is a defect. check-sw.js was written the same afternoon as the
 * worker it checks, which is exactly when a check is most likely to be shaped around the code it is
 * looking at rather than around the failure it is supposed to prevent.
 *
 * ⛔ NOTHING HERE WRITES sw.js. Each defect goes into os.tmpdir() and check-sw.js is pointed at it
 * with --file, the pattern the three sibling harnesses already use.
 * ⛔ EMPTY OUTPUT IS A CRASH, NOT A PASS. The last line always prints.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const SW = path.resolve(__dirname, '..', 'sw.js');

const PLANTS = [
  { guard: 'sw-update-path',
    name: 'the update check is allowed to be served from cache — the app silently stops updating',
    /* THE defect this whole tool exists for, and the one that makes cache-first defensible at all:
       starve checkUpdate() of the network and the "Update ready" bar never appears again, so nothing
       deployed reaches his phone. */
    edits: [{ from: "  if (req.cache === 'no-store' || url.searchParams.has('u')) return;",
              to:   "  /* removed */" }] },

  { guard: 'sw-update-path',
    name: 'only ?u= is bypassed, so a no-store check without the buster gets cached',
    /* Safari does not reliably expose request.cache, which is why the ?u= test is not optional —
       and this plant is why the no-store test is not optional either. */
    edits: [{ from: "  if (req.cache === 'no-store' || url.searchParams.has('u')) return;",
              to:   "  if (url.searchParams.has('u')) return;" }] },

  { guard: 'sw-scope',
    name: 'cross-origin traffic gets intercepted, so the gist sync goes through the cache',
    edits: [{ from: "  if (url.origin !== self.location.origin) return;       /* the gist sync and the push service are not ours */",
              to:   "  /* removed */" }] },

  { guard: 'sw-scope',
    name: 'POSTs get intercepted, so a write could be answered from cache',
    edits: [{ from: "  if (req.method !== 'GET') return;                      /* never interfere with a write */",
              to:   "  /* removed */" }] },

  { guard: 'sw-online',
    name: 'it reverts to network-first, so every cold open pays ~950 KB again',
    edits: [{ from: "      if (hit) {", to: "      if (false) {" }] },

  { guard: 'sw-online',
    name: 'the background revalidate is dropped, so the cache never refreshes on its own',
    /* without it he depends on noticing the Update bar EVERY time; with it, simply reopening the app
       tomorrow gets him the current build. */
    edits: [{ from: "        event.waitUntil(fetch(req).then(res => store(key, res)).catch(() => {}));",
              to:   "        /* not revalidated */" }] },

  { guard: 'sw-online',
    name: 'nothing is ever stored, so there is no copy to open offline and nothing to serve fast',
    edits: [{ from: "  if(!res || !res.ok || res.type !== 'basic') return Promise.resolve();",
              to:   "  return Promise.resolve();" }] },

  { guard: 'sw-update-apply',
    name: 'the ?v= branch is gone, so tapping Update serves the cached copy and the update never lands',
    /* the bar would reappear on every open, forever, and tapping it would do nothing visible. */
    edits: [{ from: "  if (doc && url.searchParams.has('v')) {",
              to:   "  if (false && doc && url.searchParams.has('v')) {" }] },

  { guard: 'sw-one-key',
    name: 'the document stops having ONE cache key — the update applies once, then reverts',
    /* the subtlest failure in this file: ?v= is cached under its own key, the next plain open still
       hits the old entry, and the app appears to update and then go back. */
    edits: [{ from: "  const key = doc ? PAGE : req;", to: "  const key = req;" }] },

  { guard: 'sw-update-reload',
    name: 'the ?v= branch loses its offline fallback — tapping Update with no signal shows an error page',
    edits: [{ from: "      fetch(req).then(res => { store(key, res); return res; }).catch(() => fromCache(key))\n    );\n    return;",
              to:   "      fetch(req).then(res => { store(key, res); return res; })\n    );\n    return;" }] },
];

function main(){
  const orig = fs.readFileSync(SW, 'utf8');
  let all = true;

  PLANTS.forEach(function(p, i){
    let s = orig, broken = false;
    for(const e of p.edits){
      if(s.split(e.from).length - 1 !== 1){
        console.log('BROKEN CASE  [' + p.guard + '] ' + p.name + ' — anchor not unique/found');
        broken = true; all = false; break;
      }
      s = s.replace(e.from, e.to);
    }
    if(broken) return;
    if(s === orig){
      console.log('BROKEN CASE  [' + p.guard + '] ' + p.name + ' — plant changed nothing');
      all = false; return;
    }
    const tmp = path.join(os.tmpdir(), 'sw-plant-' + i + '.js');
    fs.writeFileSync(tmp, s);
    let out = '', code = 0;
    try { out = execSync('node "' + path.join(__dirname, 'check-sw.js') + '" --file "' + tmp + '"', {encoding:'utf8'}); }
    catch(e){ code = e.status || 1; out = (e.stdout || '') + (e.stderr || ''); }
    try { fs.unlinkSync(tmp); } catch(e){}
    const rx = new RegExp('FAIL\\s+\\[' + p.guard + '\\]');
    if(code !== 0 && rx.test(out)){
      const line = (out.split('\n').find(l => rx.test(l)) || '').trim();
      console.log('CAUGHT  [' + p.guard + '] ' + p.name);
      console.log('        ' + line.slice(0, 150));
    } else {
      console.log('NOT CAUGHT  [' + p.guard + '] ' + p.name + '  (exit=' + code + ')');
      all = false;
    }
  });

  const untouched = fs.readFileSync(SW, 'utf8') === orig;
  console.log('');
  console.log('sw.js never written: ' + untouched);
  console.log(all && untouched ? 'ALL PLANTS CAUGHT — the service-worker checks are load-bearing'
                               : 'PLANT HARNESS FOUND A HOLE');
  process.exitCode = (all && untouched) ? 0 : 1;
}
main();
