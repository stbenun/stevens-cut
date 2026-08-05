#!/usr/bin/env node
/* ============================================================================
   check-food.js  —  run:  node tools/check-food.js
   ============================================================================
   Guards the food numbers in index.html.

   WHY THIS EXISTS (Aug 5 2026)
   In one evening, every number that lived only inside a sentence turned out
   wrong: "10 pieces sashimi or rolls" (220/47P vs 316/18P), "12 pieces tuna or
   salmon" (264 vs 504 cal), "carved beef 6 oz" (243 cal for eye of round, 420
   for brisket), an eat-out swap line claiming salmon sashimi is "+5 cal" when
   it is +20, and an arak figure that drifted 123 -> 98 -> 85 cal a shot across
   three messages. In the same week all 43 recipe totals were correct, because
   THOSE have an arithmetic guard and prose does not.

   Every check below is one of those failures, turned into something mechanical.

   THIS FILE LIVES IN THE REPO ON PURPOSE. Test harnesses kept in a session
   scratchpad get lost with the session; this one is committed and survives.
   ============================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const FILE = process.argv[2] || path.join(__dirname, '..', 'index.html');  /* arg lets the selftest point at a mutated copy */
const src = fs.readFileSync(FILE, 'utf8');

let fails = 0;
const fail = (check, msg) => { fails++; console.log('  FAIL  [' + check + '] ' + msg); };
const pass = (check, msg) => console.log('  ok    [' + check + '] ' + msg);

/* ---- pull a top-level `const NAME = {...}` / `[...]` out of the file ----
   const declared inside eval() is scoped to the eval, so rewrite to a global
   assignment. (Learned the hard way trying to set logDate from outside.) */
function grab(name) {
  const decl = 'const ' + name + ' = ';
  const i = src.indexOf(decl);
  if (i < 0) return null;
  const open = src[i + decl.length];
  const close = open === '{' ? '\n};' : '\n];';
  const j = src.indexOf(close, i);
  if (j < 0) return null;
  const code = src.slice(i, j + close.length).replace(decl, 'globalThis.' + name + ' = ');
  try { eval(code); return globalThis[name]; }
  catch (e) { fail('extract', name + ' would not evaluate: ' + e.message); return null; }
}

const FOOD_FACTS      = grab('FOOD_FACTS');
const FOOD_CONFUSABLE = grab('FOOD_CONFUSABLE');
const EATOUT_ORDER    = grab('EATOUT_ORDER');
const EATOUT          = grab('EATOUT');
const EVENTS          = grab('EVENTS');
const SLOTS           = grab('SLOTS');
const HOWTO           = grab('HOWTO');
const RECIPES         = grab('RECIPES');
const SHABBAT_FEAST   = grab('SHABBAT_FEAST');

if (!FOOD_FACTS || !SLOTS) { console.log('\ncould not read the food data at all'); process.exit(1); }

/* ============ 1. recipe totals == sum of their ingredients ============
   The check that has never let a bad number through. Kept here so it is
   durable rather than living in a scratchpad harness. */
(function recipeTotals() {
  let n = 0, bad = 0;
  SLOTS.forEach(sl => sl.opts.forEach(o => o.vars.forEach(v => {
    n++;
    const want = [0, 1, 2, 3].map(k => Math.round(v.ing.reduce((t, i) => t + (i[2] ? i[2][k] : 0), 0)));
    if (want.join(',') !== v.t.join(',')) {
      bad++;
      fail('recipe-totals', o.id + ' ' + o.name + ' stored ' + v.t.join('/') + ' but ingredients sum to ' + want.join('/'));
    }
  })));
  if (!bad) pass('recipe-totals', n + ' option variants equal their ingredient sums');
})();

/* ============ 2. FOOD_FACTS is complete and sane ============ */
(function factsSane() {
  let bad = 0;
  for (const [k, v] of Object.entries(FOOD_FACTS)) {
    for (const key of ['unit', 'cal', 'p', 'c', 'f', 'src']) {
      if (v[key] === undefined || v[key] === null) { bad++; fail('food-facts', k + ' is missing "' + key + '"'); }
    }
    ['cal', 'p', 'c', 'f'].forEach(key => {
      if (typeof v[key] === 'number' && (!isFinite(v[key]) || v[key] < 0)) {
        bad++; fail('food-facts', k + '.' + key + ' is not a sane number: ' + v[key]);
      }
    });
    if (typeof v.src === 'string' && v.src.length < 12) {
      bad++; fail('food-facts', k + ' has no real provenance in "src" — where did the number come from?');
    }
  }
  if (!bad) pass('food-facts', Object.keys(FOOD_FACTS).length + ' entries complete, with provenance');
})();

/* ---- every string a human actually reads ---- */
function userStrings() {
  const out = [];
  /* Split long copy into sentence/line chunks BEFORE checking. A card is one giant string, so
     testing it whole meant a "+180 cal" in the carving-station line excused a conflation over in
     the sushi line. The selftest caught exactly that hole. */
  /* Split on <br> FIRST, then strip the remaining tags — checking the text a human reads, not the
     markup. The closing slash in "</b>" was being read as an "or" and produced a false positive. */
  const chunks = str => str
    .split(/<br\s*\/?>|\n|(?<=[.!?])\s+|\s+·\s+/)
    .map(x => x.replace(/<[^>]*>/g, '').trim())
    .filter(x => x.length > 3);
  const add = (where, val) => {
    if (typeof val === 'string') {
      const cs = chunks(val);
      cs.forEach((c, n) => out.push({ where: where + (cs.length > 1 ? '#' + n : ''), s: c }));
    }
    else if (Array.isArray(val)) val.forEach((x, i) => add(where + '[' + i + ']', x));
    else if (val && typeof val === 'object') Object.entries(val).forEach(([k, x]) => add(where + '.' + k, x));
  };
  if (EATOUT_ORDER) add('EATOUT_ORDER', EATOUT_ORDER);
  if (EATOUT) add('EATOUT', EATOUT);
  if (EVENTS) add('EVENTS', EVENTS);
  if (HOWTO) add('HOWTO', HOWTO);
  SLOTS.forEach(sl => sl.opts.forEach(o => o.vars.forEach(v =>
    v.ing.forEach((i, k) => add('SLOTS.' + o.id + '.ing[' + k + ']', i[0])))));
  return out;
}
const STRINGS = userStrings();
const DELTA = /[+−-]\s?\d+(\.\d+)?\s?(cal|kcal|g|P\b)|\bvs\b|instead of|not a (free )?swap|different|apart|\bcount it\b|leaner than|lighter than/i;
/* The error is offering two foods as ALTERNATIVES. Two foods merely appearing in the same
   sentence is fine and normal — "eat the sashimi before any rolls" and "1 roll + bump sashimi to
   10–12" are both correct copy, and an earlier version of this check flagged them. What is never
   fine is "sashimi OR rolls" / "salmon/tuna" with no numbers. So require an alternation marker. */
const ALT = /\bor\b|\/|\beither\b/i;

/* ============ 3. no string offers two different foods as one option ============
   The Aug 5 error class, four times over. */
(function conflation() {
  if (!FOOD_CONFUSABLE) { fail('conflation', 'FOOD_CONFUSABLE is missing'); return; }
  let bad = 0;
  const has = (s, list) => list.every(w => s.toLowerCase().includes(w.toLowerCase()));
  FOOD_CONFUSABLE.forEach(pair => {
    const da = Math.abs(FOOD_FACTS[pair.a].cal - FOOD_FACTS[pair.b].cal);
    const dp = Math.abs(FOOD_FACTS[pair.a].p - FOOD_FACTS[pair.b].p);
    STRINGS.forEach(({ where, s }) => {
      if (has(s, pair.needA) && has(s, pair.needB) && ALT.test(s) && !DELTA.test(s)) {
        bad++;
        fail('conflation', where + ' names BOTH "' + pair.a + '" and "' + pair.b + '" (' +
          da.toFixed(0) + ' cal / ' + dp.toFixed(1) + ' P apart per ' + FOOD_FACTS[pair.a].unit +
          ') without stating the difference:\n          "' + s.replace(/<[^>]+>/g, '').slice(0, 130) + '"');
      }
    });
  });
  if (!bad) pass('conflation', FOOD_CONFUSABLE.length + ' confusable pairs, no string presents either pair as interchangeable');
})();

/* ============ 4. a claimed "+N cal" swap must match the real difference ============
   This is the check that would have caught "salmon is +5 cal" months ago. */
(function swapMath() {
  if (!EATOUT_ORDER) return;
  let checked = 0, bad = 0;
  const names = Object.keys(FOOD_FACTS);
  Object.entries(EATOUT_ORDER).forEach(([venue, v]) => (v.swaps || []).forEach(line => {
    const hit = names.filter(n => {
      const words = n.split(' ');
      return words.every(w => new RegExp('\\b' + w.replace(/[%]/g, '') + '\\b', 'i').test(line));
    });
    if (hit.length !== 2) return;
    const m = line.match(/\+\s?(\d+(?:\.\d+)?)\s?cal/i);
    if (!m) {
      bad++; fail('swap-math', venue + ' swap names ' + hit.join(' and ') + ' but states no calorie delta:\n          "' + line.replace(/<[^>]+>/g, '').slice(0, 110) + '"');
      return;
    }
    checked++;
    const real = Math.abs(FOOD_FACTS[hit[0]].cal - FOOD_FACTS[hit[1]].cal);
    const claimed = parseFloat(m[1]);
    if (Math.abs(real - claimed) > 3) {
      bad++;
      fail('swap-math', venue + ' swap claims +' + claimed + ' cal for ' + hit[0] + ' vs ' + hit[1] +
        ' — the real difference is +' + real.toFixed(0) + ' per ' + FOOD_FACTS[hit[0]].unit);
    }
  }));
  if (!bad) pass('swap-math', checked + ' swap line(s) with a stated delta, all matching FOOD_FACTS');
})();

/* ============ 5. EATOUT_ORDER anchors must agree with FOOD_FACTS ============
   Two copies of the same number is how they drift apart. */
(function anchors() {
  if (!EATOUT_ORDER || !EATOUT_ORDER.sushi) return;
  const checks = [
    ['sushi anchor (sashimi)', EATOUT_ORDER.sushi.anchor, 'tuna sashimi'],
    ['sushi carb (roll)', EATOUT_ORDER.sushi.carb, 'tuna roll'],
  ];
  let bad = 0;
  checks.forEach(([label, item, key]) => {
    if (!item || !FOOD_FACTS[key]) return;
    ['cal', 'p'].forEach(k => {
      if (Math.abs(item[k] - FOOD_FACTS[key][k]) > 0.5) {
        bad++; fail('anchors', label + '.' + k + ' = ' + item[k] + ' but FOOD_FACTS["' + key + '"].' + k + ' = ' + FOOD_FACTS[key][k]);
      }
    });
  });
  if (!bad) pass('anchors', 'EATOUT_ORDER sushi anchors match FOOD_FACTS');
})();

/* ============ 6. no non-almond nut anywhere in the food data ============
   He is anaphylactic to peanut, hazelnut, pistachio and cashew. Almond is the
   only one he can have. Warning copy may name them; ingredients and steps may not. */
(function nuts() {
  const BAD = /peanut|hazelnut|pistachio|cashew|walnut|pecan|macadamia|brazil nut|pine nut/i;
  let bad = 0;
  const scan = (where, txt) => { if (typeof txt === 'string' && BAD.test(txt)) { bad++; fail('nuts', where + ' :: ' + txt.slice(0, 90)); } };
  SLOTS.forEach(sl => sl.opts.forEach(o => o.vars.forEach(v => v.ing.forEach(i => scan('SLOT ' + o.id, i[0])))));
  if (RECIPES) RECIPES.forEach(w => w.recipes.forEach(r => { r.ing.forEach(i => scan('RECIPE ' + r.n, i[0])); (r.st || []).forEach(x => scan('STEP ' + r.n, x)); }));
  if (SHABBAT_FEAST) SHABBAT_FEAST.forEach(d => { d.ing.forEach(i => scan('FEAST ' + d.n, i[0])); (d.st || []).forEach(x => scan('FEAST STEP ' + d.n, x)); });
  if (HOWTO) Object.entries(HOWTO).forEach(([id, steps]) => (steps || []).forEach(x => scan('HOWTO ' + id, x)));
  if (!bad) pass('nuts', 'no non-almond nut appears as an ingredient or a cooking step');
})();

/* ============ 7. EVENTS time placeholders must be resolvable ============
   Dated cards use {{LU}} / {{LU+165}} so their meal times track the schedule instead of a time I
   typed. A typo would ship to his phone as literal "{{LUNCH}}" text, so check the syntax here. */
(function placeholders() {
  if (!EVENTS) return;
  const OK = /^\{\{(PRE|BF|LU|SN|DI)([+-]\d+)?\}\}$/;
  let found = 0, bad = 0;
  EVENTS.forEach(e => {
    (String(e.msg).match(/\{\{[^}]*\}\}/g) || []).forEach(ph => {
      found++;
      if (!OK.test(ph)) { bad++; fail('placeholders', e.d + ' has an unresolvable placeholder ' + ph + ' — it would render as literal text'); }
    });
  });
  if (!bad) pass('placeholders', found + ' time placeholder(s) across EVENTS, all resolvable');
})();

console.log('');
if (fails) { console.log(fails + ' CHECK(S) FAILED'); process.exit(1); }
console.log('all food checks passed');
