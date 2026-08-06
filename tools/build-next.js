#!/usr/bin/env node
/* build-next.js — generate next/index.html = index.html + next/skin.html
 *
 * The new app is NOT a fork. It is the live app with a different view layer stapled on, so every
 * recipe, rotation, macro and engine function has exactly one definition. A fork would have meant
 * two copies of his food data, and drift between them is the bug class this whole refresh existed
 * to kill.
 *
 * Because only the PATH differs (/stevens-cut/ vs /stevens-cut/next/), the origin is identical and
 * localStorage is shared — the new app operates on his real data and syncs through the same gist.
 * Nothing to migrate, and whichever app he has open, both agree.
 *
 * Run after ANY change to index.html:  node tools/build-next.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const base = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const skin = fs.readFileSync(path.join(ROOT, 'next', 'skin.html'), 'utf8');

if (!base.includes('</body>')) { console.error('index.html has no </body> to insert before'); process.exit(1); }

/* The self-updater fetches `location.pathname`, so it already checks ITSELF rather than the root
   file — the preview updates independently and needs no patching here. Verified, not assumed. */
let out = base.replace('</body>', skin + '\n</body>');

/* A banner so a screenshot of the preview is never mistaken for the real app — the single most
   expensive diagnostic mistake in this project's history was not knowing which file he was on. */
out = out.replace('<div class="app">',
  '<div class="app">\n' +
  '  <div id="nxPreviewFlag" style="background:#A8761F;color:#fff;font:600 12px/1.4 ' +
  '-apple-system,system-ui,sans-serif;padding:7px 14px;text-align:center">' +
  'PREVIEW BUILD — the app you rely on is still at ' +
  '<a href="../" style="color:#fff">stbenun.github.io/stevens-cut</a>. ' +
  'This one shares the same data.</div>');

fs.mkdirSync(path.join(ROOT, 'next'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'next', 'index.html'), out);

const kb = n => (n / 1024).toFixed(0) + ' KB';
console.log(`next/index.html written — ${kb(out.length)} (base ${kb(base.length)} + skin ${kb(skin.length)})`);
