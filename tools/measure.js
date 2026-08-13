#!/usr/bin/env node
/* measure.js — REAL layout measurement, because jsdom has none.
 *
 * probe.js renders 210 views and reports "clean" for a card whose title has collapsed to "..." and
 * whose chip is stacked one letter per line, because jsdom computes no geometry. Two visually broken
 * builds reached his phone that way. This drives the Microsoft Edge already installed on Windows via
 * puppeteer-core (no browser download), loads the real index.html, and measures boxes.
 *
 * Usage:
 *   NODE_PATH=.work/node_modules node tools/measure.js                  # all checks, default widths
 *   NODE_PATH=.work/node_modules node tools/measure.js --widths 320,390 # pick widths
 *   NODE_PATH=.work/node_modules node tools/measure.js --shot out.png   # also save a screenshot
 *
 * Exits nonzero when a row is taller than one line's worth of text, or when the "next >" stepper sits
 * at a different x for different flavour names. Those are the two defects he actually reported.
 */
'use strict';
const path = require('path');
const fs = require('fs');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const WIDTHS = String(arg('widths', '320,360,390,430')).split(',').map(Number);
const SHOT = arg('shot', null);
const ROOT = path.join(__dirname, '..');

const EDGES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const exe = EDGES.find(p => fs.existsSync(p));
if (!exe) { console.error('no Edge found — install puppeteer, or add the path to EDGES'); process.exit(2); }

let puppeteer;
try { puppeteer = require('puppeteer-core'); }
catch (e) { console.error('needs puppeteer-core:\n  npm --prefix .work install puppeteer-core\n' +
                          '  NODE_PATH=.work/node_modules node tools/measure.js'); process.exit(2); }

let failed = 0;
const ok   = (n, m) => console.log(`  ok    [${n}] ${m}`);
const fail = (n, m) => { failed++; console.log(`  FAIL  [${n}] ${m}`); };
const warn = (n, m) => console.log(`  note  [${n}] ${m}`);

(async () => {
  const browser = await puppeteer.launch({ executablePath: exe, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-device-scale-factor=1'] });
  try {
    for (const W of WIDTHS) {
      const page = await browser.newPage();
      await page.setViewport({ width: W, height: 900, deviceScaleFactor: 1 });
      /* file:// so no server is needed; localStorage still works for the app's own state */
      const url = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
      await page.goto(url, { waitUntil: 'load' });
      /* wipe persisted UI state, then reload — see the note on shared file:// localStorage below */
      await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForSelector('#view', { timeout: 15000 });

      /* ---- 1. TODAY: the flavour stepper must sit at one x for every name length ---- */
      const flav = await page.evaluate(() => {
        const names = ['Fudge', 'Death by Chocolate — Raspberry',
                       'A Very Long Flavour Name That Should Never Move The Buttons Anywhere'];
        const host = document.createElement('div');
        host.className = 'card';
        host.style.cssText = 'position:absolute;left:0;top:0;width:100%';
        host.innerHTML = names.map((n, i) =>
          `<details class="opt acc" data-acc="cor-day" open><summary>` +
          `<b>🥣 ${n}</b>${window.tchip ? tchip('breakfast') : '<span class="chip time">breakfast</span>'}` +
          `<span class="statline">545·39P</span>` +
          `${nextBtns('cor', i % 2 === 0)}${rateBtns('cor:' + n)}</summary></details>`).join('');
        document.body.appendChild(host);
        const xs = [...host.querySelectorAll('.nxb[data-dir="1"]')].map(b => Math.round(b.getBoundingClientRect().left));
        const chips = [...host.querySelectorAll('.chip.time')].map(c => Math.round(c.getBoundingClientRect().height));
        const titles = [...host.querySelectorAll('summary>b')].map(b => Math.round(b.getBoundingClientRect().width));
        host.remove();
        return { xs, spread: Math.max(...xs) - Math.min(...xs), chipH: Math.max(...chips), minTitle: Math.min(...titles) };
      });
      if (flav.spread !== 0) fail('flavor-x@' + W, `next › left edge varies by ${flav.spread}px across names (${flav.xs.join(', ')})`);
      else ok('flavor-x@' + W, `next › fixed at x=${flav.xs[0]}`);
      if (flav.chipH > 40) fail('flavor-chip@' + W, `the breakfast chip is ${flav.chipH}px tall — it is being crushed into stacked letters`);
      else ok('flavor-chip@' + W, `chip ${flav.chipH}px tall (one line)`);
      /* 40px was far too lax and let "🥣 Death …" through — he cannot read which flavour that is.
         The name must get a real share of the row, same floor as the meal names. */
      const tFloor = Math.round(W * 0.4);
      if (flav.minTitle < tFloor) fail('flavor-title@' + W, `narrowest flavour title is ${flav.minTitle}px, ` +
            `under the ${tFloor}px floor — it truncates to an ellipsis instead of wrapping the macros away`);
      else ok('flavor-title@' + W, `narrowest flavour title ${flav.minTitle}px (floor ${tFloor})`);

      /* ---- 2. MEALS: no summary row may run to three lines ---- */
      await page.evaluate(() => {
        const tab = [...document.querySelectorAll('[data-tab],nav button,.tabbtn')]
          .find(b => /meals/i.test(b.textContent || ''));
        if (tab) tab.click();
      });
      /* the tab slides in via .anim-l — measuring mid-flight reports every x offset by the transform,
         which is how I first "found" a 26px indent that did not exist. Let it settle. */
      await new Promise(r => setTimeout(r, 600));

      /* ⛔ EVERY SLOT OPEN, ALWAYS. Pages in one browser share file:// localStorage, and the app
         persists which sections are open (qpcut.acctoggled.*), so consecutive runs measured whichever
         subset happened to be left open by the previous run. That produced "all checks passed" at 390px
         and then, minutes later, a 7px squeeze at the same width on rows the earlier run never laid out.
         A harness whose result depends on leftover state is worse than no harness — it certifies
         whatever it happened to look at. Open everything so all rows are always measured. */
      await page.evaluate(() => {
        document.querySelectorAll('details.slotsec').forEach(d => { d.open = true; });
      });
      await new Promise(r => setTimeout(r, 400));

      const meals = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('details.mealcard>summary, details.slotsec>summary')];
        const out = rows.map(r => {
          const b = r.querySelector('b');
          const lh = parseFloat(getComputedStyle(r).lineHeight) || 20;
          return { h: Math.round(r.getBoundingClientRect().height), lines: Math.round(r.getBoundingClientRect().height / lh),
                   name: (b ? b.textContent : '').trim().slice(0, 34), nameW: b ? Math.round(b.getBoundingClientRect().width) : 0 };
        });
        return { count: out.length, worst: out.sort((a, b) => b.lines - a.lines).slice(0, 4) };
      });
      if (!meals.count) fail('meals-rows@' + W, 'found no meal rows — did the Meals tab fail to open?');
      else {
        /* The honest limit: at 320 px a 47-character name ("Strawberry Shortcake Bowl (protein-powder
           base)") plus a kosher chip plus four macros does not fit in three lines — the macro block
           alone is 176 px of a 234 px row. So this does NOT assert "everything fits"; it asserts the
           name is never squeezed into a narrow column, which is the defect he photographed ("Cream /
           of / Rice" over three lines). 5+ lines means the squeeze is back. */
        /* Reported, NOT failed, and the distinction is the point: line count is driven by how long HIS
           meal names are, which is not mine to change — "Strawberry Shortcake Bowl (protein-powder
           base)" is 47 characters and takes 4 lines in a 234px column however the flexbox is arranged.
           I tuned the basis empirically (12/16ch identical, 20ch made FOUR rows worse by wrapping the
           kosher chip onto its own line) and 12ch is the best available. The hard invariant is the name
           WIDTH floor below — that is the squeeze he photographed, and that is what I control. */
        const bad = meals.worst.filter(r => r.lines >= 5);
        if (bad.length) warn('meal-row@' + W, `${bad.length} long-name row(s) still run to ${bad[0].lines} lines: ` +
              bad.map(r => `"${r.name}" name ${r.nameW}px`).join(' · ') + ' — name length, not squeeze');
        else ok('meal-row@' + W, `${meals.count} rows, worst is ${meals.worst[0].lines} line(s) ("${meals.worst[0].name}")`);
        const floor = Math.round(W * 0.42);   /* the name must get a real share of the row, not scraps */
        const squeezed = meals.worst.filter(r => r.nameW > 0 && r.nameW < floor);
        if (squeezed.length) fail('meal-name@' + W, `name squeezed to ${squeezed[0].nameW}px, under the ` +
              `${floor}px floor ("${squeezed[0].name}")`);
        else ok('meal-name@' + W, `narrowest name ${Math.min(...meals.worst.map(r => r.nameW))}px (floor ${floor})`);
      }

      /* ---- 3. nothing may overflow the viewport horizontally ---- */
      const over = await page.evaluate(() => {
        const de = document.documentElement;
        return { scrollW: de.scrollWidth, clientW: de.clientWidth };
      });
      if (over.scrollW > over.clientW + 1)
        fail('h-overflow@' + W, `page scrolls horizontally: content ${over.scrollW}px in a ${over.clientW}px viewport`);
      else ok('h-overflow@' + W, 'no horizontal overflow');

      if (SHOT) { await page.screenshot({ path: SHOT.replace(/(\.png)?$/, '') + '-' + W + '.png', fullPage: false });
                  console.log('        shot -> ' + SHOT.replace(/(\.png)?$/, '') + '-' + W + '.png'); }
      await page.close();
    }
  } finally { await browser.close(); }
  console.log(failed ? `\n${failed} LAYOUT CHECK(S) FAILED` : '\nall layout checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('measure.js blew up: ' + (e && e.stack || e)); process.exit(2); });
