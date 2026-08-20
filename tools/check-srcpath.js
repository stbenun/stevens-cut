#!/usr/bin/env node
/* check-srcpath.js — differential proof that --file is honoured, and that honouring it changes
 * nothing else. check-app.plant.js DEPENDS on this: it stopped mutating index.html on 2026-08-20
 * and plants into a temp copy instead, which is only safe if --file reaches every reader.
 *
 * THE SUITE GOING GREEN CANNOT PROVE THIS. A --file that is silently ignored gives a green suite AND
 * byte-identical output — the plant harness would then be testing the real file while reporting on a
 * copy, which is the 2026-08-20 failure at larger scale. So this asserts the NEGATIVE too: a defect
 * planted in a copy must actually FAIL.
 *
 * Two mechanisms, tested separately, because either could be left pointing at the real file:
 *   probe.js resolves --file at module load and boots from it  -> [buffins] proves it
 *   check-app.js reads the same path with fs at three sites    -> [time-picker] proves it
 *
 * The first version of case C used a plant that COULD NOT FAIL: it flipped a type=time input to
 * text, which changed only the COUNT the guard prints and never its verdict, so it reported
 * "the direct reads are still hardcoded" when the plumbing was fine.
 *
 * ⛔ NOT IN THE MANDATORY SEQUENCE — his call, 2026-08-20. It is the slowest thing here (four
 * check-app.js runs, each booting jsdom) guarding the rarest regression, and **a slow mandatory suite
 * gets skipped.** Protecting the speed of the sequence everyone actually runs is worth more than
 * covering a regression that only appears when someone edits two specific files. So it is tied to a
 * TRIGGER instead of the calendar: run it when `tools/probe.js` or `tools/check-app.js` changes.
 *
 * ⛔ AND THE TRIGGER IS CHECKED, NOT REMEMBERED. `--if-touched` asks git whether either file is
 * modified against HEAD and skips in a second if not. His reasoning: *"make the trigger checkable,
 * not remembered... a conditional rule with no way to check the condition is the thing you two keep
 * finding buried in files."* Same shape as the dirty-index canary — read the state, do not trust that
 * you will remember. A skip says so out loud and names what it checked; silence is never the answer.
 *
 * Usage: NODE_PATH=.work/node_modules node tools/check-srcpath.js               # always run
 *        NODE_PATH=.work/node_modules node tools/check-srcpath.js --if-touched  # run only if needed
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

function main() {

/* ---- the trigger, asked of git rather than of memory ---- */
const TRIGGERS = ['tools/probe.js', 'tools/check-app.js'];
if (process.argv.includes('--if-touched')) {
  let changed = '';
  try { changed = execSync('git diff --name-only HEAD', { encoding: 'utf8' }); }
  catch (e) {
    console.log('CANNOT CHECK THE TRIGGER — git diff failed. Running anyway; a trigger that cannot be');
    console.log('read is not a reason to skip.');
    changed = TRIGGERS.join('\n');
  }
  const names = changed.split('\n').map(x => x.trim()).filter(Boolean);
  const hit = TRIGGERS.filter(t => names.includes(t));
  if (!hit.length) {
    console.log('SKIPPED — neither ' + TRIGGERS.join(' nor ') + ' is modified against HEAD.');
    console.log('  git diff --name-only HEAD -> ' + (names.length ? names.join(', ') : '(nothing)'));
    console.log('This is the trigger being CHECKED, not assumed. Drop --if-touched to run it regardless.');
    process.exitCode = 0;
    return;
  }
  console.log('TRIGGERED by: ' + hit.join(', ') + ' — running the differential proof.');
  console.log('');
}

const REAL = 'index.html';
const before = fs.readFileSync(REAL);
const orig = before.toString('utf8');
const T = os.tmpdir();
const ENV = Object.assign({}, process.env, { NODE_PATH: '.work/node_modules' });

const run = (args) => {
  try { return { code: 0, out: execSync('node tools/check-app.js ' + args, { env: ENV, encoding: 'utf8' }) }; }
  catch (e) { return { code: e.status || 1, out: (e.stdout || '') + (e.stderr || '') }; }
};
const write = (name, body) => { const p = path.join(T, name); fs.writeFileSync(p, body); return p; };
/* strip nothing — a byte compare is the point */
const norm = s => s.replace(/\r\n/g, '\n');

let pass = true;
const say = (ok, label, detail) => {
  if (!ok) pass = false;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + label + (detail ? '\n          ' + detail : ''));
};

// ---------- A. same input, both paths ----------
const same = write('dt-same.html', orig);
const a = run('');
const b = run('--file "' + same + '"');
const identical = norm(a.out) === norm(b.out) && a.code === b.code;
say(identical, 'A. same input via default path and --file gives identical output',
    identical ? 'both exit ' + a.code + ', ' + a.out.split('\n').length + ' lines, byte-identical'
              : 'DIVERGED — default exit ' + a.code + ' vs --file exit ' + b.code);
if (!identical) {
  const la = norm(a.out).split('\n'), lb = norm(b.out).split('\n');
  for (let i = 0; i < Math.max(la.length, lb.length); i++)
    if (la[i] !== lb[i]) { console.log('          first diff line ' + (i + 1) + ':\n            default: ' + la[i] + '\n            --file : ' + lb[i]); break; }
}

// ---------- B. booted-app guard must see the mutated copy ----------
const B_FROM = '(openAcc.has("buffins") ? " open" : "")';
const B_TO = '" open"';
if (orig.split(B_FROM).length - 1 !== 1) { say(false, 'B. plant anchor', 'anchor not unique'); }
else {
  const mut = write('dt-boot.html', orig.replace(B_FROM, B_TO));
  const r = run('--file "' + mut + '"');
  const fired = /FAIL\s+\[buffins\]/.test(r.out);
  say(fired && r.code !== 0, 'B. --file reaches the BOOTED app (probe.js)',
      fired ? (r.out.split('\n').find(l => /FAIL\s+\[buffins\]/.test(l)) || '').trim().slice(0, 120)
            : 'planted a defect only the booted app can see and [buffins] did NOT fire — probe is still reading the real file');
}

// ---------- C. direct-read guard must see the mutated copy ----------
/* ⛔ The first version of this plant flipped type="time" to "text", which only changed the
   COUNT the guard reports (2 -> 1) and never its verdict. It read as 'the direct reads are still
   hardcoded' when the plumbing was fine. Remove a HANDLER instead — that is what [time-picker]
   actually fails on. A plant that cannot fail proves nothing about the thing it points at. */
const C_FROM = "$('#eatTime')";
const C_TO = "$('#eatTimeGONE')";
if (orig.split(C_FROM).length - 1 !== 1) { say(false, 'C. plant anchor', 'anchor not unique'); }
else {
  const mut = write('dt-direct.html', orig.replace(C_FROM, C_TO));
  const r = run('--file "' + mut + '"');
  const fired = /FAIL\s+\[time-picker\]/.test(r.out);
  say(fired && r.code !== 0, 'C. --file reaches the DIRECT fs reads (the 3 SRC sites)',
      fired ? (r.out.split('\n').find(l => /FAIL\s+\[time-picker\]/.test(l)) || '').trim().slice(0, 120)
            : 'planted a defect only a direct-read guard can see and [time-picker] did NOT fire — those reads are still hardcoded');
}

// ---------- D. the tree ----------
const untouched = fs.readFileSync(REAL).equals(before);
let ns = 'git-error';
try { ns = execSync('git diff --numstat -- ' + REAL, { encoding: 'utf8' }).trim(); } catch (e) {}
say(untouched && ns === '', 'D. index.html byte-identical and git-clean throughout',
    'equals=' + untouched + ', numstat=' + (ns === '' ? '(empty)' : ns));

console.log('');
console.log(pass ? 'DIFFERENTIAL PROOF PASSED — --file is honoured by both mechanisms and changes nothing else'
                 : 'DIFFERENTIAL PROOF FAILED');
  process.exitCode = pass ? 0 : 1;
}

main();
