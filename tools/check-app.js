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
/* SRC comes from probe.js so this file and the booted app can never disagree about WHICH file is
 * under test. Pass --file <path> to check a copy: that is how check-app.plant.js plants a defect
 * without ever writing the working tree. */
const { boot, SRC } = require('./probe.js');

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
      if (wAt.from != null && at < wAt.from)
        out.push(d + ': dairy snack at ' + fmtMin(at) + ' but the window opens ' + fmtMin(wAt.from));
      /* and the other direction — dairy must not land after a meat dinner either */
      if (wAt.until != null && at > wAt.until)
        out.push(d + ': dairy snack at ' + fmtMin(at) + ' but a meat dinner closes it at ' + fmtMin(wAt.until));
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
  /* A rotation wrapping is normal; wrapping into a dish he had recently is not. Fail only at zero
     headroom — the week BEFORE he would be served a repeat — so this is a deadline, not a permanent
     red light. Note earlier than that, so the deadline never arrives as a surprise. */
  const low = [], soon = [];
  if (r.feastLeft <= 0) low.push(`the Shabbat feast rotation repeats NEXT Friday — add a dish`);
  else if (r.feastLeft <= 2) soon.push(`feast rotation: ${r.feastLeft} new dish(es) left`);
  if (r.corLeft <= 1) low.push(`COR sets run out next week`);
  else if (r.corLeft <= 4) soon.push(`COR sets: ${r.corLeft} weeks left`);
  if (low.length) fail('rotation-headroom', low.join(' · ') + ' — he notices repeats and says so');
  else ok('rotation-headroom', `feast has ${r.feastLeft} new dish(es) left, COR ${r.corLeft} weeks`);
  if (soon.length) warn('rotation-soon', soon.join(' · '));

  warn('creami-batch', `${r.creami.name}, cup ${r.creami.cup}/${r.creami.of}; next is ${r.creami.next}`);
  if (r.staleN) warn('dated-content', `${r.staleN} dated entries are in the past — inert, but if one ` +
    `was a one-read notice it has served its purpose and should be pulled deliberately`);
}

/* ---------- 8b. his standing flavor rules ----------
   "na not with plain cor" / "no not cookies n cream" — a pale base reads to him as a wasted slot,
   and he wants the bowl to taste like something. That rule was recorded on Aug 6 and eleven combos
   in the rotation still opened with Plain COR, which is 13% of his breakfasts. A rule that lives
   only in a memory file is a rule that gets walked past. Salted Caramel stays by his explicit call
   ("keep for now") even though one of its combos is rated down — so this reports it, not fails it. */
{
  const res = run(`
    const out = { plain: [], ratedDown: [], unquantified: [] };
    const ratings = store.get('qpcut.flavorRatings', {});
    COR_SETS.forEach((set, si) => set.forEach((c, di) => {
      if (/Plain COR/.test(c[1])) out.plain.push('set' + si + 'd' + di + ' ' + c[0]);
      if (ratings['cor:' + c[0]] === 'down') out.ratedDown.push('set' + si + 'd' + di + ' ' + c[0]);
    }));
    return JSON.stringify(out);
  `);
  const r = JSON.parse(res);
  if (r.plain.length) fail('flavor-rules', `Plain COR is back in ${r.plain.length} combo(s): ` +
    r.plain.join(', ') + ' — he has rejected a pale base twice');
  else ok('flavor-rules', 'no Plain COR in the rotation');
  if (r.ratedDown.length) warn('rated-down', `still rostered after a 👎: ${r.ratedDown.join(', ')} ` +
    `(Salted Caramel kept by his call, Aug 6)`);
}

/* ---------- 8bb. the Fall 2026 gate opens on Aug 31 and not a day sooner ----------
   "it doesnt start yet!" — the semester rebuild must be completely inert until the term begins.
   A date gate that silently leaks is the worst kind, because the wrong day looks like a right one. */
{
  const res = run(`
    const REAL = Date;
    function rowsOn(iso){
      const t = new REAL(iso + 'T09:00:00').getTime();
      globalThis.Date = function(){ return arguments.length ? new REAL(...arguments) : new REAL(t); };
      globalThis.Date.now = () => t; globalThis.Date.prototype = REAL.prototype;
      globalThis.Date.parse = REAL.parse; globalThis.Date.UTC = REAL.UTC;
      let r = [];
      try { r = dayRows().map(function(x){ return x[1]; }).join(' | '); } catch(e){ r = 'THREW ' + e.message; }
      globalThis.Date = REAL;
      return r;
    }
    return JSON.stringify({
      before:  rowsOn('2026-08-24'),   /* Mon, one week before */
      firstMon:rowsOn('2026-08-31'),   /* Mon, day one */
      wed:     rowsOn('2026-09-02'),
      tue:     rowsOn('2026-09-01'),   /* untouched by the semester */
      after:   rowsOn('2026-12-28'),   /* Mon, after the term ends */
      start: SEMESTER[0], end: SEMESTER[1]
    });
  `);
  const r = JSON.parse(res);
  const bad = [];
  const CAMPUS = /HNSC 2300|Boylan|Ingersoll/;
  if (CAMPUS.test(r.before)) bad.push('campus rows LEAKED into Mon Aug 24, before the term');
  if (!CAMPUS.test(r.firstMon)) bad.push('Mon Aug 31 has no campus rows — the gate did not open');
  if (!CAMPUS.test(r.wed)) bad.push('Wed Sep 2 has no campus rows');
  if (CAMPUS.test(r.tue)) bad.push('campus rows appeared on a Tuesday — Mon/Wed only');
  if (CAMPUS.test(r.after)) bad.push('campus rows still present after the term ends');
  if (/ENGL 1012/.test(r.firstMon) === false) bad.push('Mon Aug 31 is missing the 6:30 ENGL class');
  if (bad.length) fail('semester-gate', bad.join(' · '));
  else ok('semester-gate', `campus days live ${r.start} to ${r.end}, Mon+Wed only, nothing before or after`);
}

/* ---------- 8c. Friday-night bread is one rule, not a menu ----------
   His standing rule (Aug 6 2026): always a full pita, no challah at all, not even the Hamotzi piece.
   Before this, five of the seven dishes carried a conditional line — "half with the challah plan,
   full if you skip the half-slice" — and they did not agree with each other about what a pita costs.
   That ambiguity is what made him ask "am I supposed to have a full or half pita tonight." */
{
  const res = run(`
    const out = { missing: [], conditional: [], challah: [] };
    SHABBAT_FEAST.forEach(function (f) {
      const rows = f.ing.map(function (r) { return r[0] + ' ' + r[1]; }).join(' | ');
      const pita = f.ing.filter(function (r) { return /pita/i.test(r[0]); });
      if (!pita.length) { out.missing.push(f.n); return; }
      pita.forEach(function (r) {
        const line = r[0] + ' ' + r[1];
        if (/½|half|if you skip|instead/i.test(line)) out.conditional.push(f.n);
      });
      if (/challah/i.test(rows + ' ' + f.mac + ' ' + (f.other || ''))) out.challah.push(f.n);
      if (/½\\s*pita|half a? pita/i.test(f.mac)) out.conditional.push(f.n + ' (header)');
    });
    return JSON.stringify(out);
  `);
  const r = JSON.parse(res);
  const bad = [];
  if (r.missing.length) bad.push('no pita row: ' + r.missing.join(', '));
  if (r.conditional.length) bad.push('conditional bread: ' + r.conditional.join(', '));
  if (r.challah.length) bad.push('challah still named: ' + r.challah.join(', '));
  if (bad.length) fail('friday-bread', bad.join(' · ') + ' — one full pita, no challah, every dish');
  else ok('friday-bread', 'all 7 feast dishes: one full pita, unconditional, no challah');
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

/* ---------- 16. the Final Meal solver actually closes the day ----------
   He chose "hit the full number, plate + dessert" over "protein first, accept being under", so a
   solver that lands 250 cal short is not a rough edge — it is the feature failing. It DID land 250
   short on the first build, because every anchor has a sane cap and three anchors cannot span a
   1,475 cal hole; the filler pass exists to fix that and this guard is what keeps it fixed.
   Also enforces the two rules that are correctness, not taste:
     - CHICKEN IS NEVER AUTO-CHOSEN. He said beef and salmon quick-defrost and chicken does not, so
       chicken may only ever appear when he explicitly picks it as a leftover. */
{
  const scen = JSON.stringify([
    {n:'only breakfast',      eaten:{pre:'p5',bf:'b1'},                     at:{bf:'11:40'}},
    {n:'missed dinner',       eaten:{pre:'p5',bf:'b1',lu:'l2',sn:'s1'},     at:{lu:'15:00',sn:'19:30'}},
    {n:'missed snack+dinner', eaten:{pre:'p5',bf:'b1',lu:'l1'},             at:{lu:'15:41'}},
    {n:'only pre-lift',       eaten:{pre:'p5'},                             at:{pre:'08:00'}},
  ]);
  const res = run(`
    const S = ${scen}, LANES = ['pareve','meat','dairy'], out = [];
    const D = isoToday();
    const eat0 = store.get('qpcut.eaten',{});
    S.forEach(sc => LANES.forEach(lane => {
      store.set('qpcut.eaten', Object.assign({}, eat0, {[D]: sc.eaten}));
      store.set('qpcut.eatenAt.'+dkey(D), sc.at);
      store.set('qpcut.offplan', {});
      let fm; try { fm = finalMeal(D, {nowM: 22*60, lane}); }
      catch(e){ out.push({n:sc.n, lane, err:String(e.message||e)}); return; }
      if(!fm) { out.push({n:sc.n, lane, none:true}); return; }
      out.push({ n:sc.n, lane, gap:fm.gap, left:fm.left, oneSitting:fm.oneSitting,
        labels: fm.rows.map(r=>r[0]),
        qtys:   fm.rows.concat(fm.sideRows).map(r=>r[1]),
        steps:  fm.steps,
        nums:   fm.rows.map(r=>r[2]) });
    }));
    store.set('qpcut.eaten', eat0);
    return JSON.stringify(out);
  `);
  const rows = JSON.parse(res);
  const bad = [];
  rows.forEach(r => {
    if (r.err)  { bad.push(`${r.n}/${r.lane}: THREW ${r.err}`); return; }
    if (r.none) { bad.push(`${r.n}/${r.lane}: returned nothing but the hole is real`); return; }
    if (r.nums.some(m => m.some(v => !isFinite(v) || v < 0)))
      bad.push(`${r.n}/${r.lane}: a row has NaN or negative macros`);
    if (r.qtys.some(q => /NaN|Infinity|^-/.test(q)))
      bad.push(`${r.n}/${r.lane}: unrenderable quantity "${r.qtys.find(q=>/NaN|Infinity|^-/.test(q))}"`);
    /* a zero-quantity row is either a dropped ingredient a step still references, or an instruction to
       add nothing. Both read as broken. */
    const zero = r.qtys.find(q => /^0(\.0+)?\s/.test(q));
    if (zero) bad.push(`${r.n}/${r.lane}: zero-quantity row "${zero}"`);
    /* "3 pattyies" shipped once, so this checks for it — but ONLY the broken forms. My first version
       used /(ies|ss|ys)s?\b/ and it failed on "2 patties", which is the CORRECT plural. A guard that
       fires on right answers gets muted, and a muted guard protects nothing. */
    const plural = r.qtys.find(q => /yies|ss\b|ys\b/.test(q));
    if (plural) bad.push(`${r.n}/${r.lane}: malformed plural "${plural}"`);
    /* and the same two checks on the rendered STEPS, which is where both bugs actually surfaced */
    (r.steps || []).forEach((t, i) => {
      if (/\(\s*0(\.0+)?\s*[a-z]/.test(t)) bad.push(`${r.n}/${r.lane} step ${i+1}: renders a zero quantity`);
      if (/pattyies|bagss|cupss/.test(t))     bad.push(`${r.n}/${r.lane} step ${i+1}: malformed plural`);
      if (/\{\w+\}/.test(t))                 bad.push(`${r.n}/${r.lane} step ${i+1}: unsubstituted placeholder`);
    });
    /* a miss is only forgiven when the hole is bigger than one sitting AND the card says so. On a
       normal hole the solve must land, or the feature he asked for is not doing its job. */
    /* RATCHET, tightened 2026-08-12 from 60 to 25. His instruction: "we shouldnt be overfeeding or
       underfeeding. we should be on target always." Once the solver stopped blindly trusting solve2's
       exact carb/fat answer and searched around it, the worst one-sitting miss fell from 72 cal to 15.
       25 locks that in with a little headroom. Only ever tighten this, never loosen it. */
    if (r.oneSitting && Math.abs(r.gap[0]) > 25)
      bad.push(`${r.n}/${r.lane}: ${Math.round(r.gap[0])} cal off a ${Math.round(r.left[0])} hole`);
    /* asymmetric on purpose, matching fmErr: gap>0 is SHORT and that is the real failure. Overshooting
       protein on a cut is fine, so the ceiling on surplus is loose and only catches absurdity. */
    if (r.oneSitting && r.gap[1] > 8)
      bad.push(`${r.n}/${r.lane}: ${Math.round(r.gap[1])}P SHORT`);
    if (r.gap[1] < -30)
      bad.push(`${r.n}/${r.lane}: ${Math.round(-r.gap[1])}P over — absurd, not just generous`);
    /* NO fish-on-meat assertion. It was here, it failed nothing, and it was WRONG: it encoded my
       guess that he separates fish and meat. Asked him Aug 10 2026 — "i do" eat them together — so
       the rule came out. A guard that enforces an assumption nobody verified is worse than no guard. */
    if (r.labels.some(l => /LEFTOVER/.test(l)))
      bad.push(`${r.n}/${r.lane}: chicken auto-chosen — it does not quick-defrost, it must be opt-in`);
    /* ⭐ HIS FREEZER IS THE CONSTRAINT: "i freeze the meat in 6oz pattys and salmon in ziplocks with
       6oz each ... so for example i wont have to defrost 1.5 burgers." A fractional patty or bag is
       an instruction he physically cannot follow. */
    r.qtys.forEach((q, i) => {
      if (!/patt|bag/.test(q)) return;
      const num = parseFloat(q);
      if (!Number.isInteger(num))
        bad.push(`${r.n}/${r.lane}: "${r.labels[i]} ${q}" — frozen units must be whole`);
    });
    const seen = new Set();
    r.labels.forEach(l => { const k = l.replace(/,? (extra|to cook).*$/,'').trim();
      if (seen.has(k)) bad.push(`${r.n}/${r.lane}: "${k}" listed twice`); seen.add(k); });
  });

/* ---------- 17. the recipes cannot contradict themselves ----------
   His complaint, Aug 10 2026: "You also tend to write things that contradict eachother when giving me
   recipes so make sure its flawless." Care does not scale and I have broken this before — the pita that
   five feast dishes disagreed about, the almond-butter drizzle whose step said 2 tsp when the real
   answer was 4-5. So the fix is STRUCTURAL: a step never holds its own copy of a quantity, it
   interpolates {pro}/{carb}/{fat} from the same variable the ingredient row prints.
   This guard is what keeps it structural. It fails on any authored step containing a hand-typed
   weight or volume. Times (min, s), temperatures (400°F) and counts of unscaled things (3 patties
   pressed from the tuna mix) are fine — only WEIGHTS and VOLUMES are banned, because those are the
   numbers the solver owns. */
{
  const dishes = JSON.parse(run(`return JSON.stringify(FINAL_DISHES.map(d=>({
    id:d.id, name:d.name, lane:d.lane, steps:d.steps,
    pro:{id:d.pro.id,label:d.pro.label,frozen:!!d.pro.frozen,lo:d.pro.lo,hi:d.pro.hi},
    carb:d.carb.id, fat:d.fat.id, carbLo:d.carb.lo, fatLo:d.fat.lo,
    extras:d.extras.map(e=>[e[0],e[1]])
  })));`));
  const bad = [];
  /* a number immediately followed by a weight/volume unit = a quantity the solver should have supplied */
  const TYPED = /\b\d+(?:[.,\u00bd\u00bc\u00be\d]*)?\s*(?:g|kg|oz|lb|ml|mL|l|tsp|tbsp|cups?|packets?|slices?|patt(?:y|ies)|bags?)\b/;
  const LANES = ['pareve', 'meat', 'dairy'];
  dishes.forEach(d => {
    if (!LANES.includes(d.lane)) bad.push(`${d.id}: unknown lane "${d.lane}"`);
    if (!d.steps.length) bad.push(`${d.id}: no method at all`);
    /* ⛔ THERE IS NO CAP ON STEP COUNT. Corrected by him 2026-08-12, verbatim: "≤6 steps — not true.
       how ever many steps needed, but dont be wordy and dont say extra things."
       I had read his earlier "not too wordy" as a limit on how MANY steps, and it is a limit on how
       much each step SAYS. Those are different constraints and capping the count was the wrong one —
       it would reject a correct 7-step method and push a real instruction into a run-on step, making
       the recipe worse in exactly the dimension he was complaining about. Brevity is enforced per
       step below (length + no filler), never by truncating the method. Do not re-add a count cap. */
    d.steps.forEach((t, i) => {
      const m = TYPED.exec(t);
      if (m) bad.push(`${d.id} step ${i + 1}: hand-typed quantity "${m[0]}" — must be {pro}/{carb}/{fat}`);
      if (t.length > 210) bad.push(`${d.id} step ${i + 1}: ${t.length} chars, too wordy`);
      /* "dont say extra things" — filler that adds no instruction. Each of these is a phrase that can
         be deleted without losing a single action, temperature, or cue. */
      const FILLER = /\b(?:basically|essentially|of course|as you know|feel free to|if you want to|you might want to|it'?s worth noting|keep in mind|don'?t worry|pro tip|simply put|at the end of the day)\b/i;
      const fm = FILLER.exec(t.replace(/\s+/g, ' '));
      if (fm) bad.push(`${d.id} step ${i + 1}: filler phrase "${fm[0].trim()}" — say the action, drop the padding`);
      const ph = t.match(/\{(\w+)\}/g) || [];
      ph.forEach(p => { if (!['{pro}', '{carb}', '{fat}'].includes(p))
        bad.push(`${d.id} step ${i + 1}: unknown placeholder ${p} — renders literally`); });
    });
    /* every scaled component must be named somewhere in the method, or the card lists food the
       instructions never tell him what to do with */
    const all = d.steps.join(' ');
    if (!all.includes('{pro}'))  bad.push(`${d.id}: the protein never appears in the steps`);
    if (!all.includes('{carb}')) bad.push(`${d.id}: the carb never appears in the steps`);
    if (d.pro.frozen && (!Number.isInteger(d.pro.lo) || !Number.isInteger(d.pro.hi)))
      bad.push(`${d.id}: frozen protein has a fractional lo/hi`);
    /* ⛔ THE BUG THIS EXISTS FOR: guac had lo:0, so a small hole solved the fat to 0. The ingredient row
       was dropped (nothing to list) but step 4 still interpolated "guac (0 cups)" — the card told him to
       add a thing that was not on the list. That is exactly the self-contradiction he complained about.
       If a method names a component, that component's floor must be above zero. */
    if (all.includes('{fat}') && !(d.fatLo > 0))
      bad.push(`${d.id}: a step names {fat} but its floor is ${d.fatLo} — it can render "(0 ...)"`);
    if (!(d.carbLo > 0))
      bad.push(`${d.id}: carb floor is ${d.carbLo} — {carb} can render zero`);
  });
  const ids = dishes.map(d => d.id);
  if (new Set(ids).size !== ids.length) bad.push('duplicate dish ids');
  if (bad.length) fail('final-recipe', bad.join(' · '));
  else ok('final-recipe', `${dishes.length} dishes: no hand-typed quantities in any step, every scaled part used, no step-count cap`);
}

  if (bad.length) fail('final-meal', bad.join(' · '));
  else ok('final-meal', `${rows.length} hole x lane combos all close within 25 cal / 8P, chicken opt-in only, no duplicate rows`);
}

/* ---------- [meal-timing] a late meal must not cascade, and nothing lands inside a commitment ------
 * His instruction Aug 12 2026: "if i had breakfast pretty late i dont want my lunch to be pushed off
 * to 5:00. Take everything into account when deciding timing."
 * The old engine was `lastMeal + healthyGap`, pure chaining, so one late meal slid the whole day.
 * Three properties, all of which failed before the rewrite:
 *   1. on an on-schedule day the suggestion IS the planned time (no drift)
 *   2. a late meal moves the next one by the MINIMUM gap, not the ideal one
 *   3. no suggestion ever lands inside a class / minyan / arbit block
 */
{
  const res = run(`
    const D = isoToday(), out = [];
    const eat0 = store.get('qpcut.eaten',{}), at0 = store.get('qpcut.eatenAt.'+dkey(D),{});
    ['10:30','12:30','13:30','14:30'].forEach(t => {
      store.set('qpcut.eaten', Object.assign({}, eat0, {[D]:{pre:'p5', bf:'b1'}}));
      store.set('qpcut.eatenAt.'+dkey(D), {pre:'07:45', bf:t});
      const s = nextEatSuggestion(D);
      const [h,m] = t.split(':').map(Number);
      out.push({ bf:h*60+m, mins: s? s.mins : null, target: s&&s.target, basis: s&&s.basis });
    });
    store.set('qpcut.eaten', eat0); store.set('qpcut.eatenAt.'+dkey(D), at0);
    return JSON.stringify({ rows: out, planned: plannedMealMins(), busy: busyBlocks() });
  `);
  const { rows, planned, busy } = JSON.parse(res);
  const bad = [];
  rows.forEach(r => {
    if (r.mins == null) { bad.push(`breakfast at ${r.bf}: no suggestion at all`); return; }
    const p = planned[r.target];
    /* 1 + 2: never further out than the planned time or the digestive floor, whichever is later */
    if (p != null) {
      const allow = Math.max(p, r.bf + 120) + 5;          /* 120 = minGap for a full meal */
      if (r.mins > allow)
        bad.push(`breakfast ${Math.floor(r.bf/60)}:${String(r.bf%60).padStart(2,'0')} pushed ${r.target} to ` +
                 `${Math.floor(r.mins/60)}:${String(r.mins%60).padStart(2,'0')} — ${r.mins-allow} min past the ` +
                 `planned time AND the minimum gap, i.e. it is cascading`);
    }
    /* 3: not inside a commitment */
    busy.forEach(([bs, be, label]) => {
      if (r.mins > bs && r.mins < be)
        bad.push(`a suggestion lands at ${Math.floor(r.mins/60)}:${String(r.mins%60).padStart(2,'0')}, ` +
                 `inside "${String(label).replace(/<[^>]*>/g,'').trim().slice(0,28)}"`);
    });
  });
  /* a meal row must never be treated as a commitment — it would block the meal being scheduled */
  busy.forEach(([, , label]) => {
    if (/breakfast|lunch|snack|dinner|yogurt|banana|creami/i.test(String(label)))
      bad.push(`busy block is actually a MEAL row: "${String(label).replace(/<[^>]*>/g,'').trim().slice(0,34)}"`);
  });
  if (bad.length) fail('meal-timing', bad.join(' · '));
  else ok('meal-timing', `late-meal recovery holds (${rows.length} start times), ${busy.length} commitment blocks, none of them meals`);
}

/* ---------- [time-picker] a time input must not re-render on 'change' ----------
 * His report Aug 12 2026: picking the HOUR on his phone closed the whole picker, so he could never
 * reach the minutes in one pass. iOS fires `change` the instant you lift off the hour wheel, and
 * render() rebuilds the DOM out from under the native picker, which then has nothing to sit on.
 * Save on change, render on blur. This reads SOURCE, not behaviour — jsdom has no native picker.
 */
{
  const src = require('fs').readFileSync(SRC, 'utf8');
  const ids = [...src.matchAll(/<input[^>]*type="time"[^>]*id="(\w+)"/g)].map(m => m[1]);
  const bad = [];
  if (!ids.length) bad.push('no type="time" inputs found — did the markup change?');
  ids.forEach(id => {
    const at = src.indexOf(`$('#${id}')`);
    if (at < 0) { bad.push(`${id}: no $('#${id}') handler found`); return; }
    /* Bound the slice at the NEXT element's handler. A fixed 900-char window swallowed the
       neighbouring #viewDate handler — which legitimately renders on change — and reported a
       false FAIL on correct code. A guard that fires on the right answer gets muted. */
    const nxt = src.indexOf("$('#", at + 4);
    const slice = src.slice(at, nxt > at ? nxt : at + 900);
    if (/addEventListener\('change'\s*,\s*(?:\([^)]*\)|\w+)\s*=>\s*\{[\s\S]{0,400}?render\(\)/.test(slice))
      bad.push(`${id}: its 'change' handler calls render() — that destroys the open picker`);
    if (!/addEventListener\('blur'/.test(slice))
      bad.push(`${id}: no 'blur' listener, so the value never commits when the picker closes`);
  });
  if (bad.length) fail('time-picker', bad.join(' · '));
  else ok('time-picker', `${ids.length} time input(s): save on change, render on blur`);
}

/* ---------- cor-repeat — the `next ›` stepper must not serve a combo he just ate ----------
 * Aug 13 2026: he pressed `next ›` and got Banana Pudding, which he had eaten two days before.
 * `corStep` walked the pool by index and never looked at qpcut.eaten, so the manual override bypassed
 * the 84-combo rotation — the only thing preventing repeats.
 * Underneath that sat a second defect this check also pins: weekIdx() read the WALL CLOCK, so
 * corFor(pastDate) returned this week's answer for that weekday. History was unreconstructable, and a
 * skip-list built on it would have banned flavors he never tasted. Both halves are checked here,
 * because the skip is only as good as the history it reads.
 */
{
  const r = run(`
    const D = '2026-08-13', wd = new Date(D+'T12:00:00').getDay();
    const pool = CORPOOL(), bad = [];

    /* (a) date-purity: same date twice must agree, and the same weekday in two different rotation
           weeks must NOT collapse to one combo (that was the wall-clock bug's signature). */
    if(corFor('2026-08-03',1)[0] !== corFor('2026-08-03',1)[0]) bad.push('corFor is not stable for one date');
    const mondays = ['2026-06-29','2026-07-27','2026-08-03','2026-08-10'].map(d=>corFor(d,1)[0]);
    if(new Set(mondays).size < 3) bad.push('4 Mondays across different weeks gave '+new Set(mondays).size+' distinct combos — weekIdx is ignoring the date');

    /* (b) the skip itself: step forward from the scheduled combo and land on nothing recent. */
    const recent = corRecent(D);
    if(!recent.size) bad.push('corRecent found no eaten COR breakfasts in 14 days — check is running vacuous');
    for(const dir of [1,-1]){
      const t = corStepTarget(D, wd, dir);
      const nm = pool[t.idx][0];
      if(recent.has(nm)) bad.push('step '+dir+' lands on '+nm+', eaten '+recent.get(nm)+'d ago');
    }
    /* (c) walking the whole pool must never serve a recent one, and must not stall on one index. */
    const seen = [];
    for(let i=0;i<12;i++){ corStep(D, wd, 1); seen.push(corFor(D, wd)[0]); }
    corResetPick(D);
    const rep = seen.filter(n=>recent.has(n));
    if(rep.length) bad.push('12 forward steps served recent combos: '+[...new Set(rep)].join(', '));
    if(new Set(seen).size < 12) bad.push('12 forward steps produced only '+new Set(seen).size+' distinct combos');
    return {bad, recentCount:recent.size, distinct:new Set(seen).size};
  `);
  if (r.bad.length) fail('cor-repeat', r.bad.join(' · '));
  else ok('cor-repeat', `stepper skips the ${r.recentCount} combos eaten in 14 days; 12 steps gave ${r.distinct} distinct, rotation is date-pure`);
}

/* ---------- flavor-btn — the "next ›" button must not move when the flavor changes ----------
 * He reported this TWICE. The first fix pinned the cluster right and truncated the name, and it was
 * not enough, because three independent things moved that button:
 *   ① two items in the row carried margin-left:auto (.statline and .flavnext), so flexbox split the
 *      free space between them and the button's position became a function of the title's width;
 *   ② details.acc summary sets flex-wrap:wrap, and flex line-breaking uses each item's UNSHRUNK size,
 *      so a long name wrapped the whole cluster to a second row before the ellipsis could apply;
 *   ③ ↺ was rendered only when a pick existed, and it sits AFTER "next ›" — so his first step of the
 *      day widened the cluster and pushed both buttons left.
 * A layout bug cannot be measured in jsdom (no layout engine), so this checks the three structural
 * facts that caused it. Cheap, and it fails the moment one is undone.
 */
{
  const src = require('fs').readFileSync(SRC, 'utf8');
  const bad = [];

  /* ③ behavioural: same button count either way, so the cluster's width cannot change */
  const counts = run(`
    const a = nextBtns('cor', true), b = nextBtns('cor', false);
    return {on:(a.match(/<button/g)||[]).length, off:(b.match(/<button/g)||[]).length,
            offHasRst:/nxb rst/.test(b), offGhost:/ghost/.test(b)};
  `);
  if (counts.on !== counts.off)
    bad.push(`nextBtns emits ${counts.on} buttons when picked but ${counts.off} when not — ` +
             `the cluster changes width the moment he steps a flavor`);
  if (!counts.offHasRst || !counts.offGhost)
    bad.push('the unpicked ↺ is not rendered as a reserved ghost slot');
  if (!/\.nxb\.ghost\{[^}]*visibility:hidden/.test(src))
    bad.push('.nxb.ghost does not hide with visibility:hidden — display:none would collapse the slot');

  /* ② the break is DETERMINISTIC: the stepper starts its own row, so its x cannot depend on the title.
        nowrap is the wrong cure and is checked for explicitly — it crushed the card on his phone. */
  if (!/<span class="flavbreak"><\/span><span class="flavnext">/.test(src))
    bad.push('nextBtns does not emit the .flavbreak spacer before the cluster — the stepper shares row 1 again');
  if (!/\.flavbreak\{[^}]*flex-basis:100%/.test(src))
    bad.push('.flavbreak does not span the row, so it cannot force the break');
  if (/data-acc="cor-day"\]>summary,[^{]*\{[^}]*flex-wrap:nowrap/.test(src))
    bad.push('the flavor summaries force flex-wrap:nowrap — that crushed the title to "..." and stacked ' +
             'the chip vertically on his phone, because the row is wider than the screen');

  /* ① the title is the ONLY thing that gives, and it gives from a zero basis so it can never wrap */
  const titleRule = src.match(/details\[data-acc="cor-day"\]>summary>b,[^{]*\{([^}]*)\}/);
  if (!titleRule) bad.push('no title rule for the flavor summaries');
  else {
    /* ⚠️ NOT `flex:1 1 0`, which is what this asserted at first. A zero basis does stop the name from
       forcing a wrap — and it also loses every fight for space, so at 320px the card rendered
       "🥣 Death …" and he could not tell which flavor it was. A ch-based basis is the middle ground:
       big enough that the macros wrap away instead of the name vanishing, fixed enough that it never
       depends on the name's own length. Measured by tools/measure.js: 117px → 173px at 320. */
    if (!/flex:\s*1 1 \d+ch/.test(titleRule[1]))
      bad.push('the flavor title has no ch-based flex-basis — with basis 0 it collapses to an ellipsis, ' +
               'with basis auto a long name forces a wrap (flex breaks lines on UNSHRUNK sizes)');
    if (!/text-overflow:ellipsis/.test(titleRule[1])) bad.push('the flavor title does not truncate');
    if (!/min-width:0/.test(titleRule[1])) bad.push('the flavor title lacks min-width:0, so it cannot shrink');
  }
  /* ⚠️ the defect his screenshot actually showed: the chip deforming instead of the title */
  const fixedRule = src.match(/details\[data-acc="cor-day"\]>summary>\.chip,[\s\S]{0,200}?\{([^}]*)\}/);
  if (!fixedRule) bad.push('no rule pinning .chip and .statline in the flavor summaries');
  else if (!/flex-shrink:0/.test(fixedRule[1]))
    bad.push('the BREAKFAST chip / statline can shrink — they deform (one letter per line) instead of ' +
             'letting the title truncate');
  const flav = src.match(/\n\s*\.flavnext\{([^}]*)\}/);
  if (flav && /margin-left:auto/.test(flav[1]))
    bad.push('.flavnext carries margin-left:auto — on its own row that would push the stepper right, ' +
             'making its x depend on the rate cluster');

  if (bad.length) fail('flavor-btn', bad.join(' · '));
  else ok('flavor-btn', `next › is position-stable: ${counts.on} buttons either way, stepper on its own ` +
          `row via .flavbreak, chip/statline pinned, title on a ${(titleRule[1].match(/1 1 (\d+)ch/)||[,'?'])[1]}ch basis`);
}

/* ---------- meal-row-wrap — a name must never be squeezed while the numbers hog the line ----------
 * His screenshot Aug 13 2026: every Meals row broke into three lines — "Cream / of / Rice" with the
 * DAIRY chip floating beside the middle word. Nothing overlapped; the name was WRAPPING, because the
 * four-macro block is flex-shrink:0 and the name was `flex:1`, whose basis is 0. A zero basis is
 * invisible to flex line-breaking, so the numbers never wrap to a second line however narrow the
 * screen — the name eats the entire shortfall.
 * ⚠️ The basis MUST be on the inline style: these two <b>s carry style="flex:...", and an inline style
 * beats any stylesheet rule. My first attempt put it in the <style> block and did nothing at all.
 * Real geometry lives in tools/measure.js (Edge via puppeteer-core); this only pins the source facts.
 */
{
  const src = require('fs').readFileSync(SRC, 'utf8');
  const bad = [];
  const basis = /<b style="flex:1 1 (\d+)ch;min-width:0">/g;
  const found = [...src.matchAll(basis)].map(m => +m[1]);
  if (found.length < 2)
    bad.push(`expected 2 inline flex-basis names in viewMeals, found ${found.length} — a zero basis ` +
             `means the macros never wrap and the name gets squeezed to nothing`);
  /* ⚠️ Scoped to the two viewMeals names by their interpolation. A bare search for flex:1 also matched
     the gym-timing row, where a zero basis is CORRECT — that row holds a name and a time input, with no
     macro block to wrap away. The first version of this check failed on healthy code. */
  if (/<b style="flex:1;min-width:0">\$\{m\.name\}/.test(src))
    bad.push('the meal name is back to flex:1 (basis 0) — that is the squeeze his screenshot showed');
  if (/<b style="flex:1;min-width:0">\$\{s\.slot\}/.test(src))
    bad.push('the slot header name is back to flex:1 (basis 0)');
  if (!/@media \(max-width:400px\)\{[\s\S]{0,260}?details\.slotsec \.mealcard\{padding-left/.test(src))
    bad.push('the narrow-screen padding trim is gone — nested cards take 118px of a 320px screen, ' +
             'leaving 202px for name + kosher + four macros');
  const titleBasis = src.match(/details\[data-acc="cor-day"\]>summary>b,[^{]*\{\s*flex:1 1 (\d+)ch/);
  if (!titleBasis) bad.push('the flavor title has no ch-based flex-basis — at 320px it renders as "Death …"');

  if (bad.length) fail('meal-row-wrap', bad.join(' · '));
  else ok('meal-row-wrap', `names carry a real flex-basis (${found.join('/')}ch), flavor title ` +
          `${titleBasis[1]}ch, narrow-screen padding trimmed`);
}

/* ---------- zone-placement — the two tools live in Tools, not Food ----------
 * His ask Aug 13 2026, verbatim: "final meal and tonights dinner tools are in Food, move it to Tools."
 * Checked against the RENDERED DOM, not source order: the zones are concatenated in a different order
 * than they are declared, so "appears later in the file" proves nothing about which section a card is in.
 * Moving them also took them out of the foodZone closure — probe.js caught that as "o is not defined" on
 * all 18 Today renders — so this also confirms the cards still render at all, not just where.
 */
{
  const r = run(`
    const dom = document.querySelector('#view');
    const zoneOf = acc => { const el = dom.querySelector('[data-acc="'+acc+'"]');
      if(!el) return null; const z = el.closest('section.zone'); return z? z.id : '(no zone)'; };
    return { finalmeal: zoneOf('finalmeal'), tonight: zoneOf('tonight'),
             food: [...dom.querySelectorAll('#z-food [data-acc]')].map(e=>e.dataset.acc),
             tools: [...dom.querySelectorAll('#z-tools [data-acc]')].map(e=>e.dataset.acc) };
  `);
  const bad = [];
  for (const acc of ['finalmeal', 'tonight']) {
    if (r[acc] === null) bad.push(`the ${acc} card does not render at all — check the foodZone hoist`);
    else if (r[acc] !== 'z-tools') bad.push(`${acc} renders in ${r[acc]}, he asked for Tools`);
  }
  if (bad.length) fail('zone-placement', bad.join(' · '));
  else ok('zone-placement', `Final meal + Tonight's dinner in 🧰 Tools (${r.tools.length} cards); ` +
          `Food keeps ${r.food.join(', ')}`);
}

/* ---------- grocery-flat — one list, checked items at the BOTTOM OF THE WHOLE LIST ----------
 * His words, Aug 16 2026: "The grocery list is very messy. There's a bunch of tabs on the list with
 * multiple items in it, Don't do that. I want anything that was checked off to be sent to the bottom
 * of the whole list."
 * The old card had FIVE `daytag` sections and each sorted its own checked items to its own bottom, so
 * a checked item sank a few rows and stopped, five separate times. This pins the fix: no section
 * headers inside the grocery card, exactly one divider, every checked row below it.
 * Checked against the RENDERED DOM after clicking real items — source order proves nothing here.
 */
{
  const r = run(`
    /* the grocery card lives on the PREP tab; check-app boots on Today */
    if(typeof setTab === 'function') setTab('prep');
    const card = document.querySelector('details[data-acc="grocery"]');
    if(!card) return {err:'no grocery card even after setTab(prep)'};
    card.open = true;
    /* he has real checked items in the synced data, so click only UNCHECKED rows, spread across the
       list, and assert the INVARIANT rather than an absolute count. An earlier version asserted
       "3 checked" and failed on healthy code because 33 were already checked from his gist. */
    const un = [...card.querySelectorAll('.buyitem:not(.done)')];
    const before = card.querySelectorAll('.buyitem.done').length;
    const picks = [...new Set([0, Math.floor(un.length/2), un.length-1])].filter(i => i >= 0 && un[i]);
    picks.forEach(i => un[i] && un[i].click());
    const c2 = document.querySelector('details[data-acc="grocery"]');
    c2.open = true;
    const seq = [...c2.querySelectorAll('.buyitem, .doneline')];
    const divAt = seq.findIndex(e => e.classList.contains('doneline'));
    const checkedAbove = seq.slice(0, divAt < 0 ? seq.length : divAt)
                            .filter(e => e.classList.contains('done')).length;
    const uncheckedBelow = divAt < 0 ? 0
      : seq.slice(divAt).filter(e => e.classList.contains('buyitem') && !e.classList.contains('done')).length;
    return {
      headers: c2.querySelectorAll('.daytag').length,
      dividers: c2.querySelectorAll('.doneline').length,
      total: c2.querySelectorAll('.buyitem').length,
      checked: c2.querySelectorAll('.buyitem.done').length,
      checkedAbove: checkedAbove, uncheckedBelow: uncheckedBelow,
      before: before, clicked: picks.length
    };
  `);
  const bad = [];
  if (r.err) bad.push(r.err);
  else {
    if (r.headers)        bad.push(r.headers + ' section header(s) inside the grocery card — he asked for no tabs');
    if (r.dividers !== 1) bad.push(r.dividers + ' done-dividers, expected exactly 1');
    if (r.checkedAbove)   bad.push(r.checkedAbove + ' checked item(s) ABOVE the divider — they must sink to the bottom of the WHOLE list');
    if (r.uncheckedBelow) bad.push(r.uncheckedBelow + ' unchecked item(s) below the divider');
    if (r.checked !== r.before + r.clicked)
      bad.push('checked ' + r.clicked + ' more items but the count went ' + r.before + ' -> ' + r.checked);
  }
  if (bad.length) fail('grocery-flat', bad.join(' \u00b7 '));
  else ok('grocery-flat', 'one flat list: ' + r.total + ' rows, 0 headers, all ' + r.checked +
          ' checked below a single divider (clicked ' + r.clicked + ' mid-test)');
}

/* ---------- lift-progression — the GO UP engine ----------
 * His report, Aug 17 2026: "The go up function isn't so good. the way its telling me to go up doesnt
 * make sense... when im supposed to go up, make it that the weight i should do is already in the boxes."
 * Five defects sat behind that, all reproduced from his own logged data:
 *   1. the prescribed load was PRINTED but never written to the boxes — he retyped three every session
 *   2. pre-session read wlog while post-session read the boxes, so one exercise printed two answers
 *      (hack squat said 210/220/240; off his real loads it was 210/230/240)
 *   3. verdict() ignored weight, so 10/8/7 @ 200/210/230 scored a GO UP against 11/8/6 @ 200/220/230
 *   4. wlog was written ONLY on a weight-box edit, so a session could record reps with no load at all
 *   5. no sanity bound — 2224 lb reached the adductor log and fed a -2000 lb delta downstream
 * Each assertion below fails if its specific defect comes back. Synthetic history, so it does not drift
 * when his real numbers move.
 */
{
  const r = run(`
    const D = ['2026-06-01','2026-06-08','2026-06-15'];  /* three Mondays */
    const EX = 1, PR = 'pr_hack', T = parseTargets('3 x 8-12'), N = 3;
    const seed = (d, reps, loads, rir, why) => {
      const rp = {}; rp[EX] = reps; store.set('qpcut.reps.'+dkey(d), rp);
      if(loads){ const wl = {}; wl[PR] = loads; store.set('qpcut.wlog.'+dkey(d), wl); }
      else store.set('qpcut.wlog.'+dkey(d), {});
      const rr = {}; if(rir!=null) rr[EX] = rir; store.set('qpcut.rir.'+dkey(d), rr);
      const lm = {}; if(why) lm[EX] = why; store.set('qpcut.ldrop.'+dkey(d), lm);
    };
    const out = {};

    /* --- 2 + 3: same reps at LESS weight must NOT score up, and must not be guessed --- */
    seed(D[0], [12,12,12], ['100','100','100'], 1, null);
    seed(D[1], [12,12,12], ['100','90','100'], 1, null);
    const drop = sessionScore(EX, PR, T, N, D[1]);
    out.dropVerdict = drop.v;
    out.dropGated = !!drop.gate;
    out.dropSets = (drop.gate||[]).map(x=>'S'+x.set);

    /* the same session with the load NOT dropped is a clean GO UP — proves the gate is not blanket */
    seed(D[1], [12,12,12], ['100','100','100'], 1, null);
    out.flatVerdict = sessionScore(EX, PR, T, N, D[1]).v;

    /* --- the three answers --- */
    const ans = {};
    ['purpose','bad','typo'].forEach(w => {
      seed(D[1], [12,12,12], ['100','90','100'], 1, w);
      const sc = sessionScore(EX, PR, T, N, D[1]);
      const pl = plannedLoads(EX, PR, T, N, D[2]);
      ans[w] = { v: sc.v, from: pl && pl.from, loads: pl && pl.loads ? pl.loads.join('/') : null };
    });
    out.answers = ans;

    /* --- 2: ONE basis. The post-session number and next week's target are the same call. --- */
    seed(D[1], [12,12,12], ['100','100','100'], 1, null);
    /* the boxes deliberately hold a DIFFERENT number than he lifted — the old bug's exact shape */
    const ps = store.get('qpcut.prset',{}); const keep = ps[PR]; ps[PR] = ['999','999','999'];
    store.set('qpcut.prset', ps);
    const fwd = plannedLoads(EX, PR, T, N, D[2]);
    out.basisIgnoresBoxes = fwd && fwd.loads ? fwd.loads.join('/') : null;
    out.basisWas = fwd && fwd.base ? fwd.base.join('/') : null;
    ps[PR] = keep; store.set('qpcut.prset', ps);

    /* --- 4: a session with reps but no recorded load must say so, never invent one --- */
    seed(D[1], [12,12,12], null, 1, null);
    const nl = plannedLoads(EX, PR, T, N, D[2]);
    out.noLoadFrom = nl && nl.from; out.noLoadLoads = nl && nl.loads;

    /* --- 5: the wild-load bound, on the real shape of his 2224 row --- */
    out.wild = loadWild(['211','224','2224'], ['211','224','224'], 3).map(x=>x.set);
    out.wildQuiet = loadWild(['238','238','238'], ['224','238','238'], 3).length;

    /* --- 1: the prescribed load actually lands in the boxes --- */
    /* prefillLoads() is deliberately TODAY-ONLY, and this harness pins the clock to 2026-08-06 — a
       Thursday, his rest day — so workoutFor() returns nothing and the prefill assertions would all
       pass vacuously. Stub Date to Mon 2026-06-15 (legs) with Mon 06-08 as its previous session. */
    const REALD = Date, MON = '2026-06-15';
    const stamp = new REALD(MON+'T09:00:00').getTime();
    globalThis.Date = function(){ return arguments.length ? new REALD(...arguments) : new REALD(stamp); };
    globalThis.Date.now = () => stamp; globalThis.Date.prototype = REALD.prototype;
    globalThis.Date.parse = REALD.parse; globalThis.Date.UTC = REALD.UTC;
    try {
    const todayISO = isoToday(), wd = new Date(todayISO+'T12:00:00').getDay();
    out.stubbedToday = todayISO; out.stubbedWd = wd;
    const loc = store.get('qpcut.loc','deal');
    const wo = workoutFor(wd, loc), wmap = ((WMAP[loc==='deal'?'deal':'bk']||{})[wd])||[];
    if(wo){
      /* a clean slate for today: no reps, no prior fill, boxes wiped for every exercise on the card */
      store.set('qpcut.reps.'+dkey(todayISO), {});
      store.set('qpcut.wfill.'+dkey(todayISO), {});
      const p2 = store.get('qpcut.prset',{});
      const slots = wo.ex.map((e,i)=>({ i, t:parseTargets(e[1]), pid:resolvePrId(wmap[i]||[], loc+'|'+wd+'|'+i) }))
                         .filter(x=>x.t && x.pid);
      slots.forEach(x=>{ p2[x.pid] = []; });
      store.set('qpcut.prset', p2);
      /* give every slot a previous session to prescribe from: top-of-range reps at 100 across the board,
         so each one earns a GO UP and the expected box value is computable */
      const pw = {}, pr = {}, pRir = {};
      slots.forEach(x=>{
        const hi = x.t.type==='ladder' ? x.t.per.slice(0,x.t.sets) : Array(x.t.sets).fill(x.t.hi);
        pr[x.i] = hi;
        pw[x.pid] = Array(x.t.sets).fill('100');
        pRir[x.i] = 1;
      });
      store.set('qpcut.reps.'+dkey('2026-06-08'), pr);
      store.set('qpcut.wlog.'+dkey('2026-06-08'), pw);
      store.set('qpcut.rir.'+dkey('2026-06-08'), pRir);
      store.set('qpcut.ldrop.'+dkey('2026-06-08'), {});
      prefillLoads(todayISO, wo, wmap, loc);
      const after = store.get('qpcut.prset',{});
      const wlNow = store.get('qpcut.wlog.'+dkey(todayISO),{});
      out.prefill = slots.map(x=>{
        const want = plannedLoads(x.i, x.pid, x.t, x.t.sets, todayISO);
        return { pid:x.pid,
                 want: want && want.loads ? want.loads.join('/') : null,
                 got: (after[x.pid]||[]).slice(0,x.t.sets).join('/'),
                 wlogged: !!(wlNow[x.pid] && wlNow[x.pid].some(v=>v)) };
      });
      /* a second pass must be a NO-OP over an edit of his — that is the anti-clobber safety */
      const p3 = store.get('qpcut.prset',{}); const first = slots[0];
      if(first){ p3[first.pid] = ['777','777','777']; store.set('qpcut.prset', p3);
        prefillLoads(todayISO, wo, wmap, loc);
        out.respectsEdit = (store.get('qpcut.prset',{})[first.pid]||[]).join('/'); }
      /* and it must refuse a day that already has a rep logged */
      const rp2 = {}; rp2[slots[0].i] = [5,null,null];
      store.set('qpcut.reps.'+dkey(todayISO), rp2);
      store.set('qpcut.wfill.'+dkey(todayISO), {});
      const p4 = store.get('qpcut.prset',{}); p4[slots[0].pid] = []; store.set('qpcut.prset', p4);
      prefillLoads(todayISO, wo, wmap, loc);
      out.skipsLiveSession = (store.get('qpcut.prset',{})[slots[0].pid]||[]).join('/');
      /* Backfill must never touch the shared boxes. 2026-06-01 needs a REAL previous session (05-25) or
         plannedLoads returns null, nothing is written either way, and this assertion passes vacuously —
         it did exactly that until a planted defect walked straight through it. */
      store.set('qpcut.reps.'+dkey('2026-05-25'), pr);
      store.set('qpcut.wlog.'+dkey('2026-05-25'), pw);
      store.set('qpcut.rir.'+dkey('2026-05-25'), pRir);
      store.set('qpcut.ldrop.'+dkey('2026-05-25'), {});
      store.set('qpcut.reps.'+dkey('2026-06-01'), {});
      store.set('qpcut.reps.'+dkey(todayISO), {});
      store.set('qpcut.wfill.'+dkey('2026-06-01'), {});
      const p5 = store.get('qpcut.prset',{}); p5[slots[0].pid] = []; store.set('qpcut.prset', p5);
      prefillLoads('2026-06-01', wo, wmap, loc);
      out.skipsBackfill = (store.get('qpcut.prset',{})[slots[0].pid]||[]).join('/');
    }
    } finally { globalThis.Date = REALD; }
    return out;
  `);
  const bad = [];
  if (r.err) bad.push(r.err);
  else {
    /* 3 — the load has to count */
    if (r.dropVerdict !== null)
      bad.push('same reps at LESS weight scored "' + r.dropVerdict + '" — a load drop must never pay out');
    if (!r.dropGated) bad.push('a load drop did not raise the ask-him gate');
    if (r.dropSets.join(',') !== 'S2') bad.push('gate blamed ' + r.dropSets.join(',') + ', expected S2');
    if (r.flatVerdict !== 'up')
      bad.push('the SAME reps at unchanged weight scored "' + r.flatVerdict + '" — the gate is over-firing');
    /* the three answers he chose */
    const a = r.answers || {};
    if (!a.purpose || a.purpose.v !== 'up')
      bad.push('"on purpose" did not restore the GO UP (got ' + (a.purpose && a.purpose.v) + ')');
    /* jumpFor() is PER SET — 90 takes +5, 100 takes +10 — so the lighter S2 climbs by 5, not 10 */
    if (!a.purpose || a.purpose.loads !== '110/95/110')
      bad.push('"on purpose" must build on the lighter load (110/95/110), got ' + (a.purpose && a.purpose.loads));
    if (!a.bad || a.bad.v !== 'hold' || a.bad.from !== 'back')
      bad.push('"bad day" must HOLD and roll back, got ' + JSON.stringify(a.bad));
    if (!a.bad || a.bad.loads !== '100/100/100')
      bad.push('"bad day" must return to the pre-drop weight 100/100/100, got ' + (a.bad && a.bad.loads));
    if (!a.typo || a.typo.from !== 'typo' || a.typo.loads !== null)
      bad.push('"mistyped" must refuse to prescribe, got ' + JSON.stringify(a.typo));
    /* 2 — one basis, and it is never the boxes */
    if (r.basisWas !== '100/100/100')
      bad.push('the prescription basis was ' + r.basisWas + ' — it must be what he LIFTED, not the boxes (999)');
    if (r.basisIgnoresBoxes !== '110/110/110')
      bad.push('forward prescription = ' + r.basisIgnoresBoxes + ', expected 110/110/110 off his real loads');
    /* 4 — no invented loads */
    if (r.noLoadFrom !== 'noload' || r.noLoadLoads)
      bad.push('a session with no recorded load produced ' + JSON.stringify(r.noLoadLoads) + ' instead of saying so');
    /* 5 — the bound */
    if (r.wild.join(',') !== '3') bad.push('2224 lb was not flagged (got sets ' + r.wild.join(',') + ')');
    if (r.wildQuiet) bad.push('the wild-load bound fired on a legitimate 238 -> 238 row');
    /* 1 — his actual ask */
    if (!r.prefill || !r.prefill.length)
      bad.push('no exercises measured for the box prefill — stubbed today was ' + r.stubbedToday +
               ' (weekday ' + r.stubbedWd + '); if that is a rest day this guard was passing vacuously');
    else {
      const miss = r.prefill.filter(x => x.want && x.got !== x.want);
      if (miss.length) bad.push('boxes NOT pre-loaded: ' + miss.map(x => x.pid + ' wanted ' + x.want + ' got "' + x.got + '"').join(', '));
      const noWl = r.prefill.filter(x => x.want && !x.wlogged);
      if (noWl.length) bad.push('prefilled but never recorded in wlog: ' + noWl.map(x => x.pid).join(', '));
    }
    if (r.respectsEdit !== '777/777/777')
      bad.push('a second prefill pass CLOBBERED his edit (777 -> ' + r.respectsEdit + ')');
    if (r.skipsLiveSession !== '')
      bad.push('prefill wrote into a session already under way (got ' + r.skipsLiveSession + ')');
    if (r.skipsBackfill !== '')
      bad.push('prefill wrote the shared boxes from a BACKFILLED day (got ' + r.skipsBackfill + ')');
  }
  if (bad.length) fail('lift-progression', bad.join(' \u00b7 '));
  else ok('lift-progression', 'load-aware: a drop gates instead of paying out, 3 answers behave (' +
          'purpose ' + r.answers.purpose.loads + ' \u00b7 bad rolls back ' + r.answers.bad.loads +
          ' \u00b7 typo refuses); one basis = what he ' +
          'lifted not the boxes; ' + r.prefill.length + ' exercises pre-loaded + wlogged, edits and ' +
          'live sessions and backfills all left alone; 2224 lb caught');
}

/* ---------- event-in-sched — a dated event has to reach the DAY, not just a card ----------
 * His report, Aug 17 2026: "why is the birthday party not in my sched today?" He had given me the date
 * days earlier and I had built an EVENTS card for it. The card was not the problem — dayRows() built the
 * timeline from weekday templates and never looked at EVENTS at all, so the event existed in the app's
 * advice and was absent from the app's schedule. He reads the schedule.
 * Now any EVENTS entry with at:'HH:MM' becomes a row. This pins that, per event, on its own date, and
 * pins the two ways it could go wrong: a party must not be read as a commitment that blocks a meal, and
 * it must not displace a meal row.
 */
{
  const r = run(`
    const out = [];
    const REALD = Date;
    /* EVERY event, not just the timed ones: his rule gives an untimed event a card and a reminder, and
       only the ROW is conditional on a time. Looping over timed events alone could never see an untimed
       card go missing. */
    const timed = EVENTS.filter(e => e.d >= '2026-08-17');
    timed.forEach(e => {
      const stamp = new REALD(e.d + 'T12:00:00').getTime();
      globalThis.Date = function(){ return arguments.length ? new REALD(...arguments) : new REALD(stamp); };
      globalThis.Date.now = () => stamp; globalThis.Date.prototype = REALD.prototype;
      globalThis.Date.parse = REALD.parse; globalThis.Date.UTC = REALD.UTC;
      try {
        const m = e.at ? /^([0-9]{1,2}):([0-9]{2})$/.exec(String(e.at)) : null; /* NOT \d: template literal eats the backslash */
        const want = m ? (+m[1]*60 + +m[2]) : null;
        const rows = dayRows();
        const label = e.row || e.title;
        const hit = rows.find(x => String(x[1]) === String(label));
        const meals = plannedMealMins();
        const busy = busyBlocks().map(b => String(b[2]));
        /* THE CARD. Render Today on this date and look for the title — the render site maps over EVENTS
           with no condition today, and this is what keeps it that way. */
        let card = false;
        try { setTab('today'); card = document.getElementById('view').innerHTML.indexOf(e.title) >= 0; }
        catch (err) { card = 'threw: ' + String(err.message || err); }
        out.push({
          d: e.d, at: e.at || null, parsed: want, today: isoToday(),
          present: !!hit, rowMin: hit ? hit[0] : null,
          card: card,
          rowCount: rows.length,
          isBusyBlock: busy.some(b => b === String(label).replace(/<[^>]*>/g,'')),
          mealSlots: Object.keys(meals).sort().join(','),
          /* an event row must never be mistaken for a meal row */
          readAsMeal: !!(typeof mealSlotOfLabel === 'function' && mealSlotOfLabel(label))
        });
      } finally { globalThis.Date = REALD; }
    });
    /* and an entry WITHOUT a time must not leak into any schedule */
    const untimed = EVENTS.filter(e => !e.at);
    let leaked = 0;
    untimed.forEach(e => {
      const stamp = new REALD(e.d + 'T12:00:00').getTime();
      globalThis.Date = function(){ return arguments.length ? new REALD(...arguments) : new REALD(stamp); };
      globalThis.Date.now = () => stamp; globalThis.Date.prototype = REALD.prototype;
      globalThis.Date.parse = REALD.parse; globalThis.Date.UTC = REALD.UTC;
      try { if(dayRows().some(x => String(x[1]) === String(e.row || e.title))) leaked++; }
      finally { globalThis.Date = REALD; }
    });
    return { rows: out, timed: timed.length, untimed: untimed.length, leaked };
  `);
  const bad = [];
  if (r.err) bad.push(r.err);
  else if (!r.timed) bad.push('no EVENTS entry carries a time — the schedule wiring is untested');
  else {
    r.rows.forEach(x => {
      if (x.today !== x.d) bad.push(x.d + ': date stub failed, isoToday() said ' + x.today);
      /* (2) the small card — every event, timed or not */
      if (x.card !== true)
        bad.push(x.d + ': NO CARD renders on that date' + (typeof x.card === 'string' ? ' (' + x.card + ')' : ''));
      /* (1) the row, iff he gave a time — a biconditional, so a row that appears WITHOUT a time is a
         fabricated clock position and fails just as loudly as a missing one */
      if (x.at && x.parsed === null) bad.push(x.d + ': at="' + x.at + '" did not parse as HH:MM');
      else if (x.at && !x.present)
        bad.push(x.d + ' ' + x.at + ': event is NOT a row in that day\'s schedule (' + x.rowCount +
                 ' rows built) — card only, which is the exact bug he reported');
      else if (x.at && x.rowMin !== x.parsed)
        bad.push(x.d + ': row sits at ' + x.rowMin + ' min but he said ' + x.at);
      else if (!x.at && x.present)
        bad.push(x.d + ': has NO time from him but a schedule row appeared anyway — that is an invented time');
      if (x.isBusyBlock) bad.push(x.d + ': the event became a commitment block and will stop a meal being suggested');
      if (x.readAsMeal) bad.push(x.d + ': the event label is being read as a MEAL slot');
      if (!x.mealSlots) bad.push(x.d + ': no meal rows survived in the schedule');
    });
    if (r.leaked) bad.push(r.leaked + ' untimed event(s) leaked into a schedule without an at:');
  }
  if (bad.length) fail('event-in-sched', bad.join(' \u00b7 '));
  else ok('event-in-sched', r.rows.length + ' event(s) since 2026-08-17: all render a card, the ' +
          r.rows.filter(x => x.at).length + ' he gave a time get a row at that time (' +
          r.rows.filter(x => x.at).map(x => x.d.slice(5) + ' ' + x.at).join(' \u00b7 ') + '), the ' +
          r.rows.filter(x => !x.at).length + ' without one get none; no event blocks or impersonates a meal');
}

/* ---------- event-noise — an event card states the event and NOTHING else ----------
 * His instruction, Aug 17 2026, after I answered "put the party in my schedule" with a food ladder, a
 * banked snack, a protein scoop, a hydration number and a nut prompt: "i never asked for the above. i
 * just asked for it to be in my schedule. Don't make meal adjustments or any adjustements unless told
 * to. when i tell you about an event, all you should do is, make a sched adjustment and a reminder for
 * the morning of. apply that to all upcoming events i told you about."
 * Six cards carried ~2,900 characters of coaching he never requested. This makes writing it again a
 * BUILD FAILURE rather than something I have to remember, which is the only version of this that holds.
 * Cutoff is the date of the instruction: earlier cards are history and are not rewritten.
 * A clash line ("your class runs 6:30-7:45 the same evening") is deliberately allowed — two things on
 * one evening is schedule information, not a meal adjustment.
 */
{
  const RULE_FROM = '2026-08-17';
  const BANNED = [
    ['\u{1F6AB}', 'a do-not list'],
    ['\u{1F95C}', 'a nut prompt'],
    ['\u{1F4A7}', 'a hydration instruction'],
    ['\u{1F379}', 'a drinks instruction'],
    ['scoop', 'a protein scoop'],
    ['SKIP \u2192', 'a banked slot'],
    ['put it into', 'a banked slot'],
    ['put them into', 'a banked slot'],
    [' oz', 'a fluid/weight amount'],
    ['starch', 'a food ladder'],
    ['dressing', 'a food ladder'],
    ['skin off', 'a food ladder'],
    ['palm-sized', 'a portion instruction'],
    ['sashimi', 'a food ladder'],
    ['in this order', 'a food ladder'],
    ['unchanged', 'a meal adjustment'],
  ];
  const r = run(`
    return EVENTS.filter(e => e.d >= '` + RULE_FROM + `')
      .map(e => ({ d: e.d, title: e.title, msg: String(e.msg || ''), len: String(e.msg || '').length }));
  `);
  const bad = [];
  if (r.err) bad.push(r.err);
  else if (!r.length) bad.push('no events on or after ' + RULE_FROM + ' — this check is vacuous');
  else r.forEach(e => {
    BANNED.forEach(([needle, what]) => {
      if (e.msg.indexOf(needle) >= 0)
        bad.push(e.d + ' card carries ' + what + ' ("' + needle.trim() + '") — he asked for the event only');
    });
    if (e.len > 220)
      bad.push(e.d + ' card is ' + e.len + ' chars; an event statement does not need that (cap 220)');
  });
  if (bad.length) fail('event-noise', bad.join(' \u00b7 '));
  else ok('event-noise', r.length + ' event card(s) since ' + RULE_FROM +
          ' state the event only — no banked slots, ladders, scoops, water or nut prompts (longest ' +
          Math.max.apply(null, r.map(e => e.len)) + ' chars)');
}

/* ---------- event-push — the morning reminder actually sees the events ----------
 * The other half of what he asked for. push-reminders.js pulls EVENTS out of the served file by REGEX
 * (not eval, so a card body can never take his defrost and weigh-in pushes down with it) — and a regex
 * against a source literal is exactly the thing that silently stops matching. This runs the push
 * script's own extractor via `--list` and compares it to what the app holds, so a format change fails
 * the build instead of quietly ending the reminders.
 */
{
  const { execSync } = require('child_process');
  const path = require('path');
  const ROOT = path.join(__dirname, '..');
  const sh = a => JSON.parse(execSync('node push-reminders.js ' + a, { cwd: ROOT, encoding: 'utf8' }));
  const want = run(`
    return EVENTS.map(e => ({ d: e.d, at: e.at || null, label: e.row || e.title }));
  `);
  const bad = [];
  let got = null, dryChecked = 0;
  try { got = sh('--list'); }
  catch (e) { bad.push('--list failed: ' + (e.stderr || e.message || '').toString().slice(0, 200)); }
  if (want.err) bad.push(want.err);
  else if (got) {
    const key = x => x.d + '|' + (x.at || '-') + '|' + x.label;
    const gotSet = new Set(got.map(key));
    const missing = want.filter(w => !gotSet.has(key(w)));
    if (missing.length)
      bad.push('the push extractor does not see ' + missing.length + ' event(s): ' +
               missing.map(m => m.d + ' "' + m.label + '"').join(', ') +
               ' — those mornings would send no reminder');
    if (got.length !== want.length)
      bad.push('extractor found ' + got.length + ' events, the app has ' + want.length);
    /* every event he has given a time to must carry it into the reminder text */
    want.filter(w => w.at).forEach(w => {
      if (!/[0-9]/.test(w.label)) bad.push(w.d + ' has a time but its reminder label shows none');
    });
    /* AND the morning branch has to actually USE the extractor. Checking grabEvents() alone passed while
       the send path was gutted to `[].filter(...)`. --dry runs the real composition for that date. */
    const dates = [...new Set(want.filter(w => w.d >= '2026-08-17').map(w => w.d))].sort().slice(0, 6);
    dates.forEach(d => {
      let items = null;
      try { items = sh('--dry morning ' + d); }
      catch (e) { bad.push('--dry morning ' + d + ' failed: ' +
                           (e.stderr || e.message || '').toString().slice(0, 120)); return; }
      const titles = items.map(i => String(i.title));
      want.filter(w => w.d === d).forEach(w => {
        if (!titles.some(t => t === w.label))
          bad.push(d + ': the morning push would NOT include "' + w.label + '" (would send: ' +
                   (titles.join(' / ') || 'nothing') + ')');
      });
      dryChecked++;
    });
  }
  if (bad.length) fail('event-push', bad.join(' \u00b7 '));
  else ok('event-push', '--list sees all ' + want.length + ' event(s) the app holds (times on the ' +
          want.filter(w => w.at).length + ' he has dated); --dry morning proves the push actually sends' +
          ' them on ' + dryChecked + ' upcoming date(s)');
}

/* ============ [bag-window] the Morning Bag leads only in its two windows ============
 * His rule: at the TOP 5-10 AM and 9 PM-2 AM, at the bottom the rest of the day.
 * ⛔ THE NIGHT WINDOW WRAPS PAST MIDNIGHT, which is the whole reason this is guarded. Written the
 * obvious way — m >= 1260 && m < 120 — it is NEVER true, so the card would silently vanish every single
 * night and nothing would report an error, because a card that decides not to render looks exactly like
 * a card that has nothing to say. Both ends of both windows are asserted below, plus the two minutes
 * either side of each boundary.
 * It is testable at all because bagAtTop takes an optional minute: nowMin is a scoped const, so the
 * first attempt to check this stubbed globalThis.nowMin, changed nothing, and cheerfully reported the
 * card as leading at 1 PM. A time rule that cannot be exercised at a chosen time cannot be verified.
 */
{
  const res = run(`
    const cases = [[0,'00:00',true],[119,'01:59',true],[120,'02:00',false],[299,'04:59',false],
      [300,'05:00',true],[450,'07:30',true],[599,'09:59',true],[600,'10:00',false],
      [780,'13:00',false],[1259,'20:59',false],[1260,'21:00',true],[1439,'23:59',true]];
    const wrong = cases.filter(c => bagAtTop(false, c[0]) !== c[2]).map(c => c[1]);
    return { wrong, backfill: bagAtTop(true), n: cases.length,
             morning: typeof BAG_MORNING !== 'undefined' ? BAG_MORNING : null,
             night: typeof BAG_NIGHT !== 'undefined' ? BAG_NIGHT : null };
  `);
  if (!res) fail('bag-window', 'could not evaluate bagAtTop in the booted app');
  else if (res.wrong && res.wrong.length)
    fail('bag-window', res.wrong.length + ' of ' + res.n + ' boundary minute(s) place the Morning Bag wrongly: ' +
      res.wrong.join(', ') + '. If the night window stopped wrapping past midnight, the card vanishes every night.');
  else if (!res.backfill)
    fail('bag-window', 'a previewed or backfilled date does not lead with the bag — opening a specific day IS the packing case');
  else if (!res.night || res.night[0] <= res.night[1])
    fail('bag-window', 'BAG_NIGHT no longer wraps past midnight (' + JSON.stringify(res.night) + ') — that is the bug this guard exists for');
  else ok('bag-window', res.n + ' boundary minutes place the bag correctly; night window wraps ' +
    res.night[0] + '\u2192' + res.night[1] + ', morning ' + res.morning[0] + '\u2192' + res.morning[1]);
}


/* ---------- offplan-topping — off-track calories come out of the topping ----------
 * HIS RULE, 2026-08-19: "whenever i tell you off track eating that actually matters, take the cals
 * from Creami Topping that day. I'd want it as a small note added to the creami flavor card that day."
 *
 * Three ways this can go wrong, and each is asserted below:
 *   1. it charges NOISE. The card already called anything at or under OFFPLAN_NOISE "nothing to
 *      offset"; a rule that quietly starts billing a celery stick for it breaks his own threshold.
 *   2. it OVERSHOOTS. The first cut of creamiTrim told him to remove 70 cal of wafer to pay a 60 cal
 *      debt, because it stepped in 5 g. Taking more dessert than the debt is a cost he never agreed to.
 *   3. it EDITS A CUP. The deduction is a render-time overlay precisely so the 36 cups still spec 140
 *      and [creami-topping] still enforces them. If a per-day charge ever mutates cup[5], that spec
 *      stops being checkable — which is how "Topping (140 cal)" printed on every cup for months.
 * Synthetic dates and a cup found by capacity, not named, so this does not rot when the batch rotates.
 */
{
  const r = run(`
    const D = '2031-03-05';                     /* far future: cannot collide with his real log */
    const before = store.get('qpcut.offplan', {});
    /* find a cup with a real trimmable component rather than naming one — batches rotate */
    let cup = null;
    for (const b of CREAMI_BATCHES) for (const c of (b.cups || [])) {
      const m = creamiTopMac(c);
      if (m && m[0] > 100 && (c[5] || []).some(p => p[0] !== 'ff whip' && FOOD_FACTS[p[0]])) { cup = c; break; }
      if (cup) break;
    }
    if (!cup) return JSON.stringify({ fatal: 'no cup with a trimmable topping' });
    const cap = creamiTopMac(cup)[0];
    const specBefore = JSON.stringify(cup[5]);

    const seen = [];
    const probeAt = (cal) => {
      store.set('qpcut.offplan', { [D]: [{ text: 'planted', cal }] });
      const ch = offplanCharge(D);
      const note = offplanNote(D, cup);
      const t = ch.cal ? creamiTrim(cup, ch.cal) : null;
      const cut = t ? t.cuts.reduce((a, c) => a + c.cal, 0) : 0;
      seen.push({ cal, charged: ch.cal, note, cut, plain: /No topping/.test(note) });
    };
    /* ⛔ ABSOLUTE, not derived from OFFPLAN_NOISE — a probe that reads the threshold it is testing
       moves with it, and a floor dropped to 0 then passes. The harness caught exactly that. */
    [5, 20, 39, 41, 60, 90, 120, cap - 1, cap, cap + 50, 900].forEach(probeAt);

    store.set('qpcut.offplan', before);         /* never leave planted data behind */
    return JSON.stringify({
      cap, floor: OFFPLAN_NOISE, seen,
      specUnchanged: JSON.stringify(cup[5]) === specBefore,
      capStillSpec: Math.abs(creamiTopMac(cup)[0] - cap) < 0.01
    });
  `);
  const res = JSON.parse(r);
  const bad = [];
  /* His app has called anything at or under this "nothing to offset" since before the rule existed.
     Pinned so a change to the constant is a FAILURE that has to be argued for, not a silent pass. */
  const FLOOR = 40;
  if (res.fatal) bad.push(res.fatal);
  else if (res.floor !== FLOOR)
    bad.push('OFFPLAN_NOISE is ' + res.floor + ', not the ' + FLOOR + ' the off-plan card has always used — ' +
             'if that is deliberate, change this guard in the same commit and say why');
  else {
    for (const s of res.seen) {
      /* 1. noise is never charged, and never draws a note. FLOOR is pinned here on purpose. */
      if (s.cal <= FLOOR && (s.charged || s.note))
        bad.push(s.cal + ' cal is at or under the ' + FLOOR + ' floor but was charged/annotated');
      /* anything over the floor must say something — silence is the failure his rule exists to fix */
      if (s.cal > FLOOR && !s.note)
        bad.push(s.cal + ' cal over the floor produced no note on the flavor card');
      /* 2. never cut more of the dessert than the debt */
      if (s.charged && s.cut > s.charged)
        bad.push(s.cal + ' cal debt cuts ' + s.cut + ' cal of topping — overshoot');
      /* 3. at or past the topping's capacity it must say the topping is gone, not trim into the cup */
      if (s.charged >= res.cap && !s.plain)
        bad.push(s.cal + ' cal exceeds the ' + res.cap + '-cal topping but the note still trims it');
      if (s.charged && s.charged < res.cap && s.plain)
        bad.push(s.cal + ' cal fits inside the topping but the note drops it entirely');
    }
    if (!res.specUnchanged) bad.push('a per-day charge MUTATED cup[5] — the 140 spec is no longer checkable');
    if (!res.capStillSpec) bad.push('the cup topping total moved after a charge — the overlay is not read-only');
  }
  if (bad.length) fail('offplan-topping', bad.length + ' fault(s): ' + bad.join(' | '));
  else ok('offplan-topping', res.seen.length + ' charges across the ' + res.floor + '-cal floor and the ' +
    res.cap + '-cal topping: noise never billed, no cut exceeds its debt, cup specs untouched');
}


/* ---------- buffins — the stock card he asked for, and the thing it must never become ----------
 * HIS ASK, 2026-08-19: "Ye track which ones I eat." He owns one of each, so a price list without a
 * count is useless — it would suggest a flavor he ate on Sunday.
 *
 * WHAT THIS GUARDS. The card DERIVES its flavors and macros from FOOD_FACTS by key prefix, and the
 * whole point is that it never becomes a second copy of the price list. So: every buffin fact must
 * appear, the badge must count what is LEFT rather than what exists, marking one must not delete it
 * from the list, and the card must start closed like every other section in this app.
 * The nut-flagged flavor must stay visibly marked — he reads wrappers himself, but the card should
 * not quietly present it as equivalent to the other ten.
 */
{
  const r = run(`
    const before = store.get('qpcut.buffins', {});
    store.set('qpcut.buffins', {});
    const list = buffinList();
    const factKeys = Object.keys(FOOD_FACTS).filter(k => k.indexOf('buffin ') === 0);
    const closed = buffinCardHTML();
    const first = list.length ? list[0].key : null;
    store.set('qpcut.buffins', first ? { [first]: '2026-08-19' } : {});
    const after = buffinCardHTML();
    const stock = buffinStock();
    store.set('qpcut.buffins', before);
    const badge = h => { const m = h.match(/<b>(\\d+)<\\/b> left/); return m ? +m[1] : null; };
    const lis = h => (h.match(/<li /g) || []).length;
    return JSON.stringify({
      facts: factKeys.length, listed: list.length,
      sorted: list.every((b, i) => i === 0 || list[i-1].cal <= b.cal),
      macrosMatch: list.every(b => FOOD_FACTS[b.key] && FOOD_FACTS[b.key].cal === b.cal &&
                                   FOOD_FACTS[b.key].p === b.p && FOOD_FACTS[b.key].c === b.c),
      badgeClosed: badge(closed), lisClosed: lis(closed),
      startsClosed: closed.indexOf(' open') === -1,
      badgeAfter: badge(after), lisAfter: lis(after),
      nutFacts: factKeys.filter(k => FOOD_FACTS[k].nut).length,
      nutChips: (closed.match(/nuts<\\/span>/g) || []).length,
      leftAfter: stock.left.length, goneAfter: stock.gone.length
    });
  `);
  const d = JSON.parse(r);
  const bad = [];
  if (d.facts !== d.listed) bad.push(d.facts + ' buffin facts but the card lists ' + d.listed + ' — the list is meant to be derived, so these cannot differ');
  if (!d.sorted) bad.push('not cheapest-first, which is the ordering the choice actually depends on');
  if (!d.macrosMatch) bad.push('a listed macro does not equal its FOOD_FACTS entry — the card has become a second copy');
  if (d.badgeClosed !== d.facts) bad.push('badge reads ' + d.badgeClosed + ' left with nothing eaten, expected ' + d.facts);
  if (!d.startsClosed) bad.push('card does not start closed');
  if (d.badgeAfter !== d.facts - 1) bad.push('after eating one the badge reads ' + d.badgeAfter + ', expected ' + (d.facts - 1));
  if (d.lisAfter !== d.lisClosed) bad.push('marking one REMOVED it from the list (' + d.lisClosed + ' -> ' + d.lisAfter + '); it should stay, greyed, with its date');
  if (d.leftAfter !== d.facts - 1 || d.goneAfter !== 1) bad.push('stock split wrong: left ' + d.leftAfter + ', gone ' + d.goneAfter);
  if (d.nutChips !== d.nutFacts) bad.push(d.nutFacts + ' nut-flagged fact(s) but ' + d.nutChips + ' marked on the card');
  if (bad.length) fail('buffins', bad.length + ' fault(s): ' + bad.join(' | '));
  else ok('buffins', d.listed + ' flavors derived from FOOD_FACTS, cheapest first, badge counts what is left, ' +
    'marking one keeps it listed with its date, ' + d.nutFacts + ' nut-flagged and marked, starts closed');
}


/* ---------- cor-crunch — a COR topping is priced from the amount his spec states ----------
 * Three defects on 2026-08-24, all in code that no guard had ever looked at, found because he asked
 * “there's still COR bowls that dont follow the correct macros???”
 *   ① corBuild carried its own copy of b1's base and of almond butter's per-gram macros. Both were
 *     snapshots taken before b1's rows were re-priced, so all 92 combo cards read 1 P and 2 C above
 *     the bowl the engine actually prices. The CALORIES matched, which is why it lived for weeks — a
 *     wrong number that agrees with the headline figure is invisible.
 *   ② COR_CRUNCH held one flat [cal,P,C,F] per topping, so “3 Nilla wafers” and “12 g Nilla” were
 *     charged identically. His call: “there should def not be one flat number for all toppings.”
 *   ③ The key 'Fruity Pebbles on top' could not match the spec “12 g Fruity Pebbles”, so the pebbles
 *     fell through to the FRUIT branch: Double Fruity Cereal Milk dropped his 70 g strawberries from
 *     the card, told him to eat cereal instead, and charged him for neither.
 * Every clause below is one of those three, plus the vacuity check that stops this whole guard from
 * passing because it found nothing to look at.
 */
{
  const r = run(`
    const bad = [], keys = COR_CRUNCH.map(c => c[0]);
    const combos = [];
    COR_SETS.forEach(s => s.forEach(([n, sp]) => combos.push({n, sp, b: corBuild(sp)})));
    if(!combos.length) bad.push('no COR combos found — this guard is running vacuous');

    /* (a) a topping names a fact and nothing else. A number here is the bug coming back. */
    COR_CRUNCH.forEach(([k, ff]) => {
      if(Array.isArray(ff)) bad.push('COR_CRUNCH \\'' + k + '\\' carries hand-typed macros again');
      else if(!FOOD_FACTS[ff]) bad.push('COR_CRUNCH \\'' + k + '\\' names missing fact ' + ff);
    });

    /* (b) the base must BE b1 as the engine prices it, never a copy of it. Defect ①. */
    const b1t = OPTBYID['b1'].vars[0].t;
    const plain = combos.filter(c => !c.b.crunch);
    if(!plain.length) bad.push('no crunch-free combo exists to compare against b1 — clause (b) is vacuous');
    plain.forEach(c => {
      if(c.b.mac.join('/') !== b1t.join('/'))
        bad.push(c.n + ' with no topping is ' + c.b.mac.join('/') + ' but the engine prices b1 at ' + b1t.join('/'));
    });

    /* (c) a topping that cannot be priced must never render as free. */
    combos.forEach(c => {
      if(c.b.crunchUnpriced) bad.push(c.n + ': topping \\'' + c.b.crunchLabel + '\\' could not be priced');
    });

    /* (d) a topping must never end up in the fruit slot. Defect ③, checked on the OUTPUT. */
    combos.forEach(c => {
      keys.forEach(k => {
        if(corKeyRe(k).test(c.b.fruitLabel))
          bad.push(c.n + ': \\'' + c.b.fruitLabel + '\\' is a topping sitting in the fruit slot');
      });
    });

    /* (d2) ⛔ THE CLAUSE THAT ACTUALLY CATCHES DEFECT ③, and the reason it is separate from (d).
           (d) and (e) both match using COR_CRUNCH's OWN keys, so if a KEY is wrong they are wrong
           the same way and see nothing — plant 3 walked straight through both. This one knows
           nothing about COR_CRUNCH: whatever ends up in the fruit slot has to be a fruit. Same
           vocabulary [cor-bowl-total] uses for fresh fruit in check-food.js. */
    const FRUITWORDS = ['berr', 'strawberr', 'blueberr', 'raspberr', 'apple', 'banana',
                        'peach', 'pineapple', 'mango', 'cherr'];
    combos.forEach(c => {
      const fl = String(c.b.fruitLabel || '').toLowerCase();
      if(!FRUITWORDS.some(w => fl.indexOf(w) >= 0))
        bad.push(c.n + ': the fruit slot holds \u2018' + c.b.fruitLabel + '\u2019, which is not a fruit');
    });
    /* (e) ...and defect ③ again, checked on the INPUT: any add-in naming a topping must be matched
           as one. (d) alone would miss a topping that fell through to the spice branch instead. */
    combos.forEach(c => {
      const parts = c.sp.split(' — ').slice(1).join(' — ');
      (parts ? parts.split(' + ') : []).map(x => x.trim()).filter(Boolean).forEach(e => {
        if(keys.some(k => corKeyRe(k).test(e)) && !c.b.crunch)
          bad.push(c.n + ': add-in \\'' + e + '\\' names a topping but none was matched');
      });
    });

    /* (f) HIS RULE, and the version that actually tests it. Defect ②.
           ⛔ THE FIRST VERSION OF THIS CLAUSE WAS VACUOUS and a plant proved it: it re-derived the
           price from the stated quantity and compared THAT to itself, never once looking at what the
           card charged. Pinning corBuild to a flat amount left it passing.
           It also cannot be written as \u2018different amounts must give different output\u2019 \u2014 8 g Biscoff and
           one 7.75 g Biscoff cookie are a fifth of a gram apart and collapse to the same rounded row,
           which is correct behaviour, not a defect.
           So: recover what corBuild ACTUALLY charged, from the almond butter it gave back, and hold it
           against the spec's own stated amount. AB is solved to the nearest half gram, so the tolerance
           is one such step. */
    const abRowG = (OPTBYID['b1'].vars[0].ing.find(r => /almond butter/i.test(String(r[0])))||[])[2];
    const abBaseG = (abRowG && abRowG.n) || 0;
    const abCal = FOOD_FACTS['almond butter'].cal;
    const TOL = 0.5 * abCal;   /* one rounding step of the almond-butter solve */
    let checkedCharges = 0;
    combos.filter(c => c.b.crunch).forEach(c => {
      const q = String(c.b.crunchQty).trim();
      const grams = q.slice(-1).toLowerCase() === 'g';
      const want = priceRow([null, null, {f: c.b.crunchFF, n: parseFloat(q), u: grams ? 'g' : 'each'}]);
      if(!want) return;   /* clause (c) owns the unpriceable case */
      const charged = (abBaseG - c.b.ab) * abCal;
      checkedCharges++;
      if(Math.abs(charged - want[0]) > TOL)
        bad.push(c.n + ': the card charges ' + Math.round(charged) + ' cal for \u2018' + q + ' ' +
                 c.b.crunchLabel + '\u2019 but that amount prices at ' + Math.round(want[0]) + ' cal');
    });
    if(!checkedCharges) bad.push('no topping charge could be checked — clause (f) is vacuous');

    /* (f2) A QUANTIFIED add-in must never end up as an unpriced extra. Defect ③ again, and this is
           the clause that finally catches it whatever the key says. Once the parser stopped letting a
           stray topping clobber the fruit, a wrong COR_CRUNCH key sent \u201c12 g Fruity Pebbles\u201d to the
           extras list instead \u2014 still uncounted, just somewhere else, and (d2) no longer saw it.
           If his spec says HOW MUCH of something, that something has to be priced. An extra with no
           stated amount (\u201cextra almond butter\u201d, \u201cGolden Lakanto\u201d) is a different case and is allowed. */
    combos.forEach(c => {
      (c.b.extras || []).forEach(x => {
        if('0123456789'.split('').some(d => String(x).indexOf(d) >= 0))
          bad.push(c.n + ': \u2018' + x + '\u2019 states an amount but is not priced into the bowl');
      });
    });

    /* (g) and the plate still has to fit, the same 25-cal tolerance [slot-fit] uses. */
    const bud = SLOT_BUDGET.bf[0];
    combos.forEach(c => {
      if(c.b.mac[0] > bud + 25) bad.push(c.n + ' is ' + (c.b.mac[0] - bud) + ' cal over the breakfast budget');
    });

    const withCrunch = combos.filter(c => c.b.crunch).length;
    return {bad, n: combos.length, withCrunch, foods: new Set(combos.filter(c => c.b.crunch).map(c => c.b.crunchFF)).size, charges: checkedCharges, b1: b1t.join('/'),
            cals: [Math.min(...combos.map(c => c.b.mac[0])), Math.max(...combos.map(c => c.b.mac[0]))]};
  `);
  if (r.bad.length) fail('cor-crunch', r.bad.length + ' fault(s): ' + r.bad.join(' | '));
  else ok('cor-crunch', r.n + ' combos, ' + r.withCrunch + ' with a topping across ' + r.foods +
    ' foods, each priced from its own stated amount; the ' + (r.n - r.withCrunch) +
    ' plain ones equal the engine\u2019s b1 (' + r.b1 + '); all land ' + r.cals[0] + '\u2013' + r.cals[1] + ' cal');
}

/* ---------- creami-shop — a batch's shopping list must not contradict its own cups ----------
 * His report, 2026-08-24: “theres an issue with the creami batch tab in prep. its showing 16 flavors.”
 * Batch 5 had a second set of 8 cups APPENDED to it instead of becoming its own batch. Three things
 * were already visible in the data and nothing was looking at any of them:
 *   ① the footer's shopping amounts were hard-coded 8-cup quantities on a 16-cup card;
 *   ② Batch 5's shop list says “no Nilla wafers and no Vanilla Ice Cream powder this round — that is
 *     the point”, while four of the appended cups are built on exactly those two. He prepped six of
 *     them on Aug 23; three needed 30 g of crushed Nilla wafers each. Shopping that card leaves him
 *     without the topping for half the batch.
 *   ③ two different cups were both named 'Snickerdoodle', and flavour ratings are keyed by the
 *     readable name, so a 👍 on one landed on the other.
 * Clause (d) covers the dead-control class that let it persist: advancing the batch pointer had been
 * wired to a branch guarded by `const done = false`, so it was unreachable code.
 */
{
  const r = run(`
    const bad = [];
    const TOKENS = ['nilla','oreo','biscoff','graham','cinnamon toast crunch','fruity pebbles',
                    'coconut','sliced almond','fiber one','blueberr','strawberr','pineapple','whip'];
    let checks = 0;
    CREAMI_BATCHES.forEach(b => {
      const shopText = (b.shop||[]).map(r2 => r2.join(' ')).join(' | ').toLowerCase();
      /* ⛔ A STANDING STAPLE COUNTS AS AVAILABLE. The first version of this clause did not know about
         STAPLES and flagged Nilla wafers and Biscoff on a batch that legitimately omits them — he
         always has both. A guard that has to be argued with on real data gets switched off. */
      const stapleText = (typeof STAPLES !== 'undefined' ? STAPLES : []).join(' | ').toLowerCase();
      const have = t => shopText.indexOf(t) >= 0 || stapleText.indexOf(t) >= 0;
      /* ...and a batch whose list says it is already made is a RECORD of a batch, not a list to shop.
         Batch 4 was made Jul 23 and its 'shop' array is two lines of history. */
      const alreadyMade = shopText.indexOf('already made') >= 0;

      /* (a) every topping a cup names has to be on the batch's own shopping list */
      (b.cups||[]).forEach(c => {
        if(alreadyMade) return;
        const top = String(c[4]||'').toLowerCase();
        TOKENS.forEach(t => {
          if(top.indexOf(t) >= 0){
            checks++;
            if(!have(t))
              bad.push(b.name + ' / ' + c[0] + ' needs ' + t + ' — not on its shop list and not a staple');
          }
        });
      });

      /* (b) ...and the NEGATIVE claims, which is the shape that actually shipped. A row saying a thing
             is not needed this round is a promise about every cup in the batch. */
      (b.shop||[]).forEach(r2 => {
        const row = r2.join(' ').toLowerCase();
        if(row.indexOf('not needed') < 0 && row.indexOf('no ') < 0) return;
        TOKENS.forEach(t => {
          if(row.indexOf('no ' + t) < 0 && !(row.indexOf('not needed') >= 0 && row.indexOf(t) >= 0)) return;
          checks++;
          (b.cups||[]).forEach(c => {
            if(String(c[4]||'').toLowerCase().indexOf(t) >= 0)
              bad.push(b.name + ' says ' + t + ' is not needed, but ' + c[0] + ' is topped with it');
          });
        });
      });

      /* (c) two cups in one batch must not share a name — ratings are keyed by the readable name */
      const seen = {};
      (b.cups||[]).forEach(c => {
        const k = String(c[0]).split('\u00b7').pop().trim().toLowerCase();
        if(seen[k]) bad.push(b.name + ' has two cups both called ' + k + ' — a rating on one hits the other');
        seen[k] = 1;
      });

      /* (d) and nothing in a batch may be empty or missing its topping spec */
      if(!(b.cups||[]).length) bad.push(b.name + ' has no cups');
      (b.cups||[]).forEach(c => { if(!String(c[4]||'').trim()) bad.push(b.name + ' / ' + c[0] + ' has no topping'); });
    });
    if(!checks) bad.push('no shop-list claim could be checked — this guard is running vacuous');
    return {bad, checks, batches: CREAMI_BATCHES.length,
            sizes: CREAMI_BATCHES.map(b => b.cups.length).join('/')};
  `);
  const src = require('fs').readFileSync(SRC, 'utf8');
  const bad2 = r.bad.slice();
  /* (e) the dead-control class, checked on the SOURCE. `const done = false` made the whole next-batch
         branch unreachable, so a batch he made EARLY could never be recorded. A constant-false guard
         on a branch is the tell, and it reads exactly like working code. */
  if (/const\s+done\s*=\s*(false|0)\s*;/.test(src))
    bad2.push('the creami next-batch branch is guarded by a constant again — that is dead code');
  if (src.indexOf('id="cbNext"') < 0)
    bad2.push('no cbNext control in the markup — the batch pointer cannot be advanced by hand');
  if (bad2.length) fail('creami-shop', bad2.length + ' fault(s): ' + bad2.join(' | '));
  else ok('creami-shop', r.batches + ' batches (' + r.sizes + ' cups), ' + r.checks +
    ' shop-list claims checked against the cups that rely on them; no duplicate cup names, ' +
    'next-batch control reachable');
}
console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nall app checks passed');
process.exit(failed ? 1 : 0);
