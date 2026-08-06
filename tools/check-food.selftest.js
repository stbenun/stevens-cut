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
    from: "], t:[586,55,49,19]}]},", to: "], t:[520,55,49,19]}]}," },
  { name: 'a cashew smuggled into an ingredient list', check: 'nuts',
    from: "['Broccoli (or asparagus / string beans)','150 g',[50,3,10,0]]", to: "['Cashew butter','10 g',[60,2,2,5]]" },
  { name: 'the sushi anchor drifting away from FOOD_FACTS', check: 'anchors',
    from: "cal:22,p:4.7,c:0,f:.3,min:6,max:16", to: "cal:31,p:4.7,c:0,f:.3,min:6,max:16" },
  /* --- the Aug 6 2026 bug: a venue whose plan cannot respond to the budget --- */
  { name: 'a real restaurant losing its budget-aware order entry', check: 'venue-source',
    from: "\n southside:{\n  base:[{n:'Pickles", to: "\n southsideoff:{\n  base:[{n:'Pickles" },
  { name: 'a frozen meal total creeping back into an advice-only list', check: 'prose-macros',
    from: "'You can weigh this one — plan numbers:'", to: "'You can weigh this one — lands ≈1,200 cal for the meal:'" },
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
