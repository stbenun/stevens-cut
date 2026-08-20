#!/usr/bin/env node
/* check-app.plant.js — plants real defects for the BEHAVIOURAL guards in check-app.js, the way
 * check-food.selftest.js does for the food guards.
 *
 * ⛔⛔ THIS HARNESS MUTATES THE REAL index.html, AND ON 2026-08-20 THAT COST AN HOUR.
 * It exited with NO OUTPUT AT ALL, so the "time-seeds itself open" plant stayed baked into the
 * working tree. Everything after it ran against a corrupted file: the re-run reported
 * "BROKEN CASE anchor not unique/found" because the anchor had already been consumed, and ~70 probe
 * renders passed against the defect. It nearly went out in a commit.
 *
 * Note what the sibling harnesses do differently: check-priced.plant.js writes into os.tmpdir(), and
 * check-food.selftest.js writes a temp copy and passes the path to check-food.js (which takes one,
 * argv[2]). Neither can damage the working tree. THIS harness cannot use that pattern yet because
 * check-app.js has no path argument and boots through probe.js. Until it does, the four guards below
 * are what stand between a mid-run death and a corrupted repo.
 *
 *   1. REFUSE TO RUN if index.html is already dirty. Another session may own it — on 2026-08-20 a
 *      second assistant held four uncommitted files in this repo, and running this then would have
 *      destroyed work in progress. It also stops a leftover plant being mistaken for a clean tree.
 *   2. SIDECAR BACKUP on disk before the first plant, checked for on startup. A finally block does
 *      not run if the process is killed; a file on disk survives that.
 *   3. process.exitCode, NEVER process.exit(). exit() can truncate buffered stdout, which is one way
 *      a run ends up looking silent.
 *   4. git diff --numstat asserted EMPTY at the end, and the byte-exact line printed unconditionally.
 *
 * ⛔ EMPTY OUTPUT IS A CRASH, NOT A PASS. The last line below always prints. If you do not see it,
 * this harness died and you must assume index.html is dirty.
 */
'use strict';
const fs = require('fs');
const { execSync } = require('child_process');
const P = 'index.html';
const BAK = 'index.html.plantbak';

const gitDirty = () => {
  try { execSync('git diff --quiet -- ' + P, { stdio: 'ignore' }); return false; }
  catch (e) { return true; }
};
const numstat = () => {
  try { return execSync('git diff --numstat -- ' + P, { encoding: 'utf8' }).trim(); }
  catch (e) { return 'git-error'; }
};

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

function main() {
  /* ---- 1a. a leftover sidecar means a previous run died before restoring ---- */
  if (fs.existsSync(BAK)) {
    console.log('LEFTOVER BACKUP: ' + BAK + ' exists, so a previous run died mid-plant.');
    fs.copyFileSync(BAK, P);
    fs.unlinkSync(BAK);
    console.log('Restored index.html from the backup and removed it. Verify with git diff, then re-run.');
    process.exitCode = 1;
    return;
  }

  /* ---- 1b. refuse to run over anyone else's uncommitted work ---- */
  if (gitDirty()) {
    console.log('REFUSING TO RUN — index.html has uncommitted changes:');
    console.log('  git diff --numstat index.html -> ' + numstat());
    console.log('This harness rewrites index.html in place. If another session owns those changes,');
    console.log('running now would destroy them. Commit or stash first, then re-run.');
    process.exitCode = 2;
    return;
  }

  const original = fs.readFileSync(P);
  const orig = original.toString('utf8');
  fs.copyFileSync(P, BAK);              /* ---- 2. sidecar, before the first plant ---- */

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
      fs.writeFileSync(P, original);     /* restore after EVERY plant, not just at the end */
    }
  } finally {
    fs.writeFileSync(P, original);
  }

  /* ---- 4. prove it, out loud, every time ---- */
  const same = fs.readFileSync(P).equals(original);
  const ns = numstat();
  console.log('');
  console.log('file restored byte-exact: ' + same);
  console.log('git diff --numstat index.html: ' + (ns === '' ? '(empty — clean)' : ns));
  if (same && ns === '') fs.unlinkSync(BAK);   /* backup goes only once the tree is provably clean */
  else console.log('KEEPING ' + BAK + ' — the tree is not provably clean, so the backup stays.');

  const good = all && same && ns === '';
  console.log(good ? 'ALL PLANTS CAUGHT — the app-behaviour guards are load-bearing'
                   : 'PLANT HARNESS FOUND A HOLE (or did not restore cleanly)');
  process.exitCode = good ? 0 : 1;       /* ---- 3. never process.exit() ---- */
}

main();
