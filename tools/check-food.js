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
   PP_G is a substring map, so any label containing a flavour name got the powder's weight whether or
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
      fail('scoop-weights', o.id + ' "' + label + '" is not the protein tub, but a flavour name in it ' +
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
  const BATCHES = grab('CREAMI_BATCHES');
  const TOPMAC  = grab('CREAMI_TOPMAC');
  if (!BATCHES || !TOPMAC) { fail('creami-topping', 'could not read CREAMI_BATCHES or CREAMI_TOPMAC'); return; }
  const cups = BATCHES.flatMap(b => (b.cups || []).map(c => ({ name: c[0], prose: c[4] })));
  const bad = [], seen = new Set();
  for (const c of cups) {
    if (!(c.prose in TOPMAC)) { bad.push(c.name + ' has no CREAMI_TOPMAC entry — its topping text changed'); continue; }
    seen.add(c.prose);
    const v = TOPMAC[c.prose];
    if (v === null) continue;                       /* deliberately uncomputable, card says so */
    if (!Array.isArray(v) || v.length !== 4) { bad.push(c.name + ' entry is not [cal,p,c,f]'); continue; }
    if (v.some(x => typeof x !== 'number' || !isFinite(x) || x < 0)) { bad.push(c.name + ' has a non-sane macro'); continue; }
    /* a topping is a garnish, not a meal: anything outside this band is a units mistake */
    if (v[0] < 20 || v[0] > 260) bad.push(c.name + ' topping is ' + v[0] + ' cal — outside 20-260, check the units');
  }
  for (const k of Object.keys(TOPMAC)) if (!seen.has(k)) bad.push('orphan CREAMI_TOPMAC key no cup uses: "' + k.slice(0, 45) + '"');
  const n = cups.length, nulls = cups.filter(c => TOPMAC[c.prose] === null).length;
  if (bad.length) fail('creami-topping', bad.join(' | '));
  else pass('creami-topping', n + ' cups all resolve (' + (n - nulls) + ' computed, ' + nulls + ' deliberately open), no orphans');
})();

console.log('');
if (fails) { console.log(fails + ' CHECK(S) FAILED'); process.exit(1); }
console.log('all food checks passed');
