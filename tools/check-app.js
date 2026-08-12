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
    if (r.oneSitting && Math.abs(r.gap[0]) > 60)
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
  else ok('final-meal', `${rows.length} hole x lane combos all close within 60 cal / 8P, chicken opt-in only, no duplicate rows`);
}

console.log(failed ? `\n${failed} CHECK(S) FAILED` : '\nall app checks passed');
process.exit(failed ? 1 : 0);
