#!/usr/bin/env node
/* mkpreview.js — render a REAL card at phone widths and MEASURE it.
 *
 * ⛔ THIS EXISTS BECAUSE jsdom COMPUTES NO GEOMETRY. probe.js renders 210 clean views of a visually
 * broken card and every guard passes, which is exactly how this repo once shipped a card whose title
 * read "..." with the chip stacked one letter per line. CLAUDE.md's rule — never ship a layout change
 * on reasoning alone — needs a tool behind it, and the tool it named was not in the tree.
 *
 * WHAT IT DOES. Boots the app through probe.js (so the markup and the CSS are the shipped ones, with
 * his real data), drives the page into the state you want to look at, then loads it in headless
 * Chrome at 320 and 400 px and reports:
 *   · horizontal overflow — the page body must never scroll sideways
 *   · per-element boxes for a selector you name, so a column that has collapsed is a NUMBER
 *   · a PNG per width
 *
 * Usage:  node tools/mkpreview.js --slot bf --measure ".erow" [--out scratchpad]
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const probe = require('./probe.js');

const arg = (n, d) => {
  const i = process.argv.indexOf('--' + n);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d;
};
const SLOT     = arg('slot', 'bf');
const MEASURE  = arg('measure', '.erow');
const OUTDIR   = path.resolve(arg('out', 'scratchpad'));
const WIDTHS   = (arg('widths', '320,400')).split(',').map(Number);
const CHROME   = arg('chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');

if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

/* ---- 1. boot the app and drive it into the state worth looking at -------------------------- */
const DAY = '2026-08-06';
const inst = probe.boot(DAY, '09:00', 'deal');
const setup = `
  const D = isoToday();
  /* log a meal so the row editor has something to edit, and open its slot + the editor */
  logSetMeal(D, ${JSON.stringify(SLOT)}, 'b1');
  expandSlot = ${JSON.stringify(SLOT)};
  openAcc.add('erow-' + ${JSON.stringify(SLOT)});
  render();
  return document.body.innerHTML;
`;
const body = inst.win.__probe('(function(){\n' + setup + '\n})()');
const problems = probe.drain();

/* the shipped <style>, lifted rather than reimplemented — a preview against different CSS is a lie */
const src = fs.readFileSync(probe.SRC, 'utf8');
const styles = (src.match(/<style[\s\S]*?<\/style>/g) || []).join('\n');
if (!styles) { console.error('could not find any <style> in ' + probe.SRC); process.exit(1); }

const page = '<!doctype html><html><head><meta charset="utf-8">'
  + '<meta name="viewport" content="width=device-width,initial-scale=1">'
  + styles + '</head><body>' + body + '</body></html>';
const tmp = path.join(os.tmpdir(), 'qpcut-preview-' + Date.now() + '.html');
fs.writeFileSync(tmp, page);

/* ---- 2. render it in a REAL browser and measure -------------------------------------------- */
(async () => {
  let puppeteer;
  try { puppeteer = require('puppeteer-core'); }
  catch (e) { console.error('puppeteer-core not installed under .work/node_modules'); process.exit(1); }
  if (!fs.existsSync(CHROME)) { console.error('no Chrome at ' + CHROME + ' — pass --chrome'); process.exit(1); }

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
                                           args: ['--no-sandbox', '--hide-scrollbars'] });
  let bad = 0;
  for (const w of WIDTHS) {
    const pg = await browser.newPage();
    await pg.setViewport({ width: w, height: 900, deviceScaleFactor: 2 });
    await pg.goto('file:///' + tmp.replace(/\\/g, '/'), { waitUntil: 'load' });

    const r = await pg.evaluate(sel => {
      const out = { scrollW: document.documentElement.scrollWidth,
                    clientW: document.documentElement.clientWidth, rows: [] };
      document.querySelectorAll(sel).forEach((el, i) => {
        if (i > 5) return;
        const kids = [...el.children].map(k => {
          const b = k.getBoundingClientRect();
          return { tag: k.tagName.toLowerCase() + (k.className ? '.' + String(k.className).split(' ')[0] : ''),
                   w: Math.round(b.width), x: Math.round(b.left),
                   txt: (k.textContent || '').trim().slice(0, 22),
                   clipped: k.scrollWidth > k.clientWidth + 1 };
        });
        const b = el.getBoundingClientRect();
        out.rows.push({ h: Math.round(b.height), w: Math.round(b.width), kids });
      });
      return out;
    }, MEASURE);

    const overflow = r.scrollW - r.clientW;
    console.log('\n=== ' + w + ' px ===  document scrollWidth ' + r.scrollW + ' vs viewport ' + r.clientW
      + (overflow > 0 ? '   ⛔ OVERFLOWS BY ' + overflow + 'px' : '   ok, no sideways scroll'));
    if (overflow > 0) bad++;
    if (!r.rows.length) { console.log('  ⚠️  selector ' + MEASURE + ' matched NOTHING — this preview measured nothing'); bad++; }
    r.rows.forEach((row, i) => {
      console.log('  row ' + i + '  h=' + row.h + 'px');
      row.kids.forEach(k => console.log('      ' + k.tag.padEnd(14) + ' x=' + String(k.x).padStart(4)
        + '  w=' + String(k.w).padStart(4) + (k.clipped ? '  ✂ TEXT CLIPPED' : '') + '   "' + k.txt + '"'));
    });
    /* a row taller than ~2 lines means it wrapped — the deformation this tool exists to catch */
    r.rows.forEach((row, i) => { if (row.h > 60) { console.log('  ⛔ row ' + i + ' is ' + row.h + 'px tall — it wrapped'); bad++; } });

    /* ⛔ SHOOT WHAT WE MEASURED. The first version screenshotted the viewport at scroll 0 and handed
       back a picture of the page HEADER while reporting on a card 2,000 px further down. A preview
       of the wrong element is worse than no preview: it looks like evidence. */
    const clip = await pg.evaluate(sel => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const card = el.closest('.card, details') || el;
      const b = card.getBoundingClientRect();
      return { x: Math.max(0, b.left - 6), y: b.top + window.scrollY - 6,
               width: Math.min(window.innerWidth, b.width + 12), height: b.height + 12 };
    }, MEASURE);
    const png = path.join(OUTDIR, 'preview-' + SLOT + '-' + w + '.png');
    if (clip && clip.height > 8) await pg.screenshot({ path: png, clip, captureBeyondViewport: true });
    else { await pg.screenshot({ path: png, fullPage: true }); console.log('  (could not locate ' + MEASURE + "'s card — full page instead)"); }
    console.log('  screenshot: ' + png);
    await pg.close();
  }
  await browser.close();
  fs.unlinkSync(tmp);
  if (problems.length) console.log('\napp reported: ' + problems.join(' | '));
  console.log('\n' + (bad ? bad + ' LAYOUT PROBLEM(S) — do not ship' : 'layout clean at ' + WIDTHS.join(' and ') + ' px'));
  process.exit(bad ? 1 : 0);
})();
