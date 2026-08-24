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

---

## 2026-08-19 (later) — off-track eating is paid out of the Creami topping

**HIS RULE, verbatim:** *"whenever i tell you off track eating that actually matters, take the cals from
Creami Topping that day. I'd want it as a small note added to the creami flavor card that day."*

**This was not a new mechanism — it was a missing default.** The off-plan card already existed, already
stored per-date entries, and already knew the threshold: anything at or under the noise floor renders as
"nothing to offset." What it then did was hand him `FIXPOOL` as a row of buttons and ask him to choose how
to pay for it. That is a prompt standing where a computed answer belongs, which is the thing the app exists
to remove. The topping is now the till, and the card says what to take off.

**⛔ The deduction is a render-time overlay, never an edit to a cup.** All 36 cups still spec the topping
allowance and `[creami-topping]` still enforces every one of them. A per-day edit to a cup would make that
spec unverifiable, which is exactly how the card printed a flat "Topping (140 cal)" on all 36 for months
before he caught it on the cup that was really 75.

**The cap is the topping, not the cup.** He said take it from the topping, so the base is never touched. A
day whose off-plan exceeds what the topping holds says so and names the remainder, rather than quietly
eating into the rest of the snack.

**⛔ Never cut more of the dessert than the debt.** The first version stepped in 5 g and told him to remove
70 cal of wafer to pay a 60 cal debt. Trimming is 1 g at a time now (he weighs the topping) and a step that
would overshoot is not taken; a residue under a handful of calories is dropped rather than printed.
Which row gets cut follows his ranking rule: the row where the cut is the smallest FRACTION, and never the
whip, because trimming air buys a number without buying a smaller dessert.

**What his celery and pepper settled:** he reported them the same minute he gave the rule, and they come to
well under the floor. Nothing came off the topping, and the reason is his own standing call that vegetables
may go UP to pad a plate and never down to trim one. The app's pre-existing floor agreed independently.
**Worth keeping: "that actually matters" already had a number in the app before he said the words.**

**A guard that reads its threshold from the code under test cannot see that threshold move.** The new
`[offplan-topping]` check probed at the noise constant and compared against it, so lowering the floor to
zero moved the test with it and passed clean. The plant harness caught it. The threshold is pinned in the
check now, and changing the constant fails the build until someone argues for it. Same family as the
already-recorded lesson that a guard switched off by adding data is not a guard.

**STILL OWED, and he has not approved it:** nothing writes these entries. The card reads a "via chat" badge
that no code sets, so the rule currently works only for what he types in himself. The write path is the
gist sync, which means me pushing to his live data — raised with him, not built.

---

## 2026-08-19 (evening) — the Buffins get saved, and two of his rules get recorded

**HIS ASK:** *"Save the macros and cals for each of the muffins so that we can reference it easier
next time."* All eleven HummusFit Buffin flavors he owns are now in `FOOD_FACTS`, priced per muffin.

**Why they were missing is the part worth keeping.** He had already sent the label photo once — he
said so: *"I sent the photo once."* A past session read it and never wrote it down, so the only trace
anywhere was one off-plan entry from Aug 16 whose muffin figure came off *"the product badge, not a
label"*, and which bundled the muffin with two eggs and veg so it could not even be read back. I had
to back a number out by subtraction and got ~434 for a muffin whose badge says 408. **A photo he sent
is not a record. Nothing is a record until it is in the repo** — that is the whole premise of this
project and it failed on a product he bought two weeks ago. He should never send a label twice.

**Provenance is unusually strong here and it is worth saying why:** his shipment badges and the
brand's published per-flavor table agree to the digit on ten of eleven. The one exception is a flavor
he should not eat anyway, and it is noted in the entry rather than reconciled.

**⛔ EVERY BUFFIN IS DAIRY.** The brand states it flatly. The hummus base reads pareve and is not —
so the meat waits apply to a Buffin, and any future session must treat one as a dairy item.

**HIS KASHRUT PRACTICE, stated 2026-08-19:** *"I can eat dairy before meat."* That is the short
direction, and the app already encodes it as `WAIT_DAIRY_MEAT` — his statement confirms the constant
rather than changing it. The long direction is unchanged. Recording it because CLAUDE.md requires
kashrut assumptions to be asked and not inferred, and now this one is his own words rather than a
guess sitting in a constant.

**HE CHECKS NUT LABELS HIMSELF:** *"I checked for nuts don't worry."* So do not warn him about nut
content on these — he has read the wrappers. The LABEL FACT still gets recorded: one flavor carries a
CONTAINS NUTS mark on its own badge, and it is flagged `nut:1`. The distinction matters — the flag is
not a second opinion on his judgement, it is a stop on anything AUTOMATED (the Final Meal solver, the
rebalancer, a swap line) reaching for a nut-bearing food on its own. `[nut-facts]` enforces it.

**A new guard, because [nuts] could not see this class at all.** `[nuts]` scans TEXT — it catches
"pecans" typed into a row or a step. It is blind to a row that names a nut-bearing PRODUCT by a key
that reads as clean prose. `[nut-facts]` reads the flag on the fact instead, and covers plain rows,
`{parts}` composites and Creami cup toppings. Two cases added to the food selftest; both watched to
fail before being trusted.

**And the added field broke the doc parser immediately.** `nut:1` sits between `f:` and `src:`, which
`food-doc.js` did not expect, so one fact went invisible and `[food-doc-parse]` failed on the very
next run. That guard has now caught an added-field regression three times. **Worth internalising: any
new field on a FOOD_FACTS entry is a change to the doc parser too.**

**Also learned the hard way:** `tools/food-doc.js` and `tools/check-food.js` are CRLF files while
`index.html` is LF-only. An anchor written with `\n` matches NOTHING in a CRLF file, and the failure
reads exactly like a missing anchor. Patch scripts must normalise for matching and restore the file's
own convention on write.

---

## 2026-08-19 (night) — Buffin stock, and a harness that was reporting a pass on a dead build

**HIS ASK:** *"Ye track which ones I eat."* He owns one of each, so pricing a Buffin without knowing
whether he still has one is useless — the app would happily suggest a flavor he ate on Sunday. New
card under the Creami: closed by default, badge carries how many are LEFT, tap to mark one eaten,
cheapest first because that is the decision he is actually making.

**The list is DERIVED from `FOOD_FACTS` by key prefix, never retyped.** Add a flavor to the price
list and it appears on the card. `[buffins]` fails the build if a listed macro stops equalling its
fact, which is the specific way a card like this rots into a second price list.

**⛔ probe.js was reporting "clean" on a build that did not parse.** My first attempt at the card
nested a template literal one escaping level wrong, so `index.html` had a syntax error. probe printed
*"0 renders ... clean — no throws, no error cards, no console errors"* and exited 0, because it only
ever asked whether the error map was empty. Nothing rendered, so nothing could throw. **It now asserts
the render count equals days x times x locations x tabs and fails otherwise.** This is the repo's own
lesson landing on its most-trusted tool: a harness that tests nothing looks exactly like a harness
that finds nothing. Watched it fail on a deliberately broken build before trusting it.

**A plant that cannot fail is not a plant.** The `[buffins]` ordering case was planted by DELETING the
sort — and passed, because the facts happen to be written into `FOOD_FACTS` in ascending-calorie order,
so removing the sort changed nothing. Reversing the sort cannot be a no-op whatever the write order is.
Same family as the already-recorded fixture lesson, but the trap here was the DATA being accidentally
in the tested order rather than a fixture naming a row.

**`check-offplan.plant.js` is now `check-app.plant.js`.** It holds plants for the behavioural guards in
check-app.js — `[offplan-topping]` and `[buffins]` — the way `check-food.selftest.js` does for the food
guards. The old name stopped describing the file the moment a second guard needed planting.

**Layout: the macro group must never break mid-sequence.** At 320 px the fat value was dropping onto a
line of its own ("420 · 24P · 54C" then "· 12F"). Pinned the numbers with nowrap and flex-shrink:0 so
the flavor NAME wraps instead — a wrapped name is readable, a wrapped macro row is not. Scoped inline,
because `.q` is shared by every meal row and `[meal-row-wrap]` guards those. Measured in Edge at 320
and 400, not reasoned about.

**Tonight's call, for the record:** he skipped the Creami for a Buffin with a beef dinner. Keto bread
turned out to be the hinge — it carries real protein per slice, so dropping the whole bun to buy more
potato puts him UNDER his protein target. One slice off is the balance point. Worth remembering that
the bread in that burger is a protein row, not just a carb row.

---

## 2026-08-20 — A verdict is one bit, and it can be wrong in both directions

**Three checks said something untrue in one day.** Two of them cost time. The third was caught before
it cost anything, and it was caught differently, which is the part worth keeping.

1. `probe.js` printed *"0 renders … clean — no throws, no error cards, no console errors"* and exited 0
   against an `index.html` that did not parse. Nothing rendered, so nothing could throw. **A vacuous
   PASS.**
2. `check-app.plant.js` exited with no output at all and left a planted defect in the working tree.
   About seventy probe renders then passed against the corrupted file. **Another vacuous PASS**, and it
   nearly went out in a commit.
3. `check-srcpath.js` case C reported that `check-app.js` was *"still reading the real file"* when the
   plumbing was correct. The plant flipped a `type="time"` input to `text`, which moved the COUNT the
   guard prints from 2 to 1 and never touched its verdict. **A vacuous FAIL** — and the dangerous
   direction, because the next step was to go edit code that was already right.

**The lesson is not "test your tests" — it is that a pass/fail is a single bit and both values lie.**
Everyone already distrusts a green check. Nobody distrusts a red one, and a red check from a plant
that cannot fail looks exactly like a real defect in the thing it points at.

**What actually caught #3 was comparing the two paths over the same input, not reading the verdict.**
The default run printed `2 time input(s)` and the `--file` run printed `1` — so the mutated copy was
plainly being read, and the "failure" was the plant. One diff answered a question no amount of staring
at PASS/FAIL could. **His words on why the acceptance condition was written that way:** *"prove it by
running both paths over the same input and diffing the results — not by six checks passing… 'the checks
pass' is the exact signal that would lie to you."* **That is why the condition was diff, not pass.**

**Carry-out, for the next person deciding how to verify a mechanism:** if the question is *"is this
thing doing what I think it is doing"*, do not ask it for a verdict. Run it two ways over one input and
compare the output. A verdict tells you what the check concluded; a diff tells you what the code did.

## 2026-08-20 — `check-srcpath.js` runs on a trigger, and the trigger is checked

**His call: it stays OUT of the mandatory deploy sequence.** *"a slow mandatory suite gets skipped.
protecting the speed of the sequence everyone actually runs is worth more than covering a regression
that only appears when someone edits those two files. so tie it to the trigger instead of the
calendar."* It is four `check-app.js` runs, each booting jsdom — the slowest thing here, guarding the
rarest regression. It runs when `tools/probe.js` or `tools/check-app.js` changes, and otherwise not.

**And the trigger is machine-checked, because a remembered condition is not a condition.** *"make the
trigger checkable, not remembered… a conditional rule with no way to check the condition is the thing
you two keep finding buried in files."* `--if-touched` asks `git diff --name-only HEAD` and skips in
about a fifth of a second when neither file is modified, printing what it looked at. Same shape as the
dirty-index canary: read the state, do not trust that you will remember. **A conditional rule whose
condition lives only in prose is the runna gate again** — true, on file, and read too late to help.

---

## 2026-08-20 (later) — three corrections to the entries above, all mine

### REVERSED: `check-srcpath.js` is STEP 7 of the mandatory sequence

The entry above records his call that it stay out. **He reversed it the same day and the reasoning is
worth more than the outcome:** it was excluded because it was slow and *a slow mandatory suite gets
skipped.* Once `--if-touched` made it exit in about 0.2s when neither trigger file changed, **the cost
it was excluded to avoid no longer existed.** His words: *"at 0.218s there is no cost left to protect…
a line sitting after the numbered steps is a line a session stops before."*

**The general shape: when the reason for an exclusion is removed, the exclusion is not still correct.**
I optimised the tool until the objection was gone and then kept the accommodation built for the
objection. The trigger still decides whether the four cases RUN — what became unconditional is the
LINE, not the work.

**And I handed the decision back to him as though it were open.** I wrote "his call whether it joins
the mandatory sequence" into the handoff after he had already decided it. One hour earlier I had
written, in this file, that handing back a closed question as an open one is how a settled call gets
re-litigated. **Writing a lesson down is not the same as being able to apply it** — which is the whole
reason `LEARNED.md` exists and is read before answers are formed, not after.

### WRONG REF: the trigger compares against `origin/main`, not `HEAD`

The entry above says `--if-touched` asks `git diff --name-only HEAD`. **That was a bug, and it disarmed
the trigger in the exact case it exists for.** `git diff HEAD` goes EMPTY the moment you commit — so a
committed-but-unpushed change to `tools/probe.js` SKIPPED, and that is precisely the state you are in
when you are about to deploy. `git diff <ref>` compares the WORKING TREE to that ref, so `origin/main`
covers uncommitted, staged and committed-unpushed in one call. A stale `origin/main` can only
over-trigger, which is the safe direction.

**It looked obviously right, it skipped silently, and the skip printed a sentence naming a comparison
it was not making.** Fixed in the header, the code and both message strings — his instruction was to fix
every occurrence rather than the lines he named, because a message that describes the wrong comparison
is worse than no message.

### A grep answers "is this string present," which is a different question

**Two false negatives in one day, both reported to him as fact.** I grepped `CLAUDE.md` for "Exit 2 is
the harness working" and got 0 — the phrase was there, wrapped across a line. I grepped
`working-with-steven.md` for "Earn every question" and found no `LEARNED.md` reference near it, and
reported §2b as still bare. **The rewrite had DELETED that phrase.** I proved the old text was gone and
read it as the fix being absent.

**A false "still open" is worse than a false "done" here.** It sends someone to redo finished work and
reopens a settled call — the failure this file already records twice. **When the question is "does this
line carry a scope note," read the lines.** Grep finds a string you already expect; it cannot see a
correct answer phrased differently, and absence of your search term is not absence of the thing.

---

## 2026-08-20 — eating out keeps its hand-typed numbers; the orders get fixed

**His call:** *"i dont think we should add them to food facts but fix the orders."* So `EATOUT_ORDER`
stays inline — `cal:40,p:3,c:5,f:1` on the item — and is NOT migrated onto `{f:key,n:qty}` pricing the
way `SLOTS` was. Only the four items `[anchors]` names are cross-checked against `FOOD_FACTS`; the rest
are copies, by decision rather than by neglect. **Write that down so a future session does not "finish"
a migration he declined.**

### What was actually wrong

**The `bbq` anchor priced two different meats as one number.** *"¼ lb smoked turkey breast OR grilled
chicken"* for a single figure that was below BOTH: per the app's own facts a quarter pound of turkey is
152/34 and of chicken is 188/35. The builder orders up to four of them, so the error scaled with the
portion — at the two it actually recommends it understated by 24 cal and 10 g protein. Anchor is turkey
alone now, at the turkey figure; chicken is a swap priced at +9 cal per oz cooked.

**Southside's five swaps had no numbers at all** — *"the leanest main on this menu", "lighter and
cheaper", "leaner than the brisket"*. Comparatives, on the venue he actually goes to. They now carry the
meat density straight out of `FOOD_FACTS`: turkey 38 cal/oz cooked against brisket at 70, roast beef
about 40. **Not sandwich totals** — the meat weight is not pinned and the breads are not on file, so a
total would be two stacked guesses. The density is the number the choice turns on, and the gap is named
in the line instead of hidden by an adjective. Two picked up real content: the White Russian is grilled
turkey breast, which the app never said, and the Smokey Tacos claim of "lighter" is marked UNVERIFIED
because nothing on file supports it.

### ⚠️ And a correction to my own audit, before it gets quoted

**I reported the `restdairy` anchor as "a blend of two fish" with numbers internally inconsistent with
the salmon fact. That was wrong.** Its 340/42/0/18 reconciles exactly as 8 oz of branzino
(220/45.4/0/4.5, sourced 2026-08-20) plus one tablespoon of grill oil (119/0/0/13.5) — to the calorie
and to the gram of fat. **The figures were right the whole time.**

The real defect was narrower: salmon was offered at the branzino price. Same portion and same oil, salmon
is about 450/49/27 — **110 cal and 9 g fat more.** So the anchor keeps its numbers and salmon became a
priced swap. **The lesson is the one from this morning, in the other direction:** I had a hypothesis
("these numbers look like salmon"), the arithmetic disagreed with it, and I only found that out by doing
the subtraction. A plausible reading of a number is not a reading of it.

### The guard shaped the wording, and the wording brought two lines under the guard

`[swap-math]` only checks a swap line that names exactly TWO `FOOD_FACTS` keys OF THE SAME UNIT, and
then the stated `+N cal` must equal the PER-UNIT difference. That is why Southside's five were invisible
to it — they name one food or none. **A guard can validate a wrong number; it cannot see a missing one.**
The turkey/chicken lines therefore state "+9 cal per oz cooked" (47 − 38) with the quarter-pound figure
after it, not "+36", which the guard would have rejected. Checked lines went from 1 to 3.

**Still open, and flagged rather than fixed:** `southside` computes to 650 against a 580 dinner budget
and says so in an `over` field — the half chicken alone is 620. There is no `[slot-fit]` equivalent for
eating out, so nothing fails the build on it, where a recipe 26 cal over is a hard failure. Carbs also
run 9–51 g under at every venue, by design: the starch is advisory and is dropped when it does not fit.

---

## 2026-08-20 — the tab bar gets out of the way while he types

**He reported it with a screenshot:** *"this happens on my phone a lot. ill start typing and the tab from
the bottom comes up. fix it."* The bar was floating in the MIDDLE of the screen, over the content, with the
keyboard below it.

**Cause:** `nav.tabs` is `position:fixed; bottom:0`, which anchors to the **layout** viewport. iOS opens the
keyboard by shrinking the **visual** viewport and scrolling to the focused field — the layout viewport never
changes, so the bar stays pinned where the old bottom was and visually detaches. The `translateZ(0)` +
`will-change:transform` promotion on that rule makes it worse, not better: a promoted layer does not reflow
with the visual viewport at all. That promotion was added for a *different* complaint (drift during
momentum scrolling) and is deliberately left in place.

**Fix: hide the bar (and the zone subnav) while a text field has focus.** Deterministic — no geometry to
compute, nothing to drift — and it is the better behaviour regardless, since a bar floating over the content
is worse than no bar for the seconds he is typing one line. Checkboxes, buttons, radios, ranges and file
inputs deliberately do NOT trigger it; the app is full of checkboxes.

**⚠️ VERIFIED ONLY IN PART, and worth knowing why.** The logic is tested — nine focus cases, both CSS rules
present. The VISUAL result is not, and could not be here: headless Edge has no on-screen keyboard and its
visual viewport never shrinks, so the bug is not reproducible on this machine by any tool available. If it
still misbehaves on his phone, the next lever is dropping the `backdrop-filter` blur and the layer
promotion, which removes the cause rather than working around it.
