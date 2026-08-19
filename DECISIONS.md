# DECISIONS — his standing calls, and why

**Hand-written and APPEND-ONLY.** This is the one document here that a tool cannot generate, because
it records what *he decided*, not what the code contains. `STATUS.md` is generated and says where the
project is; this says why it is shaped that way.

**Rules for this file.** Add a line when he makes a call, with the date and — where he gave one — his
own words. Never delete an entry; if a decision is reversed, add the reversal and leave the original,
because the reasoning usually still matters. **Never put a food quantity in here** — quantities live in
`FOOD_FACTS` and `SLOTS`, and a number copied into a document is a number that will go stale and get
recited. Point at where it lives instead.

**⭐⭐ KEEPING IT FED IS MY JOB, NOT HIS.** His instruction, 2026-08-18: *"I'd like you to also ask me if
you should log it when I say something since I may forget."* So: when he says something that will still
be true next month, I raise it in one line at the end of the reply — or, when it is unambiguous, log it
and simply say I did. He should never have to remember to ask for his own decision to be recorded.
**But not on every message** — a prompt he stops reading protects nothing, which is the same lesson
`check-food.js` already carries about a guard that fires on right answers. The trigger and the
counter-examples are written up in `working-with-steven.md` §0, which is canonical for this.

**This is the one file here that rots if neglected**, because no tool can generate it. `STATUS.md` has a
staleness guard; this has only the habit above. If it ever falls months behind, a future session will
read a decisions log missing his recent calls and will not know it is missing them.

---

## 2026-08-18 — the day the numbers got sourced

**Ingredient rows name their source; they do not carry a copy of it.**
Row index 2 is now `{f,n}` / `{parts}` / `{free}` and the macros are looked up at render time. Totals
are the sum of their rows, not a separate claim. His instruction, after finding a bowl 43 cal over:
*"Every recipe should be FACT checked when being made. I cant be the one to find these mistakes all the
time... NOTHING SHOULD BE OFF CALORIES AND MACROS!"* Enforced by `[priced]` and `[slot-fit]`.

**Protein powder is priced PER GRAM, PER FLAVOR.** His call, overruling me:
*"it should be g per flavor. thats how we stay on target."* He was right and my per-scoop argument was
wrong — he WEIGHS the powder, and a gram of one flavor is not a gram of another when scoop weights run
30-41 g for the same 25 P. A row whose flavor rotates daily stays per-scoop, because there is no single
gram figure for it. He also pointed out the data was already in the app: *"you have all the per g
measurements for protein. its in the app on meals."*

**b19 deleted entirely, both sizes.** *"get rid of b19 in totallity. small and big."* The 705-cal
version had never been his: an earlier session found it 165 over the breakfast slot and kept it as an
optional "feast/refeed day" pick instead of removing it, and he did not know it existed. **Lesson worth
keeping: do not invent an option to avoid deleting one.**

**Q's TARGETS stand. Portions move to hit them.** His challenge — *"where are you getting the numbers
from to say he's wrong?"* — was fair, and the answer is that Q was never wrong. Q set the slot totals
and those are untouched; Q's per-ingredient figures were round estimates, and pricing the same plate
off real labels made it add to more than Q's stated total. So portions move and the total lands on Q's
number. When that is not possible without changing the food, it gets flagged, not silently fixed.

**Do not cut the vegetables to fix calories.** The rebalancer proposed halving his string beans to save
24 cal. Veg may go UP to pad a plate, never down to trim one — trim the starch or the dense fat.

**Cut where it shows least.** Ranking by "dense rows first" protected volume but took 4 g off a 7 g
almond-butter drizzle (57% of it) to close 16 cal. Rank by the FRACTION of a row a change consumes:
30 g off a 370 g tub of yogurt does the same job invisibly. He asked for flavor AND volume to be
priorities, and this is what that means in practice.

**Nothing goes over calories.** *"You should be making sure that nothing goes over calories and that
everything matches the correct macros as best as possible."* Over its slot budget by more than 25 cal
is a hard build failure. Under is survivable and sometimes deliberate.

**Brand-variable foods get a spread, not a false single number** — but the BASIS is whatever the plan
actually uses, and it only moves when he says so. Pricing Oikos at the published-vanilla low end cut
20 cal from a breakfast against his own recorded call that the higher figure stands. A row that NAMES
a brand (Justin's) prices as that brand; the generic key stays unpinned.

**p4 stays Q's light pre-lift.** *"dont add scrambled egg white to p4. need something readily
available. if it doesnt work then just leave it."* Nothing on that plate closes its 21-cal / 8-P gap
without adding a food, so it stays as Q built it and runs under on purpose.

**Products he settled:** regular Lotus Biscoff, not de-creamed. Oreo **minis**, not Thins —
*"Stop using oreo thins."* Hershey's Zero Sugar syrup. Lily's SF chocolate chips. Chosen Foods avocado
spray. Kodiak Protein Oats (the canister, not the packets or PEAK). Seaweed is 20 — *"seaweed is 20."*
his figure over a published range, because his pack is what he eats.

**Salmon is WILD, skin off, sushi-grade from a kosher market in Brooklyn.** Basis is coho. Wild
Atlantic is deliberately excluded — US commercial sale has been banned since the late 1940s, so it is
not a purchasable fish and "wild" here means Pacific. Species still open; see `STATUS.md`.

**Do not peel the potatoes.** Peeling buys about 5% more weight for the same calories and costs the
fiber. If a plate needs volume, more vegetable is ten times the volume per calorie.

**Berries: one key per berry, plus a blend.** *"get each berry seperate"* and *"and mixed"*. A single
vague key would have hidden a real spread — blackberries are a third leaner than raw blueberries.

**American spelling: "flavor", not "flavour."**

---

## Conventions that came out of the same day

- **Produce unit weights are online.** He was right that refusing a "1 medium tomato" as unsourceable
  was wrong when USDA publishes reference weights. Look it up; only ask him for something genuinely
  local or ambiguous.
- **A fixture that names today's numbers will go stale and then test nothing.** Two selftest cases and
  the plant harness all quoted specific rows, and each silently stopped testing when those rows were
  migrated — printing "SKIP" or "BROKEN CASE" while the suite still read as fine. Fixtures now FIND
  what they need instead of knowing it.
- **A guard that can be switched off by adding data is not a guard.** Adding a plain `salmon` key made
  `[swap-math]` match three names on the sushi line instead of two, so it silently stopped checking the
  one line it was written for. The selftest caught it.

---

## 2026-08-18 (same day, later) — how this file gets fed

**Catching his decisions is my job, not his.** *"I'd like you to also ask me if you should log it when I
say something since I may forget."* Raise it in one line at the end of a reply; log the unambiguous ones
outright and just say so. Do NOT prompt on every message — a question he stops reading protects nothing.
Trigger, counter-examples and precedence live in `working-with-steven.md` §0.

**Reading order for a new session, and what NOT to read.** `working-with-steven.md` → this repo's
`CLAUDE.md` → `STATUS.md` → `DECISIONS.md`. **Not the chat transcripts** — tens of megabytes, and reading
them recreates the failure he opened with on 2026-08-18: *"you sometimes use memory, sometimes use chat
history, sometimes use lines in the app... and its messing up everything."* Precedence is explicit:
behaviour to `working-with-steven.md`, code and product to `CLAUDE.md`, and any current NUMBER to the
guards over every document.

**A status document without a staleness check will eventually mislead someone with total confidence.**
`CLAUDE.md`'s onboarding section claimed most ingredient rows were unsourced — true one morning, false
by that evening, and nothing anywhere said so. Fast-moving facts now live in `STATUS.md`, generated, with
`[status-doc]` failing the build when it drifts.

---

## 2026-08-18 (evening) — the yogurt bowls stay big

**Volume beats flavor concentration. The 400 g base stays.** He ate b7 and said *"yogurt bowl was mid.
not a lot of flavor."* I proposed cutting the base to 260 g and nearly doubling the cookie, trading the
~22 g of surplus protein every bowl carries for mix-ins. He rejected it: *"no i dont like that. i need it
to fill me still. ill just add salt, lakanto and a bit more extract."* **His reason beats mine** — 400 g
of yogurt is what makes breakfast hold, and on a cut fullness is worth more than a more intense bowl.
⛔ Do not re-propose shrinking the yogurt base to fix flavor.

**Flavor gets fixed with the free levers instead: salt, Lakanto, heavier extract.** Now a row on all 13
FAGE-base bowls so it is on the card, not in a chat. Why it was bland is worth keeping: **13 of the 14
bowls had no sweetener of any kind** and plain FAGE 2% is tart, and **salt was absent from all 14** —
the biggest lever there is in sweet dairy. Both cost nothing, so there was never a macro reason to leave
them out. They had simply never been written down.

**Standing note, not yet acted on:** every FAGE bowl runs ~22 g protein OVER the 36 g breakfast budget.
That is real surplus, and if he ever wants more room for flavor without losing volume, that is where it
would come from. Raised once and declined; his call if it comes up again.
