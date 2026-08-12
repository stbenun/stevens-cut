# CLAUDE.md — how to work on this repo

The app: a personal nutrition and training tracker — meals, macros, lifts, hydration, supplements, and
the meal-timing rules its owner keeps. **The entire app is ONE file, `index.html` (~540 KB).** There is no framework, no build for the
main file, and no other source. `next/index.html` is generated.

He built this to be a nutritionist and coach that is *precise*. He has said, in his words, that what he
values most is **precision and accuracy**, and the way I have failed him is by **asserting numbers
instead of retrieving them**. Every rule below exists because of a specific failure, not as theory.

---

## ⛔ RULE 0 — THIS REPO IS PUBLIC

`github.com/stbenun/stevens-cut`, visibility PUBLIC. Every file here is world-readable, including this
one. **Personal facts do not belong in the repo** — no health conditions, allergies, religious practice,
body metrics, addresses, schedules, or other people's names. Those live in the assistant's private notes
outside the repo. Write the RULE and let the guard hold the fact: `[nuts]`, `[kashrut]`, `[name-leak]`.
I violated this on 2026-08-12 by writing an allergy and an observance into this file and pushing it.

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
- **A missing Saturday is not a missed workout** — one day a week is logged off-device by design, so its
  data arrives late or not at all. Ask before reading a gap as a skip.
- The section-collapse rule: **every app section starts CLOSED**, with a summary badge carrying the
  numbers. Never time-seed one open.
- **Dietary restrictions are enforced by `[nuts]` and `[kashrut]` in the checks, not by memory.** Read the
  guards for the actual rules; do not restate them here. Never relax one to make a recipe work.
- Meal-timing/eligibility tags (`k:` on every option) are **data the engine must actually use**, not
  decoration. **Flag any assumption about them and ASK — never encode a stricter rule than the owner
  keeps, and never a looser one either.**
