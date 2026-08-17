#!/usr/bin/env node
/* measure-lift.js — REAL geometry for the LIFT card, with his real logged data seeded.
 *
 * measure.js clears localStorage, so the exercise rows render with no history: no 🎉 GO UP badge, no
 * "⏸ why lighter?" badge, no coach line. That is exactly the state that CANNOT show the defect. The
 * summary row he screenshotted twice now carries up to TWO badges beside the exercise name, and a
 * second badge is the classic way this row squeezes on a ~400 px phone.
 *
 * Seeds .work/gistdata.json into localStorage, opens the Lift card, expands every exercise, and
 * measures. Fails on horizontal overflow, on a summary row taller than 2 lines, or on an exercise name
 * squeezed below a readable floor.
 *
 * Usage: NODE_PATH=.work/node_modules node tools/measure-lift.js [--widths 320,390] [--shot out.png]
 */
'use strict';
const path = require('path');
const fs = require('fs');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const WIDTHS = String(arg('widths', '320,360,390,430')).split(',').map(Number);
const SHOT = arg('shot', null);
const ROOT = path.join(__dirname, '..');
const DATA = path.join(ROOT, '.work', 'gistdata.json');

if (!fs.existsSync(DATA)) {
  console.error('need .work/gistdata.json first:\n  gh api gists/cdea638da31299a8b1bdc25d0aeb3e98 ' +
                '--jq \'.files["thecut-data.json"].content\' > .work/gistdata.json');
  process.exit(2);
}
const payload = JSON.parse(fs.readFileSync(DATA, 'utf8'));

const EDGES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
];
const exe = EDGES.find(p => fs.existsSync(p));
if (!exe) { console.error('no Edge found'); process.exit(2); }

let puppeteer;
try { puppeteer = require('puppeteer-core'); }
catch (e) { console.error('needs puppeteer-core: npm --prefix .work install puppeteer-core'); process.exit(2); }

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
      await page.setViewport({ width: W, height: 1400, deviceScaleFactor: 1 });
      const url = 'file:///' + path.join(ROOT, 'index.html').replace(/\\/g, '/');
      await page.goto(url, { waitUntil: 'load' });
      /* seed his real state, then reload so the app boots against it */
      await page.evaluate(d => {
        try { localStorage.clear(); } catch (e) {}
        for (const k in d) localStorage.setItem(k, d[k]);
        localStorage.setItem('qpcut.loc', '"deal"');
      }, payload.data);
      await page.goto(url, { waitUntil: 'load' });
      await page.waitForSelector('#view', { timeout: 15000 });

      /* open the Lift accordion + every exercise fold, then let the transitions settle */
      const opened = await page.evaluate(() => {
        const lift = document.getElementById('liftLog');
        if (!lift) return 0;
        lift.open = true;
        const f = [...lift.querySelectorAll('details.exfold')];
        f.forEach(d => { d.open = true; });
        return f.length;
      });
      if (!opened) { fail(`lift-card@${W}`, 'no lift card rendered — is today a workout day?'); await page.close(); continue; }
      await new Promise(r => setTimeout(r, 700));

      const m = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('#liftLog details.exfold > summary')].map(s => {
          const nm = s.querySelector('.exnm');
          const flags = [...s.querySelectorAll('.upflag')].map(f => ({
            text: f.textContent.trim(),
            h: Math.round(f.getBoundingClientRect().height),
            w: Math.round(f.getBoundingClientRect().width)
          }));
          const lh = parseFloat(getComputedStyle(s).lineHeight) || 18;
          /* Measure the NAME TEXT itself, not the .exnm box: the box's height also grows when a badge
             drops to a second line, which is fine and even desirable. A Range over the leading text
             node reports how many lines the exercise name actually occupies. */
          let bare = '', nameTextLines = 1;
          if (nm) {
            const tn = [...nm.childNodes].find(n => n.nodeType === 3 && n.textContent.trim());
            if (tn) {
              bare = tn.textContent.replace(/\s+/g, ' ').trim();
              const rg = document.createRange(); rg.selectNodeContents(tn);
              nameTextLines = Math.max(1, rg.getClientRects().length);
            } else { bare = nm.textContent.replace(/\s+/g, ' ').trim(); }
          }
          const nmLh = nm ? (parseFloat(getComputedStyle(nm).lineHeight) || lh) : lh;
          return {
            text: (nm ? nm.textContent : s.textContent).replace(/\s+/g, ' ').trim().slice(0, 48),
            nameText: bare,
            h: Math.round(s.getBoundingClientRect().height),
            nameW: nm ? Math.round(nm.getBoundingClientRect().width) : 0,
            nameLines: nameTextLines,
            boxLines: nm ? Math.max(1, Math.round(nm.getBoundingClientRect().height / nmLh)) : 1,
            lines: Math.max(1, Math.round(s.getBoundingClientRect().height / lh)),
            flags
          };
        });
        /* the guide + chip rows inside each open exercise */
        const guides = [...document.querySelectorAll('#liftLog .exguide')].map(g => ({
          h: Math.round(g.getBoundingClientRect().height),
          chips: g.querySelectorAll('[data-ldrop]').length,
          rir: g.querySelectorAll('[data-rir]').length,
          text: g.textContent.replace(/\s+/g, ' ').trim().slice(0, 90)
        }));
        /* any weight box pre-filled? read the actual DOM values */
        const boxes = [...document.querySelectorAll('#liftLog input.prw2')].map(i => i.value);
        const de = document.documentElement;
        return { rows, guides, boxes,
                 overflow: de.scrollWidth - de.clientWidth,
                 chipRowWrapped: [...document.querySelectorAll('#liftLog .exguide [data-ldrop]')]
                   .map(b => Math.round(b.getBoundingClientRect().top)) };
      });

      /* 1. no horizontal overflow, ever */
      if (m.overflow > 1) fail(`h-overflow@${W}`, `page scrolls ${m.overflow}px horizontally`);
      else ok(`h-overflow@${W}`, 'no horizontal overflow');

      /* 2. the summary row must not tower — 2 lines is the tolerated wrap, 3+ is the squeeze.
         320 is a NOTE, not a fail: his phone measures 390 pt (the screenshots are 945x2048 = 390x844
         at 3x, resized), and no current iPhone is 320. A 25-character exercise name beside two numeric
         columns and a badge genuinely needs 3 lines down there. Naming the row beats hiding it. */
      const tall = m.rows.filter(r => r.lines > 2);
      if (tall.length && W >= 360) fail(`lift-row@${W}`, tall.map(r => `"${r.text}" ${r.lines} lines (${r.h}px)`).join(' · '));
      else if (tall.length) warn(`lift-row@${W}`, `below any current iPhone: ${tall.map(r => `"${r.text}" ${r.lines} lines`).join(' · ')}`);
      else ok(`lift-row@${W}`, `${m.rows.length} rows, worst is ${Math.max(...m.rows.map(r => r.lines))} line(s)`);

      /* 3. every badge stays on ONE line — a badge stacked letter-per-line is the exact bug he sent */
      const badBadge = m.rows.flatMap(r => r.flags.filter(f => f.h > 30).map(f => `${r.text}: "${f.text}" ${f.h}px`));
      if (badBadge.length) fail(`lift-badge@${W}`, badBadge.join(' · '));
      else {
        const all = m.rows.flatMap(r => r.flags);
        ok(`lift-badge@${W}`, all.length ? `${all.length} badge(s), tallest ${Math.max(...all.map(f => f.h))}px (one line)` : 'no badges in this state');
      }

      /* 4. A short name must not be forced to wrap. NOT a "% of width" floor — that invariant is wrong
         and already cost a round here: it flagged four perfectly healthy rows at 320 whose names simply
         are long. What matters is whether flex squeezed a name that had no business wrapping. */
      const shortWrapped = m.rows.filter(r => r.nameText && r.nameText.length <= 18 && r.nameLines > 1);
      if (shortWrapped.length)
        fail(`lift-name@${W}`, shortWrapped.map(r => `"${r.nameText}" (${r.nameText.length} chars) wrapped to ${r.nameLines} lines in ${r.nameW}px`).join(' · '));
      else ok(`lift-name@${W}`, `no short name forced to wrap (shortest: "${m.rows.map(r=>r.nameText).sort((a,b)=>a.length-b.length)[0]}")`);

      /* 5. the "lighter because" chips must sit on ONE row, like the RIR chips they mirror */
      const tops = [...new Set(m.chipRowWrapped)];
      if (m.chipRowWrapped.length && tops.length > 1)
        fail(`ldrop-chips@${W}`, `${m.chipRowWrapped.length} chips across ${tops.length} rows`);
      else if (m.chipRowWrapped.length)
        ok(`ldrop-chips@${W}`, `${m.chipRowWrapped.length} chips on one row`);
      else warn(`ldrop-chips@${W}`, 'no load-drop chips in this state');

      /* 6. the thing he asked for: are the boxes actually pre-filled? */
      const filled = m.boxes.filter(v => v !== '').length;
      if (!m.boxes.length) warn(`prefill@${W}`, 'no weight boxes found');
      else if (filled === 0) fail(`prefill@${W}`, `all ${m.boxes.length} weight boxes are EMPTY`);
      else ok(`prefill@${W}`, `${filled}/${m.boxes.length} weight boxes carry a load: ${m.boxes.join(' ')}`);

      if (W === WIDTHS[0]) {
        console.log('        guide lines:');
        m.guides.forEach(g => console.log(`          [${g.h}px, ${g.chips} why-chips, ${g.rir} rir] ${g.text}`));
      }
      if (SHOT && W === WIDTHS[0]) await page.screenshot({ path: SHOT, fullPage: true });
      await page.close();
    }
  } finally { await browser.close(); }
  console.log(failed ? `\n${failed} layout check(s) FAILED` : '\nall lift layout checks passed');
  process.exit(failed ? 1 : 0);
})();
