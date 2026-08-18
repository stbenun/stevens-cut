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
  /* src may be DOUBLE-quoted — it has to be whenever the note contains an apostrophe, e.g. the
     Smucker's jam entry. The single-quote-only version of this regex silently skipped that one fact,
     so it never reached FOOD_FACTS.md and the coverage line under-reported by one (61% vs the real
     62%). It went unnoticed because [food-doc] compares this parser's output against this parser's
     output — a fact it cannot see is missing from both sides and the check still passes.
     check-food.js now cross-checks this count against the live Object.keys(FOOD_FACTS). */
  /* `sp:[lo,hi]` is OPTIONAL and sits between unit: and cal: — it marks a deliberate brand or
     flavour spread that [row-math] is allowed to accept. Adding it made three facts invisible to
     the earlier version of this regex; [food-doc-parse] caught that on the next run. */
  /* `ea:` is optional too and sits in the same gap — it gives the gram weight of one discrete unit so
     a row written as a COUNT can price off a per-gram fact. Adding it to 'egg' made that one fact
     invisible here, and [food-doc-parse] caught it on the next run, exactly as it did for sp. Any new
     optional field must be added to this gap or its fact silently vanishes from FOOD_FACTS.md. */
  const rx = /'([^']+)':\s*\{unit:'([^']*)',\s*(?:sp:\[([\d.]+),\s*([\d.]+)\],\s*)?(?:ea:[\d.]+,\s*(?:\/\*(?:[^*]|\*(?!\/))*\*\/\s*)?)?cal:([\d.]+),\s*p:([\d.]+),\s*c:([\d.]+),\s*f:([\d.]+),\s*src:(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
  let m;
  while ((m = rx.exec(ffBlock))) {
    facts.push({ name: m[1], unit: m[2],
                 sp: m[3] !== undefined ? [+m[3], +m[4]] : null,
                 cal: +m[5], p: +m[6], c: +m[7], f: +m[8],
                 src: m[9] !== undefined ? m[9] : m[10] });
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
  const isCovered = COVER;

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
/* --count reports how many FOOD_FACTS entries this file's PARSER can see, and exits 0 whether or not
   FOOD_FACTS.md is stale. check-food.js compares it against the live Object.keys(FOOD_FACTS).
   It is deliberately separate from --check: when both a stale doc and an unparseable entry were folded
   into one exit code, the staleness swallowed the count and the guard reported "has its output
   changed?" for what was actually a missing fact. One check, one failure mode. */
if (process.argv.includes('--count')) { console.log(`${r.facts} facts`); process.exit(0); }
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== r.text) { console.error('FOOD_FACTS.md is STALE — run: node tools/food-doc.js'); process.exit(1); }
  console.log(`FOOD_FACTS.md up to date — ${r.facts} facts, coverage ${r.done}/${r.total} (${r.pct}%)`);
} else {
  fs.writeFileSync(OUT, r.text);
  console.log(`FOOD_FACTS.md written — ${r.facts} facts, coverage ${r.done}/${r.total} (${r.pct}%)`);
}
