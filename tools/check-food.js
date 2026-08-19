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
/* ONE FOOD, ONE KEY. The raw ingredient names carry decoration that made the same food count
   several times and inflated the denominator: "oats" appears both plain and with a heat emoji,
   almond butter both plain and with a snowflake, "Ezekiel bread, toasted" separately from
   "Ezekiel bread", FAGE under four spellings. Strip emoji and leading symbols, the trailing
   parenthetical, the em-dash aside, and a trailing preparation state — what is left is the food. */
const foodKey = raw => String(raw)
  .replace(/<[^>]*>/g, '')
  .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, '')
  .split('(')[0].split('\u2014')[0]
  .replace(/,\s*(?:toasted|raw|dry|cooked|crushed|chopped|sliced|for\s[^,]*)\s*$/i, '')
  .replace(/[,.]+$/, '')
  .trim().toLowerCase();

const fs = require('fs');
const path = require('path');

const FILE = process.argv[2] || path.join(__dirname, '..', 'index.html');  /* arg lets the selftest point at a mutated copy */
const src = fs.readFileSync(FILE, 'utf8');

let fails = 0;
const fail = (check, msg) => { fails++; console.log('  FAIL  [' + check + '] ' + msg); };
const pass = (check, msg) => console.log('  ok    [' + check + '] ' + msg);

/* ============ 0. line endings — FIRST, because CRLF makes later checks lie ============
   Aug 13 2026: I bumped `const BUILD` with a Python one-liner using io.open(p,'w'), and Python's TEXT
   mode on Windows rewrites every \n as \r\n. index.html went from LF to CRLF in a single commit.
   The app still rendered and all 210 probe renders passed, so nothing looked wrong — but half the
   checks in this file locate code with anchors like indexOf('\n\n'), and those silently stopped
   matching. [scoop-weights] reported "could not locate ppFind/ppTag in the source", which reads like
   a refactor broke it rather than a line-ending change.
   ⛔ When writing this file from Python use newline='' (or binary mode). Node's fs.writeFileSync is
   safe. CLAUDE.md warned about CRLF from core.autocrlf and nothing enforced it — now something does.
   The tools/*.js files are CRLF already and always have been; this guards index.html only. */
{
  const crlf = (fs.readFileSync(FILE, 'binary').match(/\r\n/g) || []).length;
  if (crlf) fail('line-endings', `${path.basename(FILE)} has ${crlf} CRLF line endings — anchor-based ` +
                 `checks below will fail or, worse, pass vacuously. Normalise to LF before trusting any result.`);
  else pass('line-endings', 'LF throughout — anchor matching is sound');
}

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
const COR_SETS        = grab('COR_SETS');        /* [cor-bowl-total] */
const COR_OVERRIDE    = grab('COR_OVERRIDE');    /* [cor-bowl-total] */

if (!FOOD_FACTS || !SLOTS) { console.log('\ncould not read the food data at all'); process.exit(1); }

/* ---- the pricing engine, lifted once from index.html and shared by every check below ----
   index.html holds the ONE implementation; this file evaluates that same text between the
   PRICING-ENGINE sentinels, so a guard can never drift from what his phone actually runs.
   Hoisted here (rather than living inside [priced]) because [recipe-totals],
   [macro-provenance] and [cor-bowl-total] all need to price a row too. */
{
  const B = src.indexOf('PRICING-ENGINE-BEGIN'), E = src.indexOf('PRICING-ENGINE-END');
  if (B < 0 || E < 0 || E < B) {
    console.log('\ncould not find the PRICING-ENGINE sentinels in index.html — every food check below');
    console.log('would run blind, so this is a hard stop rather than a FAIL line.');
    process.exit(1);
  }
  /* E lands INSIDE the end sentinel comment; slicing to it leaves a dangling comment opener and
     the eval dies with "Invalid or unexpected token". Cut at the comment OPENER on both sides. */
  const engine = src.slice(src.indexOf('*/', B) + 2, src.lastIndexOf('/*', E));
  /* Strict mode keeps eval declarations inside the eval, so the names are handed out by code that
     runs INSIDE it — no regex over the engine body, which is where shell escaping kept eating
     backslashes exactly as CLAUDE.md warns. */
  const EXPORTS = ['ffUnit', 'ffScale', 'priceRow', 'varTotal', 'FF_ALIAS', 'FF_BASE'];
  const handoff = EXPORTS.map(n => 'globalThis.' + n + ' = ' + n + ';').join('\n');
  try { eval(engine + '\n' + handoff); }
  catch (e) {
    console.log('\nthe pricing engine in index.html would not evaluate: ' + e.message);
    console.log('the app runs this same text, so this is a hard stop.');
    process.exit(1);
  }
}


/* ============ 1. recipe totals == sum of their ingredients ============
   The check that has never let a bad number through. Kept here so it is
   durable rather than living in a scratchpad harness. */
(function recipeTotals() {
  let n = 0, bad = 0;
  SLOTS.forEach(sl => sl.opts.forEach(o => o.vars.forEach(v => {
    n++;
    /* Was `i[2][k]`, which read the row's own copy of the macros. The moment a row started NAMING
       its source instead of carrying a copy, i[2] became an object and every total came out NaN —
       reported as 22 failures that looked like corrupted data rather than a guard reading the wrong
       shape. It now prices each row through the same engine the app uses. */
    const want = [0, 1, 2, 3].map(k => Math.round(v.ing.reduce(function (t, i) {
      const m = priceRow(i);
      return t + (m ? m[k] : 0);
    }, 0)));
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
  /* 'protein' is a MACRO WORD, not a dish. It earns its place in FOOD_FACTS because it is the only
     token shared by every protein-powder ingredient row, but scanning prose for it matches the
     English word — a BBQ swap line mentioning "protein" and brisket read as two foods offered
     interchangeably. The prose checks are about confusable FOODS, so skip it there. */
  const PROSE_SKIP = new Set(['protein']);
  const names = Object.keys(FOOD_FACTS).filter(n => !PROSE_SKIP.has(n));
  Object.entries(EATOUT_ORDER).forEach(([venue, v]) => (v.swaps || []).forEach(line => {
    const hit = names.filter(n => {
      const words = n.split(' ');
      return words.every(w => new RegExp('\\b' + w.replace(/[%]/g, '') + '\\b', 'i').test(line));
    });
    /* ⛔ DROP THE SUBSUMED GENERIC. Adding a plain 'salmon' fact (for his raw-weight dinner rows) meant
       the sushi swap line matched THREE names — 'tuna sashimi', 'salmon sashimi' and now 'salmon' — so
       `hit.length !== 2` bailed out and the check silently stopped running on the one line it was
       written for. The selftest caught it: the planted "+5 cal" salmon swap, the exact error this guard
       exists to catch, sailed through. A new fact must never be able to switch a check off, so a name
       whose words are a strict SUBSET of another hit's words is not a second food — it is the same food
       named less precisely. Most specific wins, the same rule [row-math] uses. */
    const specific = hit.filter(n => !hit.some(o => {
      if (o === n) return false;
      const nw = n.split(' '), ow = o.split(' ');
      return nw.length < ow.length && nw.every(w => ow.indexOf(w) >= 0);
    }));
    hit.length = 0; specific.forEach(n => hit.push(n));
    if (hit.length !== 2) return;
    /* Only compare foods measured the SAME way. Cucumber is per-gram and a tuna roll is per-roll,
       so their 'difference' was reported as +190 per g — arithmetic on incompatible units. This
       surfaced when 'cucumber' became a fact and matched the word inside "cucumber-wrapped",
       which is describing the Naruto roll's wrapper, not offering cucumber as the alternative. */
    if (FOOD_FACTS[hit[0]].unit !== FOOD_FACTS[hit[1]].unit) return;
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
    ['southside anchor (half chicken)', (EATOUT_ORDER.southside || {}).anchor, 'smoked half chicken'],
    /* the base items were the gap: he questioned the miso number and it turned out to have no
       source anywhere. Anything he can be told to order gets checked against FOOD_FACTS. */
    ['sushi base (miso)', (EATOUT_ORDER.sushi.base || []).find(b => /miso/i.test(b.n)), 'miso soup'],
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

/* ============ 8. every eat-out venue has EXACTLY ONE source of truth ============
   THE AUG 6 2026 BUG, encoded. eatoutOrder() returns null for any venue missing from
   EATOUT_ORDER, and the card then falls back to EATOUT[venue].rules -- a hardcoded list --
   while the header keeps recomputing the budget from the banked slots. Result: southside
   showed the IDENTICAL 10-line plan for a 1115 kcal bank and a 915 kcal bank, and its frozen
   "Lands ~1,100-1,300 cal" line contradicted both. He caught it, not me.

   BOTH is the defect: two copies of one card means the wrong one can render and they drift.
   NEITHER is also a defect: the card would have a budget and no content.
   So: computed (EATOUT_ORDER) XOR advice-only (rules). A venue may only be advice-only if it
   has no menu to order from -- listed here explicitly, with the reason, so adding a real
   restaurant without an order entry FAILS instead of silently degrading. */
const ADVICE_ONLY = {
  homedairy: 'his own kitchen — he weighs it, there is nothing to order',
  homemeat:  'his own kitchen — he weighs it, there is nothing to order',
  simcha:    'a wedding/event buffet — no menu and no quantities to name in advance',
};
(function venueSource() {
  if (!EATOUT || !EATOUT_ORDER) { fail('venue-source', 'EATOUT or EATOUT_ORDER missing'); return; }
  let bad = 0;
  Object.entries(EATOUT).forEach(([key, v]) => {
    const computed = !!EATOUT_ORDER[key];
    const staticRules = Array.isArray(v.rules) && v.rules.length > 0;
    if (computed && staticRules) {
      bad++; fail('venue-source', key + ' has BOTH an EATOUT_ORDER entry and a static rules[] — ' +
        'two copies of the same card. Delete the rules[]; the computed order is authoritative.');
    }
    if (!computed && !staticRules) {
      bad++; fail('venue-source', key + ' has NEITHER an EATOUT_ORDER entry nor rules[] — its card would render a budget with no plan.');
    }
    if (!computed && staticRules && !ADVICE_ONLY[key]) {
      bad++; fail('venue-source', key + ' renders a STATIC list under a computed budget header, so the plan ' +
        'will not change when he banks a different set of slots (the Aug 6 bug). Give it an EATOUT_ORDER ' +
        'entry, or add it to ADVICE_ONLY in this file with the reason it has no menu.');
    }
  });
  if (!bad) pass('venue-source', Object.keys(EATOUT).length + ' venues, each computed XOR advice-only (' +
    Object.keys(ADVICE_ONLY).length + ' advice-only, by name)');
})();

/* ============ 9. an advice-only venue may not quote a meal-level macro ============
   The static list cannot know the budget, so any portion/meal total inside it is a number that
   will contradict the header sooner or later -- which is exactly how "Lands ~1,100-1,300 cal"
   survived next to a 915 kcal budget. Per-gram constants ("alcohol is 7 cal/g") are fine: they
   are physics, not portions. Threshold is 100, which is above any constant and below any meal. */
(function noProseMacros() {
  if (!EATOUT) return;
  const CLAIM = /(\d[\d,]*)\s*(?:[-–—]\s*\d[\d,]*\s*)?(cal|kcal)\b|(\d[\d,]*)\s*(?:g\s*)?P\b/gi;
  let bad = 0, scanned = 0;
  Object.entries(EATOUT).forEach(([key, v]) => (v.rules || []).forEach((line, i) => {
    scanned++;
    const txt = String(line).replace(/<[^>]*>/g, '');
    let m;
    CLAIM.lastIndex = 0;
    while ((m = CLAIM.exec(txt))) {
      const n = parseFloat(String(m[1] || m[3]).replace(/,/g, ''));
      if (n >= 100) {
        bad++;
        fail('prose-macros', key + '.rules[' + i + '] states a meal-level macro (' + m[0].trim() +
          ') inside a static list that cannot see the budget:\n          "' + txt.slice(0, 120) + '"');
        break;
      }
    }
  }));
  if (!bad) pass('prose-macros', scanned + ' advice-only line(s), none quoting a meal-level macro');
})();

/* ============ 10. a scoop stamp may never contradict the row's own quantity ============
   Aug 6 2026, found by HIM on the Fruity Pebbles bowl, two bugs on one card:
     "Fruity Pebbles cereal, on top"  q=10 g          -> stamped "weigh 30 g" (the protein tub's scoop)
     "Fruity Pebbles protein"         q="½ serving · 15 g" -> stamped the FULL 30 g beside the half
   PP_G is a substring map, so any label containing a flavor name got the powder's weight whether or
   not the row WAS the powder. Two numbers on one line, and the wrong one is bolded.

   This check runs the SHIPPED ppFind/ppTag against every ingredient row rather than a copy of the
   logic -- two copies is how check 5 exists in the first place. It also asserts the call sites still
   hand the quantity in, because the fix is worthless if a future edit drops that argument. */
(function scoopWeights() {
  /* (a) call sites: an ingredient-row mapper must pass the row quantity.
     `l` is only ever the ingredient label in those two mappers, so a bare ppTag(l) IS the bug.
     (The first version of this used /[^]]*?/ to span the template — in JavaScript `[^]` matches ANY
     character, so `[^]]` reads as "any char, then a literal ]" and the check silently matched nothing.
     Same vacuous-pass shape as the \b-through-a-heredoc bug. Plain indexOf-style checks from now on.) */
  const bare = (src.match(/ppTag\(l\)/g) || []).length;
  if (bare) {
    fail('scoop-weights', bare + ' ingredient-row render site(s) call ppTag(l) without the row ' +
      'quantity — the stamp cannot tell whether the row is already exact (the Fruity Pebbles bug).');
  }

  /* (b) behaviour: pull the real functions out of the file and run every row through them */
  const a = src.indexOf('const PP_NOTPOWDER');
  const b = src.indexOf('\n\n', src.indexOf('function ppTag'));
  if (a < 0 || b < 0 || b <= a) { fail('scoop-weights', 'could not locate ppFind/ppTag in the source'); return; }
  const slice = src.slice(a, b);
  if (slice.length < 200) { fail('scoop-weights', 'ppFind/ppTag slice came out empty — fix the anchors'); return; }
  const PP_G = grab('PP_G');
  if (!PP_G) return;
  let ppTag;
  try {
    ppTag = eval('(function(){' + slice.replace('const PP_NOTPOWDER', 'var PP_NOTPOWDER') +
                 '; return ppTag; })()');
  } catch (e) { fail('scoop-weights', 'ppFind/ppTag would not evaluate: ' + e.message); return; }

  const grams = s => { const m = String(s).match(/(\d+(?:\.\d+)?)\s*g\b/); return m ? parseFloat(m[1]) : null; };
  const OTHER_PRODUCT = /cereal|wafers?|thins|crumbs?|on top|topping/i;
  let n = 0, bad = 0;
  SLOTS.forEach(sl => sl.opts.forEach(o => o.vars.forEach(v => v.ing.forEach(([label, qty]) => {
    n++;
    /* B1 — the REAL render path (quantity passed, exactly as the card calls it) may never put two
       different gram figures on one line. This is the user-visible invariant. */
    const shown = grams(String(ppTag(label, false, qty)).replace(/<[^>]+>/g, ''));
    const own = grams(qty);
    if (shown != null && own != null && Math.abs(own - shown) > 0.05) {
      bad++;
      fail('scoop-weights', o.id + ' "' + label + '" renders its own ' + own + ' g AND a stamped ' +
        shown + ' g — two different weights on one line.');
    }
    /* B2 — the lookup itself. A row naming a DIFFERENT product must resolve to no scoop weight at all,
       whatever the quantity column says. Without this, blanking PP_NOTPOWDER passes: the quantity
       suppression is the outer defence and it hides a broken lookup. Note the partial-scoop rows
       (s2 uses 23.4 g of a 36 g scoop) are legitimately a different NUMBER from the tub, which is why
       B1 is the number check and B2 is a product check — conflating the two flagged s2 falsely. */
    if (OTHER_PRODUCT.test(String(label)) && String(ppTag(label)) !== '') {
      bad++;
      fail('scoop-weights', o.id + ' "' + label + '" is not the protein tub, but a flavor name in it ' +
        'still resolves to a scoop weight — PP_NOTPOWDER is not rejecting it.');
    }
  }))));
  if (!bad && !bare) pass('scoop-weights', n + ' ingredient rows, no stamped weight contradicts the row itself');
})();

/* ============ 11. a meat meal may never be handed a dairy item ============
   Aug 6 2026, his words: "you also added for me to have a shake after dinner but thats dairy and the
   dinner is meat. this goes for all meals." The Southside card prescribed the whey protein patch
   three lines above its own "Meat meal -> no dairy for 6 h" warning. He is shomer kashrut; this is
   not a rounding error, it is the card telling him to break the wait it just named.

   WARNING copy is fine and necessary ("no dairy for 6 hours", "the Creami moves to tomorrow") — what
   is banned is PRESCRIBING one. So a dairy term only fails when its sentence carries no negation. */
const DAIRY_TERM = /\bmilk\b|\byogurt\b|\bcheese\b|\bwhey\b|Fairlife|Oikos|FAGE|\bshake\b|Creami/i;
const NEGATED = /\bno\b|\bnot\b|\bskip\b|avoid|\bwait\b|hours?\b|tomorrow|instead of|never/i;
(function kashrut() {
  if (!EATOUT_ORDER) return;
  const EO_PATCH = grab('EO_PATCH');
  let bad = 0;

  /* (a) every venue that can produce an order must declare what it is */
  Object.entries(EATOUT_ORDER).forEach(([key, v]) => {
    if (!['meat', 'dairy', 'pareve'].includes(v.k)) {
      bad++; fail('kashrut', key + " does not declare k:'meat'|'dairy'|'pareve', so nothing downstream " +
        'can tell whether a dairy patch is allowed after it.');
    }
  });

  /* (b) the meat patch must actually be pareve, and the render must choose it */
  if (!EO_PATCH || !EO_PATCH.pMeat) {
    bad++; fail('kashrut', 'EO_PATCH.pMeat is missing — there is no pareve protein to offer after a meat meal.');
  } else if (DAIRY_TERM.test(EO_PATCH.pMeat.replace(NEGATED, ''))) {
    bad++; fail('kashrut', 'EO_PATCH.pMeat names a dairy item: "' + EO_PATCH.pMeat + '"');
  }
  if (!/k===['"]meat['"]\s*\?\s*EO_PATCH\.pMeat/.test(src)) {
    bad++; fail('kashrut', 'the card does not branch on the venue being meat before choosing the protein ' +
      'patch — a meat meal would be offered the dairy shake again.');
  }

  /* (c) nothing a MEAT venue says may prescribe dairy */
  Object.entries(EATOUT_ORDER).forEach(([key, v]) => {
    if (v.k !== 'meat') return;
    const lines = [].concat(v.swaps || [], v.more || [], v.free || [], v.never || [],
      (v.base || []).map(x => x.n), v.anchor ? [v.anchor.n] : [], v.carb ? [v.carb.n] : []);
    lines.forEach(line => String(line).split(/(?<=[.!?])\s+|\s+·\s+/).forEach(part => {
      if (DAIRY_TERM.test(part) && !NEGATED.test(part)) {
        bad++; fail('kashrut', key + ' is a MEAT venue but prescribes dairy:\n          "' + part.trim().slice(0, 120) + '"');
      }
    }));
  });

  if (!bad) pass('kashrut', 'every venue declares meat/dairy/pareve; no meat venue offers a dairy item');
})();

/* ---- [topping-weights] every whip / chocolate-syrup mention states its grams ----
   His instruction, Aug 10 2026: "when you put ff whipped cream or sf choc syrup,
   you need to write how many g." Not pedantry — the Creami cups run on a 140-cal
   topping budget, so an unweighted topping makes the cup's macro header
   unverifiable, which is the exact class of failure this whole file exists for.
   30 mentions across the batches carried no amount at all. Both foods now live in
   FOOD_FACTS at a 15 g standard serving and this keeps them honest.
   ⚠️ SHOPPING-LIST ROWS ARE EXEMPT ON PURPOSE: ['FF whipped cream','1 can'] is
   right — he buys a can, not 15 g. The rule covers anything telling him what to
   PUT ON the food, not what to buy. */
(() => {
  const NAMES = /(FF whip(?:ped cream)?|SF choc(?:olate)? (?:syrup|drizzle))/g;
  const bad = [];
  src.split('\n').forEach((line, ln) => {
    if (/'(?:1 can|check stock)'/.test(line)) return;   /* a shopping row */
    if (/unit:'g'/.test(line)) return;                  /* the FOOD_FACTS defs, cal-per-gram */
    let m; NAMES.lastIndex = 0;
    while ((m = NAMES.exec(line))) {
      const rest = line.slice(m.index + m[0].length);
      /* ⚠️ MY FIRST VERSION JUST LOOKED 26 CHARS AHEAD FOR "N g" AND THAT WAS WRONG IN BOTH
         DIRECTIONS. It failed the grocery rows, which ARE weighted (just as separate array slots),
         and — far worse — it PASSED b7's HOWTO, where "SF chocolate syrup drizzled" was followed by
         an unrelated "9 g almond butter" close enough to satisfy the regex. A proximity match will
         happily accept another ingredient's number. So this is structural now. */
      /* ① an ingredient row: ['SF chocolate syrup, drizzled','15 g',[5,0,2,0]].
            Skip to the end of the LABEL first — the label has its own comma ("...syrup, drizzled")
            and my previous attempt tripped on it — then require the quantity slot to be followed by
            the macro array `,[`. That `,[` is what makes this precise: an ingredient row always has
            one, and HOWTO prose never does, so prose can't sneak through on a neighbouring quote. */
      const q = rest.indexOf("'");
      if (q >= 0) {
        /* ...followed by the macro array `,[` (a SLOTS ingredient row), or by `]` (a DRAFT recipe
           row, which is a bare [name, qty] pair with no macros). Both are legitimately weighted. */
        const slot = /^'\s*,\s*'([^']{0,20})'\s*(?:,\s*\[|\])/.exec(rest.slice(q));
        if (slot && /\d+(?:\.\d+)?\s*g\b/.test(slot[1])) continue;
      }
      /* ② a grocery row: ['Pantry','SF chocolate syrup',15,'g'] — amount and unit are separate */
      if (/^['"]?\s*,\s*\d+(?:\.\d+)?\s*,\s*['"]g['"]/.test(rest)) continue;
      /* ③ prose: the grams must be TIGHT after the name and before any comma, so a later
            ingredient's weight cannot vouch for this one */
      if (/\d+(?:\.\d+)?\s*g\b/.test(rest.slice(0, 14).split(',')[0])) continue;
      bad.push('line ' + (ln + 1) + ' "' + m[0] + '" has no grams -> ' + line.trim().slice(0, 60));
    }
  });
  if (bad.length) fail('topping-weights', bad.join(' | '));
  else pass('topping-weights', 'every whip / chocolate-syrup mention states its grams (shopping rows exempt)');
})();

/* ============ [creami-topping] every cup's topping resolves to real macros ============
 * Exists because the Creami card printed "Topping (140 cal)" on all 36 cups for months —
 * s1's third ingredient is a placeholder budget, not a food, and nothing checked it. HE found
 * it, on cup 2, which is actually 75. CREAMI_TOPMAC is keyed on the exact topping prose so an
 * edited cup fails SAFE (no number shown), but silently showing nothing is still a regression,
 * so this makes it loud: every cup must have a key, and every key must belong to a cup.
 */
(function creamiTopping() {
  const TARGET = 140, TOL = 8;
  const BATCHES = grab('CREAMI_BATCHES');
  if (!BATCHES || !FOOD_FACTS) { fail('creami-topping', 'could not read CREAMI_BATCHES / FOOD_FACTS'); return; }
  const cups = BATCHES.flatMap(b => (b.cups || []).map(c => ({ name: c[0], prose: c[4], comps: c[5] })));
  const bad = [];
  for (const c of cups) {
    if (!Array.isArray(c.comps) || !c.comps.length) { bad.push(c.name + ' has no component list (cup[5])'); continue; }
    let cal = 0, ok = true;
    for (const pair of c.comps) {
      const [k, q] = pair || [];
      const f = FOOD_FACTS[k];
      if (!f) { bad.push(c.name + ': "' + k + '" is not in FOOD_FACTS'); ok = false; break; }
      if (!(typeof q === 'number' && isFinite(q) && q > 0)) { bad.push(c.name + ': bad quantity for ' + k); ok = false; break; }
      cal += f.cal * q;
      /* every component named in the sentence must be a real row, and vice versa — the sentence is
         generated from this list, so a mismatch means someone hand-edited the prose. */
      const label = k.replace(/^(bare|fd|sf) /, '').split(' ')[0];
      if (label.length > 3 && !c.prose.toLowerCase().includes(label.toLowerCase()))
        bad.push(c.name + ': component "' + k + '" is not mentioned in the topping text');
    }
    if (!ok) continue;
    /* THE SPEC: s1 budgets 140 cal of topping so the cup fills the 330-cal snack slot. */
    if (Math.abs(cal - TARGET) > TOL)
      bad.push(c.name + ' topping is ' + Math.round(cal) + ' cal — off the ' + TARGET + ' spec by ' +
               Math.round(cal - TARGET) + ', rebalance it');
    /* whip is a garnish; if it ever creeps up it is being used as a calorie lever (see creamiTopMac) */
    const w = (c.comps.find(p => p && p[0] === 'ff whip') || [])[1] || 0;
    if (w > 30) bad.push(c.name + ' has ' + w + ' g of whip — that is a calorie lever, add cookie not air');
  }
  if (bad.length) fail('creami-topping', bad.join(' | '));
  else pass('creami-topping', cups.length + ' cups: every topping within ' + TOL + ' cal of the ' +
            TARGET + ' spec, every component sourced and named in its text');
})();

/* ============ [macro-provenance] the coverage RATCHET ============
 * The core problem, measured: most ingredient rows in SLOTS are hand-typed numbers with no source
 * anywhere in the repo, and the recipe-total guard passes anyway because it only checks that a sum
 * of guesses equals the stated sum of those guesses.
 *
 * This prints coverage on every run so progress toward 100% is visible instead of promised, and it
 * FAILS IF COVERAGE EVER DROPS — so a new unsourced ingredient cannot be added quietly. Raise FLOOR
 * as coverage climbs; never lower it.
 */
(function macroProvenance() {
  const FLOOR = 70;                       /* ratchet — only ever goes up. 62 -> 70 on Aug 18 2026: nine
                                             facts added for the tuna-salad lunch (USDA veg, Huy Fong
                                             sriracha, his tuna-pouch label, both Hellmann's). */
  const need = new Map();
  const slotsBlock = (() => {
    const i = src.indexOf('const SLOTS'); if (i < 0) return '';
    const j = src.indexOf('\n];', i); return j < 0 ? '' : src.slice(i, j);
  })();
  /* ⛔ This regex used to match ONLY the legacy shape ['label','qty',[n,n,n,n]], so every row that
     migrated to naming its source vanished from the denominator: coverage "FELL to 63% (56/89)" when
     nothing had become less sourced — 37 foods had simply stopped being counted. A ratchet whose
     denominator moves is not a ratchet. Both shapes are matched now, and a row carrying a SPEC is
     covered by definition, because a spec that does not resolve fails [priced] outright. */
  const priced = new Set();
  const rx = /\['([^']+)','([^']*)',(\[[\d.,]+\]|\{[^{}]*\})\]/g;
  let m;
  while ((m = rx.exec(slotsBlock))) {
    const key = foodKey(m[1]);
    need.set(key, (need.get(key) || 0) + 1);
    if (m[3].charAt(0) === '{') priced.add(key);
  }
  const names = Object.keys(FOOD_FACTS || {});
  /* Does a FOOD_FACTS entry cover this ingredient? Third attempt, and the first two failures are
     both worth keeping in mind:
       v1 filtered tokens to length>3, so a fact named "egg" produced an EMPTY token list and
          [].every() is true — one three-letter name marked all 119 foods covered and the ratchet
          printed COMPLETE. A guard that passes vacuously is worse than no guard at all.
       v2 required every raw token with word boundaries, which was too strict the other way:
          "white rice dry" missed the food "white rice" (the key drops the parenthetical), and
          "rice cake" missed "rice cakes" on the plural alone. Five new facts registered as zero.
     v3: stem the plurals, drop preparation words that are not part of the food's identity, and
     require the fact's tokens to be a SUBSET of the food's. */
  const STOP = new Set(['dry','raw','whole','fresh','frozen','each','the','and','with','only','plain']);
  const stem = w => w.replace(/ies$/, 'y').replace(/([^s])s$/, '$1');
  const toks = str => String(str).toLowerCase().split(/[^a-z0-9%]+/)
    .filter(t => t.length > 2 && !STOP.has(t)).map(stem);
  const NAMETOKS = names.map(n => toks(n)).filter(a => a.length);
  const COVER = k => { const b = new Set(toks(k)); return NAMETOKS.some(a => a.every(t => b.has(t))); };
  /* a food is sourced if a FOOD_FACTS entry covers its name OR one of its rows now names a fact */
  const covered = k => COVER(k) || priced.has(k);

  const total = need.size, done = [...need.keys()].filter(covered).length;
  const pct = total ? Math.round(100 * done / total) : 0;
  if (pct < FLOOR) {
    fail('macro-provenance', 'coverage FELL to ' + pct + '% (' + done + '/' + total + ') — floor is ' +
      FLOOR + '%. An ingredient was added with no FOOD_FACTS source behind it.');
  } else {
    pass('macro-provenance', done + '/' + total + ' plan foods sourced (' + pct + '%, floor ' + FLOOR +
      '%)' + (pct < 100 ? ' — ' + (total - done) + ' still hand-typed, see FOOD_FACTS.md' : ' — COMPLETE'));
  }
})();

/* ============ [food-doc] the readable copy is not stale ============
 * FOOD_FACTS.md exists because he could not open the numbers in Explorer — the whole app is one
 * index.html. A generated view is only safe if it cannot drift from its source, so this fails the
 * build when it does. Two copies of one truth is the bug class this whole effort is about.
 */
(function foodDoc() {
  const { execFileSync } = require('child_process');
  /* ⭐ FIRST: does food-doc's parser SEE every fact? It reads FOOD_FACTS with a regex, and a regex can
     miss an entry — the Smucker's jam row was invisible for a while because its src note is
     double-quoted (it contains an apostrophe). The staleness check below could never catch that: it
     compares food-doc's output to food-doc's output, so a fact neither side sees looks like agreement.
     This compares its count against the REAL object, which is the only non-circular check available. */
  const live = Object.keys(FOOD_FACTS).length;
  let parsed = null;
  try {
    /* --count, not --check: --check exits nonzero when the doc is stale and prints no number, which
       made a missing fact masquerade as "output changed". */
    const out = execFileSync(process.execPath, [path.join(__dirname, 'food-doc.js'), '--count'],
                             { stdio: ['pipe', 'pipe', 'pipe'] }).toString();
    const m = out.match(/(\d+)\s+facts/);
    parsed = m ? +m[1] : null;
  } catch (e) { parsed = null; }
  if (parsed !== null && parsed !== live)
    fail('food-doc-parse', `food-doc sees ${parsed} of the ${live} FOOD_FACTS entries — ` +
         `${live - parsed} invisible to its regex, so they are missing from FOOD_FACTS.md`);
  else if (parsed === null)
    fail('food-doc-parse', 'could not read a fact count out of food-doc.js — has its output changed?');
  else pass('food-doc-parse', `food-doc's parser sees all ${live} FOOD_FACTS entries`);

  try {
    execFileSync(process.execPath, [path.join(__dirname, 'food-doc.js'), '--check'], { stdio: 'pipe' });
    pass('food-doc', 'FOOD_FACTS.md matches FOOD_FACTS in index.html');
  } catch (e) {
    fail('food-doc', 'FOOD_FACTS.md is stale — run: node tools/food-doc.js');
  }
})();

/* ============ [jiben-anchor] a hand-copied macro sum cannot drift from its source ============
 * PRO_JIBEN.per is the sum of four SLOTS ingredient rows. It was correct for weeks, then the cottage
 * cheese label was corrected and the copy went stale in silence — [final-meal] surfaced it only as a
 * 72-cal miss on the dairy lane, which is a symptom, not a cause. This asserts the identity directly.
 */
(function jibenAnchor() {
  const NEED = ['Eggs', 'Egg whites', '4% cottage cheese', 'Low-moisture mozzarella'];
  const l2 = (SLOTS.find(s => s.key === 'lu') || {opts: []}).opts.find(o => o.id === 'l2');
  const anchor = (() => { const m = /const PRO_JIBEN\s*=\s*\{[\s\S]*?per:\[([\d.,]+)\]/.exec(src);
                          return m ? m[1].split(',').map(Number) : null; })();
  if (!l2 || !anchor) { fail('jiben-anchor', 'could not read l2 or PRO_JIBEN'); return; }
  const sum = [0, 0, 0, 0];
  const found = [];
  /* `mac` was the row's own copy of the macros; once these four rows started naming their source it
     became a spec object and mac.forEach threw. Price it through the engine instead. */
  l2.vars[0].ing.forEach(row => {
    const name = row[0];
    if (!NEED.some(n => name.startsWith(n))) return;
    found.push(name);
    const mac = priceRow(row);
    if (mac) mac.forEach((v, i) => sum[i] += v);
  });
  const miss = NEED.filter(n => !found.some(f => f.startsWith(n)));
  if (miss.length) { fail('jiben-anchor', 'l2 no longer contains: ' + miss.join(', ')); return; }
  const off = sum.map((v, i) => Math.round(v - anchor[i]));
  if (off.some(d => Math.abs(d) > 1))
    fail('jiben-anchor', 'PRO_JIBEN.per is [' + anchor + '] but its four l2 rows sum to [' +
         sum.map(Math.round) + '] — off by [' + off + ']');
  else pass('jiben-anchor', 'PRO_JIBEN.per matches its four l2 ingredient rows');
})();

/* ============ [cor-bowl-total] a COR spec must cost what the app says the bowl costs ============
 * Built Aug 18 2026, minutes after he caught "150 g diced apple" in a bowl whose fruit row is 70 g. I had
 * taken the amount from a code COMMENT instead of reading b1's ingredient rows, and nothing stood between
 * that inference and his breakfast. The missing check IS the defect; "be more careful" is not a mechanism.
 *   (A) exact:   a spec naming a fresh-fruit weight must name the weight b1 actually carries.
 *   (B) ratchet: crunch garnishes appear in no b1 row, so they sit ON TOP of the 545. The existing debt is
 *                RECORDED, not fixed — changing it is a meal adjustment he has not asked for.
 * NOTE ON PLACEMENT: this must sit ABOVE the `if (fails)` summary. The first version went below it, so it
 * printed FAIL and the run still exited 0 — a guard that reports a failure and passes the build.
 */
(function corBowlTotal() {
  const CRUNCH_CEILING = 63;   /* worst known single-combo overage in cal (15 g graham). Only goes DOWN. */
  const bfSlot = SLOTS.find(s => s.slot === 'Breakfast');
  const b1 = bfSlot && bfSlot.opts.find(o => o.id === 'b1');
  if (!b1) { fail('cor-bowl-total', 'no b1 bowl found — the anchor moved'); return; }
  const v = b1.vars[0];
  const fruitRow = v.ing.find(r => /berries/i.test(r[0]));
  if (!fruitRow) { fail('cor-bowl-total', 'b1 has no fruit row to anchor against'); return; }
  const FRUIT_G = parseFloat(fruitRow[1]);
  /* `r[2][0]` read the row's own calorie copy and became NaN once these rows named their source */
  const rowSum = Math.round(v.ing.reduce(function (a, r) { const p = priceRow(r); return a + (p ? p[0] : 0); }, 0));
  if (!COR_SETS || !COR_SETS.length) {
    fail('cor-bowl-total', 'COR_SETS did not parse — this check would otherwise pass vacuously'); return;
  }
  const FRESH = /(\d+(?:\.\d+)?)\s*g\s+(?:diced\s+|mixed\s+)?(strawberr\w*|blueberr\w*|berries|apple|banana|peach\w*|pineapple)/gi;
  const CRUNCH = /(\d+(?:\.\d+)?)\s*g\s+(Nilla|Biscoff|graham|Fruity Pebbles|Cinnamon Toast Crunch|coconut chips|Oreo|raisins)/gi;
  const PERG = {nilla: 4.7, biscoff: 4.8, graham: 4.2, 'fruity pebbles': 3.9,
                'cinnamon toast crunch': 4.15, 'coconut chips': 6.1, oreo: 4.8, raisins: 3.0};
  const specs = [];
  COR_SETS.forEach(wk => wk.forEach(p => specs.push([p[0], String(p[1]).replace(/&amp;/g, '&')])));
  if (COR_OVERRIDE) Object.keys(COR_OVERRIDE).forEach(d =>
    specs.push([d + ' ' + COR_OVERRIDE[d][0], String(COR_OVERRIDE[d][1]).replace(/&amp;/g, '&')]));
  const fruitBad = [], overs = [];
  specs.forEach(([nm, spec]) => {
    let m;
    FRESH.lastIndex = 0;
    while ((m = FRESH.exec(spec)))
      if (Math.abs(parseFloat(m[1]) - FRUIT_G) > 0.5)
        fruitBad.push(nm + ' names ' + m[1] + ' g ' + m[2] + " — the bowl's fruit row is " + FRUIT_G + ' g');
    let extra = 0; const bits = [];
    CRUNCH.lastIndex = 0;
    while ((m = CRUNCH.exec(spec))) {
      const per = PERG[m[2].toLowerCase()];
      if (per) { extra += parseFloat(m[1]) * per; bits.push(m[1] + ' g ' + m[2]); }
    }
    if (extra > 0.5) overs.push({nm, cal: Math.round(extra), bits: bits.join(' + ')});
  });
  const bad = [];
  if (rowSum !== v.t[0]) bad.push('b1 rows sum to ' + rowSum + ' but the option states ' + v.t[0]);
  if (fruitBad.length) bad.push(fruitBad.join(' · '));
  const worst = overs.reduce((a, o) => Math.max(a, o.cal), 0);
  if (worst > CRUNCH_CEILING)
    bad.push('a garnish now costs ' + worst + ' uncounted cal, past the ' + CRUNCH_CEILING + ' ceiling: ' +
             overs.filter(o => o.cal === worst).map(o => o.nm + ' (' + o.bits + ')').join(', '));
  if (bad.length) fail('cor-bowl-total', bad.join(' · '));
  else pass('cor-bowl-total', specs.length + " COR specs: every fresh-fruit weight matches the bowl's " +
       FRUIT_G + ' g row; ' + overs.length + ' carry an uncounted crunch, worst ' + worst + ' cal (ceiling ' +
       CRUNCH_CEILING + ') — known debt, his call pending');
})();

/* ============ [row-math] every ingredient row recomputed from its source ============
 * The check that should always have existed. [recipe-totals] only proves a sum of guesses equals the
 * stated sum of those guesses (CLAUDE.md says exactly that); this one prices each row against FOOD_FACTS.
 *
 * Built Aug 18 2026 after he said: "Every recipe should be FACT checked when being made... I cant be the
 * one to find these mistakes all the time."
 *
 * THREE OUTCOMES, and the distinction is the whole point:
 *   VERIFIED       the row matches its source
 *   NEEDS A LABEL  listed by name in KNOWN_UNSOURCED with what would close it. Ratcheted and printed
 *                  every run, so it is a shrinking debt rather than a silence.
 *   WRONG          anything else fails the build.
 * "Everything is checked" would be a lie. "Everything is either checked or named" is true.
 *
 * Matching UNDER-matches by design. An earlier subset matcher paired 'Tomato paste' with raw tomato
 * (~5x denser; the row was right) and 'Frozen strawberries' with fresh. Acting on that list would have
 * corrupted correct rows, so ambiguity resolves to unchecked, never to a guess.
 */
(function rowMath() {
  const UNCHECKED_CEILING   = 2;  /* single-food rows with no fact that prices them. Only goes DOWN. */
  const COMPOSITE_CEILING   = 2;  /* rows naming several foods; must be split to be priceable. Only DOWN. */
  const NEEDS_LABEL_CEILING = 3;   /* rows awaiting a photo of his package. Only goes DOWN. */
  const MISLABELLED_CEILING = 1;  /* rows escaping the check via a descriptive '+'. Only goes DOWN. */

  /* Different foods that share a word — left unchecked until each earns its own fact. */
  const DENY = [['tomato paste', 'tomato'], ['kodiak', 'oats'], ['0%', 'fage 2% greek yogurt'],
                ['shortcake', 'strawberries'], ['frozen', 'strawberries'], ['powder', 'fruity pebbles'],
                /* The de-creamed-Biscoff denial is GONE: he answered on Aug 18 2026 -- "start using the
                   regular lotus biscoff cookies" -- and sent the Lotus Original panel, so those rows now
                   price off the real cookie instead of being refused as ambiguous. */];

  /* ⛔ NEVER add a row here to make a failure go away. Only when the source genuinely does not exist yet,
     and always with the specific thing that would close it. */
  const KNOWN_UNSOURCED = {
    'Kodiak buttermilk Power Flapjacks (frozen)':
      "the fact's own src says Kodiak runs 14-16 P across formulations and to re-check his box - needs a photo of the package",
    'Chocolate Cookie Blast protein':
      'this row implies 150 cal a scoop; the four label-verified flavors run 130-140 - needs a photo of the Cookie Blast tub'
  };

  const FRAC = {'\u00bd': 0.5, '\u00bc': 0.25, '\u00be': 0.75, '\u2153': 1/3, '\u2154': 2/3, '\u215b': 0.125};
  function qtyOf(q) {
    const t = String(q).trim();
    let m = /^(\d+(?:\.\d+)?)\s*(g|mL|ml|oz)\b/.exec(t);
    if (m) return {n: parseFloat(m[1]), unit: m[2].toLowerCase() === 'ml' ? 'ml' : m[2].toLowerCase()};
    m = /^(\d+)\s*(?:pack|cup|piece|bag)?\s*\((\d+(?:\.\d+)?)\s*g\)/.exec(t);
    if (m) return {n: parseFloat(m[1]) * parseFloat(m[2]), unit: 'g'};
    m = /^([\u00bd\u00bc\u00be\u2153\u2154\u215b])\s*(scoop|serving|med|cup|can)?/.exec(t);
    if (m) return {n: FRAC[m[1]], unit: m[2] || 'each'};
    m = /^(\d+(?:\.\d+)?)\s*(slices?|scoops?|servings?|pieces?|cups?|packets?|bars?|each|med|medium|can|bag|sheet)?\b/.exec(t);
    if (m) { let u = (m[2] || 'each').replace(/s$/, ''); if (u === 'medium' || u === 'med') u = 'each'; return {n: parseFloat(m[1]), unit: u}; }
    return null;
  }
  const stemW = w => w.replace(/ies$/, 'y').replace(/([^s])s$/, '$1');
  function toks(str) {
    const seen = {}, out = [];
    String(str).toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[^a-z0-9%]+/).forEach(function (t) {
      if (t.length > 1) { const k = stemW(t); if (!seen[k]) { seen[k] = 1; out.push(k); } }
    });
    return out;
  }
  const FACTS = Object.keys(FOOD_FACTS).map(k => ({k: k, t: toks(k), f: FOOD_FACTS[k]})).filter(x => x.t.length);
  const isComposite = lab => / \+ | OR |\u00b7|\/ | or /i.test(lab);
  function matchFact(label) {
    const rt = toks(label), low = label.toLowerCase();
    let subs = FACTS.filter(x => x.t.every(t => rt.indexOf(t) >= 0));
    subs = subs.filter(x => !DENY.some(d => low.indexOf(d[0]) >= 0 && x.k === d[1]));
    if (!subs.length) return null;
    subs.sort((a, z) => z.t.length - a.t.length);
    if (subs.length > 1 && subs[1].t.length === subs[0].t.length) return null;
    return subs[0];
  }
  function scale(fact, q) {
    const f = fact.f, u = String(f.unit).toLowerCase().replace(/\s*\(.*\)/, '');
    if (u === q.unit) return q.n;
    if (u === 'ml' && q.unit === 'ml') return q.n;
    if (u === 'scoop' && q.unit === 'serving') return q.n;
    if (/^piece/.test(u) && (q.unit === 'piece' || q.unit === 'each')) return q.n;
    if (['each','slice','packet','cup','scoop','can','bar','sheet'].indexOf(u) >= 0 && q.unit === 'each') return q.n;
    if (u === 'g' && q.unit === 'each' && f.ea) return q.n * f.ea;
    return null;
  }

  const off = [], verified = [], unchecked = [], composite = [], spreadBad = [], needsLabel = [], mislabelled = [];
  FACTS.forEach(function (x) {
    if (x.f.sp && (x.f.sp[0] < x.f.cal * 0.8 - 1e-9 || x.f.sp[1] > x.f.cal * 1.2 + 1e-9))
      spreadBad.push(x.k + ' declares sp:[' + x.f.sp.join(',') + '] around a base of ' + x.f.cal +
                     ' - a spread wider than +/-20% can bury a wrong number');
  });
  SLOTS.forEach(slot => (slot.opts || []).forEach(opt => (opt.vars || []).forEach(function (v, vi) {
    (v.ing || []).forEach(function (row) {
      const plain = String(row[0]).replace(/<[^>]*>/g, '');
      /* ⛔ THIS CHECK IS NOW ONLY FOR HAND-TYPED ROWS. Everything that carries a SPEC is priced and
         verified by [priced], which reads the row's declared source instead of guessing from its label.
         Leaving spec rows in here double-counted them and produced a false failure: once the protein
         rows started naming per-flavor facts, all nine "X protein + 1/2 tsp extract" lines matched a
         single fact while still containing a ' + ', so they were reported as "escaping the check via a
         stray +" and pushed the mislabelled count past its ceiling. They were not escaping anything —
         the extract is zero-calorie and the spec prices the only component that carries any. Fuzzy
         label matching has no business second-guessing a row that states its own source. */
      if (!Array.isArray(row[2])) return;
      const tag = slot.key + '/' + opt.id + (opt.vars.length > 1 ? '#' + vi : '') + ' "' + plain.slice(0, 34) + '"';
      if (isComposite(plain)) {
        /* A descriptive ' + ' ('split + toasted dark') exempts a row from checking, which is
           how an understated Sola bagel walked past a plant test. If exactly ONE fact matches a
           supposedly compound row it is MISLABELLED, not compound - say so, never skip quietly. */
        if (matchFact(plain) && qtyOf(row[1])) mislabelled.push(tag);
        composite.push(tag); return;
      }
      const q = qtyOf(row[1]), hit = matchFact(plain);
      if (!q || !hit) { unchecked.push(tag); return; }
      const n = scale(hit, q);
      if (n === null) { unchecked.push(tag); return; }
      const f = hit.f, mac = row[2];
      const exp = [n * f.cal, n * f.p, n * f.c, n * f.f];
      let loCal = exp[0], hiCal = exp[0];
      if (f.sp) { loCal = n * f.sp[0]; hiCal = n * f.sp[1]; }
      const tol = Math.max(4, exp[0] * 0.03);
      const calBad = mac[0] < loCal - tol || mac[0] > hiCal + tol;
      /* a brand spread moves the MACROS too, proportionally: almond butter's calories ARE its fat, so
         widening only the calorie bound flagged Justin's own 220/6/5/19 panel as an error */
      const up = f.sp ? f.sp[1] / f.cal : 1;
      const macBad = [1, 2, 3].some(function (i) {
        const lo = Math.min(exp[i], exp[i] * up), hi = Math.max(exp[i], exp[i] * up);
        return mac[i] < lo - 2 || mac[i] > hi + 2;
      });
      if (calBad || macBad) {
        if (KNOWN_UNSOURCED[plain]) needsLabel.push(tag + ' - ' + KNOWN_UNSOURCED[plain]);
        else off.push(tag + ' [' + row[1] + ' -> ' + hit.k + '] states ' + mac.join('/') +
                      ' but the source gives ' + exp.map(x => Math.round(x * 10) / 10).join('/'));
      } else verified.push(tag);
    });
  })));

  const bad = [];
  if (spreadBad.length) bad.push(spreadBad.join(' \u00b7 '));
  /* Ratcheted, NOT a hard fail: most of these are legitimately compound (a protein plus a
     zero-calorie extract) and as an unconditional failure it masked every other result in this
     check, including the plant tests. A noisy diagnostic that drowns the real signal is worse
     than none - so it is a count that can only fall. */
  if (mislabelled.length > MISLABELLED_CEILING)
    bad.push(mislabelled.length + ' row(s) read as compound but match exactly one fact, past the'
      + ' ceiling of ' + MISLABELLED_CEILING + ' - a new row is escaping the check via a stray +: '
      + mislabelled.join(' / '));
  if (off.length) bad.push(off.length + ' row(s) disagree with their source: ' + off.join(' \u00b7 '));
  if (needsLabel.length > NEEDS_LABEL_CEILING)
    bad.push(needsLabel.length + ' rows parked as needing a label, past the ceiling of ' + NEEDS_LABEL_CEILING +
             ' - a row must never be parked there to silence a failure');
  if (unchecked.length > UNCHECKED_CEILING)
    bad.push(unchecked.length + ' single-food rows have no fact that prices them, past the ceiling of ' +
             UNCHECKED_CEILING + ' - an ingredient was added with no FOOD_FACTS entry behind it');
  if (composite.length > COMPOSITE_CEILING)
    bad.push(composite.length + ' composite rows, past the ceiling of ' + COMPOSITE_CEILING +
             ' - a new row packs several foods into one line, which cannot be priced');
  if (bad.length) fail('row-math', bad.join(' \u00b7 '));
  else pass('row-math', verified.length + ' rows recomputed from FOOD_FACTS and CORRECT \u00b7 ' +
       needsLabel.length + ' awaiting a label from him \u00b7 ' + unchecked.length +
       ' not yet priceable (ceiling ' + UNCHECKED_CEILING + ') \u00b7 ' + composite.length +
       ' composite (ceiling ' + COMPOSITE_CEILING + ') \u2014 every ceiling only ever falls');
})();

/* ============ [priced] every row's numbers come from a source, or the build stops ==============
 * Built Aug 18 2026, the enforcement half of the pricing engine in index.html.
 *
 * WHAT THE OLD CHECKS COULD NOT SAY. [recipe-totals] proves a sum of guesses equals the stated sum
 * of those guesses. [row-math] prices a row ONLY when a fuzzy token matcher can link its label to a
 * fact, and by design resolves every ambiguity to "unchecked" -- which is how 78 rows sat unpriced
 * while the build printed "all food checks passed". Neither could fail on a row that simply had no
 * source. This one can, because the row now NAMES its source instead of being matched to one.
 *
 * THREE KINDS OF ROW, and the counts are the migration's progress bar:
 *   PRICED    index 2 is {f,n} / {parts} / {free}. priceRow returns numbers from FOOD_FACTS.
 *   LEGACY    index 2 is a hand-typed [cal,P,C,F]. Allowed, ratcheted DOWN, never up.
 *   BROKEN    index 2 is a spec that priceRow cannot resolve -- bad key, or a unit that does not
 *             convert. ALWAYS FAILS. This is the case the old matcher swallowed silently.
 *
 * ⛔ THIS BLOCK MUST STAY ABOVE THE `if (fails)` TAIL. On Aug 18 a guard appended below it printed
 * FAIL and still exited 0 -- a check that reports failures and lets the build pass is worse than no
 * check, because it manufactures exactly the confidence it was built to remove.
 */
(function priced() {

  const LEGACY_CEILING = 4;   /* hand-typed rows still to migrate. ⛔ ONLY EVER GOES DOWN. */

  const broken = [], legacy = [], pricedRows = [], totalDrift = [];
  SLOTS.forEach(sl => sl.opts.forEach(o => (o.vars || []).forEach(function (v, vi) {
    const tag = sl.key + '/' + o.id + (o.vars.length > 1 ? '#' + vi : '');
    (v.ing || []).forEach(function (row) {
      const label = String(row[0]).replace(/<[^>]*>/g, '').slice(0, 40);
      const sp = row[2];
      if (Array.isArray(sp)) { legacy.push(tag + ' "' + label + '"'); return; }
      const m = priceRow(row);
      if (m === null) {
        broken.push(tag + ' "' + label + '" -> ' +
          (sp && sp.f ? ('names FOOD_FACTS[' + JSON.stringify(sp.f) + ']' +
             (FOOD_FACTS[sp.f] ? ' but asks for unit ' + JSON.stringify(sp.u || FOOD_FACTS[sp.f].unit) +
                                 ' against a fact in ' + JSON.stringify(FOOD_FACTS[sp.f].unit)
                               : ' which does not exist'))
                      : 'spec ' + JSON.stringify(sp) + ' is not a shape priceRow understands'));
        return;
      }
      pricedRows.push(tag);
    });
    /* the boot-time assignment must equal a fresh computation; if it does not, something mutated
       v.t after load and the number on his screen is not the sum of the rows under it */
    const fresh = varTotal(v);
    if (fresh.join(',') !== (v.t || []).join(','))
      totalDrift.push(tag + ' displays ' + (v.t || []).join('/') + ' but its rows price to ' + fresh.join('/'));
  })));

  const bad = [];
  if (broken.length)
    bad.push(broken.length + ' row(s) name a source that cannot be resolved: ' + broken.join(' · '));
  if (totalDrift.length)
    bad.push(totalDrift.length + ' variant total(s) are not the sum of their rows: ' + totalDrift.join(' · '));
  if (legacy.length > LEGACY_CEILING)
    bad.push(legacy.length + ' hand-typed rows, past the ceiling of ' + LEGACY_CEILING +
             ' - a new row was added carrying its own [cal,P,C,F] instead of naming a food. ' +
             'Point it at FOOD_FACTS; never raise this ceiling.');
  if (bad.length) fail('priced', bad.join(' · '));
  else pass('priced', pricedRows.length + ' rows priced from FOOD_FACTS · ' + legacy.length +
            ' still hand-typed (ceiling ' + LEGACY_CEILING + ', only ever falls) · 0 broken · ' +
            'every variant total equals the sum of its rows');
})();


/* ============ [dup-keys] a repeated FOOD_FACTS key silently destroys provenance ============
 * Aug 18 2026: I added nine staple facts and four of them ALREADY EXISTED. In an object literal the
 * later definition wins and the earlier one is simply gone — no error, no warning. Object.keys went
 * from an expected 87 to 83 and the only reason it surfaced at all was [food-doc-parse] noticing its
 * regex counted more textual definitions than there were live keys. The four I clobbered were the
 * BETTER entries: the original white rice sat at 3.62 cal/g because short-grain sushi rice is ~358,
 * a distinction my 3.65 threw away.
 * A silent overwrite of a sourced number is the exact failure this whole file exists to prevent, so
 * it gets its own check rather than being caught sideways by a doc-count mismatch.
 */
(function dupKeys() {
  const i = src.indexOf('const FOOD_FACTS'), j = src.indexOf('\n};', i);
  if (i < 0 || j < 0) { fail('dup-keys', 'could not locate the FOOD_FACTS block'); return; }
  const blk = src.slice(i, j);
  const rx = /^\s{2}'([^']+)':\s*\{/gm;
  const seen = Object.create(null), dups = [];
  let m;
  while ((m = rx.exec(blk)) !== null) {
    if (seen[m[1]]) dups.push(m[1]);
    seen[m[1]] = (seen[m[1]] || 0) + 1;
  }
  const uniq = Object.keys(seen).length;
  const live = FOOD_FACTS ? Object.keys(FOOD_FACTS).length : -1;
  if (dups.length)
    fail('dup-keys', dups.length + ' FOOD_FACTS key(s) defined twice — the LATER one wins and the ' +
      'earlier provenance is destroyed silently: ' + dups.join(', ') +
      '. Merge them; never leave two definitions of one food.');
  else if (live >= 0 && uniq !== live)
    fail('dup-keys', 'the block declares ' + uniq + ' keys but the object has ' + live +
      ' — something is shadowing a key in a way this check cannot see.');
  else pass('dup-keys', uniq + ' FOOD_FACTS keys, each defined exactly once');
})();


/* ============ [slot-fit] no meal may go OVER its slot budget ============
 * HIS RULE, stated plainly Aug 18 2026: "You should be making sure that nothing goes over calories and
 * that everything matches the correct macros as best as possible."
 *
 * WHY IT EXISTS: minutes after the last recipe was converted, s4 The Brookie was sitting at 3,896 cal
 * against a 330 snack slot -- +3,566. One part of a split row said {f:'oikos triple zero',n:40} where the
 * row text reads "Oikos vanilla 40 g", and that fact is priced per CUP, so it read forty CUPS. Every
 * other check passed: the spec resolved, the units were legal, the total equalled the sum of its rows.
 * Nothing was inconsistent -- it was just wrong, and only the SIZE of the number gave it away.
 * That is the gap this closes. An engine can verify that a plate adds up; only a budget can say whether
 * the plate is food.
 *
 * OVER is a hard failure, because on a cut an overshoot is the error that costs him the deficit.
 * UNDER is a ratcheted count -- being short is survivable and sometimes deliberate (p4 is Q's own light
 * pre-lift at 180/10), but it must not quietly grow.
 */
(function slotFit() {
  const OVER_CAL = 25;      /* ⛔ hard fail past this. Never raise it to make a build pass. */
  const UNDER_CEILING = 4;  /* variants more than 25 under. Only ever falls. */
  const over = [], under = [];
  SLOTS.forEach(sl => sl.opts.forEach(o => (o.vars || []).forEach(function (v, vi) {
    const tag = sl.key + '/' + o.id + (o.vars.length > 1 ? '#' + vi : '');
    const t = varTotal(v), b = sl.b;
    if (!b || !b.length) return;
    const d = t[0] - b[0];
    if (d > OVER_CAL) over.push(tag + ' ' + o.name.slice(0, 30) + ': ' + t[0] + ' cal against a ' + b[0] + ' slot, +' + Math.round(d));
    else if (d < -OVER_CAL) under.push(tag + ' (' + Math.round(d) + ')');
  })));
  const bad = [];
  if (over.length)
    bad.push(over.length + ' variant(s) OVER their slot budget by more than ' + OVER_CAL +
      ' cal: ' + over.join(' · ') + '. Fix the FOOD (portions), never the budget.');
  if (under.length > UNDER_CEILING)
    bad.push(under.length + ' variant(s) more than ' + OVER_CAL + ' cal UNDER, past the ceiling of ' +
      UNDER_CEILING + ': ' + under.join(', '));
  if (bad.length) fail('slot-fit', bad.join(' · '));
  else pass('slot-fit', 'every variant within +' + OVER_CAL + ' cal of its slot budget; ' +
            under.length + ' running more than ' + OVER_CAL + ' under (ceiling ' + UNDER_CEILING + ')');
})();


/* ============ [status-doc] STATUS.md must not drift from reality ============
 * The mechanism CLAUDE.md never had. Its onboarding section claimed most ingredient rows were
 * hand-typed with no source — true in the morning of Aug 18 2026, false by that evening — and nothing
 * anywhere would have said so. A status document with no staleness check is a document that will
 * eventually mislead the next session with total confidence.
 * Same contract as [food-doc]: the generator is the source, the file is a view, and a mismatch fails
 * the build rather than sitting quietly. Run `node tools/status.js` to fix.
 */
(function statusDoc() {
  const cp = require('child_process');
  const r = cp.spawnSync(process.execPath, [require('path').join(__dirname, 'status.js'), '--check'],
                         {encoding: 'utf8'});
  const out = ((r.stdout || '') + (r.stderr || '')).trim().split(/\r?\n/).pop();
  if (r.status === 0) pass('status-doc', 'STATUS.md matches what the repo actually contains');
  else fail('status-doc', out || 'status.js --check failed to run');
})();


/* ============ [dup-rows] the same ingredient must not appear twice in one meal ============
 * Aug 18 2026: a bulk edit added a free "pinch of salt, Lakanto to taste" row to the yogurt bowls
 * using indexOf-and-replace in a loop, where the search string was a PREFIX of its own replacement.
 * The loop never stopped matching. It appended TWENTY copies per bowl, 40 rows in all, and every
 * single check passed -- because the row prices to zero, so no total moved, no budget shifted and no
 * spec failed to resolve. The card would have shipped to his phone listing the same line twenty times.
 *
 * The lesson generalises past that one bug: a duplicated row is ALWAYS wrong, and when it is
 * zero-calorie nothing arithmetic can see it. This is the check for that. It also catches the more
 * dangerous version -- the same food counted twice in a plate he then eats.
 */
(function dupRows() {
  const bad = [];
  SLOTS.forEach(sl => sl.opts.forEach(o => (o.vars || []).forEach(function (v, vi) {
    const tag = sl.key + '/' + o.id + (o.vars.length > 1 ? '#' + vi : '');
    const seen = Object.create(null);
    (v.ing || []).forEach(function (row) {
      /* identity is the label PLUS the amount: two different weights of the same food on one card is a
         legitimate shape (a warm plate and a cold plate can both take almond butter), but the identical
         line twice never is. */
      const k = String(row[0]).replace(/<[^>]*>/g, '') + ' @@ ' + String(row[1]);
      seen[k] = (seen[k] || 0) + 1;
    });
    Object.keys(seen).forEach(function (k) {
      if (seen[k] > 1) bad.push(tag + ' x' + seen[k] + ' "' + k.split(' @@ ')[0].slice(0, 40) + '"');
    });
  })));
  if (bad.length) fail('dup-rows', bad.length + ' meal(s) list an identical ingredient row more than once: ' +
    bad.join(' · ') + '. A duplicated row is always wrong, and a zero-calorie one is invisible to every other check.');
  else pass('dup-rows', 'no meal lists the same ingredient row twice');
})();


console.log('');
if (fails) { console.log(fails + ' CHECK(S) FAILED'); process.exit(1); }
console.log('all food checks passed');
