# CLAUDE.md — how to work on this repo

The app: a personal nutrition and training tracker — meals, macros, lifts, hydration, supplements, and
the meal-timing rules its owner keeps. **The entire app is ONE file, `index.html` (~540 KB).** There is no framework, no build for the
main file, and no other source. `next/index.html` is generated.

He built this to be a nutritionist and coach that is *precise*. He has said, in his words, that what he
values most is **precision and accuracy**, and the way I have failed him is by **asserting numbers
instead of retrieving them**. Every rule below exists because of a specific failure, not as theory.

---

## RULE 0 — THIS REPO IS PUBLIC, AND HE HAS SAID THAT IS FINE

`github.com/stbenun/stevens-cut`, visibility PUBLIC — every file here is world-readable. **His call,
2026-08-12, verbatim: "i dont care whats public. its fine." and "you can speak about me."** So write
about him plainly; do not sanitise his own details or spend his time on privacy hedging. That decision
is his to make and he has made it — stop re-raising it.

**What is still NOT his to waive: other people.** No real names of his coach, family, friends, rabbis,
or anyone else. `[name-leak]` in check-app.js guards this. Note the gap: that check looks for NAMES
only, so it has nothing to say about anything else.

## ⛔ RULE 1 — Never state a number I did not just retrieve

For any quantity I put in front of him, I must be able to name the tool call that produced it:
the app read live, `FOOD_FACTS`, or a source fetched **this session**.

**Memory is never a source for a number.** Not my memory files, not earlier in the conversation.
Memory holds context and preferences; the repo holds quantities. When they disagree, **the repo wins
and I fix the memory.**

This has cost him real accuracy:
- Quoted a slot-budget sum from memory when the app's live remainder was ~30 cal lower.
- Quoted a jiben figure from memory when `SLOTS` l2 carries the real one.
- Told him a Creami cup was Almond Joy off a 2-day-old data snapshot when his live app said cup 2.

If I cannot source it, **say "I don't have this sourced"** and stop. A hedged guess reads as a fact.

## ⛔ RULE 2 — Say the diagnosis before building

One or two sentences, always: *what I think is wrong, why, and what I intend to do.* He must never
learn what I decided by reading a finished commit. Two failures in two days died at this sentence:
- He asked a confirming question about dinner and I softened the plan instead of confirming it.
- He reported a topping's calories were low and I "fixed" the label on a recipe that was actually
  underfeeding him. See RULE 3.

## ⛔ RULE 3 — A number here is usually a SPEC, not a description

Slot budgets, the Creami topping allowance, the daily macro target — these are **targets he has to
hit**. When reality disagrees with one of them, **reality is what's broken.** Fix the food, not the
label. Placeholder rows are specs, not sloppiness to be replaced with observed values.

## ⛔ RULE 4 — Verify, then claim, in the same message

No "fixed" / "done" / "correct" without the verification output attached. Guards test the source;
only a live fetch tests the deploy. See DEPLOY below.

## ⛔ RULE 5 — The line between us

**I own:** arithmetic, sourcing, provenance, options laid out with their real costs, and saying plainly
when his ask does not fit the numbers.
**He owns:** taste, tradeoffs, what is acceptable, and what goes in his mouth.

Never silently change what he eats to make a number work — show the cost and let him choose. And a
clarifying question from him ("just confirming…", "no X?") means **verify**, not renegotiate.

---

## DEPLOY — four steps, all required

`git commit` is not deploy. `git push` is not deploy either, on its own.

```bash
node tools/check-food.js                                    # food numbers
NODE_PATH=.work/node_modules node tools/check-app.js        # schedule, rotations, name leak
NODE_PATH=.work/node_modules node tools/probe.js            # renders his real data, every tab/day
node tools/food-doc.js                                      # regenerate FOOD_FACTS.md
# bump `const BUILD = 'b<epoch>'` in index.html   <-- WITHOUT THIS HIS OPEN APP NEVER UPDATES
node tools/build-next.js                                    # regenerate next/index.html
git add -A && git commit && git push origin main
# then PROVE it is live:
curl -s "https://stbenun.github.io/stevens-cut/index.html?cb=$RANDOM" | grep -o "const BUILD = 'b[0-9]*'"
```
`checkUpdate()` compares the served file's `BUILD` against the running app's. **Unchanged BUILD → the
updater stays silent and nothing reaches his phone.** Also confirm `wc -c` of the live fetch equals
local `index.html`; that is the only proof he and I are reading the same file.

## WHERE THE NUMBERS LIVE — read these, never recall them

| what | where |
|---|---|
| daily macro target (+ per-day adjustments) | `PLAN_T`, `planTarget(ld)` |
| per-slot budgets | `SLOT_BUDGET` |
| every meal + its ingredients and totals | `SLOTS`, `OPTBYID` |
| per-unit food numbers, with provenance | `FOOD_FACTS` → readable copy `FOOD_FACTS.md` |
| Creami cups / their topping macros | `CREAMI_BATCHES`, `CREAMI_TOPMAC`, `creamiTop()` |
| which Creami cup is current | `creamiState()` — **reads his live log, do not infer** |
| eating out | `EATOUT`, `EATOUT_ORDER`, `eatoutOrder()` |
| hydration target and why it moved | `hydrTarget(ld)` |
| meat/dairy waits | `dairyWindow()`, `WAIT_MEAT_DAIRY`, `WAIT_DAIRY_MEAT` |
| one-plate salvage solver | `finalMeal()`, `FINAL_DISHES`, `FINAL_SIDES` |
| pinned one-day plans | `DAY_PLAN`, `dayPlanCard()` |
| **his actual logged data** | `qpcut.*` in localStorage — reach it with `probe.js --eval` |

`probe.js --eval <file>` runs an expression **inside the booted app against his real data**. Use it
instead of reimplementing engine logic and getting a different answer than his phone gets. Write a
bare body with `return` (it is wrapped in an IIFE for you).

## THE OPEN PROBLEM — provenance coverage

`FOOD_FACTS.md` carries the live number. **Most ingredient rows in `SLOTS` are hand-typed with no
source anywhere in the repo.** The recipe-total guard passes because it verifies that a sum of guesses
equals the stated sum of those guesses — internally consistent, externally unverified. **A vacuous
guard is worse than no guard: it manufactures confidence.**

Goal is 100%. Work in order of how often he eats a thing — breakfast and lunch first, they are daily.
Prefer published labels and USDA; **he should not have to photograph a national brand.** Ask him only
for a **brand name** when the product is genuinely local or ambiguous, never for a photo of something
findable online. Anything unsourceable gets marked UNVERIFIED **in the app**, visibly.

## GOTCHAS THAT HAVE COST HOURS

- **Never write regexes or escapes through a shell heredoc.** `\s` collapses to `s`, `\b` becomes a
  literal backspace, and checks then pass *vacuously*. Write the script to a file, or use
  `json.dumps` so escaping is never hand-rolled.
- **Watch every new guard fail before trusting it.** Plant the real defect. A first plant that changes
  nothing (e.g. targeting a double quote where the file uses single) looks like a pass.
- **Two sessions can share this clone.** `git fetch && git log --oneline HEAD..origin/main` before
  editing, and again before committing. Never force-push.
- `git config core.autocrlf false` in a fresh clone, or CRLF makes every file look modified and breaks
  anchor matching in the checks.
- **⛔ Never write `index.html` from Python's text mode.** `io.open(p,'w')` on Windows rewrites every
  `\n` as `\r\n`, so a one-line `const BUILD` bump silently converted the whole file to CRLF — and it
  cost nothing visible: the app rendered, all 210 probe renders passed, the deploy verified byte-identical
  against the live copy. What broke was the CHECKS: anchors like `indexOf('\n\n')` stopped matching and
  `[scoop-weights]` reported "could not locate ppFind/ppTag", which reads like a refactor. Use
  `newline=''`, binary mode, or `fs.writeFileSync`. `[line-endings]` in check-food.js now runs first and
  says so plainly. **Also: Git Bash `grep -c $'\r'` reports 0 on a CRLF file — it is not a reliable test.
  Read the bytes (`fs.readFileSync(f,'binary')`).**
- **A missing Saturday is not a missed workout** — Shabbat means no phone, so nothing gets logged.
  Five weeks of reps show Mon/Tue/Wed/Fri only. Never read a blank Saturday as a skip; ask.
- The section-collapse rule: **every app section starts CLOSED**, with a summary badge carrying the
  numbers. Never time-seed one open.
- **He is allergic to all nuts EXCEPT almonds.** Almonds and almond butter are in his plan daily;
  every other nut is out, including in a topping or a step. `[nuts]` in check-food.js enforces it.
  Coconut is not treated as a nut here and he eats it.
- Kashrut is **data the engine must use**, not decoration — every option carries a `k:` tag, and the
  meat→dairy wait drives WHEN he eats, not just what. **Flag any kashrut assumption and ASK: never
  encode a stringency he does not keep, and never a leniency either.** He eats fish with meat.

---

## HOW HE LIKES THINGS BUILT — from his own corrections

**Viewing**
- **Every section starts CLOSED**, with a summary badge carrying the numbers. Never time-seed one open.
- A meal row's right-hand numbers are **all four macros — cal · P · C · F**, not cal + protein.
- The card shape he reads, in this order: header → budget line → qty/item/cal/P table → TOTAL →
  vs budget → "Lands C · F" → order & timing → 🚫 do-not → ✅ free → 🔁 **swaps priced with what each costs.**

**Recipes**
- A recipe is a **method**, not a list of grams. His words on a version that missed: *"this isnt what i
  wanted. i wanted you to put together a recipe for me to cook. what you did was just write a bunch of
  ingredients."*
- ⛔ **NO CAP ON STEP COUNT.** His correction, verbatim: *"how ever many steps needed, but dont be wordy
  and dont say extra things."* Brevity is per step — say the action, cut the padding. A count cap forces
  two instructions into one run-on step and makes the recipe worse. `[final-recipe]` checks for filler
  phrases, not step count. **Character caps are a bad proxy too** — a long step that is all substance
  (a technique explanation) is fine; a short step with padding is not.
- **A step never holds its own copy of a quantity** — interpolate `{pro}` `{carb}` `{fat}` from the
  ingredient row, so a step is structurally incapable of contradicting the list. This is why his
  recipes used to contradict themselves.
- Leftover/residual sides render under a separate **"On the side"** heading, never folded into the method.
- All weights are **RAW / dry**. Never quote a cooked weight.
- Frozen protein scales in **WHOLE units** — he freezes beef and salmon in 6 oz portions, so print
  "1 bag (6 oz)", never 1.5 patties.

**Content**
- **Exact products, exact weights, macro-fit every meal.** No "some almonds", no "a handful".
- Rows are **name + dose only**. His instruction: *"just write the supplement and the dose if its
  something we changed."* Reasoning goes in a code comment, never on the row.
- **Anything settled in conversation must become app behaviour.** He will not scroll back through chat
  to find it, so a chat agreement that never lands in the app is worth nothing.
- **Brand-variable foods get a RANGE, not false precision.** His call on almond butter: brands run
  190–220 per 32 g and he does not buy one brand, so pinning a single sourced number would be a
  fake fix. Record the spread and which end the plan uses.
- One goal-true verdict on a "should I". Lead with no when it is no. Never bless both sides.
- Never moralise about the things he has told me not to. They stay out of the app entirely.
