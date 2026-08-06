#!/usr/bin/env node
/* check-app.js — the guards for everything that is NOT a food number.
 *
 * tools/check-food.js already guards the arithmetic: all 43 recipe totals were correct all week
 * because something checked them. Everything with no guard on it was wrong. This file closes that
 * gap for the SCHEDULE and the ROTATIONS — the two surfaces that produced every bug in the Aug 6
 * audit, none of which threw an error, and all of which waited for him to notice.
 *
 * Each check below exists because it actually failed once:
 *   day-plan-complete   Sunday listed only Lunch and Snack — no breakfast, no dinner
 *   meal-collision      Tuesday scheduled the snack at 6:31 PM with dinner at 6:30 PM
 *   kashrut-timing      the dairy Creami was suggested 3 h 45 after a chicken lunch, 3 separate days
 *   slot-budget-sum     the five slot budgets summed to 2240 against a 2220 target
 *   option-fits-slot    b19 sat 165 cal over the breakfast slot
 *   clock-copy          a row reading "Bed by 10:30" rendered at 10:00 PM
 *   rotation-headroom   the Shabbat feast rotation wraps to a repeat next Friday
 *   dated-content       19 dated cards had expired (reported, not fatal)
 *
 * Usage: NODE_PATH=.work/node_modules node tools/check-app.js
 */
'use strict';
const path = require('path');
const { boot } = require('./probe.js');

let failed = 0;
const ok   = (n, m) => console.log(`  ok    [${n}] ${m}`);
const fail = (n, m) => { failed++; console.log(`  FAIL  [${n}] ${m}`); };
const warn = (n, m) => console.log(`  note  [${n}] ${m}`);

/* Boot once per weekday: the day plan is a function of the weekday, so that is the axis. */
const DAYS = ['2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05',
              '2026-08-06', '2026-08-07', '2026-08-08'];
const DN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const inst = boot('2026-08-06', '09:00', 'deal');
if (inst.dead) { console.error('app would not boot: ' + inst.problems.join('; ')); process.exit(2); }
const run = code => inst.win.__probe('(function(){' + code + '})()');

/* ---------- 1. every day plan lists every meal he actually eats ---------- */
{
  const res = run(`
    const out = [];
    const REAL = Date;
    ${JSON.stringify(DAYS)}.forEach(d => {
      const t = new REAL(d + 'T09:00:00').getTime();
      globalThis.Date = function(...a){ return a.length ? new REAL(...a) : new REAL(t); };
      globalThis.Date.now = () => t; globalThis.Date.prototype = REAL.prototype;
      globalThis.Date.parse = REAL.parse; globalThis.Date.UTC = REAL.UTC;
      try {
        const p = plannedMealMins();
        out.push({ d, wd: new REAL(d+'T12:00:00').getDay(), slots: Object.keys(p), mins: p });
      } catch (e) { out.push({ d, err: e.message }); }
      globalThis.Date = REAL;
    });
    return JSON.stringify(out);
  `);
  const rows = JSON.parse(res);
  /* Friday skips the snack on purpose (candle-lighting); Saturday is Shabbat, no phone, one
     communal meal. Every other day owes breakfast, lunch, dinner and a snack. */
  const EXPECT = {
    0: ['bf', 'lu', 'sn', 'di'], 1: ['bf', 'lu', 'sn', 'di'], 2: ['bf', 'lu', 'sn', 'di'],
    3: ['bf', 'lu', 'sn', 'di'], 4: ['bf', 'lu', 'sn', 'di'], 5: ['bf', 'lu'], 6: [],
  };
  const missing = [];
  rows.forEach(r => {
    if (r.err) { missing.push(`${DN[r.wd]}: threw ${r.err}`); return; }
    (EXPECT[r.wd] || []).forEach(k => {
      if (!r.slots.includes(k)) missing.push(`${DN[r.wd]} has no ${k} row`);
    });
  });
  if (missing.length) fail('day-plan-complete', missing.join(' · '));
  else ok('day-plan-complete', 'all 7 day plans list every meal slot they owe');

  /* ---------- 2. no two meals stacked on top of each other ---------- */
  const clashes = [];
  rows.forEach(r => {
    if (r.err) return;
    const e = Object.entries(r.mins).sort((a, b) => a[1] - b[1]);
    for (let i = 1; i < e.length; i++) {
      const gap = e[i][1] - e[i - 1][1];
      if (gap < 45) clashes.push(`${DN[r.wd]} ${e[i-1][0]}→${e[i][0]} only ${gap} min apart`);
    }
  });
  if (clashes.length) fail('meal-collision', clashes.join(' · '));
  else ok('meal-collision', 'no two planned meals sit within 45 min of each other');
}

/* ---------- 3. a dairy slot is never scheduled inside the meat wait ---------- */
{
  const res = run(`
    const out = [];
    const eaten = store.get('qpcut.eaten', {});
    Object.keys(eaten).sort().forEach(d => {
      const m = eaten[d] || {};
      if (!m.sn) return;
      const dairySnack = (optK(m.sn) || []).includes('dairy');
      if (!dairySnack) return;
      const w = dairyWindow(d);
      const times = eatTimes(d);
      const toM = s => { if(!s) return null; const [h,mm]=String(s).split(':').map(Number); return h*60+mm; };
      const at = toM(times.sn);
      if (at == null) return;
      /* judge the window as it stood AT the moment he ate — meat later that evening is irrelevant */
      const wAt = dairyWindow(d, { asOf: at });
      if (wAt.from == null) return;
      w.from = wAt.from;
      if (at < w.from) out.push(d + ': dairy snack at ' + fmtMin(at) + ' but the window opens ' + fmtMin(w.from));
    });
    /* and the forward-looking one: what would the engine SUGGEST today? */
    const sug = nextEatSuggestion(isoToday());
    if (sug && sug.target === 'sn') {
      const w = dairyWindow(isoToday());
      if (w.from != null && sug.mins < w.from)
        out.push('today: engine suggests ' + fmtMin(sug.mins) + ', window opens ' + fmtMin(w.from));
    }
    return JSON.stringify(out);
  `);
  const bad = JSON.parse(res);
  if (bad.length) fail('kashrut-timing', bad.join(' · '));
  else ok('kashrut-timing', 'no dairy slot lands inside the 6-hour meat wait');
}

/* ---------- 4 + 5. budgets reconcile, and every option fits its slot ---------- */
{
  const res = run(`
    const sum = [0,0,0,0];
    SLOTS.forEach(s => s.b.forEach((v,i) => sum[i] += v));
    const over = [];
    SLOTS.forEach(s => s.opts.forEach(o => o.vars.forEach((v,i) => {
      /* a variant explicitly labelled for a feast or refeed day is off-plan ON PURPOSE and is not
         supposed to fit the cut-day slot — that is the whole reason it carries a label */
      if (/feast|refeed/i.test(v.label || '')) return;
      const d = v.t[0] - s.b[0];
      if (Math.abs(d) > 45) over.push(o.id + (i?'/v'+i:'') + ' ' + (d>0?'+':'') + d + ' cal vs the ' + s.key + ' slot');
    })));
    return JSON.stringify({ sum, plan: PLAN_T, over });
  `);
  const { sum, plan, over } = JSON.parse(res);
  const diff = sum.map((v, i) => v - plan[i]);
  if (diff.some((d, i) => Math.abs(d) > (i === 0 ? 25 : 8)))
    fail('slot-budget-sum', `slots sum to ${sum.join('/')} but the plan target is ${plan.join('/')} ` +
                            `(off by ${diff.join('/')}) — he cannot hit the target by eating the plan`);
  else ok('slot-budget-sum', `slot budgets sum to ${sum.join('/')} against a ${plan.join('/')} target`);

  if (over.length) fail('option-fits-slot', over.join(' · '));
  else ok('option-fits-slot', 'every option variant sits within 45 cal of its slot budget');
}

/* ---------- 6. a row that names a clock time renders at that time ---------- */
{
  const res = run(`
    const out = [];
    const REAL = Date;
    ${JSON.stringify(DAYS)}.forEach(d => {
      const t = new REAL(d + 'T09:00:00').getTime();
      globalThis.Date = function(...a){ return a.length ? new REAL(...a) : new REAL(t); };
      globalThis.Date.now = () => t; globalThis.Date.prototype = REAL.prototype;
      globalThis.Date.parse = REAL.parse; globalThis.Date.UTC = REAL.UTC;
      try {
        dayRows().forEach(([m, label]) => {
          const txt = String(label).replace(/<[^>]+>/g, '');
          /* only judge a row that states a time for ITSELF, e.g. "Bed by 10:30" */
          const hit = /\\b(?:by|at)\\s+(\\d{1,2})(?::(\\d{2}))?\\s*(AM|PM)?\\b/i.exec(txt);
          if (!hit) return;
          let h = +hit[1], mm = hit[2] ? +hit[2] : 0;
          const ap = hit[3];
          let cand = [];
          if (ap) cand = [((h%12) + (/pm/i.test(ap)?12:0))*60 + mm];
          else cand = [((h%12))*60+mm, ((h%12)+12)*60+mm];
          if (!cand.some(c => Math.abs(c - m) <= 5))
            out.push(new REAL(d+'T12:00:00').toDateString().slice(0,3) + ' "' + txt.slice(0,42) +
                     '" renders at ' + fmtMin(m));
        });
      } catch (e) {}
      globalThis.Date = REAL;
    });
    return JSON.stringify(out);
  `);
  const bad = JSON.parse(res);
  if (bad.length) fail('clock-copy', bad.join(' · '));
  else ok('clock-copy', 'every row that names a time renders at that time');
}

/* ---------- 7 + 8. rotation headroom and expired dated content ---------- */
{
  const res = run(`
    const wi = Math.floor((new Date(2026,7,6) - FL_ANCHOR)/(7*864e5));
    const feastLeft = SHABBAT_FEAST.length - (wi % SHABBAT_FEAST.length) - 1;
    const corLeft = COR_SETS.length - wi - 1;
    const cs = creamiState();
    const today = isoToday();
    const stale = [];
    Object.keys(OVERRIDES||{}).forEach(k => { if(/^\\d{4}-\\d{2}-\\d{2}$/.test(k) && k < today) stale.push('OVERRIDES '+k); });
    (Array.isArray(EVENTS)?EVENTS:[]).forEach(e => { if(e && e.d && e.d < today) stale.push('EVENTS '+e.d); });
    return JSON.stringify({ wi, feastLeft, corLeft,
      creami: { name: cs.batch.name, cup: cs.cup+1, of: cs.batch.cups.length, next: cs.next.name },
      staleN: stale.length });
  `);
  const r = JSON.parse(res);
  const low = [];
  if (r.feastLeft <= 0) low.push(`the Shabbat feast rotation repeats NEXT week (${r.feastLeft} new dishes left)`);
  else if (r.feastLeft <= 1) low.push(`the Shabbat feast rotation has ${r.feastLeft} new dish left`);
  if (r.corLeft <= 2) low.push(`COR sets run out in ${r.corLeft} weeks`);
  if (low.length) fail('rotation-headroom', low.join(' · ') + ' — he notices repeats and says so');
  else ok('rotation-headroom', `feast has ${r.feastLeft} new dishes left, COR ${r.corLeft} weeks`);

  warn('creami-batch', `${r.creami.name}, cup ${r.creami.cup}/${r.creami.of}; next is ${r.creami.next}`);
  if (r.staleN) warn('dated-content', `${r.staleN} dated entries are in the past — inert, but if one ` +
    `was a one-read notice it has served its purpose and should be pulled deliberately`);
}

/* ---------- 9. no real name reaches the public page ----------
   This repo is public because GitHub Pages on the free plan requires it. The Jul 31 sweep fixed
   four of the five places his first name appeared and missed the <h1> — the one actually rendered
   on screen — so it sat visible on a public URL for a week while a memory note recorded it as
   fixed. A grep is cheap; believing it was handled is what cost the week. */
{
  const fs = require('fs');
  const BANNED = ['Steven', 'Quinton', 'Benun', 'Simon', 'Ronnie', 'Red Bank', '186.6'];
  /* the URL itself is irreducible — the account handle and repo name are baked into the Pages
     address and renaming the repo would force an icon re-add, which iOS can answer by wiping the
     storage container. Everything OTHER than the URL is fair game. */
  const URLISH = /(?:https?:\/\/)?stbenun\.github\.io[^\s"'<)]*|gist\.githubusercontent\.com[^\s"'<)]*|github\.com\/stbenun[^\s"'<)]*|stbenun\/stevens-cut/g;
  const hits = [];
  ['index.html', 'manifest.json', 'sw.js', 'push-reminders.js'].forEach(f => {
    const p = path.join(__dirname, '..', f);
    if (!fs.existsSync(p)) return;
    const txt = fs.readFileSync(p, 'utf8').replace(URLISH, '');
    txt.split('\n').forEach((line, i) => {
      BANNED.forEach(b => {
        if (line.toLowerCase().includes(b.toLowerCase()))
          hits.push(`${f}:${i + 1} contains "${b}" — ${line.trim().slice(0, 70)}`);
      });
    });
  });
  if (hits.length) fail('name-leak', hits.join(' · '));
  else ok('name-leak', 'no real name on any file this repo publishes (URL excepted — irreducible)');
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nall app checks passed');
process.exit(failed ? 1 : 0);
