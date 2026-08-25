# STATUS — where this project actually is

**GENERATED FILE — do not edit.** Written by `node tools/status.js`, and `[status-doc]` in
check-food.js fails the build when it is stale. Every number below is computed from
`index.html`, never typed — which is the difference between this file and the onboarding
section of CLAUDE.md that had gone quietly wrong by the time anyone noticed.

| | |
|---|---|
| app | `index.html`, 722,351 bytes, 8,610 lines, one file |
| build | `b1787670952` |
| foods on the price list | 120 |
| provenance | 55 label · 36 USDA · 27 derived · 2 unverified |

## Ingredient rows

A row either NAMES its source in `FOOD_FACTS` and is multiplied at render time, or it still
carries a hand-typed copy of its macros. The second kind is the one that can be silently wrong.

| | rows | |
|---|---:|---|
| priced from FOOD_FACTS | **225** | 88% of 256 |
| deliberately zero (`{free:1}`) | 27 | spices, rubs, a free garnish |
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
| `bf/b5` | Banana Cream Protein Bowl | 560 / 44 / 62 / 17 | +20 cal · |
| `bf/b25` | Blueberry Muffin Bowl | 553 / 48 / 58 / 16 | +13 cal |
| `lu/l10` | Salad+Bagel | 588 / 73 / 70 / 17 | +13 cal |
| `bf/b27` | Almond Croissant Bowl | 551 / 45 / 46 / 22 | +11 cal |
| `bf/b3#1` | Kodiak Breakfast | 550 / 38 / 51 / 22 | +10 cal |
| `di/d3` | Blackened Salmon Plate | 589 / 54 / 58 / 15 | +9 cal |
| `bf/b4` | Oikos Power Parfait — no scale / no co | 548 / 36 / 76 / 12 | +8 cal |
| `lu/l9` | Cold Crunch Bowl | 581 / 54 / 45 / 18 | +6 cal |
| `bf/b1` | Cream of Rice | 545 / 38 / 52 / 22 | +5 cal |
| `lu/l4` | Tuna Melt Stack | 580 / 51 / 62 / 17 | +5 cal |
| `sn/s2` | Protein Cookie | 330 / 34 / 32 / 7 | +5 cal |
| `bf/b7` | Cookies & Cream Bowl | 544 / 43 / 47 / 22 | +4 cal |
| `bf/b18` | Chocolate Cookie Bowl | 543 / 44 / 50 / 20 | +3 cal |
| `bf/b23` | Pumpkin Pie Bowl | 543 / 46 / 51 / 19 | +3 cal |
| `di/d17` | Sweet-Chili Salmon Plate (air fryer) | 583 / 56 / 45 / 20 | +3 cal |
| `pre/p2` | Rice Cakes + Tuna | 200 / 18 / 27 / 1 | 0 cal |
| `pre/p6` | Tuna + Banana | 200 / 19 / 33 / 1 | 0 cal |
| `bf/b8` | Piña Colada Bowl | 540 / 44 / 55 / 18 | 0 cal |
| `bf/b9` | Butterscotch Apple Pie Bowl | 540 / 43 / 60 / 16 | 0 cal |
| `bf/b10` | Lemon Blueberry Cheesecake Bowl | 540 / 44 / 58 / 17 | 0 cal |
| `bf/b13` | Mint Chip Bowl | 540 / 45 / 46 / 24 | 0 cal |
| `bf/b16` | Strawberry Shortcake Bowl | 540 / 44 / 57 / 17 | 0 cal |
| `bf/b17` | Apple Pie Bowl | 540 / 44 / 67 / 16 | 0 cal |
| `bf/b14` | Cinnamon Toast Bowl | 539 / 45 / 52 / 19 | -1 cal |
| `bf/b15` | Vanilla Berry Bowl | 539 / 44 / 55 / 18 | -1 cal |
| `bf/b26` | Snickerdoodle Bowl | 539 / 44 / 60 / 15 | -1 cal |
| `lu/l6` | Salmon Shawarma Bowl | 574 / 53 / 57 / 15 | -1 cal |
| `di/d1` | Burger | 579 / 60 / 58 / 18 | -1 cal |
| `bf/b6` | Strawberry Cheesecake Bowl | 538 / 44 / 60 / 15 | -2 cal |
| `bf/b11` | Chocolate Almond-Butter Bowl | 538 / 46 / 47 / 21 | -2 cal |
| `lu/l3` | Spinach Jiben | 573 / 57 / 41 / 22 | -2 cal |
| `di/d15` | Tomato Beef | 578 / 61 / 60 / 18 | -2 cal |
| `bf/b12` | Fruity Pebbles Bowl | 537 / 44 / 54 / 18 | -3 cal |
| `bf/b21` | Mocha Cookie Bowl | 537 / 44 / 55 / 18 | -3 cal |
| `lu/l2` | Broccoli Jiben | 572 / 55 / 45 / 21 | -3 cal |
| `bf/b22` | Orange Creamsicle Bowl | 536 / 43 / 53 / 17 | -4 cal |
| `lu/l1r` | Chicken Meal — Rice | 571 / 52 / 56 / 15 | -4 cal |
| `pre/p3` | Rice Cakes + Yogurt | 195 / 16 / 27 / 0 | -5 cal |
| `pre/p5` | Yogurt + Banana | 195 / 16 / 33 / 0 | -5 cal |
| `bf/b2` | Bagel w/ Berries | 535 / 49 / 73 / 20 | -5 cal |
| `bf/b20` | Cookie Butter Bowl | 534 / 44 / 54 / 18 | -6 cal |
| `lu/l7` | Spicy Tuna Crunch Bowl | 569 / 65 / 51 / 12 | -6 cal |
| `di/d2` | Poke Bowl | 573 / 53 / 53 / 17 | -7 cal |
| `sn/s4` | The Brookie | 317 / 30 / 38 / 6 | -8 cal |
| `lu/l1` | Chicken Meal — Sweet Potato | 566 / 52 / 57 / 15 | -9 cal |
| `sn/s1` | Ninja Creami | 315 / 32 / 30 / 7 | -10 cal |
| `di/d16` | Teriyaki-Glaze Salmon Bowl (fresh · se | 569 / 55 / 51 / 15 | -11 cal |
| `lu/l8` | Salmon Smash Patties | 563 / 56 / 66 / 14 | -12 cal |
| `bf/b24` | Red Velvet Bowl | 527 / 44 / 49 / 19 | -13 cal |
| `pre/p4` | Ezekiel + Jelly | 179 / 8 / 39 / 1 | -21 cal · |

**0 of 51 variants over budget.**

## Waiting on him

The only hand-maintained list in this file — nothing can compute what he has not said yet.

- **Balsamic drizzle brand** — b2 carries 30 cal for 15 g with no source. Balsamic GLAZE runs 30-90 cal per 15 g depending on how far it is reduced, so the brand decides it.
- **Kodiak flapjack box** — b3 variant 2 prices 4 frozen flapjacks at 255 cal from a derived figure. Kodiak publishes 14-16 P across formulations, so the box settles it.
- **Salmon species** — He confirmed WILD, skin off, sushi-grade from a kosher market. Basis is coho, which matches all six rows to within 1 cal. Sockeye would make the app read ~30 cal HIGH per meal; king ~59 LOW and ~7 g fat LOW, which would push five plates over their fat budget. He is asking at the counter.
- **Jiben fat** — l2 and l3 run 6-7 g over their fat budget. It is structural — eggs plus cottage cheese plus mozzarella — so closing it means changing the food, which is his call, not a portion tweak.

## How to verify all of this yourself

```bash
node tools/check-food.js                                 # food numbers, budgets, provenance
NODE_PATH=.work/node_modules node tools/check-app.js      # schedule, rotations, name leak
NODE_PATH=.work/node_modules node tools/probe.js          # renders his real data, every tab/day
node tools/check-priced.plant.js                          # plants real defects, proves [priced] fires
node tools/check-food.selftest.js                         # plants real defects across the food guards
node tools/check-app.plant.js                              # plants real defects, proves the app-behaviour guards fire
```

Do not trust a claim in any document — including this one — over what those five print.
