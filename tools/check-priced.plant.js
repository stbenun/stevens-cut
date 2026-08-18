/* Plant each real defect into a COPY of index.html and require the build to fail on it.
   CLAUDE.md: "Watch every new guard fail before trusting it. Plant the real defect. A first plant
   that changes nothing looks like a pass." So every plant below is asserted to (a) exit non-zero and
   (b) name [priced] specifically — a plant that trips some other check proves nothing about this one. */
const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const REPO = require("path").join(__dirname, "..");
const SCRATCH = require("os").tmpdir();
const orig = fs.readFileSync(path.join(REPO, 'index.html'), 'utf8');

/* the first real ingredient row in b1: Elev8 COR, 25 g, [85,1.5,19,0] */
const ROW = "['Elev8 COR','25 g',[85,1.5,19,0]]";
if (orig.indexOf(ROW) < 0) { console.error('SETUP FAIL: anchor row not found'); process.exit(1); }

/* ⛔ FIXTURES GO STALE AND A STALE FIXTURE SKIPS SILENTLY. Three of these plants stopped firing the
   moment their target rows migrated: the old anchors quoted hand-typed arrays like
   ['Ezekiel bread','2 slices',[160,8,30,1]] which no longer exist in the file. The run printed
   "SKIP (anchor gone)" three times and the suite still looked broadly fine — exactly the vacuous-pass
   trap. Anchors below now quote the CURRENT migrated text, and a missing anchor is a hard failure
   rather than a shrug, so this can never quietly degrade again. */
const PLANTS = [
  { name: 'names a FOOD_FACTS key that does not exist',
    from: ROW, to: "['Elev8 COR','25 g',{f:'elev8 cor',n:25}]" },

  { name: 'unit mismatch: asks for grams of a per-slice fact',
    from: "['Ezekiel bread','2 slices',{f:'ezekiel bread',n:2}]",
    to:   "['Ezekiel bread','2 slices',{f:'ezekiel bread',n:2,u:'g'}]" },

  { name: 'mass against a discrete unit: grams of a per-packet fact',
    from: "['Tuna packet','1',{f:'tuna packet',n:1,u:'each'}]",
    to:   "['Tuna packet','1',{f:'tuna packet',n:70,u:'g'}]" },

  { name: 'a stored t: that disagrees with its own rows',
    from: 't:[545,36,54,21]', to: 't:[545,36,54,99]' },

  { name: 'a migrated row whose spec shape is nonsense',
    from: ROW, to: "['Elev8 COR','25 g',{grams:25}]" },

  { name: 'a portion silently changed without its quantity label following',
    from: "['Potatoes','175 g',{f:'potatoes',n:175}]",
    to:   "['Potatoes','175 g',{f:'potatoes',n:260}]" },
];

let allGood = true;
for (const p of PLANTS) {
  const f = path.join(SCRATCH, 'plant-' + PLANTS.indexOf(p) + '.html');
  if (orig.indexOf(p.from) < 0) {
    console.log('SKIP (anchor gone): ' + p.name);
    allGood = false;
    continue;
  }
  fs.writeFileSync(f, orig.replace(p.from, p.to));
  const r = cp.spawnSync('node', [path.join(REPO, 'tools', 'check-food.js'), f],
                         { encoding: 'utf8', cwd: REPO });
  const out = (r.stdout || '') + (r.stderr || '');
  const pricedFailed = /FAIL {2}\[priced\]/.test(out);
  const exited = r.status !== 0;
  const verdict = (pricedFailed && exited) ? 'CAUGHT' : 'MISSED';
  if (verdict === 'MISSED') allGood = false;
  console.log(verdict.padEnd(7) + ' exit=' + r.status + '  [priced] fired=' + pricedFailed + '   ' + p.name);
  if (pricedFailed) {
    const line = out.split('\n').filter(l => l.indexOf('[priced]') >= 0)[0] || '';
    console.log('        ' + line.trim().slice(0, 190));
  }
  fs.unlinkSync(f);
}
console.log('');
console.log(allGood ? 'ALL PLANTS CAUGHT — the guard is load-bearing'
                    : 'AT LEAST ONE PLANT SURVIVED — do not trust this guard yet');
process.exit(allGood ? 0 : 1);
