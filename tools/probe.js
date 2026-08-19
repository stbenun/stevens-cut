#!/usr/bin/env node
/* probe.js — render the REAL app against his REAL data and report anything that breaks.
 *
 * Why this exists, and why it lives in the repo instead of a scratchpad:
 * every shape bug this app has ever shipped was invisible to a stubbed fixture and obvious
 * the moment his own synced data was loaded. A harness that dies with a chat session gets
 * rebuilt from memory, badly, every time. This one stays.
 *
 * What it does
 *   1. boots index.html in jsdom at the real origin (so the wrong-copy banner stays off)
 *   2. seeds localStorage from a sync-gist payload — his actual ~226 keys
 *   3. freezes the clock, then renders every tab, on every weekday, at several times of day,
 *      in both training locations
 *   4. clicks every wired control and reports anything that throws
 *
 * A render "fails" if it throws, logs a console error, or draws the app's own
 * "⚠️ The <tab> tab failed to draw" card — that card is a caught crash, not a pass.
 *
 * Usage
 *   node tools/probe.js                        # all days x all tabs, summary
 *   node tools/probe.js --day 2026-08-06       # one date
 *   node tools/probe.js --clicks               # also dispatch every control
 *   node tools/probe.js --html today           # dump the rendered HTML of one tab
 *   node tools/probe.js --data path/to.json    # a different gist payload
 *
 * Needs jsdom:  npm --prefix .work install jsdom      (NODE_PATH=.work/node_modules)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
};
const has = name => argv.includes('--' + name);

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = require('jsdom'));
} catch (e) {
  console.error('probe.js needs jsdom.\n  npm --prefix .work install jsdom\n' +
                '  NODE_PATH=.work/node_modules node tools/probe.js');
  process.exit(2);
}

/* An async handler that rejects never reaches window.onerror, so without this a dead
   button can fail silently in the harness exactly like it does on his phone. */
const LATE = [];
process.on('unhandledRejection', r => LATE.push('unhandled rejection: ' +
  (r && r.stack ? r.stack.split('\n').slice(0, 2).join(' | ') : String(r))));

const SRC = arg('file', path.join(ROOT, 'index.html'));
let HTML = fs.readFileSync(SRC, 'utf8');
const DATA_PATH = arg('data', path.join(ROOT, '.work', 'gist.json'));

/* --inject lets the selftest plant a known defect and prove the probe reports it.
   A harness nobody has watched fail is decoration. */
const INJECT = arg('inject', null);
if (INJECT) {
  const BUGS = {
    /* a view that throws — the class that used to leave the previous tab's HTML on screen */
    view: ['function viewMeals(){', 'function viewMeals(){ null.x;'],
    /* a click handler that throws — a dead button, silent on his phone */
    click: ['function wireToday(){', 'function wireToday(){ document.querySelectorAll("#view button")' +
            '.forEach(b=>b.addEventListener("click",()=>{ throw new Error("probe-selftest dead button"); }));'],
    /* a view that renders nothing */
    empty: ['function viewTrain(){', 'function viewTrain(){ if(1) return "";'],
  };
  const b = BUGS[INJECT];
  if (!b) { console.error('unknown --inject ' + INJECT); process.exit(2); }
  if (!HTML.includes(b[0])) { console.error('inject anchor missing: ' + b[0]); process.exit(2); }
  HTML = HTML.replace(b[0], b[1]);
}

/* The sync payload is {v,at,data,w,t} where data is {key: jsonString}. Accept a bare
   {key: value} map too, so a hand-made fixture still works. */
function loadSeed(p) {
  if (!fs.existsSync(p)) return null;
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  const data = raw && raw.data ? raw.data : raw;
  const out = {};
  for (const k of Object.keys(data)) {
    const v = data[k];
    out[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return out;
}
const SEED = loadSeed(DATA_PATH);
if (!SEED) {
  console.error('no data payload at ' + DATA_PATH + '\n' +
    'pull his live one:\n  curl -s https://gist.githubusercontent.com/stbenun/' +
    '<GIST_ID>/raw/thecut-data.json -o .work/gist.json');
  process.exit(2);
}

/* Strip the inline app script out of the page: we want the real DOM skeleton, but we need to
   install a frozen clock and a seeded localStorage BEFORE a single line of app code runs. */
const SCRIPTS = [...HTML.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const APP_JS = SCRIPTS.reduce((a, b) => (a.length > b.length ? a : b), '');
const SHELL = HTML.replace(APP_JS, '/* app script injected by probe */');

const TABS = ['today', 'meals', 'prep', 'train', 'track'];
const DAYNAME = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* the live instance's problem list, so listener errors land against the right tab */
let inflight = [];
const drain = () => inflight.splice(0, inflight.length);

/* One booted app instance, pinned to a moment in time and a location. */
function boot(whenISO, hhmm, loc) {
  const [Y, M, D] = whenISO.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  const FIXED = new Date(Y, M - 1, D, hh, mm, 0).getTime();

  const problems = [];
  /* An exception thrown INSIDE an event listener does not propagate out of dispatchEvent —
     jsdom routes it to the virtual console as a "jsdomError". Without this hook the click
     sweep prints stack traces to stderr and still reports "clean", which is the one thing
     a harness must never do. */
  const vc = new VirtualConsole();
  vc.on('jsdomError', err => problems.push('listener threw: ' +
    (err && err.detail ? String(err.detail).split('\n')[0] : String(err && err.message || err))));
  vc.on('error', (...a) => problems.push('console.error: ' + a.map(String).join(' ')));

  const dom = new JSDOM(SHELL, {
    url: 'https://stbenun.github.io/stevens-cut/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole: vc,
  });
  const win = dom.window;
  inflight = problems;   /* renderTab/clickEverything drain this */

  win.addEventListener('error', e => problems.push('window error: ' + (e.message || e)));
  const origErr = win.console.error;
  win.console.error = (...a) => { problems.push('console.error: ' + a.map(String).join(' ')); };

  /* Freeze the clock. Everything date-dependent in this app funnels through `new Date()`
     and Date.now(), so patching the constructor covers the whole surface. */
  win.eval(`
    (function(){
      const REAL = Date, FIXED = ${FIXED};
      function FakeDate(...a){
        if(!(this instanceof FakeDate)) return new REAL(FIXED).toString();
        return a.length ? new REAL(...a) : new REAL(FIXED);
      }
      FakeDate.prototype = REAL.prototype;
      FakeDate.now = () => FIXED;
      FakeDate.parse = REAL.parse;
      FakeDate.UTC = REAL.UTC;
      globalThis.Date = FakeDate;
    })();
  `);

  /* Seed his data, then set the location under test. */
  for (const [k, v] of Object.entries(SEED)) win.localStorage.setItem(k, v);
  win.localStorage.setItem('qpcut.loc', JSON.stringify(loc));
  /* Never let a probe run reach the network: no sync push, no update check. */
  win.fetch = () => new win.Promise(() => {});

  /* Track timers so win_close can clear them. The app starts a clock interval on boot and jsdom's
     window.close() does not clear pending timers, so this is correct hygiene.
     ⚠️ IT IS NOT SUFFICIENT, AND DO NOT CLAIM OTHERWISE. Measured Aug 10 2026: with this in place
     the full `--clicks` sweep STILL dies with "Ineffective mark-compacts near heap limit" at 4 GB
     around instance ~40. jsdom retains far more per window than its timers. The working answer is
     to CHUNK the sweep — one process per day via `--day`, so each gets a fresh heap:
        for d in <the 7 dates>; do node tools/probe.js --clicks --day $d; done
     Same coverage, bounded memory. Raising --max-old-space-size only moves the wall. */
  const timers = [];
  const realSI = win.setInterval, realST = win.setTimeout;
  win.setInterval = (...a) => { const id = realSI.apply(win, a); timers.push(['i', id]); return id; };
  win.setTimeout  = (...a) => { const id = realST.apply(win, a); timers.push(['t', id]); return id; };

  /* Two things the real phone has and jsdom does not. Stub them, or their absence
     masquerades as an app bug — progress photos live in IndexedDB, and every setTab
     calls scrollTo. Neither has ever been the thing that was broken. */
  win.scrollTo = () => {};
  /* jsdom implements neither scrollTo NOR Element.scrollIntoView. Missing the second one cost a
     real debugging detour on Aug 10 2026: the first completed --clicks sweep reported three
     failures on Sat 2026-08-15 ("▶ Start session" and "💧 Take the Ryse stick") that were purely
     `el.scrollIntoView is not a function`. Those buttons work fine on his phone. Worse than the
     false positive: a throw there ABORTS the rest of that handler, so anything it would have
     surfaced afterwards goes unseen. Stub it on the prototype — several handlers call it after a
     render to pull the card he just acted on into view. */
  win.Element.prototype.scrollIntoView = function(){};
  win.URL.createObjectURL = () => 'blob:probe';
  win.URL.revokeObjectURL = () => {};
  win.print = () => {};
  win.alert = () => {};
  win.confirm = () => true;      /* take the destructive branch, so it gets exercised */
  win.prompt = () => '';
  win.indexedDB = {
    open() {
      const req = { result: null, onsuccess: null, onerror: null, onupgradeneeded: null };
      const store = {
        getAll: () => mkReq([]), get: () => mkReq(undefined),
        put: () => mkReq(1), delete: () => mkReq(undefined), add: () => mkReq(1),
      };
      function mkReq(value) {
        const r = { result: value, onsuccess: null, onerror: null };
        queueMicrotask(() => r.onsuccess && r.onsuccess({ target: r }));
        return r;
      }
      req.result = {
        objectStoreNames: { contains: () => true },
        createObjectStore: () => store,
        transaction: () => ({ objectStore: () => store, oncomplete: null }),
        close() {},
      };
      queueMicrotask(() => req.onsuccess && req.onsuccess({ target: req }));
      return req;
    },
  };

  try {
    /* Install the inspector INSIDE the app's own eval, so it closes over the app's lexical
       scope. `let`/`const` at the top level of an indirect eval are not reachable from a
       later, separate eval — that trap has produced a confidently wrong test result before. */
    win.eval(APP_JS + '\n;globalThis.__probe = function(__code){ return eval(__code); };');
  } catch (err) {
    problems.push('BOOT THREW: ' + (err && err.stack ? err.stack.split('\n')[0] : err));
    return { win, problems, timers, dead: true };
  }
  win.console.error = origErr;
  return { win, problems, timers, dead: false };
}

/* The app catches view throws and draws its own error card. That is a failure, not a pass —
   detect it by the exact copy the card uses. */
const ERRCARD = /failed to draw/i;

function renderTab(inst, tab) {
  const { win } = inst;
  drain();                       /* anything queued belongs to the previous step */
  const found = [];
  let html = '';
  try {
    win.eval(`setTab(${JSON.stringify(tab)})`);
    html = win.document.querySelector('#view').innerHTML;
  } catch (err) {
    found.push('THREW: ' + (err && err.message ? err.message : String(err)));
  }
  found.push(...drain());
  if (ERRCARD.test(html)) {
    const m = html.match(/font-family:var\(--mono\)[^>]*>([^<]{0,200})/);
    found.push('ERROR CARD: ' + (m ? m[1].trim() : 'unknown'));
  }
  if (!html.trim()) found.push('EMPTY: the view rendered nothing');
  return { html, found };
}

/* Dispatch every control the app wired up. A handler that throws is a dead button —
   the class of bug that reads as "the app is broken" and never logs anything visible. */
function clickEverything(inst, tab) {
  const { win } = inst;
  const doc = win.document;
  const found = [];
  const sel = 'button, [data-rate], [data-tab], [data-acc] > summary, .btn, [id^="btn"]';
  /* Most handlers end in render(), which rebuilds #view wholesale. Holding one NodeList and
     clicking through it means every click after the first lands on a DETACHED node whose card no
     longer exists — its listener still fires, then queries the live document and finds nothing.
     That reported six "dead buttons" that were nothing of the kind. Re-query before each click and
     only click what is still really on screen. */
  const total = doc.querySelectorAll('#view ' + sel).length;
  drain();
  for (let i = 0; i < total; i++) {
    const live = doc.querySelectorAll('#view ' + sel);
    const n = live[i];
    if (!n || !n.isConnected) continue;
    const label = (n.id || n.dataset.rate || n.textContent || '').trim().slice(0, 40)
      .replace(/\s+/g, ' ');
    try {
      n.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
    } catch (err) {
      found.push(`click "${label}" THREW: ${err && err.message}`);
    }
    drain().forEach(e => found.push(`click "${label}" -> ${e}`));
  }
  return { count: total, found };
}

function main() {
  const only = arg('day', null);
  const dumpTab = arg('html', null);
  const days = only ? [only]
    : ['2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05',
       '2026-08-06', '2026-08-07', '2026-08-08'];
  const times = only ? ['09:00'] : ['07:30', '13:00', '21:30'];
  const locs = ['deal', 'bk'];

  /* --eval runs an expression INSIDE the booted app, against his real data. This is how you
     interrogate the engine — planTarget, SLOTS, the rotations — without reimplementing any of
     it in the harness and getting a different answer than his phone gets. */
  const expr = arg('eval', null);
  if (expr) {
    const inst = boot(only || '2026-08-06', arg('time', '09:00'), arg('loc', 'deal'));
    const code = fs.existsSync(expr) ? fs.readFileSync(expr, 'utf8') : expr;
    let out;
    try { out = inst.win.__probe('(function(){\n' + code + '\n})()'); }
    catch (err) { console.error('eval threw: ' + (err && err.stack || err)); process.exitCode = 1; }
    if (out !== undefined) console.log(typeof out === 'string' ? out : JSON.stringify(out, null, 1));
    drain().forEach(p => console.error('  [' + p + ']'));
    /* the app leaves a clock interval running; nothing left to wait for */
    win_close(inst); process.exit(process.exitCode || 0);
  }

  if (dumpTab) {
    const inst = boot(only || '2026-08-06', arg('time', '09:00'), arg('loc', 'deal'));
    const r = renderTab(inst, dumpTab);
    process.stdout.write(r.html);
    if (r.found.length) console.error('\n--- problems ---\n' + r.found.join('\n'));
    return;
  }

  let runs = 0, bad = 0;
  const seen = new Map();     /* dedupe: the same bug fires on many days */
  for (const day of days) {
    for (const time of times) {
      for (const loc of locs) {
        const inst = boot(day, time, loc);
        const wd = DAYNAME[new Date(day + 'T12:00:00').getDay()];
        const ctx = `${wd} ${day} ${time} ${loc}`;
        const bootProblems = drain();
        if (inst.dead) {
          console.log(`BOOT FAIL  ${ctx}\n   ${inst.problems.join('\n   ')}`);
          bad++; continue;
        }
        bootProblems.forEach(p => {
          const key = 'boot|' + p.slice(0, 120);
          if (!seen.has(key)) seen.set(key, { ctx, what: 'boot: ' + p, n: 0 });
          seen.get(key).n++;
        });
        for (const tab of TABS) {
          runs++;
          const r = renderTab(inst, tab);
          if (has('clicks')) {
            const c = clickEverything(inst, tab);
            r.found.push(...c.found);
          }
          if (r.found.length) {
            bad++;
            for (const f of r.found) {
              const key = tab + '|' + f.slice(0, 140);
              if (!seen.has(key)) seen.set(key, { ctx, what: `[${tab}] ${f}`, n: 0 });
              seen.get(key).n++;
            }
          }
        }
        win_close(inst);
      }
    }
  }

  console.log(`\n${runs} renders across ${days.length} days x ${times.length} times x ` +
              `${locs.length} locations`);
  LATE.forEach(l => {
    const key = 'async|' + l.slice(0, 140);
    if (!seen.has(key)) seen.set(key, { ctx: 'async', what: l, n: 0 });
    seen.get(key).n++;
  });
  /* ⛔ ZERO RENDERS IS A FAILURE, NOT A CLEAN RUN. Reported "clean" on a build whose script had a
     syntax error — nothing rendered, so nothing could throw. Assert the work actually happened
     before believing the absence of errors. */
  const expected = days.length * times.length * locs.length * TABS.length;
  if (runs !== expected) {
    console.log('\nFAIL — rendered ' + runs + ' view(s), expected ' + expected +
                '. Zero or short means the app did not boot (check index.html for a syntax error); ' +
                'an absence of errors across renders that never ran is not a pass.');
    process.exitCode = 1;
    return;
  }
  if (!seen.size) { console.log('clean — no throws, no error cards, no console errors'); return; }
  console.log(`\n${seen.size} distinct problem(s):\n`);
  [...seen.values()].sort((a, b) => b.n - a.n).forEach(p => {
    console.log(`  x${String(p.n).padStart(3)}  ${p.what}`);
    console.log(`        first seen: ${p.ctx}`);
  });
  process.exitCode = 1;
}

function win_close(inst) {
  /* clear the app's timers FIRST — a live interval pins the window and close() won't drop it.
     See the timer-tracking note in boot(); without this the --clicks sweep OOMs at 4 GB. */
  try { (inst.timers || []).forEach(([kind, id]) => {
    kind === 'i' ? inst.win.clearInterval(id) : inst.win.clearTimeout(id);
  }); } catch (e) {}
  try { inst.win.close(); } catch (e) {}
}

/* check-app.js drives the same booted engine — one boot implementation, so a guard can never
   pass against a different app than the one the probe renders. */
module.exports = { boot, renderTab, drain, TABS, APP_JS };

if (require.main === module) main();
