# DECISIONS — his standing calls, and why

**Hand-written and APPEND-ONLY.** This is the one document here that a tool cannot generate, because
it records what *he decided*, not what the code contains. `STATUS.md` is generated and says where the
project is; this says why it is shaped that way.

**Rules for this file.** Add a line when he makes a call, with the date and — where he gave one — his
own words. Never delete an entry; if a decision is reversed, add the reversal and leave the original,
because the reasoning usually still matters. **Never put a food quantity in here** — quantities live in
`FOOD_FACTS` and `SLOTS`, and a number copied into a document is a number that will go stale and get
recited. Point at where it lives instead.

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
