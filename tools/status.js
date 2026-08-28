#!/usr/bin/env node
/* status.js — write STATUS.md: what state this project is actually in, right now.
 *
 * WHY THIS EXISTS. On Aug 18 2026 he asked how a brand-new chat could understand the project, and the
 * answer had to start with an admission: CLAUDE.md — the onboarding document — was already lying. Its
 * "THE OPEN PROBLEM" section said most ingredient rows were hand-typed with no source, which had been
 * true that morning and was false by evening. It also called the app ~540 KB when it was 660 KB. A
 * hand-written status doc rots, and a rotted one is worse than none, because it is confidently wrong.
 *
 * So: EVERY NUMBER IN STATUS.md IS COMPUTED HERE. Nothing is typed. `[status-doc]` in check-food.js
 * fails the build when the file on disk disagrees with what this tool would write, exactly as
 * `[food-doc]` guards FOOD_FACTS.md. That guard is the whole mechanism — it is what CLAUDE.md never
 * had, which is why it drifted.
 *
 * THE ONE HAND-MAINTAINED PART is the OPEN list below: things genuinely waiting on HIM, which no
 * amount of computation can discover. Keep it short and delete a line the moment he answers it.
 *
 * Usage: node tools/status.js            (writes STATUS.md)
 *        node tools/status.js --check    (exit 1 if stale)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const OUT = path.join(ROOT, 'STATUS.md');
const CHECKF = path.join(__dirname, 'check-food.js');

/* ⛔ HAND-MAINTAINED, and the only part that is. Each line is a thing only he can settle.
   Delete a line the moment he answers it; do not let this become a graveyard. */
const OPEN = [
  ['Balsamic drizzle brand', 'b2 carries 30 cal for 15 g with no source. Balsamic GLAZE runs 30-90 cal per 15 g depending on how far it is reduced, so the brand decides it.'],
  ['Kodiak flapjack box', 'b3 variant 2 prices 4 frozen flapjacks at 255 cal from a derived figure. Kodiak publishes 14-16 P across formulations, so the box settles it.'],
  ['Salmon species', 'He confirmed WILD, skin off, sushi-grade from a kosher market. Basis is coho, which matches all six rows to within 1 cal. Sockeye would make the app read ~30 cal HIGH per meal; king ~59 LOW and ~7 g fat LOW, which would push five plates over their fat budget. He is asking at the counter.'],
  ['Jiben fat', 'l2 and l3 run 6-7 g over their fat budget. It is structural — eggs plus cottage cheese plus mozzarella — so closing it means changing the food, which is his call, not a portion tweak.']
];

function grabSpan(src, name, open, close) {
  const i = src.indexOf('const ' + name + ' ');
  if (i < 0) return null;
  const s = src.indexOf(open, i);
  let d = 0, j = s;
  for (; j < src.length; j++) { if (src[j] === open) d++; else if (src[j] === close) d--; if (d === 0) break; }
  return src.slice(s, j + 1);
}

function build() {
  const src = fs.readFileSync(SRC, 'utf8');
  const FOOD_FACTS = eval('(' + grabSpan(src, 'FOOD_FACTS', '{', '}') + ')');
  const SLOTS = eval(grabSpan(src, 'SLOTS', '[', ']'));

  /* the app's own pricing engine, lifted between its sentinels — never reimplemented */
  const B = src.indexOf('PRICING-ENGINE-BEGIN'), E = src.indexOf('PRICING-ENGINE-END');
  if (B < 0 || E < 0) throw new Error('PRICING-ENGINE sentinels missing from index.html');
  const engine = src.slice(src.indexOf('*/', B) + 2, src.lastIndexOf('/*', E));
  const names = ['ffUnit', 'ffScale', 'priceRow', 'varTotal', 'FF_ALIAS', 'FF_BASE', 'ffEach'];
  eval(engine + '\n' + names.map(n => 'globalThis.' + n + ' = ' + n + ';').join('\n'));

  /* ---- rows ---- */
  const legacy = [], priced = [], free = [], broken = [];
  const variants = [];
  SLOTS.forEach(sl => sl.opts.forEach(o => (o.vars || []).forEach(function (v, vi) {
    const tag = sl.key + '/' + o.id + (o.vars.length > 1 ? '#' + vi : '');
    (v.ing || []).forEach(function (row) {
      const label = String(row[0]).replace(/<[^>]*>/g, '');
      const sp = row[2];
      if (Array.isArray(sp)) { legacy.push({ tag, label, cal: sp[0] || 0 }); return; }
      if (sp && sp.free) { free.push({ tag, label }); return; }
      if (priceRow(row) === null) { broken.push({ tag, label }); return; }
      priced.push({ tag, label });
    });
    variants.push({ tag, name: o.name, slot: sl.key, b: sl.b, t: varTotal(v) });
  })));
  const rowTotal = legacy.length + priced.length + free.length + broken.length;

  /* ---- ceilings, read from the guard so they cannot be misquoted here ---- */
  const cf = fs.readFileSync(CHECKF, 'utf8');
  const ceil = n => { const m = new RegExp(n + '\\s*=\\s*(\\d+)').exec(cf); return m ? m[1] : '?'; };

  /* ---- provenance mix ---- */
  /* One copy, shared with food-doc.js. These two used to disagree about 15 foods because each
     carried its own classifier, testing in a different order. See tools/provenance.js. */
  const tag = require('./provenance.js').tag;
  const prov = {};
  Object.keys(FOOD_FACTS).forEach(k => { const t = tag(FOOD_FACTS[k].src); prov[t] = (prov[t] || 0) + 1; });

  const BUILD = (/const BUILD = '([^']+)'/.exec(src) || [])[1] || '?';
  const R = x => Math.round(x);
  const L = [];

  L.push('# STATUS — where this project actually is');
  L.push('');
  L.push('**GENERATED FILE — do not edit.** Written by `node tools/status.js`, and `[status-doc]` in');
  L.push('check-food.js fails the build when it is stale. Every number below is computed from');
  L.push('`index.html`, never typed — which is the difference between this file and the onboarding');
  L.push('section of CLAUDE.md that had gone quietly wrong by the time anyone noticed.');
  L.push('');
  L.push('| | |');
  L.push('|---|---|');
  L.push('| app | `index.html`, ' + fs.statSync(SRC).size.toLocaleString() + ' bytes, ' + src.split('\n').length.toLocaleString() + ' lines, one file |');
  L.push('| build | `' + BUILD + '` |');
  L.push('| foods on the price list | ' + Object.keys(FOOD_FACTS).length + ' |');
  L.push('| provenance | ' + Object.keys(prov).sort((a, b) => prov[b] - prov[a]).map(k => prov[k] + ' ' + k).join(' · ') + ' |');
  L.push('');

  L.push('## Ingredient rows');
  L.push('');
  L.push('A row either NAMES its source in `FOOD_FACTS` and is multiplied at render time, or it still');
  L.push('carries a hand-typed copy of its macros. The second kind is the one that can be silently wrong.');
  L.push('');
  L.push('| | rows | |');
  L.push('|---|---:|---|');
  L.push('| priced from FOOD_FACTS | **' + priced.length + '** | ' + Math.round(100 * priced.length / rowTotal) + '% of ' + rowTotal + ' |');
  L.push('| deliberately zero (`{free:1}`) | ' + free.length + ' | spices, rubs, a free garnish |');
  L.push('| still hand-typed | **' + legacy.length + '** | ceiling ' + ceil('LEGACY_CEILING') + ', only ever falls |');
  L.push('| broken | ' + broken.length + ' | any number here fails the build |');
  L.push('');
  if (legacy.length) {
    L.push('### The hand-typed rows that remain');
    L.push('');
    L.push('| row | amount-carried cal | why it is still hand-typed |');
    L.push('|---|---:|---|');
    const WHY = {
      'Topping / mix-in': 'a SPEC, not an observation — the Creami topping allowance he has to hit',
      'Balsamic drizzle': 'needs his brand (see Waiting on him)',
      'Kodiak buttermilk Power Flapjacks': 'needs his box (see Waiting on him)',
      'Ryse/RAW protein': 'flavor rotates daily, so per-scoop is the honest unit; the card prints that day\'s grams'
    };
    legacy.forEach(r => {
      const why = Object.keys(WHY).find(k => r.label.indexOf(k) >= 0);
      L.push('| `' + r.tag + '` ' + r.label.slice(0, 44).replace(/\|/g, '\\|') + ' | ' + r.cal + ' | ' + (why ? WHY[why] : 'not yet migrated') + ' |');
    });
    L.push('');
  }

  L.push('## Every meal against its slot budget');
  L.push('');
  L.push('Budgets are targets he has to hit, not observations. When a plate disagrees with one, the FOOD');
  L.push('moves — never the budget. `[slot-fit]` fails the build on anything more than 25 cal OVER.');
  L.push('');
  L.push('| meal | | total | vs budget |');
  L.push('|---|---|---|---:|');
  variants.slice().sort((a, z) => (z.t[0] - z.b[0]) - (a.t[0] - a.b[0])).forEach(v => {
    const d = v.t[0] - v.b[0];
    const flag = d > 25 ? ' ⛔ OVER' : (Math.abs(d) > 15 ? ' ·' : '');
    L.push('| `' + v.tag + '` | ' + v.name.slice(0, 38).replace(/\|/g, '\\|') + ' | ' + v.t.join(' / ') +
      ' | ' + (d > 0 ? '+' : '') + R(d) + ' cal' + flag + ' |');
  });
  L.push('');
  const over = variants.filter(v => v.t[0] - v.b[0] > 25).length;
  L.push('**' + over + ' of ' + variants.length + ' variants over budget.**');
  L.push('');

  L.push('## Waiting on him');
  L.push('');
  L.push('The only hand-maintained list in this file — nothing can compute what he has not said yet.');
  L.push('');
  OPEN.forEach(([q, why]) => { L.push('- **' + q + '** — ' + why); });
  L.push('');

  L.push('## How to verify all of this yourself');
  L.push('');
  L.push('```bash');
  L.push('node tools/check-food.js                                 # food numbers, budgets, provenance');
  L.push('NODE_PATH=.work/node_modules node tools/check-app.js      # schedule, rotations, name leak');
  L.push('NODE_PATH=.work/node_modules node tools/probe.js          # renders his real data, every tab/day');
  L.push('node tools/check-priced.plant.js                          # plants real defects, proves [priced] fires');
  L.push('node tools/check-food.selftest.js                         # plants real defects across the food guards');
  L.push('node tools/check-app.plant.js                              # plants real defects, proves the app-behaviour guards fire');
  L.push('```');
  L.push('');
  L.push('Do not trust a claim in any document — including this one — over what those five print.');
  return L.join('\n') + '\n';
}

const text = build();
if (process.argv.indexOf('--check') >= 0) {
  let cur = '';
  try { cur = fs.readFileSync(OUT, 'utf8'); } catch (e) { /* missing counts as stale */ }
  if (cur !== text) { console.log('STATUS.md is stale — run: node tools/status.js'); process.exit(1); }
  console.log('STATUS.md is current');
} else {
  fs.writeFileSync(OUT, text);
  console.log('wrote STATUS.md');
}
