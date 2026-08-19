// Prove [offplan-topping] bites. Plants each real defect it was written for, confirms check-app
// exits non-zero AND names the guard, then restores the file byte-for-byte.
const fs = require('fs');
const { execSync } = require('child_process');
const P = 'index.html';
const original = fs.readFileSync(P);          // Buffer — byte-exact restore
const orig = original.toString('utf8');

const PLANTS = [
  {
    name: 'the 5 g step returns, so a 60-cal debt over-cuts the dessert',
    from: `    const s = step(c), per = c.f.cal * s;`,
    to:   `    const s = (FOOD_FACTS[c.k].unit === 'each' ? 1 : 5), per = c.f.cal * s;`,
    extra: [{
      from: `    while((left - per) >= 0 && (c.q - take - s) >= 0){ take += s; left -= per; }`,
      to:   `    while(left > 0 && (c.q - take - s) >= 0){ take += s; left -= per; }`
    }]
  },
  {
    name: 'the noise floor drops to zero, so a celery stick gets billed',
    from: `const OFFPLAN_NOISE = 40;`,
    to:   `const OFFPLAN_NOISE = 0;`
  },
  {
    name: 'the note goes silent, so the charge happens with nothing on the card',
    from: `function offplanNote(ld, cup){`,
    to:   `function offplanNote(ld, cup){ if(1) return '';`
  },
  {
    name: 'a per-day charge mutates the cup, so the 140 spec stops being checkable',
    from: `function creamiTrim(cup, charge){`,
    to:   `function creamiTrim(cup, charge){ if(cup && cup[5] && cup[5][0]) cup[5][0][1] = 1;`
  }
];

let allCaught = true;
try {
  for (const p of PLANTS) {
    let s = orig;
    const edits = [{ from: p.from, to: p.to }].concat(p.extra || []);
    let ok = true;
    for (const e of edits) {
      if (s.split(e.from).length - 1 !== 1) { console.log('BROKEN CASE  ' + p.name + ' — anchor not unique/found'); ok = false; allCaught = false; break; }
      s = s.replace(e.from, e.to);
    }
    if (!ok) continue;
    if (s === orig) { console.log('BROKEN CASE  ' + p.name + ' — plant changed nothing'); allCaught = false; continue; }
    fs.writeFileSync(P, s);
    let out = '', code = 0;
    try {
      out = execSync('node tools/check-app.js', { env: Object.assign({}, process.env, { NODE_PATH: '.work/node_modules' }), encoding: 'utf8' });
    } catch (e) { code = e.status || 1; out = (e.stdout || '') + (e.stderr || ''); }
    const named = /offplan-topping/.test(out) && /FAIL/.test(out);
    if (code !== 0 && named) {
      const line = (out.split('\n').find(l => /FAIL\s+\[offplan-topping\]/.test(l)) || '').trim();
      console.log('CAUGHT  ' + p.name);
      console.log('        ' + line.slice(0, 150));
    } else {
      console.log('NOT CAUGHT  ' + p.name + '  (exit=' + code + ', guard named=' + named + ')');
      allCaught = false;
    }
  }
} finally {
  fs.writeFileSync(P, original);              // restore the exact bytes
}
const same = fs.readFileSync(P).equals(original);
console.log('\nfile restored byte-exact: ' + same);
console.log(allCaught && same ? 'ALL PLANTS CAUGHT — [offplan-topping] is load-bearing'
                              : 'PLANT HARNESS FOUND A HOLE');
process.exit(allCaught && same ? 0 : 1);
