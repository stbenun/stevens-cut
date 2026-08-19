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

---

## 2026-08-18 (evening) — steps must match their rows

**He caught this from a screenshot of his own phone:** *"The amount of oreos is different in 3 places in
this recipe/meal. fix it and make sure nothing else has issues like this."* Then, when I fixed only that
class: *"dont just fix the oreo issues. make sure all recipes and steps match up."*

**Twelve steps contradicted their own ingredient rows**, and most went stale THAT DAY when the rebalancer
moved portions and the prose kept the old figures. `CLAUDE.md` has always required that a step never hold
its own copy of a quantity; twelve were holding one anyway. Guarded now by `[step-qty]`.

**A step can also name the RIGHT amount of the WRONG product**, which no number check can see. Three did:
two still described de-creaming Oreo Thins after he moved to whole minis, one still said "de-creamed
Biscoff" after he switched to the regular Lotus cookie. Each was internally consistent and each told him
to do something he had explicitly stopped doing. Guarded now by `[retired]`, which carries the list of
products he has dropped — **add to it whenever he retires something.**

**Seven bowls listed almond butter with no instruction for it.** The dollop-versus-stir distinction is one
he cares about (chocolate and cookie bowls take it stirred through; fruit-forward bowls take it dolloped,
because stirring muddies them), and b12 through b18 had inherited "method same as b12" and never got the
line. Added, with each weight read off its own row.

---

## 2026-08-18 (night) — the protein powder comes out of the yogurt bowls

**His question was the right one:** *"if the protein is so high then why do we need the protein powder?"*
Answer: you don't. 400 g of FAGE alone is 40 P against a 36 g breakfast budget, so the powder's 12.5 P was
surplus stacked on surplus. It was never a protein source in those bowls — it was a **flavoring that cost
65 calories**, and 65 cal of flavoring spread through 460 g is exactly what he called mid.

**His call: *"yes on all. dont add oreos on all obviously."*** So the powder and the Fairlife both come out
of 13 bowls, and the freed ~85 cal goes to each bowl's OWN signature ingredient, not one topping stamped
across fourteen recipes. The Fairlife went because its only job was making the powder shakeable; with no
powder there is nothing to shake, and losing the liquid leaves the bowl thicker.

**⛔ THE YOGURT STAYS AT 400 g.** The rebalancer's first answer was to pad these bowls with MORE yogurt —
b6 went to 490 g — because its rule is "pad with volume" and yogurt is the biggest volume on the card.
That is backwards: it would have swapped 65 cal of powder for 65 cal of plain base and left him with less
flavor than he started with. Reverted by hand. **When a bowl is under budget, spend on the topping.**

**b13 Mint Chip keeps its powder, deliberately.** The mint IS the powder and there is no mint extract on
his shelf. A "Mint Chip Bowl" with no mint in it would be a worse bowl wearing the same name. Its step is
self-contained now, because it can no longer inherit "method same as b12".

Result: protein went from ~+22 over budget on every bowl to +7-10, calories land within a few either way,
and the toppings roughly doubled — b7 went from 8 Oreo minis to 13, b12's cereal from 10 g to 30 g.
Six titles dropped "(protein-powder base)" because it stopped being true.

---

## 2026-08-18 (night) — the extract shelf is data now

**He gave the full shelf**, eighteen of them: strawberry, blueberry, banana, almond, lemon, peppermint,
orange, maple, coconut, raspberry, cookie butter, pumpkin spice, cinnamon spice, coffee, caramel, cake
batter, velvet cake, vanilla bean paste. Mostly LorAnn plus the vanilla bean paste.

**It had to become DATA, not something I remember.** Converting the bowls off protein powder, I inferred
which extracts he owned from whatever each old row happened to mention — and on that guess I declared b13
unconvertible ("no mint extract on the shelf") when he has **PEPPERMINT**, and reached for raspberry on the
strawberry-shortcake bowl when he owns **STRAWBERRY**. `EXTRACTS` now lives in the app and
`[extract-shelf]` fails the build if a recipe names a flavoring that is not on it. **An extract is the one
ingredient class with no weight and no macros, so no other check here can see it** — which is why it needed
its own. ⛔ Add to EXTRACTS when he buys one, never to make a recipe pass.

**b13 Mint Chip is converted** — peppermint extract, powder and Fairlife out, chips 8 g to 24 g. It kept
the "(protein-powder base)" name only as long as it kept the powder.

**Four new bowls, four new Creami cups, four new COR combos**, each built on an extract that was sitting
unused: cookie butter, coffee, orange, pumpkin spice, maple, cake batter. Notes worth keeping — orange
alone reads like juice and needs vanilla behind it to become creamsicle; maple behind pumpkin spice is what
makes it read as PIE rather than spiced yogurt; coffee extract is what turns cocoa into mocha.

**All 18 extracts now carry a recipe.** The last four were velvet cake, blueberry, cinnamon spice and
almond: Red Velvet, Blueberry Muffin, Snickerdoodle and Almond Croissant, each as a bowl, a Creami cup and
a COR combo. Flavor notes worth keeping, and they are in the steps rather than here:
red velvet is cocoa plus a sharp dairy tang and **FAGE 2% IS the tang** — it does what buttermilk does in
the cake, so no coloring and only ~6 g cocoa, because past 8 g it stops being velvet; a blueberry muffin
needs **citrus behind the blueberry** or the fruit reads flat; a snickerdoodle needs **Golden** Lakanto for
the brown-sugar note and more salt than any other bowl, because it is a salt-and-cinnamon cookie; and
almond extract plus almond butter is one trick in two parts — the extract is the bitter-almond marzipan
note, the butter is the body, and neither alone gets there.

---

## 2026-08-18 (night) — Morning Bag

**His ask:** a card at the top of Today for what to pack, titled **Morning Bag**, listing what he needs for
the day's COR and yogurt bowl, supplements, and lunch, with room to add things **the night before and the
morning of**. And on supplements: *"just write supplements. dont write each one."*

**It is DERIVED, not authored.** The COR line comes from `corFor()`/`corBuild()` and the bowl line straight
off `OPTBYID[bowlOfDay(ld)]`'s own rows — the same functions the Food zone below it uses. Writing a second
packing list would have been the two-copies bug in a new place, and it would have gone stale the first time
a portion moved. It follows the date picker too, so previewing tomorrow shows tomorrow's bag.

**Two add-lanes, not one**, because he asked to add at two different times and a single box would lose which
was which. Checks and additions persist **per day** (`qpcut.bag.<iso>`) — a bag packed last night is not
tomorrow's bag.

**Two bugs caught before it shipped.** The badge read "12" with three items added, because string
concatenation evaluates left to right and the add-lanes were being built *after* the count had already been
interpolated — a count that ignores what he added is worse than no count, since he would pack from it. And
the icons did not match the Food zone's, which reads as a different thing two cards apart.

**Layout was measured, not reasoned about**, per CLAUDE.md: opened in real Edge at 320 and 400 px, every row
measured, screenshots read. No overflow at either width; a couple of COR rows wrap to two lines at 320 and
that is graceful, not deformed. The Lunch line was shortened because the long version wrapped.

**Morning Bag placement is time-based**, his rule: at the TOP 5–10 AM and 9 PM–2 AM, at the bottom the rest
of the day — *"just like you have other cards moving"*, which is `zoneOrder()`. A previewed or backfilled
date always leads with it, because opening a specific day IS the packing case.

**⛔ The night window WRAPS past midnight**, and that is the whole reason it is guarded. Written the obvious
way — `m >= 1260 && m < 120` — it is never true, so the card would silently disappear every single night
and nothing would report it, because a card that decides not to render looks exactly like a card with
nothing to say. `[bag-window]` asserts both ends of both windows plus the minutes either side, and fails
if `BAG_NIGHT` ever stops wrapping.

It is testable only because `bagAtTop` takes an optional minute. `nowMin` is a scoped const, so the first
attempt to check these boundaries stubbed `globalThis.nowMin`, changed nothing, and cheerfully reported the
card as leading at 1 PM. **A time rule that cannot be exercised at a chosen time cannot be verified** —
worth remembering the next time something depends on the clock.

**SF ketchup is HEINZ**, and his one-word answer reversed a correction I had made in the wrong direction.
His rows had said 20 cal per 32 g. I found that G Hughes publishes 5 cal a tablespoon, assumed Heinz matched
it, and "corrected" his rows down to ~9. **Heinz No Sugar Added is 10 cal a tablespoon, not 5** — G Hughes is
the 5. So the app was right before I touched it, and my fix erred toward UNDER-counting, which on a cut is
the direction that costs him. Now label-sourced at 0.625 cal/g, which reproduces his long-standing 32 g =
20 cal / 2 C rows exactly. ⛔ Do not conflate the two brands again; the entry says so.

**The lesson is narrower than "check the brand".** I had TWO brands publishing different numbers and picked
a midpoint, then a basis, without knowing which bottle was his — and recorded it as "brand unconfirmed"
while still changing his food. A number flagged uncertain should not also be acted on: either ask first, or
leave what he had. Asking cost one word.

---

## 2026-08-19 — the hummus comes out of the Shawarma Bowl

**Hummus is out of l6.** *"get rid of the hummus."* It had been carried as an optional smear and the
card already told him to consider skipping it, so this makes the skip the build. Removing it alone would
have left the bowl further short on carbs than it already was, so the freed calories went into the rice —
amounts live in `SLOTS` l6, and the cooking water scales with the rice rather than staying at the figure
the smaller portion needed. Fat was over its slot line and the hummus is where that sat, so this closes
both at once.

**What made it visible was a stranded sentence, not a wrong number.** The l6 method carried a note saying
the rice had been *"bumped from"* the exact figure the step already showed. It came from `8697a2a`, which
raised the rice to answer his "feels small" complaint and pushed the bowl over its slot; `8d9edcb` then
rolled the portion back to hold the budget and left the explanation behind. So a real complaint of his got
a fix, the fix got reverted for a good reason, and the only surviving trace was a sentence that no longer
parsed.

**A stale rationale survives every guard that checks numbers.** `[step-qty]` compares a step's quantity
against its row and passes when they agree — it has nothing to say about prose explaining a change that no
longer exists. Worth knowing: the sentences that justify a number are the one thing in this repo with no
owner and no check.

**Still open, not his call to make:** the lunch budget exists twice and the two copies disagree —
`SLOT_BUDGET.lu` against the slot's own `b`, differing on calories, protein and carbs, with only one of
them enforced by `[slot-fit]`. Reading the unenforced one is how a correct lookup produced a wrong figure
in conversation. Raised with him 2026-08-19; not yet fixed, because changing a budget moves every meal
judged against it.
