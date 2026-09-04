#!/usr/bin/env node
/* Proves check-food.js can actually FAIL. Run: node tools/check-food.selftest.js
   Each case reintroduces one of the real Aug 5 2026 errors into a throwaway copy of
   index.html and asserts the guard catches it, naming the right check. A guard nobody
   has watched fail is decoration. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { execFileSync } = require('child_process');

const SRC = path.join(__dirname, '..', 'index.html');
const GUARD = path.join(__dirname, 'check-food.js');
const base = fs.readFileSync(SRC, 'utf8');

const CASES = [
  /* the vague row comes back on one bowl — this is verbatim what all 21 of them used to say */
  { name: 'an extract row goes back to describing the amount instead of stating it', check: 'extract-dose',
    from: "['Pinch of salt + Lakanto, to taste','—',{free:1}],['Banana extract','½ tsp',{free:1}]",
    to:   "['Pinch of salt, Lakanto to taste, extract on the heavy side','—',{free:1}]" },
  /* An extract loses its only combo and goes back to sitting in the cupboard. Raspberry is the right
     one to plant on: Very Berry is its ONLY home, so removing it orphans the bottle outright. */
  { name: 'an extract is left on the shelf with no combo calling for it', check: 'extract-used',
    from: '— ½ tsp raspberry extract, mixed berries', to: '— mixed berries' },
  /* A venue may rename its basis's dish; it may never re-price it. Teva is the dairy-restaurant
     card with Teva's dishes on it, so the arithmetic has to stay one number in one place. */
  { name: 'a venue re-prices the plate it declared a basis for', check: 'venue-basis',
    from: "of:'anchor',cal:340,p:42,c:0,f:18,max:1,keep:1",
    to:   "of:'anchor',cal:300,p:42,c:0,f:18,max:1,keep:1" },
  { name: 'a venue declares a basis that does not exist', check: 'venue-basis',
    from: "k:'dairy', basis:'restdairy',", to: "k:'dairy', basis:'nosuchvenue'," },
  { name: 'the real "+5 cal" salmon swap line', check: 'swap-math',
    from: '+20 cal and +2.6 g fat per piece', to: '+5 cal and +1 g fat per piece' },
  /* Anchor every case on PERMANENT app content, never on a dated EVENTS card. The first version of
     this case quoted the wedding card and broke the same day the card was reworded. */
  /* Re-anchored Aug 6 2026: this case used to quote EATOUT.sushi.rules, which was DELETED that day
     when every venue with a computed order gave up its duplicate static list. Same lesson as the
     wedding-card version of this case — anchor on content that has a reason to exist forever. */
  { name: 'sashimi written as "tuna or salmon" again', check: 'conflation',
    from: 'Still hungry? +3 pieces of sashimi = 66 cal, 14 P.',
    to:   'Still hungry? A few more pieces of tuna or salmon sashimi.' },
  { name: 'sashimi and rolls offered as one option again', check: 'conflation',
    from: '\u{1F41F} 8\u201310 pieces sashimi \u2014 <b>TUNA</b> (salmon is +20 cal each)<br>',
    to:   '\u{1F41F} 8\u201310 pieces sashimi or a couple of rolls<br>' },
  { name: 'a recipe total that no longer matches its ingredients', check: 'recipe-totals',
    from: "['Asparagus','100 g',{f:'asparagus',n:100}]", to: "['Asparagus','100 g',{f:'asparagus',n:900}]" },
  { name: 'a cashew smuggled into an ingredient list', check: 'nuts',
    from: "['Broccoli — asparagus and string beans swap 1:1','150 g',{f:'broccoli',n:150}]", to: "['Cashew butter','10 g',{f:'almond butter',n:10}]" },
  { name: 'the sushi anchor drifting away from FOOD_FACTS', check: 'anchors',
    from: "cal:22,p:4.7,c:0,f:.3,min:6,max:16", to: "cal:31,p:4.7,c:0,f:.3,min:6,max:16" },
  /* --- the Aug 6 2026 bug: a venue whose plan cannot respond to the budget --- */
  { name: 'a real restaurant losing its budget-aware order entry', check: 'venue-source',
    from: "\n southside:{\n  k:'meat',", to: "\n southsideoff:{\n  k:'meat'," },
  { name: 'a frozen meal total creeping back into an advice-only list', check: 'prose-macros',
    from: "'You can weigh this one — plan numbers:'", to: "'You can weigh this one — lands ≈1,200 cal for the meal:'" },
  /* --- the Fruity Pebbles bowl: a scoop weight stamped over the row's real amount --- */
  { name: 'an ingredient row losing the quantity it hands to ppTag', check: 'scoop-weights',
    from: "${l}${ppTag(l,false,q)}</span><span class=\"q\">${q}</span>", to: "${l}${ppTag(l)}</span><span class=\"q\">${q}</span>" },
  { name: 'cereal-first rows matching the protein tub again (the b4 case)', check: 'scoop-weights',
    from: "if(PP_ISOTHER.test(s)) return null;", to: "if(false) return null;" },
  { name: 'a trailing "cereal" no longer rejecting the tub match', check: 'scoop-weights',
    from: "if(PP_NOTPOWDER.test(s.slice(i + e[0].length, i + e[0].length + 30))) continue;", to: "if(false) continue;" },
  /* --- the whey shake prescribed after a BBQ dinner --- */
  { name: 'an at-home patch is prescribed after the meal again', check: 'kashrut',
    from: 'Nothing to make up at home.', to: 'At home after: ${EO_PATCH.p}' },
  /* --- Aug 19 2026: a nut-bearing PRODUCT can hide behind a name that says nothing about nuts.
         [nuts] reads text and is blind to {f:'buffin welcome to the sno'}; [nut-facts] reads the flag
         on the fact. Both directions of the spec shape are planted — a plain row and a {parts} part. */
  /* ⛔ THESE TWO PLANT THE FLAG, NOT A REFERENCE TO A FLAGGED FOOD — and the rewrite is the point.
     They used to name {f:'buffin welcome to the sno'}, the only nut-flagged fact on the list. On
     2026-09-04 he corrected that flag off it ("welcome to the sno has coconut. im not allergic";
     the FDA counts coconut as a tree nut, which is why the badge says CONTAINS NUTS), and the moment
     it went, BOTH cases reported MISSED — there was no flagged food left to smuggle anywhere.
     That is the failure this file exists to catch, arriving at this file itself: a fixture anchored
     to one real row, and the row moved.
     ⛔ AND IT LEFT [nut-facts] TOTALLY UNARMED. Zero flagged facts means its flag-and-walk wiring is
     untested, on the one guard standing between an automated swap and anaphylaxis — HummusFit itself
     warns that some muffins contain peanuts and tree nuts, so the next shipment can re-arm it.
     Flagging a food he eats DAILY tests the wiring regardless of what is in his cupboard, and tests
     it harder: almond butter is in 26 ingredient rows and tomato sits inside {parts} composites, so
     one plant each proves the plain-row walk and the parts walk still bite. */
  { name: 'a nut flag on a food used in plain ingredient rows', check: 'nut-facts',
    from: "  'almond butter':     {unit:'g',           sp:[5.94,6.88],",
    to:   "  'almond butter':     {unit:'g', nut:1,    sp:[5.94,6.88]," },
  { name: 'a nut flag on a food used inside a {parts} composite', check: 'nut-facts',
    from: "  'tomato':         {unit:'g', ea:123,",
    to:   "  'tomato':         {unit:'g', nut:1, ea:123," },
  /* ⛔ Anchored on the DISH NAME AND PRICE, not the description. The previous version quoted the whole
     tacos line verbatim and broke the moment that copy was rewritten (2026-08-20) — it printed
     BROKEN CASE while the suite still read as fine, which is the staleness this file already warns
     about. Name + price is what does not churn; the prose around it is edited constantly. */
  { name: 'a meat venue told to finish with something dairy', check: 'kashrut',
    from: "'Smokey Tacos 2 pc $18",
    to:   "'Finish with a yogurt on the way home. Smokey Tacos 2 pc $18" },
];

let bad = 0;
CASES.forEach((c, i) => {
  if (!base.includes(c.from)) { bad++; console.log('  BROKEN CASE  ' + c.name + ' — anchor text not found, fix the selftest'); return; }
  const tmp = path.join(os.tmpdir(), 'checkfood-selftest-' + i + '.html');
  fs.writeFileSync(tmp, base.replace(c.from, c.to), 'utf8');
  let out = '', code = 0;
  try { out = execFileSync(process.execPath, [GUARD, tmp], { encoding: 'utf8' }); }
  catch (e) { code = e.status; out = (e.stdout || '') + (e.stderr || ''); }
  fs.unlinkSync(tmp);
  const caught = code !== 0 && out.includes('FAIL  [' + c.check + ']');  /* the guard prints exactly: '  FAIL  [check] msg' */
  console.log((caught ? '  caught  ' : '  MISSED  ') + '[' + c.check + '] ' + c.name);
  if (!caught) { bad++; console.log(out.split('\n').filter(l => /FAIL|passed|FAILED/.test(l)).map(l => '            ' + l).join('\n')); }
});

console.log('');
if (bad) { console.log(bad + ' case(s) NOT caught — the guard has holes'); process.exit(1); }
console.log('all ' + CASES.length + ' reintroduced errors were caught');
