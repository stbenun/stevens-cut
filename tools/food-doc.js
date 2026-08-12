#!/usr/bin/env node
/* food-doc.js — write FOOD_FACTS.md: a readable, openable copy of the food-number table.
 *
 * Why this exists: he asked "why cant i see this as a file in explorer" and he was right to.
 * The whole app is ONE 536 KB index.html, so FOOD_FACTS is a JS object buried near line 1428 —
 * there is nothing on disk to open. This generates one.
 *
 * It is GENERATED, never hand-edited. index.html stays the single source of truth; this file is a
 * view of it. `[food-doc]` in check-food.js fails the build if the two disagree, so the readable
 * copy can never quietly drift from the numbers the app actually uses — which is exactly the class
 * of bug (two copies of one truth) that this whole effort is about.
 *
 * It also carries the COVERAGE number, so progress toward 100% is visible instead of promised.
 *
 * Usage: node tools/food-doc.js            (writes FOOD_FACTS.md)
 *        node tools/food-doc.js --check    (exit 1 if the file is stale)
 */
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

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'index.html');
const OUT = path.join(ROOT, 'FOOD_FACTS.md');

function slice(src, decl, close) {
  const i = src.indexOf(decl);
  if (i < 0) return null;
  const j = src.indexOf(close, i);
  return j < 0 ? null : src.slice(i, j + close.length);
}

function build() {
  const src = fs.readFileSync(SRC, 'utf8');

  const ffBlock = slice(src, 'const FOOD_FACTS', '\n};');
  if (!ffBlock) throw new Error('could not find FOOD_FACTS');
  const facts = [];
  const rx = /'([^']+)':\s*\{unit:'([^']*)',\s*cal:([\d.]+),\s*p:([\d.]+),\s*c:([\d.]+),\s*f:([\d.]+),\s*src:'((?:[^'\\]|\\.)*)'/g;
  let m;
  while ((m = rx.exec(ffBlock))) {
    facts.push({ name: m[1], unit: m[2], cal: +m[3], p: +m[4], c: +m[5], f: +m[6], src: m[7] });
  }

  /* what the meal plan actually needs */
  const slotsBlock = slice(src, 'const SLOTS', '\n];') || '';
  const need = new Map();
  const irx = /\['([^']+)','([^']*)',\[[\d.]+,[\d.]+,[\d.]+,[\d.]+\]\]/g;
  while ((m = irx.exec(slotsBlock))) {
    const raw = m[1].replace(/<[^>]*>/g, '');
    const key = foodKey(raw);
    need.set(key, (need.get(key) || 0) + 1);
  }
  const names = facts.map(f => f.name);
  const isCovered = k => names.some(n => n.split(' ').filter(t => t.length > 3).every(t => k.includes(t)));
  const todo = [...need.entries()].filter(([k]) => !isCovered(k)).sort((a, b) => b[1] - a[1]);
  const pct = need.size ? Math.round(100 * (need.size - todo.length) / need.size) : 0;

  /* classify provenance honestly — a src that says "not a label photo" is NOT label-sourced,
     which is a mistake my own earlier summary made out loud. Order matters here. */
  const tag = s => {
    const t = s.toLowerCase();
    if (/not (yet )?confirmed|neither is a label|derived, not a label|needs one weigh/.test(t)) return 'UNVERIFIED';
    if (/^derived|derived from|matches the/.test(t)) return 'derived';
    if (/label|panel|lotusbiscoff/.test(t)) return 'label';
    if (/usda/.test(t)) return 'USDA';
    return 'derived';
  };

  const esc = s => s.replace(/\|/g, '\\|');
  const L = [];
  L.push('# FOOD_FACTS — every per-unit food number in the app');
  L.push('');
  L.push('**GENERATED FILE — do not edit.** Source of truth is `FOOD_FACTS` inside `index.html`.');
  L.push('Regenerate with `node tools/food-doc.js`. `[food-doc]` in check-food.js fails if this is stale.');
  L.push('');
  L.push(`## Coverage: ${need.size - todo.length} / ${need.size} foods in the meal plan (**${pct}%**)`);
  L.push('');
  L.push('`cal/p/c/f` are **per one unit** shown in the `per` column. Multiply by the amount eaten.');
  L.push('');
  const byTag = {};
  facts.forEach(f => { const t = tag(f.src); byTag[t] = (byTag[t] || 0) + 1; });
  L.push('Provenance of the ' + facts.length + ' rows: ' +
    Object.entries(byTag).sort((a, b) => b[1] - a[1]).map(([k, v]) => `**${v}** ${k}`).join(' · '));
  L.push('');
  L.push('| food | per | cal | P | C | F | provenance | source |');
  L.push('|---|---|---:|---:|---:|---:|---|---|');
  facts.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach(f => {
    L.push(`| \`${f.name}\` | ${esc(f.unit)} | ${f.cal} | ${f.p} | ${f.c} | ${f.f} | ${tag(f.src)} | ${esc(f.src)} |`);
  });
  L.push('');
  L.push(`## Still to source — ${todo.length} foods, most-used first`);
  L.push('');
  L.push('Every row below is a hand-typed number with no source anywhere in the repo.');
  L.push('');
  L.push('| food | times it appears in the plan |');
  L.push('|---|---:|');
  todo.forEach(([k, n]) => L.push(`| ${esc(k)} | ${n} |`));
  L.push('');
  return { text: L.join('\n') + '\n', pct, total: need.size, done: need.size - todo.length, facts: facts.length };
}

const r = build();
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== r.text) { console.error('FOOD_FACTS.md is STALE — run: node tools/food-doc.js'); process.exit(1); }
  console.log(`FOOD_FACTS.md up to date — ${r.facts} facts, coverage ${r.done}/${r.total} (${r.pct}%)`);
} else {
  fs.writeFileSync(OUT, r.text);
  console.log(`FOOD_FACTS.md written — ${r.facts} facts, coverage ${r.done}/${r.total} (${r.pct}%)`);
}
