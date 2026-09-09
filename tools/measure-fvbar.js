#!/usr/bin/env node
/* measure-fvbar.js — is the picks bar ON SCREEN without scrolling, and are the last foods still
 * reachable underneath it?
 *
 * WHY ITS OWN TOOL. mkpreview reports element boxes and horizontal overflow, which is what layout
 * questions usually need. This question is different: it is about a FIXED element's position in the
 * viewport at scroll 0, and about whether a fixed element is covering content that has to stay
 * tappable. jsdom cannot answer either — it computes no geometry — and the bar spent its whole life
 * laid out statically at the end of a 203-food list precisely because nothing measured it.
 *
 * Checks, at his 390x844:
 *   ① at scrollY = 0, the bar's box is fully inside the viewport
 *   ② the bar sits ABOVE the fixed tab bar rather than under it
 *   ③ scrolled to the bottom, the last food row is not hidden behind the bar
 *   ④ nothing scrolls sideways
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const probe = require('./probe.js');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n);
  return i > -1 && process.argv[i+1] && !process.argv[i+1].startsWith('--') ? process.argv[i+1] : d; };
const W = +arg('width', 390), H = +arg('height', 844);
const CHROME = arg('chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe');
const OUT = path.resolve(arg('out', 'scratchpad'));
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const inst = probe.boot('2026-08-06', '09:00', 'deal');
const body = inst.win.__probe(`(function(){
  fvSet({slot:'bf', tab:'all', q:'', pick:null, sel:['strawberries','elev8 cor'], selAmt:{strawberries:{n:155,u:'g'}}});
  current = 'today'; render();
  return document.body.innerHTML;
})()`);
const problems = probe.drain();
if (problems.length) { console.log('probe reported problems before measuring: ' + problems.length); }

const src = fs.readFileSync(probe.SRC, 'utf8');
const styles = (src.match(/<style[\s\S]*?<\/style>/g) || []).join('\n');
if (!styles) { console.error('no <style> found in ' + probe.SRC); process.exit(1); }
const page = '<!doctype html><html><head><meta charset="utf-8">'
  + '<meta name="viewport" content="width=device-width,initial-scale=1">' + styles
  + '</head><body>' + body + '</body></html>';
const tmp = path.join(os.tmpdir(), 'fvbar-' + Date.now() + '.html');
fs.writeFileSync(tmp, page);

(async () => {
  let puppeteer;
  try { puppeteer = require('puppeteer-core'); }
  catch (e) { console.error('puppeteer-core not installed under .work/node_modules'); process.exit(1); }
  if (!fs.existsSync(CHROME)) { console.error('no Chrome at ' + CHROME); process.exit(1); }

  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
                                           args: ['--no-sandbox', '--hide-scrollbars'] });
  const pg = await browser.newPage();
  await pg.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
  await pg.goto('file:///' + tmp.replace(/\\/g, '/'), { waitUntil: 'load' });

  const r = await pg.evaluate(() => {
    const box = el => { if(!el) return null; const b = el.getBoundingClientRect();
      return {top: Math.round(b.top), bottom: Math.round(b.bottom), h: Math.round(b.height)}; };
    window.scrollTo(0, 0);
    const bar = document.querySelector('.fvbar');
    const nav = document.querySelector('nav.tabs');
    const out = { vh: window.innerHeight, atTop: box(bar), nav: box(nav),
                  scrollW: document.documentElement.scrollWidth,
                  clientW: document.documentElement.clientWidth,
                  rows: document.querySelectorAll('.fvrow').length,
                  pagePadBottom: getComputedStyle(document.querySelector('.fvpage')).paddingBottom,
                  position: bar ? getComputedStyle(bar).position : null };
    /* ⛔ ORDER MATTERS AND I GOT IT WRONG ONCE. The last row has to be measured while scrolled to
       the END — that is the only position where "is it hidden behind the bar" means anything. Taken
       at scroll 0 its rect is thousands of pixels down the page and the comparison is nonsense: it
       reported a 3,294px overlap that did not exist. Screenshot last, back at the top, because the
       top is the state he complained about. */
    window.scrollTo(0, document.body.scrollHeight);
    out.atBottom = box(document.querySelector('.fvbar'));
    const rows = document.querySelectorAll('.fvrow');
    out.lastRow = box(rows[rows.length - 1]);
    out.scrolledBy = Math.round(window.scrollY);
    window.scrollTo(0, 0);
    out.shotAt = 'top';
    return out;
  });

  const bad = [];
  if (!r.atTop) bad.push('there is no .fvbar on screen at all');
  else {
    if (r.position !== 'fixed') bad.push('the bar is position:' + r.position + ' — sticky cannot work under body overflow-x:hidden');
    if (r.atTop.bottom > r.vh) bad.push('at the top of the list the bar runs ' + (r.atTop.bottom - r.vh) + 'px BELOW the fold — he would have to scroll for it');
    if (r.atTop.top < 0) bad.push('the bar is above the top of the viewport');
    if (r.nav && r.atTop.bottom > r.nav.top + 1) bad.push('the bar overlaps the tab bar by ' + (r.atTop.bottom - r.nav.top) + 'px — it would read as missing');
    if (r.atBottom && Math.abs(r.atBottom.top - r.atTop.top) > 1)
      bad.push('the bar moved ' + Math.abs(r.atBottom.top - r.atTop.top) + 'px when scrolled — it is not actually pinned');
    if (r.lastRow && r.lastRow.bottom > r.atTop.top + 1)
      bad.push('scrolled to the end, the last food row is ' + (r.lastRow.bottom - r.atTop.top) + 'px behind the bar — it cannot be tapped');
  }
  if (r.scrollW - r.clientW > 0) bad.push('the page scrolls sideways by ' + (r.scrollW - r.clientW) + 'px');
  if (r.rows < 20) bad.push('only ' + r.rows + ' rows rendered — this measurement is vacuous');
  if (!(r.scrolledBy > 200)) bad.push('the page only scrolled ' + r.scrolledBy + 'px, so the last-row clause proved nothing');

  console.log('viewport ' + W + 'x' + r.vh + '  ·  ' + r.rows + ' rows  ·  .fvpage padding-bottom ' + r.pagePadBottom);
  console.log('bar at scroll 0     : top ' + (r.atTop && r.atTop.top) + '  bottom ' + (r.atTop && r.atTop.bottom) + '  (position:' + r.position + ')');
  console.log('bar scrolled to end : top ' + (r.atBottom && r.atBottom.top));
  console.log('tab bar top         : ' + (r.nav && r.nav.top));
  console.log('last row bottom     : ' + (r.lastRow && r.lastRow.bottom));
  const shot = path.join(OUT, 'fvbar-' + W + '.png');
  await pg.screenshot({ path: shot });
  console.log('screenshot: ' + shot);
  await browser.close();

  console.log('');
  if (bad.length) { console.log(bad.length + ' PROBLEM(S):'); bad.forEach(b => console.log('  ⛔ ' + b)); process.exit(1); }
  console.log('the picks bar is pinned on screen, clear of the tab bar, and the last food stays tappable');
})();
