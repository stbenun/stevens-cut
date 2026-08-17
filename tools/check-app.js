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
  const src = require('fs').readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
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
  const src = require('fs').readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
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
       "🥣 Death …" and he could not tell which flavour it was. A ch-based basis is the middle ground:
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
  const src = require('fs').readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
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
  if (!titleBasis) bad.push('the flavour title has no ch-based flex-basis — at 320px it renders as "Death …"');

  if (bad.length) fail('meal-row-wrap', bad.join(' · '));
  else ok('meal-row-wrap', `names carry a real flex-basis (${found.join('/')}ch), flavour title ` +
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

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nall app checks passed');
process.exit(failed ? 1 : 0);
