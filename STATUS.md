# STATUS — where this project actually is

**GENERATED FILE — do not edit.** Written by `node tools/status.js`, and `[status-doc]` in
check-food.js fails the build when it is stale. Every number below is computed from
`index.html`, never typed — which is the difference between this file and the onboarding
section of CLAUDE.md that had gone quietly wrong by the time anyone noticed.

| | |
|---|---|
| app | `index.html`, 662,036 bytes, 7,961 lines, one file |
| build | `b1787154513` |
| foods on the price list | 106 |
| provenance | 41 label · 36 USDA · 26 derived · 3 unverified |

## Ingredient rows

A row either NAMES its source in `FOOD_FACTS` and is multiplied at render time, or it still
carries a hand-typed copy of its macros. The second kind is the one that can be silently wrong.

| | rows | |
|---|---:|---|
| priced from FOOD_FACTS | **216** | 90% of 239 |
| deliberately zero (`{free:1}`) | 19 | spices, rubs, a free garnish |
| still hand-typed | **4** | ceiling 4, only ever falls |
| broken | 0 | any number here fails the build |

### The hand-typed rows that remain

| row | amount-carried cal | why it is still hand-typed |
|---|---:|---|
| `bf/b1` Ryse/RAW protein | 140 | flavor rotates daily, so per-scoop is the honest unit; the card prints that day's grams |
| `bf/b2` Balsamic drizzle | 30 | needs his brand (see Waiting on him) |
| `bf/b3#1` Kodiak buttermilk Power Flapjacks (frozen) | 255 | needs his box (see Waiting on him) |
| `sn/s1` Topping / mix-in (140-cal budget) | 140 | a SPEC, not an observation — the Creami topping allowance he has to hit |

## Every meal against its slot budget

Budgets are targets he has to hit, not observations. When a plate disagrees with one, the FOOD
moves — never the budget. `[slot-fit]` fails the build on anything more than 25 cal OVER.

| meal | | total | vs budget |
|---|---|---|---:|
| `bf/b3#0` | Kodiak Breakfast | 560 / 35 / 64 / 21 | +20 cal · |
| `lu/l10` | Salad+Bagel | 588 / 73 / 70 / 17 | +13 cal |
| `bf/b3#1` | Kodiak Breakfast | 550 / 38 / 51 / 22 | +10 cal |
| `bf/b8` | Piña Colada Bowl | 549 / 59 / 40 / 18 | +9 cal |
| `bf/b9` | Butterscotch Apple Pie Bowl | 549 / 59 / 42 / 17 | +9 cal |
| `bf/b4` | Oikos Power Parfait — no scale / no co | 548 / 36 / 76 / 12 | +8 cal |
| `bf/b7` | Cookies & Cream Bowl | 547 / 58 / 37 / 19 | +7 cal |
| `bf/b14` | Cinnamon Toast Bowl (protein-powder ba | 546 / 59 / 40 / 18 | +6 cal |
| `lu/l9` | Cold Crunch Bowl | 581 / 54 / 45 / 18 | +6 cal |
| `bf/b1` | Cream of Rice | 545 / 38 / 52 / 22 | +5 cal |
| `lu/l4` | Tuna Melt Stack | 580 / 51 / 62 / 17 | +5 cal |
| `sn/s2` | Protein Cookie | 330 / 34 / 32 / 7 | +5 cal |
| `bf/b12` | Fruity Pebbles Bowl (protein-powder ba | 544 / 59 / 40 / 18 | +4 cal |
| `bf/b11` | Chocolate Almond-Butter Bowl | 543 / 59 / 47 / 15 | +3 cal |
| `di/d17` | Sweet-Chili Salmon Plate (air fryer) | 583 / 56 / 45 / 20 | +3 cal |
| `pre/p2` | Rice Cakes + Tuna | 200 / 18 / 27 / 1 | 0 cal |
| `pre/p6` | Tuna + Banana | 200 / 19 / 33 / 1 | 0 cal |
| `bf/b10` | Lemon Blueberry Cheesecake Bowl | 539 / 59 / 39 / 18 | -1 cal |
| `bf/b15` | Vanilla Berry Bowl (protein-powder bas | 539 / 59 / 40 / 17 | -1 cal |
| `bf/b17` | Apple Pie Bowl (protein-powder base) | 539 / 60 / 47 / 17 | -1 cal |
| `bf/b18` | Chocolate Cookie Bowl (protein-powder  | 538 / 59 / 39 / 18 | -2 cal |
| `lu/l3` | Spinach Jiben | 573 / 57 / 41 / 22 | -2 cal |
| `lu/l6` | Salmon Shawarma Bowl | 573 / 53 / 53 / 17 | -2 cal |
| `di/d15` | Tomato Beef | 578 / 61 / 60 / 18 | -2 cal |
| `di/d3` | Blackened Salmon Plate | 578 / 54 / 58 / 15 | -2 cal |
| `bf/b5` | Banana Cream Protein Bowl | 537 / 56 / 46 / 16 | -3 cal |
| `bf/b6` | Strawberry Cheesecake Bowl | 537 / 60 / 43 / 15 | -3 cal |
| `lu/l2` | Broccoli Jiben | 572 / 55 / 45 / 21 | -3 cal |
| `bf/b13` | Mint Chip Bowl (protein-powder base) | 536 / 60 / 35 / 20 | -4 cal |
| `lu/l1r` | Chicken Meal — Rice | 571 / 52 / 56 / 15 | -4 cal |
| `pre/p3` | Rice Cakes + Yogurt | 195 / 16 / 27 / 0 | -5 cal |
| `pre/p5` | Yogurt + Banana | 195 / 16 / 33 / 0 | -5 cal |
| `bf/b2` | Bagel w/ Berries | 535 / 49 / 73 / 20 | -5 cal |
| `bf/b16` | Strawberry Shortcake Bowl (protein-pow | 534 / 59 / 39 / 17 | -6 cal |
| `lu/l7` | Spicy Tuna Crunch Bowl | 569 / 65 / 51 / 12 | -6 cal |
| `di/d2` | Poke Bowl | 573 / 53 / 53 / 17 | -7 cal |
| `lu/l1` | Chicken Meal — Sweet Potato | 566 / 52 / 57 / 15 | -9 cal |
| `sn/s4` | The Brookie | 315 / 30 / 38 / 6 | -10 cal |
| `sn/s1` | Ninja Creami | 315 / 32 / 30 / 7 | -10 cal |
| `di/d16` | Teriyaki-Glaze Salmon Bowl (fresh · se | 569 / 55 / 51 / 15 | -11 cal |
| `lu/l8` | Salmon Smash Patties | 563 / 56 / 66 / 14 | -12 cal |
| `di/d1` | Burger | 568 / 60 / 58 / 18 | -12 cal |
| `pre/p4` | Ezekiel + Jelly | 179 / 8 / 39 / 1 | -21 cal · |

**0 of 43 variants over budget.**

## Waiting on him

The only hand-maintained list in this file — nothing can compute what he has not said yet.

- **Balsamic drizzle brand** — b2 carries 30 cal for 15 g with no source. Balsamic GLAZE runs 30-90 cal per 15 g depending on how far it is reduced, so the brand decides it.
- **Kodiak flapjack box** — b3 variant 2 prices 4 frozen flapjacks at 255 cal from a derived figure. Kodiak publishes 14-16 P across formulations, so the box settles it.
- **Salmon species** — He confirmed WILD, skin off, sushi-grade from a kosher market. Basis is coho, which matches all six rows to within 1 cal. Sockeye would make the app read ~30 cal HIGH per meal; king ~59 LOW and ~7 g fat LOW, which would push five plates over their fat budget. He is asking at the counter.
- **Chocolate Cookie Blast scoop weight** — PP_G says 41 g a scoop, the published label says 39.1 g. Per-gram is 5% apart. One weighed scoop settles it.
- **SF ketchup bottle** — Priced at 0.29 cal/g from G Hughes and Heinz No Sugar Added, both of which publish 5 cal a tablespoon. His rows had said 20 cal for 32 g; corrected to ~9. If his bottle is a different formulation this needs replacing.
- **Jiben fat** — l2 and l3 run 6-7 g over their fat budget. It is structural — eggs plus cottage cheese plus mozzarella — so closing it means changing the food, which is his call, not a portion tweak.

## How to verify all of this yourself

```bash
node tools/check-food.js                                 # food numbers, budgets, provenance
NODE_PATH=.work/node_modules node tools/check-app.js      # schedule, rotations, name leak
NODE_PATH=.work/node_modules node tools/probe.js          # renders his real data, every tab/day
node tools/check-priced.plant.js                          # plants real defects, proves [priced] fires
node tools/check-food.selftest.js                         # plants real defects across the food guards
```

Do not trust a claim in any document — including this one — over what those five print.
