# tools

## check-food.js

    node tools/check-food.js

Run it before pushing anything that touches food numbers. Exits non-zero on failure.

### Why it exists

On Aug 5 2026 every number that lived only inside a sentence turned out wrong:

- "10 pieces sashimi **or** plain rolls" — 220 cal/47 P vs 316 cal/18 P
- "12 pieces (tuna **or** salmon)" — 264 vs 504 cal, and salmon has *less* protein
- "carved beef, 6 oz" — 243 cal for eye of round, 420 for brisket flat
- an eat-out swap line claiming salmon sashimi is "+5 cal" when it is +20
- the arak figure drifting 123 → 98 → 85 cal a shot across three messages

In the same week **all 43 recipe totals were correct**, because those have an
arithmetic guard. Prose did not. That is the whole diagnosis: unguarded surface,
not carelessness.

Every check here is one of those failures turned into something mechanical.

### The checks

| check | what it enforces |
|---|---|
| `recipe-totals` | every meal option's stored total equals the sum of its ingredients |
| `food-facts` | every `FOOD_FACTS` entry is complete and carries provenance in `src` |
| `conflation` | no line offers two materially different foods as alternatives without stating the delta |
| `swap-math` | any claimed "+N cal" swap matches what `FOOD_FACTS` actually says |
| `anchors` | `EATOUT_ORDER` numbers agree with `FOOD_FACTS` instead of being a second copy |
| `nuts` | no non-almond nut appears as an ingredient or a cooking step (anaphylaxis) |

### FOOD_FACTS

`FOOD_FACTS` in `index.html` is the single source of truth for every per-unit
number quoted **outside** a recipe. **Never type one of these into a plan or a
card — read it and compute.** Adding a food means adding it there, with a real
`src`, not quoting it inline.

## check-food.selftest.js

    node tools/check-food.selftest.js

Reintroduces each of the six real errors into a throwaway copy and asserts the
guard catches it, naming the right check. **A guard nobody has watched fail is
decoration.** Writing this found two genuine holes in the guard: it was testing
a whole card as one string, so a delta in one line excused a conflation in
another; and its regexes had been written through a Python heredoc that turned
`\b` into a literal backspace, so a check was silently matching nothing.

## check-app.plant.js

    node tools/check-app.plant.js

Proves the BEHAVIOURAL guards in check-app.js are load-bearing — [offplan-topping] and [buffins]. His rule, 2026-08-19: off-track eating
that actually matters is paid out of that day's Creami topping, with a note on the flavor card.

Plants the four ways that can rot — the 5 g trim step returning so a 60-cal debt over-cuts the
dessert, the noise floor dropping so a celery stick gets billed, the note going silent while the
charge still happens, and a per-day charge mutating a cup so the 140 spec stops being checkable —
and fails if any of them still passes. It restores `index.html` byte-for-byte.

It caught a real hole in the guard on the day it was written: the check probed at `OFFPLAN_NOISE`
and compared against it, so a floor lowered to 0 moved the test with it and passed. The threshold is
pinned in the check now. **A guard that reads its threshold from the code under test cannot see that
threshold move.**

## check-srcpath.js

    NODE_PATH=.work/node_modules node tools/check-srcpath.js

Differential proof that `--file` is honoured by `check-app.js`, and that honouring it changes nothing
else. `check-app.plant.js` depends on this: as of 2026-08-20 it plants defects into a copy in
os.tmpdir() rather than mutating `index.html`, which is only safe if `--file` actually reaches every
reader in the process.

**The suite going green cannot establish this.** A `--file` that is silently ignored produces a green
suite *and* byte-identical output — the plant harness would be testing the real file while reporting
on a copy, which is the 2026-08-20 corruption at larger scale. So it asserts the negative too: a
defect planted into a copy must actually FAIL.

**NOT in the mandatory deploy sequence** — his call, 2026-08-20. Four `check-app.js` runs, each booting
jsdom: the slowest thing here for the rarest regression, and **a slow mandatory suite gets skipped.**
Run it on a TRIGGER instead — when `tools/probe.js` or `tools/check-app.js` changes.

**The trigger is checked, not remembered.** `--if-touched` asks `git diff --name-only HEAD` and skips in
about 0.2s when neither file is modified, printing what it looked at:

    NODE_PATH=.work/node_modules node tools/check-srcpath.js --if-touched

A conditional rule whose condition lives only in prose is the buried-rule shape this project keeps
tripping over — true, on file, and read too late to help. Drop the flag to run it regardless.

Four cases. **A** same input through both code paths must be byte-identical. **B** a defect only the
booted app can see must fire (`[buffins]`) — proves probe.js reads the copy. **C** a defect only a
direct `fs` read can see must fire (`[time-picker]`) — proves the three SRC sites read it. Those are
separate mechanisms and either could be left pointing at the real file. **D** `index.html` byte-identical
and git-clean throughout.

⚠️ The first version of case C used a plant that **could not fail** — it flipped a `type="time"` input
to `text`, which changed only the count the guard prints and never its verdict, so it read as "the
direct reads are still hardcoded" when the plumbing was fine.
