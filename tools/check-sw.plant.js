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
    /* THE defect this whole tool exists for: starve checkUpdate() of the network and the
       "Update ready" bar never appears again, so nothing deployed reaches his phone. */
    edits: [{ from: "  if (req.cache === 'no-store' || url.searchParams.has('u')) return;",
              to:   "  /* removed */" }] },

  { guard: 'sw-update-path',
    name: 'only ?u= is bypassed, so a no-store check without the buster gets cached',
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
    name: 'it goes cache-first, so he sees the version he last downloaded instead of the live one',
    edits: [{ from: "    fetch(req)\n      .then(res => {",
              to:   "    caches.match(req, { ignoreSearch: true }).then(h => h || fetch(req))\n      .then(res => {" }] },

  { guard: 'sw-online',
    name: 'the good copy is never stored, so there is nothing to fall back on offline',
    edits: [{ from: "          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});",
              to:   "          /* not stored */" }] },

  { guard: 'sw-update-reload',
    name: 'the offline fallback for an update reload is removed — a blank screen after tapping Update',
    /* WHAT CLAUSE 5 ACTUALLY PROTECTS, learned from this plant failing twice. After tapping the bar
       the app reloads itself as ?v=<build>; offline, an exact-key cache lookup misses that URL. TWO
       independent mechanisms save it: ignoreSearch on the first lookup, and the literal 'index.html'
       second lookup (which resolves to the same stored key). They are redundant WITH EACH OTHER, so
       removing either one alone changes nothing — the first two versions of this plant came back NOT
       CAUGHT, correctly, and that is a fact about the worker worth having written down rather than a
       hole in the check. The defect is losing BOTH: then a ?v= reload with no signal returns
       Response.error(), which is a white screen caused by the update button itself. */
    edits: [{ from: "        caches.match(req, { ignoreSearch: true })",
              to:   "        caches.match(req)" },
            { from: "          .then(hit => hit || caches.match('index.html', { ignoreSearch: true }))\n",
              to:   "" }] },
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
