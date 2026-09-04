#!/usr/bin/env node
/* check-app.plant.js — plants real defects for the BEHAVIOURAL guards in check-app.js, the way
 * check-food.selftest.js does for the food guards.
 *
 * ⛔ IT NO LONGER TOUCHES index.html. Each defect is planted into a COPY in os.tmpdir() and
 * check-app.js is pointed at it with --file. That is the pattern the two sibling harnesses already
 * used — check-priced.plant.js works in os.tmpdir(), check-food.selftest.js passes a temp copy to
 * check-food.js via argv[2] — and this file was the only one that wrote the working tree.
 *
 * WHY IT CHANGED. On 2026-08-20 this harness exited with no output at all and left its "time-seeds
 * itself open" plant baked into index.html. ~70 probe renders then passed against the corrupted file
 * and it nearly went out in a commit. The first fix added a sidecar backup, a startup recovery path
 * and a restore-after-every-plant. All of that has been DELETED: with nothing mutating the live file
 * it defended against nothing, and a guard that cannot fire still reads as "all checks passed" —
 * which is this repo's own recorded lesson about fixtures that quietly stopped testing anything.
 *
 * WHAT MADE IT POSSIBLE. probe.js already resolved --file; it now also EXPORTS the resolved path, and
 * check-app.js reads that instead of resolving index.html a second time by hand. Proved by
 * differential test, not by the suite going green: same input through both code paths gives
 * byte-identical output, and a defect planted in a temp copy fires through BOTH mechanisms — the
 * booted app (probe.js, [buffins]) and the direct fs reads (the three SRC sites, [time-picker]).
 * Those are separate mechanisms and either could have been left pointing at the real file.
 * ⚠️ The first attempt at that proof used a plant that could not fail — it flipped a type="time" to
 * "text", which changed only the COUNT the guard prints and never its verdict, and so read as
 * "the direct reads are still hardcoded" when the plumbing was fine.
 *
 * The ONE guard kept from the first fix: refuse to run on a dirty index.html. Nothing here writes it,
 * so a dirty file means something else did — it is a canary for the next tool that decides to mutate
 * in place, and it is one git call.
 *
 * ⛔ EMPTY OUTPUT IS A CRASH, NOT A PASS. The last line always prints.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');
const P = 'index.html';

const numstat = () => {
  try { return execSync('git diff --numstat -- ' + P, { encoding: 'utf8' }).trim(); }
  catch (e) { return 'git-error'; }
};

const PLANTS = [
  /* ---- [log-shape]: qpcut.eaten reads a bare option id AND an array of row-carrying entries ----
     Both shapes are live on his device at once and will be for months. Every defect below leaves the
     app rendering perfectly; the first one is the reason this whole harness entry exists, because a
     row-editing feature that silently ignores the edit looks exactly like one that works. */
  { guard: 'log-shape', name: 'entryMacros ignores the entry rows and falls back to the meal id',
    edits: [{ from: "  if(e.rows && e.rows.length){\n    const t = [0,0,0,0];",
              to:   "  if(false){\n    const t = [0,0,0,0];" }] },
  { guard: 'log-shape', name: 'logEntries stops normalising the legacy string shape, erasing his history',
    edits: [{ from: "    out[slot] = [{id:String(v), legacy:1}];",
              to:   "    out[slot] = [];" }] },
  { guard: 'log-shape', name: 'a null slot starts reading as eaten',
    edits: [{ from: "    if(!v) return;                                  /* null = not eaten, same as absent */",
              to:   "    if(v===undefined) return;" }] },
  /* ⛔ THIS CASE WAS WRITTEN WRONG FIRST AND REPORTED "NOT CAUGHT", which is the harness doing its
     job on the harness. The original plant added `|| OPTBYID['b1']` as a fallback for a lookup I had
     assumed misses — but OPTBYID['final'] is a REGISTERED synthetic option with t:[0,0,0,0], so the
     fallback was dead code and the plant changed nothing observable. A plant that cannot fail reads
     exactly like a guard that works. The real defect is the one the sentinel note above SLOTS warns
     about: give it real macros and eatenMacros() counts the meal twice, once as a slot and once as
     the off-plan row finalMeal() writes. */
  { guard: 'log-shape', name: "the 'final' sentinel stops being zero, so the day double-counts the meal",
    edits: [{ from: "                    vars:[{ing:[], t:[0,0,0,0]}], slotKey:null, slotName:'Final meal'};",
              to:   "                    vars:[{ing:[], t:[500,40,50,15]}], slotKey:null, slotName:'Final meal'};" }] },

  /* Both of these are bugs I actually shipped into the working tree while building the row editor,
     planted back verbatim. Neither threw; both rendered perfectly. */
  { guard: 'log-shape', name: 'editEntryRows goes back to Object.assign, destroying legacy array rows',
    edits: [{ from: "  return entryRows(entry).map(sp=>Array.isArray(sp) ? sp.slice() : Object.assign({}, sp));",
              to:   "  return entryRows(entry).map(sp=>Object.assign({}, sp));" }] },
  /* ⚠️ The obvious plant here — putting back .filter(Boolean) — CANNOT FAIL: 0 of 284 rows lack a
     spec, so it removes nothing and the lengths still match. Filtering the {free:1} rows is the same
     class of mistake ("don't show seasonings") and actually shifts the indices. */
  { guard: 'log-shape', name: 'entryRows filters free rows out, so every edit index shifts',
    edits: [{ from: "  return o ? o.vars[0].ing.map(r=>r[2]) : [];",
              to:   "  return o ? o.vars[0].ing.map(r=>r[2]).filter(sp=>sp && !sp.free) : [];" }] },

  { guard: 'log-shape', name: 'a recipe row becomes removable, so deleting one silently changes the meal',
    edits: [{ from: "  if(i < base || i >= rows.length) return null;",
              to:   "  if(i >= rows.length) return null;" }] },
  { guard: 'log-shape', name: 'added rows go to the FRONT, shifting every recipe index under an edit',
    edits: [{ from: "  rows.push({f:key, n:n});", to: "  rows.unshift({f:key, n:n});" }] },
  { guard: 'log-shape', name: 'addEntryRow stops checking the food is on the price list',
    edits: [{ from: "  if(!FOOD_FACTS[key] || typeof n !== ", to: "  if(false || typeof n !== " }] },

  /* ---- [log-access]: qpcut.eaten has exactly one reader and one writer ----
     The plant is the innocent line someone will actually write. It reads the legacy shape perfectly
     and drops every row-carrying entry, which is why nothing else notices. */
  { guard: 'log-access', name: 'a second reader of qpcut.eaten appears outside the sentinels',
    edits: [{ from: "function eatenMacros(ld){",
              to:   "function eatenMacros(ld){ const sneaky = store.get('qpcut.eaten',{});" }] },
  { guard: 'log-access', name: 'the sentinels are removed, so the guard has nothing to measure',
    edits: [{ from: "/* ==== LOG-ACCESS-BEGIN", to: "/* ==== LOG-ACCESS-DISABLED" }] },

  /* ---- [offplan-topping]: off-track calories come out of that day's Creami topping ---- */
  { guard: 'offplan-topping', name: 'the 5 g trim step returns, so a 60-cal debt over-cuts the dessert',
    edits: [
      { from: "    const s = step(c), per = c.f.cal * s;",
        to:   "    const s = (FOOD_FACTS[c.k].unit === 'each' ? 1 : 5), per = c.f.cal * s;" },
      { from: "    while((left - per) >= 0 && (c.q - take - s) >= 0){ take += s; left -= per; }",
        to:   "    while(left > 0 && (c.q - take - s) >= 0){ take += s; left -= per; }" }
    ] },
  { guard: 'offplan-topping', name: 'the noise floor drops to zero, so a celery stick gets billed',
    edits: [{ from: "const OFFPLAN_NOISE = 40;", to: "const OFFPLAN_NOISE = 0;" }] },
  { guard: 'offplan-topping', name: 'the note goes silent while the charge still happens',
    edits: [{ from: "function offplanNote(ld, cup){", to: "function offplanNote(ld, cup){ if(1) return '';" }] },
  { guard: 'offplan-topping', name: 'a per-day charge mutates the cup, so the topping spec stops being checkable',
    edits: [{ from: "function creamiTrim(cup, charge){",
              to:   "function creamiTrim(cup, charge){ if(cup && cup[5] && cup[5][0]) cup[5][0][1] = 1;" }] },

  /* ---- [buffins]: the stock card, which must stay DERIVED and never become a second price list ---- */
  { guard: 'buffins', name: 'the card becomes a second copy of the macros instead of reading FOOD_FACTS',
    edits: [{ from: "    return {key:k, name:nm, cal:f.cal, p:f.p, c:f.c, f:f.f, nut:!!f.nut};",
              to:   "    return {key:k, name:nm, cal:400, p:f.p, c:f.c, f:f.f, nut:!!f.nut};" }] },
  /* ⛔ Do NOT plant this by DELETING the sort. The facts happen to be written into FOOD_FACTS in
     ascending-calorie order today, so removing the sort changes nothing and the case passes
     vacuously — it did exactly that on first run. REVERSE it instead, which cannot be a no-op
     whatever order the facts are written in. */
  { guard: 'buffins', name: 'the cheapest-first ordering is reversed',
    edits: [{ from: "  }).sort(function(a,b){ return a.cal - b.cal; });",
              to:   "  }).sort(function(a,b){ return b.cal - a.cal; });" }] },
  { guard: 'buffins', name: 'the badge counts what exists instead of what is left',
    edits: [{ from: "       + \"<span class='statline'><b>\" + bs.left.length + \"</b> left</span></summary>\"",
              to:   "       + \"<span class='statline'><b>\" + bs.all.length + \"</b> left</span></summary>\"" }] },
  { guard: 'buffins', name: 'eating one deletes it from the list instead of greying it',
    edits: [{ from: "  var rows = bs.all.map(function(b){", to: "  var rows = bs.left.map(function(b){" }] },
  { guard: 'buffins', name: 'the card time-seeds itself open',
    edits: [{ from: "(openAcc.has(\"buffins\") ? \" open\" : \"\")", to: "\" open\"" }] },
  { guard: 'buffins', name: 'the nut-flagged flavor loses its mark',
    edits: [{ from: "         + (b.nut ? \" <span class='chip notetag'>nuts</span>\" : \"\")", to: "         + \"\"" }] }
,

  /* ---- [cor-crunch]: the three real defects of 2026-08-24, planted verbatim ---- */
  /* ⛔ Defect ①. This is the exact literal that was sitting in corBuild — a copy of b1 taken before
     its rows were re-priced. It is worth planting the REAL stale value rather than an obviously silly
     one: it is only 1 P and 2 C off and the calorie total still lands on 545, so it is a plant a weak
     guard passes. If clause (b) ever stops comparing against the engine, this case is what notices. */
  { guard: 'cor-crunch', name: "corBuild goes back to its own stale copy of b1's base",
    edits: [{ from: "  for(const r of (b1v.ing||[])){ if(r===abRow) continue; const m=priceRow(r); if(m) baseNoAB=baseNoAB.map((x,i)=>x+m[i]); }",
              to:   "  baseNoAB=[355,32,47,5];" }] },

  /* Defect ②, the one he actually named: the stated amount stops mattering. Pinning n to 3 leaves
     every topping PRICEABLE, so clauses (a) and (c) stay silent and only (f) can catch it. That is
     deliberate — (f) is his rule and it needs a case that isolates it from the others.
     ⚠️ n:3 u:'g', NOT u:'each'. The first version of this plant used a COUNT, and a per-gram fact
     with no ea: cannot price a count — so it tripped (c) 'could not be priced' and never exercised
     (f) at all. It looked caught. Grams resolve against every one of these facts, so every amount
     prices and (f) is the only clause left that can object. */
  { guard: 'cor-crunch', name: 'the topping ignores the spec and charges one flat amount again',
    edits: [{ from: "    if(crunchFF && isFinite(qn) && qn>0) cm = priceRow([null,null,{f:crunchFF, n:qn, u:/g\\s*$/i.test(crunchQty)?'g':'each'}]);",
              to:   "    if(crunchFF && isFinite(qn) && qn>0) cm = priceRow([null,null,{f:crunchFF, n:3, u:'g'}]);" }] },

  /* Defect ③, byte-for-byte the key that shipped: 'Fruity Pebbles on top' cannot match the spec
     “12 g Fruity Pebbles”, so the pebbles fall through to the fruit branch and his 70 g of
     strawberries vanish off the card. Caught by (d) on the output and (e) on the input. */
  { guard: 'cor-crunch', name: 'the pebbles key gets long again and the topping lands in the fruit slot',
    edits: [{ from: "['Fruity Pebbles','fruity pebbles']",
              to:   "['Fruity Pebbles on top','fruity pebbles']" }] },

  /* ---- [creami-shop]: the Batch 5 defects of 2026-08-24, one plant per clause ---- */
  /* (b) the contradiction that actually shipped, in the cleanest form: a batch declares a topping
     unnecessary while its own cups are built on it. Batch 5 really did say “no Nilla wafers ... that is
     the point” with four Nilla-topped cups appended to it, and he prepped three of them. Planted on
     Batch 6 instead of Batch 5 so it touches ONE shop row and disturbs no cup's component list — a
     plant that also trips [creami-topping] would not tell us which guard was load-bearing. */
  { guard: 'creami-shop', name: 'a batch calls a topping unnecessary while its own cups are built on it',
    edits: [{ from: "['⚠️ NEEDS Nilla wafers + Vanilla Ice Cream powder','the exact opposite of Batch 5 — which is why these were split apart'],",
              to:   "['❌ NOT needed','no Nilla wafers this round']," }] },

  /* (a) a topping on no shop list and not a staple. Batch 1's coconut chips were missing for months
     and Batch 1 is the batch AFTER Batch 6, so it was next in line to bite. */
  { guard: 'creami-shop', name: 'a non-staple topping goes missing from the shop list again',
    edits: [{ from: "['Toasted coconut chips','8 g (cup 5) — NOT a staple, and the list omitted it until 2026-08-24'],",
              to:   "" }] },

  /* (c) two cups in one batch sharing a readable name. Flavour ratings key off that name, so his 👍
     on one was landing on the other — and the ratings are what decides which cups get kept. */
  { guard: 'creami-shop', name: 'two cups in one batch share a name again, so ratings collide',
    edits: [{ from: "['Snickerdoodle Crunch','Cinnamon Toast'",
              to:   "['Snickerdoodle','Cinnamon Toast'" }] },

  /* (e) the dead-control class. `const done = false` is what made the next-batch branch unreachable,
     so the pointer could only ever advance by finishing every cup — and he prepped a new batch with
     three cups of the old one still notionally left. Reads exactly like working code. */
  /* ---- [eat-time]: the AM/PM case, and the false positive that nearly shipped with the fix ---- */
  /* The impossible time is accepted again, so the engine reasons from it and prints a confident
     next-meal time. This is exactly what produced “Next: eat around 5:45 PM” off a breakfast
     logged at 11:45 PM. */
  { guard: 'eat-time', name: 'a meal stamped in the future is accepted again',
    edits: [{ from: "  if(ld === isoToday() && mine > nowMin())",
              to:   "  if(false && ld === isoToday() && mine > nowMin())" }] },

  /* ⛔ THE MORE IMPORTANT ONE. The order check goes back to the fixed SLOT_SEQ, which lists the snack
     BEFORE dinner. His Creami lands after dinner on most days, so this would flag his normal routine
     every single night — a guard he would have to argue with, which is a guard that gets switched off.
     dayMealOrder() is the app's own answer for the day and it puts dinner first. */
  { guard: 'eat-time', name: 'the order check goes back to the fixed slot list, flagging his nightly Creami',
    edits: [{ from: "  const order = (typeof dayMealOrder === 'function' && dayMealOrder().length) ? dayMealOrder() : SLOT_SEQ;",
              to:   "  const order = SLOT_SEQ;" }] },

  /* And the card prints a next-meal time beside the warning instead of withholding it. */
  { guard: 'eat-time', name: 'the card computes a next-meal time from a time it just called impossible',
    edits: [{ from: "        const sug = conflict ? null : nextEatSuggestion(ld);",
              to:   "        const sug = nextEatSuggestion(ld);" }] },

  /* ---- [progression-rule]: one plant per rule his coach gave on 2026-08-25 ---- */
  /* The feeler stops being a feeler — this is the OLD behaviour, and against his own log it held him
     at the same weight 12 times where Q would have moved him up. Signature was 12/12/11. */
  { guard: 'progression-rule', name: 'set 1 counts again on a straight range, so the feeler can block a jump',
    edits: [{ from: '  const judged = t.sets > 1 ? rs.slice(1) : rs;',
              to:   '  const judged = rs;' }] },

  /* Back to needing EVERY set at the top. Q: "increase ANY time you're hitting 12". */
  { guard: 'progression-rule', name: 'the jump waits for every set again instead of any working set',
    edits: [{ from: '  if(judged.some(v=>v>=top)) return ' + String.fromCharCode(39) + 'up' + String.fromCharCode(39) + ';',
              to:   '  if(judged.every(v=>v>=top)) return ' + String.fromCharCode(39) + 'up' + String.fromCharCode(39) + ';' }] },

  /* 3 x 12 collapses back to a 12-12 range, so doing the prescription exactly reads as GO UP — which
     is what fired 4 times on his shrugs and abductors before Q answered. */
  { guard: 'progression-rule', name: 'a 3 x 12 goes back to jumping at 12 instead of 15',
    edits: [{ from: 'hi:nums[0], upAt:15,', to: 'hi:nums[0],' }] },

  /* (f3) a topping stated as a count again. His find, 2026-08-25: one spec said Biscoff 8 g and
     another said 1 Biscoff crushed. The MACROS were fine either way — both resolve through the same
     fact — so no pricing check could ever have caught it. It is a defect in what he reads, and this
     is the only clause that looks at it. */
  { guard: 'cor-crunch', name: 'a COR topping goes back to a cookie count instead of a weight',
    edits: [{ from: 'Coconut Cream Pie COR + Vanilla Ice Cream Ryse + banana extract — berries + 12 g Nilla',
              to:   'Coconut Cream Pie COR + Vanilla Ice Cream Ryse + banana extract — berries + 3 Nilla wafers' }] },

  /* (f) a second cup list creeps back onto the card. This is the exact shape of my own first fix:
     the next batch's recipes rendered on the same card, which put 16 cup recipes back in front of him
     — the thing he had reported. Planted as a plain render so it is not hidden behind an accordion;
     the clause counts cups, and closed would not have saved it either. */
  { guard: 'creami-shop', name: "the next batch's cups render on the current batch's card again",
    edits: [{ from: "    <div class=\"formrow\"><button class=\"btn ghost\" id=\"cbNext\">Made ${nextBatch.name} — switch to it</button></div>",
              to:   "    ${cupHTML(nextBatch.cups)}<div class=\"formrow\"><button class=\"btn ghost\" id=\"cbNext\">Made ${nextBatch.name} — switch to it</button></div>" }] },

  { guard: 'creami-shop', name: 'the next-batch branch goes back behind a constant-false guard',
    edits: [{ from: "    const nextBatch = cs.next;",
              to:   "    const nextBatch = cs.next; const done = false;" }] }
];

function main() {
  /* Nothing below writes index.html. A dirty one therefore means another tool or another session
     did — refuse, and say which, rather than planting against content that is not committed. */
  if (numstat() !== '') {
    console.log('REFUSING TO RUN — index.html has uncommitted changes:');
    console.log('  git diff --numstat index.html -> ' + numstat());
    console.log('Nothing in this harness writes that file, so something else is holding it. Whoever has');
    console.log('it dirty owns it until it is committed. Commit or stash, then re-run.');
    process.exitCode = 2;
    return;
  }

  const before = fs.readFileSync(P);
  const orig = before.toString('utf8');
  const env = Object.assign({}, process.env, { NODE_PATH: '.work/node_modules' });
  let all = true;

  PLANTS.forEach(function (p, i) {
    let s = orig, ok = true;
    for (const e of p.edits) {
      if (s.split(e.from).length - 1 !== 1) {
        console.log('BROKEN CASE  [' + p.guard + '] ' + p.name + ' — anchor not unique/found');
        ok = false; all = false; break;
      }
      s = s.replace(e.from, e.to);
    }
    if (!ok) return;
    if (s === orig) {
      console.log('BROKEN CASE  [' + p.guard + '] ' + p.name + ' — plant changed nothing');
      all = false; return;
    }
    /* the defect goes in a COPY; the working tree is never written */
    const tmp = path.join(os.tmpdir(), 'checkapp-plant-' + i + '.html');
    fs.writeFileSync(tmp, s);
    let out = '', code = 0;
    try {
      out = execSync('node tools/check-app.js --file "' + tmp + '"', { env: env, encoding: 'utf8' });
    } catch (e) { code = e.status || 1; out = (e.stdout || '') + (e.stderr || ''); }
    try { fs.unlinkSync(tmp); } catch (e) {}
    const rx = new RegExp('FAIL\\s+\\[' + p.guard + '\\]');
    if (code !== 0 && rx.test(out)) {
      const line = (out.split('\n').find(l => rx.test(l)) || '').trim();
      console.log('CAUGHT  [' + p.guard + '] ' + p.name);
      console.log('        ' + line.slice(0, 150));
    } else {
      console.log('NOT CAUGHT  [' + p.guard + '] ' + p.name + '  (exit=' + code + ')');
      all = false;
    }
  });

  /* Not restore machinery — an assertion. If a future edit reintroduces an in-place write, this is
     what says so, and it costs one file read. */
  const untouched = fs.readFileSync(P).equals(before);
  const ns = numstat();
  console.log('');
  console.log('index.html never written: ' + untouched + '   git diff --numstat: ' + (ns === '' ? '(empty — clean)' : ns));
  const good = all && untouched && ns === '';
  console.log(good ? 'ALL PLANTS CAUGHT — the app-behaviour guards are load-bearing'
                   : 'PLANT HARNESS FOUND A HOLE (or the working tree moved under it)');
  process.exitCode = good ? 0 : 1;
}

main();
