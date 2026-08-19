#!/usr/bin/env node
/* check-app.plant.js — plants real defects for the BEHAVIOURAL guards in check-app.js, the way
 * check-food.selftest.js does for the food guards. Renamed from check-offplan.plant.js on
 * 2026-08-19 when a second app guard needed planting and the old name stopped describing the file.
 *
 * Every guard here was watched to fail before it was trusted. That is not ceremony: [offplan-topping]
 * passed clean on its first run while a floor lowered to zero slipped straight past it, because the
 * check read its threshold from the code under test. A harness that tests nothing looks exactly like
 * a harness that finds nothing.
 *
 * Restores index.html byte-for-byte, and says so.
 */
'use strict';
const fs = require('fs');
const { execSync } = require('child_process');
const P = 'index.html';
const original = fs.readFileSync(P);
const orig = original.toString('utf8');

const PLANTS = [
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
];

let all = true;
try {
  for (const p of PLANTS) {
    let s = orig, ok = true;
    for (const e of p.edits) {
      if (s.split(e.from).length - 1 !== 1) {
        console.log('BROKEN CASE  [' + p.guard + '] ' + p.name + ' — anchor not unique/found');
        ok = false; all = false; break;
      }
      s = s.replace(e.from, e.to);
    }
    if (!ok) continue;
    if (s === orig) { console.log('BROKEN CASE  [' + p.guard + '] ' + p.name + ' — plant changed nothing'); all = false; continue; }
    fs.writeFileSync(P, s);
    let out = '', code = 0;
    try {
      out = execSync('node tools/check-app.js', {
        env: Object.assign({}, process.env, { NODE_PATH: '.work/node_modules' }), encoding: 'utf8' });
    } catch (e) { code = e.status || 1; out = (e.stdout || '') + (e.stderr || ''); }
    const rx = new RegExp('FAIL\\s+\\[' + p.guard + '\\]');
    if (code !== 0 && rx.test(out)) {
      const line = (out.split('\n').find(l => rx.test(l)) || '').trim();
      console.log('CAUGHT  [' + p.guard + '] ' + p.name);
      console.log('        ' + line.slice(0, 150));
    } else {
      console.log('NOT CAUGHT  [' + p.guard + '] ' + p.name + '  (exit=' + code + ')');
      all = false;
    }
  }
} finally { fs.writeFileSync(P, original); }

const same = fs.readFileSync(P).equals(original);
console.log('\nfile restored byte-exact: ' + same);
console.log(all && same ? 'ALL PLANTS CAUGHT — the app-behaviour guards are load-bearing'
                        : 'PLANT HARNESS FOUND A HOLE');
process.exit(all && same ? 0 : 1);
