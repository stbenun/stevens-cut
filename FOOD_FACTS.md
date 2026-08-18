# FOOD_FACTS — every per-unit food number in the app

**GENERATED FILE — do not edit.** Source of truth is `FOOD_FACTS` inside `index.html`.
Regenerate with `node tools/food-doc.js`. `[food-doc]` in check-food.js fails if this is stale.

## Coverage: 43 / 64 foods in the meal plan (**67%**)

`cal/p/c/f` are **per one unit** shown in the `per` column. Multiply by the amount eaten.

Provenance of the 83 rows: **33** USDA · **31** label · **17** derived · **2** UNVERIFIED

| food | per | cal | P | C | F | provenance | source |
|---|---|---:|---:|---:|---:|---|---|
| `93/7 ground beef` | g | 1.52 | 0.209 | 0 | 0.071 | USDA | USDA FDC 173110, 'Beef, ground, 93% lean meat / 7% fat, raw': 100 g = 152 cal / 20.9 P / 0 C / 7.1 F -> per gram. Fetched Aug 18 2026. His 6 oz raw row states 255/35/0/12 and this gives 259/35.6/0/12.1 — it was already right, just unsourced. |
| `acme nova lox` | g | 1.24 | 0.229 | 0 | 0.044 | label | Acme Nova smoked salmon label, verified Jul 24 2026: 2 oz (57 g) = 70 cal / 13 P / 0 C / 2.5 F -> per gram. His 75 g row = 93/17/0/3. It had been overstated at 145/16/0/9 under the wrong brand name and was corrected then. |
| `almond butter` | g | 5.94 | 0.19 | 0.19 | 0.53 | label | BRAND-VARIABLE, his call: 190-220 cal per 32 g depending on brand, and he does not standardise. Basis is the low end (190/32 = 5.94 cal/g), which is what the app rows already use. Justin\'s Classic official panel for reference: 32 g = 220 / 6 P / 5 C / 19 F. Do NOT pin a single brand. |
| `apple` | g | 0.52 | 0.003 | 0.138 | 0.002 | USDA | USDA apples, raw, WITH SKIN: 100 g = 52 cal / 0.26 P / 13.8 C / 0.17 F -> per gram. A medium apple is ~182 g = 95 cal, which is exactly what his row says. Confirmed correct. |
| `arak 40%` | mL | 2.21 | 0 | 0 | 0 | derived | 0.40 ABV x 0.789 g/mL x 7 kcal/g — pure distillate, no sugar. 1.5 oz = 44.4 mL = 98 cal |
| `asparagus` | g | 0.2 | 0.022 | 0.039 | 0.001 | USDA | USDA asparagus, raw: 100 g = 20 cal / 2.2 P / 3.88 C TOTAL (2.1 g fibre, so 1.78 net) / 0.12 F -> per gram. App prices 100 g at 20/2/4/0 — exact. Not changed. |
| `banana` | g | 0.89 | 0.0109 | 0.228 | 0.0033 | USDA | USDA bananas raw: 100 g = 89 cal / 1.09 P / 22.8 C / 0.33 F -> per gram. A medium banana is 118 g = 105 cal. NOTE the app carries BOTH 105 and 110 for "1 med"; 105 is the USDA figure. |
| `bare coconut chips` | g | 6.07 | 0.07 | 0.5 | 0.43 | label | Bare Baked Crunchy Toasted Coconut Chips label, his brand confirmed Aug 11 2026: 28 g = 170 cal / 2 P / 14 C / 12 F -> per gram. Sat fat 11 g per 28 g. |
| `biscoff` | g | 4.84 | 0.065 | 0.742 | 0.194 | label | lotusbiscoff.com US Classic panel: 4 cookies (31 g) = 150 cal / 2 P / 23 C / 6 F -> per gram. 7.75 g per cookie. Airline/snack packs differ (2 cookies 25 g = 120 cal) — this is the Classic box. 4 cups. |
| `blueberries` | g | 0.57 | 0.007 | 0.145 | 0.003 | USDA | USDA raw blueberries, 100 g = 57 cal / 0.7 P / 14.5 C / 0.33 F -> per gram. Cups use 70 g. |
| `brisket flat` | oz cooked | 70 | 8.2 | 0 | 4 | derived | 248 cal / 29 P per 100 g — his own Southside figure |
| `broccoli` | g | 0.34 | 0.028 | 0.066 | 0.004 | USDA | USDA broccoli, raw: 100 g = 34 cal / 2.82 P / 6.64 C / 0.37 F -> per gram. App prices 150 g at 50 cal; USDA gives 51. Already right, not changed. |
| `celery` | g | 0.16 | 0.0069 | 0.0297 | 0.0017 | USDA | USDA celery, raw: 100 g = 16 cal / 0.69 P / 2.97 C / 0.17 F -> per gram. Fetched Aug 18 2026. |
| `chicken breast` | oz cooked | 47 | 8.8 | 0 | 1 | derived | grilled skinless, 165 cal / 31 P per 100 g |
| `chicken breast raw` | g | 1.2 | 0.225 | 0 | 0.026 | USDA | USDA FDC 171077, chicken breast, boneless skinless, raw: 100 g = 120 cal / 22.5 P / 0 C / 2.6 F -> per gram. Fetched Aug 18 2026. His 7 oz raw row states 245/44/0/7; this gives 238/44.6/0/5.2, so calories were 7 high and fat 1.8 high. |
| `cinnamon apples` | g | 0.52 | 0.003 | 0.138 | 0.002 | USDA | USDA raw apple with skin, 100 g = 52 cal / 0.26 P / 13.8 C / 0.17 F -> per gram; the cinnamon and the warming add nothing. Cups use 100 g. |
| `cinnamon toast crunch` | g | 4.15 | 0.049 | 0.805 | 0.098 | label | General Mills Cinnamon Toast Crunch label: 1 cup (41 g) = 170 cal / 2 P / 33 C / 4 F -> per gram. 2 cups. |
| `cottage cheese 4%` | g | 0.909 | 0.127 | 0.018 | 0.041 | label | Good Culture Organic 4% official panel: 1/2 cup (110 g) = 100 cal / 14 P / 2 C / 4.5 F -> per gram. BRAND RANGE: Daisy 4% is 113 g = 110 / 13 P / 5 C / 5 F, so 103-110 cal per 113 g. He uses either. The app had 113 g at 80 cal — 23 cal and 3.6 g fat LOW on his jiben lunch — corrected in l2 and l3. |
| `cucumber` | g | 0.15 | 0.007 | 0.036 | 0.001 | USDA | USDA cucumber, with peel, raw: 100 g = 15 cal / 0.65 P / 3.63 C / 0.11 F -> per gram. His 75 g row reads 15 cal; USDA gives 11. Four calories, left alone. |
| `edamame` | g | 1.21 | 0.119 | 0.089 | 0.052 | USDA | USDA edamame, frozen, PREPARED: 100 g = 121 cal / 11.9 P / 8.9 C total (5.2 g fibre, so 3.7 net — an earlier search handed me the NET figure as if it were total) / 5.2 F -> per gram. He confirmed Aug 12 2026 it is just regular frozen edamame, so USDA is the right basis. ⚠️ The app rows ran ~17% high (85 g priced at 120 cal, real 103) and are corrected. |
| `egg` | each | 72 | 6.3 | 0.4 | 4.8 | USDA | USDA FDC 171287, egg, whole, raw, fresh: 1 large egg (50 g) = 72 cal / 6.3 P / 0.4 C / 4.8 F. Fetched Aug 18 2026. Confirms the app's 2-egg row at 144/13/1/10 and shows Q's original sheet figure of 80 cal an egg was for a larger grade. |
| `egg whites` | g | 0.52 | 0.109 | 0.007 | 0.002 | USDA | USDA egg white, raw: 100 g = 52 cal / 10.9 P / 0.73 C / 0.17 F -> per gram. The app prices 100 g at 50 / 10 / 0 / 0 — within 4%, so the rows were already right and were NOT changed. |
| `eye of round` | oz cooked | 40.5 | 7.7 | 0 | 1 | derived | lean roast beef, 143 cal / 27 P per 100 g |
| `ezekiel bread` | slice | 80 | 4 | 15 | 0.5 | label | Food For Life Ezekiel 4:9 Sprouted Whole Grain label: 1 slice = 80 cal / 4 P / 15 C total (3 g fiber) / 0.5 F. ⚠️ The app rows use 5 P per slice, so every Ezekiel row overstates protein by 1 g per slice. |
| `fage 2% greek yogurt` | g | 0.697 | 0.0995 | 0.0299 | 0.0199 | label | FAGE Total 2% panel: 7.1 oz container (201 g) = 140 cal / 20 P / 6 C / 4 F -> per gram. Cross-checked against the app: his 400 g row says 282/40/12/8 and this gives 279/39.8/11.9/8.0 — the row was already right. |
| `fairlife 0% milk` | mL | 0.333 | 0.0542 | 0.025 | 0 | label | Fairlife Fat Free ultra-filtered label: 240 mL = 80 cal / 13 P / 6 C / 0 F -> per mL. Cross-checked: his 320 mL row says 107/17.3 and this gives 106.7/17.3 — exact to the decimal. |
| `fd strawberries` | g | 3.5 | 0.1 | 0.8 | 0.01 | label | Freeze-dried strawberries published panel: 10 g = 35 cal / 1 P / 8 C (2 g fiber, 5 g sugar) -> per gram. Brand-to-brand variation is small. Batch 5 cup 8 uses 10 g. |
| `ff whip` | g | 1 | 0 | 0.2 | 0 | label | Reddi-wip Fat Free label: 2 tbsp (5 g) = 5 cal / 0 P / 1 C / 0 F -> 1 cal per g. STANDARD SERVING 15 g = 15 cal / 3 C. ✅ BRAND CONFIRMED BY HIM Aug 11 2026 — it is Reddi-wip Fat Free, and the published label matches this row exactly, so the derived figure was right. |
| `fiber one bar` | bar | 70 | 2 | 17 | 3 | label | Fiber One 70 Calorie Soft-Baked Bar label, HIS version confirmed Aug 11 2026: 1 bar (~25 g) = 70 cal / 2 P / 17 C total / 3 F, 7 g fiber, 2 g sugar. Cinnamon Coffee Cake and Chocolate Fudge Brownie are identical panels. The 90-cal product is a DIFFERENT bar — do not mix them up. |
| `frozen strawberries` | g | 0.35 | 0.004 | 0.091 | 0.001 | USDA | USDA strawberries, frozen, UNSWEETENED — he confirmed unsweetened Aug 12: 100 g = 35 cal / 0.43 P / 9.13 C / 0.11 F -> per gram. The app had 150 g at 75 cal; real is 53. Corrected in b6 and b16. |
| `fruity pebbles` | g | 3.89 | 0.028 | 0.861 | 0.056 | label | Post Fruity Pebbles label: 1 cup (36 g) = 140 cal / 1 P / 31 C / 2 F -> per gram. 3 cups. |
| `graham cracker` | g | 4.19 | 0.065 | 0.774 | 0.097 | label | Honey Maid Original label: 31 g (8 crackers / 2 full sheets) = 130 cal / 2 P / 24 C / 3 F -> per gram. Batch 5 cup 4 Key Lime takes 25 g. |
| `hummus` | g | 1.83 | 0.04 | 0.13 | 0.1 | derived | Category figure for plain hummus, 1.7-2.0 cal/g; his rows use 1.83 (30 g = 55 cal) which sits mid-range. NOT brand-verified — if hummus ever becomes more than a 15-30 g smear, get the tub. |
| `justins classic almond butter` | g | 6.875 | 0.1875 | 0.15625 | 0.59375 | label | Justin's Classic Almond Butter official panel: 32 g squeeze pack = 220 cal / 6 P / 5 C / 19 F -> per gram. The same panel is already cited inside the generic almond-butter entry as its upper bound; this key exists so a row that NAMES the brand is priced as the brand instead of at the 190 low end. His rule stands for the generic key: do not pin it. |
| `kodiak flapjack` | each | 63 | 4.7 | 9 | 1.3 | derived | Kodiak Buttermilk Power Flapjacks, FROZEN: 3 flapjacks = 190 cal / 14 P -> ~63 cal / 4.7 P each. ⚠️ Kodiak lists 14-16 P per serving across formulations, so this is the low end; re-check against his box. |
| `kodiak waffle` | each | 220 | 10 | 25 | 9 | derived | Kodiak Thick & Fluffy Buttermilk & Vanilla FROZEN waffles, verified Jul 24 2026: 220 cal EACH (they are thick, 1 per serving). His 2-waffle row = 440/20/50/18. Confirmed correct, not the mix. |
| `lakanto sugar-free maple syrup` | g | 0.256 | 0 | 0.154 | 0 | label | Lakanto Maple Flavored Syrup (monk fruit + erythritol) label: 2 tbsp / 30 mL = 10 cal / 6 C, syrup density ~1.3 g/mL so ~39 g -> per gram. ⚠️ Caught an internal contradiction: his 15 g row said 4 C while the 60 g row said 1 C — four times the syrup for a quarter of the carbs. 60 g corrected to 15 cal / 9 C. |
| `light mayo` | g | 2.67 | 0 | 0.067 | 0.267 | label | Hellmann's Light label: 1 tbsp (15 g) = 40 cal / 0 P / 1 C / 4 F -> per gram. Fetched Aug 18 2026. Older panels said 35/3.5; this is the current one. |
| `low-moisture mozzarella` | g | 2.857 | 0.25 | 0.0714 | 0.214 | label | Les Petites Fermieres Shredded Mozzarella, low-moisture part-skim — HIS BAG, label photographed Aug 12 2026: 1/4 cup (28 g) = 80 cal / 7 P / 2 C / 6 F (3 g sat), 8 servings per 227 g bag. The app row had 6 P at 28 g; calories, carbs and fat were already exact. Protein corrected to 7. |
| `mayonnaise` | g | 6.92 | 0 | 0 | 0.77 | label | Hellmann's Real label: 1 tbsp (13 g) = 90 cal / 0 P / 0 C / 10 F -> per gram. Fetched Aug 18 2026. |
| `mini guac cup` | cup | 105 | 1 | 5 | 9 | derived | Wholly Guacamole Classic Minis: 2 oz (57 g) = 110 cal, ~9.5 F / 5 C / 1 P. He uses Wegmans cups OR Wholly (confirmed Aug 12), so this is a midpoint of the two; the app row (100/1/6/8) sits inside the brand spread and was left alone. |
| `miso soup` | cup (240 g) | 40 | 3 | 5 | 1 | USDA | USDA-style restaurant miso: 240 g cup ~50 cal / 3 P / 5 C / 1 F; 40 is the Atwater-consistent value for that split. Tofu-heavy bowls run 6 P / ~80 cal. ~700 mg sodium. |
| `natures own keto bread` | slice | 35 | 6 | 10 | 0.5 | label | Nature\'s Own Keto Soft White Bread label, his brand confirmed Aug 12 2026: 1 slice = 35 cal / 6 P / 10 C total (9 g fibre, 1 g net) / 0.5 F. He has the LOAF, not the buns. OPEN: how many slices he uses as a burger bun — the app row says 50 cal, which matches neither 1 slice nor 2. |
| `nilla wafer` | g | 4.67 | 0.033 | 0.7 | 0.2 | label | Nabisco Nilla Wafers label: 8 wafers (30 g) = 140 cal / 1 P / 21 C / 6 F -> per gram. 3.75 g per wafer, which matches his own "9 crushed Nilla wafers (34 g)" row to within 0.03 g. 11 cups use these. |
| `oats` | g | 3.79 | 0.135 | 0.674 | 0.069 | USDA | USDA oats, rolled, dry: 100 g = 379 cal / 13.5 P / 67.4 C / 6.9 F -> per gram. The app prices 25 g at 95 cal, i.e. 3.8 cal/g — already exact. No change. |
| `oikos triple zero` | cup (150 g) | 90 | 15 | 6 | 0 | derived | FLAVOUR-VARIABLE. His call Aug 12 2026 when shown the 80-vs-90 conflict: 'depends on flavor.' oikos.com official for VANILLA is 1 cup (150 g) = 80 cal / 15 P / 6 C / 0 F; retailers list 90 for other flavours. Spread recorded as 80-90 and NOT pinned. BASIS IS 90 because that is what his app rows have always used and he confirmed it stands — pricing at 80 silently cut 20 cal from b4. |
| `oreo mini` | g | 4.83 | 0.034 | 0.724 | 0.207 | label | Oreo Mini Bite Size label: 9 cookies (29 g) = 140 cal / 1 P / 21 C / 6 F -> per gram, 3.22 g per cookie. Identical per-gram to oreo thin, which is expected — same cookie, smaller format. He eats these WHOLE, not de-creamed. |
| `oreo thin` | g | 4.83 | 0.034 | 0.724 | 0.207 | label | Oreo Thins label: 4 cookies (29 g) = 140 cal / 1 P / 21 C / 6 F -> per gram. 7.25 g per WHOLE cookie. ⚠️ 6 cups specify DE-CREAMED and the filling conversion is UNKNOWN — do not apply this to a de-creamed cup until he says whether he weighs before or after. |
| `oreo thin wafer` | g | 4.78 | 0.044 | 0.752 | 0.168 | UNVERIFIED | DERIVED, not a label: Oreo Thins whole (4 cookies / 29 g = 140 cal / 1 P / 21 C / 6 F) minus an assumed 22% cream fraction. A de-creamed Thin ~= 5.65 g / 27 cal / 0.25 P / 4.25 C / 0.95 F, so 5 of them ~= 135 cal vs 175 whole. NEEDS ONE WEIGH-IN TO CONFIRM. |
| `philadelphia cream cheese` | g | 2.19 | 0.063 | 0.063 | 0.188 | label | Philadelphia 1/3-less-fat (Neufchatel) label, verified Jul 24 2026: 32 g = 70 cal / 2 P / 2 C / 6 F -> per gram. His 45 g row = 98/3/3/8, corrected then from an overstated 120/3/3/10.5. |
| `pineapple` | g | 0.5 | 0.005 | 0.131 | 0.001 | USDA | USDA raw pineapple, 100 g = 50 cal / 0.54 P / 13.1 C / 0.12 F -> per gram. Cups use 150 g. |
| `pita` | piece | 190 | 6.3 | 38.5 | 0.8 | UNVERIFIED | HIS 190 cal/piece; split derived from USDA white pita 275 cal / 9.1 P / 55.7 C / 1.2 F per 100 g -> a 69 g piece. ⚠️⚠️ HIS INSTRUCTION Aug 12 2026: "for now just assume 190" — he will confirm off the package later, so 190 STANDS and is not a guess of mine. BRAND IS SHORE PITA AND THE FIGURES CONFLICT: a crowd-sourced listing for Shore Pita Plain gives 230 cal / 6 P / 40 C / 0.5 F per pita, 40 cal ABOVE his 190. Neither is a label photo — his 190 is from memory, the 230 is user-submitted. He eats one EVERY Friday, so 40 cal x every Friday is worth settling. DO NOT overwrite 190 with 230 without the package; Shore sells more than one size. |
| `potato skin-on` | g | 0.76 | 0.0205 | 0.1745 | 0.001 | USDA | Midpoint of USDA russet flesh-and-skin raw (79 cal/100 g) and Yukon Gold flesh-and-skin raw (73), because he alternates and always eats the skin. RANGE 0.73-0.79 cal/g. All his weights are raw. Corrected 5 rows that were priced at the gold end. |
| `potatoes` | g | 0.79 | 0.021 | 0.179 | 0.001 | USDA | USDA 'Potatoes, russet, flesh and skin, raw': 100 g = 79 cal / 2.1 P / 17.9 C / 0.1 F -> per gram. Fetched Aug 18 2026. Spread 77-80 covers the generic flesh-and-skin entry and gold varieties, because he buys either and always cooks skin on. His 220 g row states 167 cal; this gives 174. |
| `protein` | scoop | 137 | 25 | 4 | 2.7 | label | Ryse Loaded / RAW, per 1 scoop. Label-verified flavours in PP_G comments: Milk Chocolate 37 g = 140/25/4/3 (Aug 4), Jet-Puffed Marshmallow 35 g = 130/25/3/2.5 (Aug 6), Jet-Puffed Birthday Cake 34.8 g = 130/25/4/2.5 (Aug 6), Blueberry Muffin 34.9 g = 140/25/4/2.5 (Jul 27). Macros per scoop barely vary; the GRAM WEIGHT does (30-41 g) and PP_G is the source for that. Always weigh from the ziplock. |
| `rice cake` | each | 35 | 0.33 | 7 | 0 | label | HIS figure, stated repeatedly and baked into the row label "Rice cakes (35 cal each)". Plain brown-rice cakes run 35 cal / 7 C, so his number checks out against the category. He always eats 3. |
| `rice vinegar` | g | 0.2 | 0 | 0.03 | 0 | label | Unseasoned rice vinegar, published panels: 1 tbsp (15 g) = 0-5 cal, rounded to 3 cal -> per gram. Brand-to-brand it is 0 or 5 depending on label rounding; the low end is used and it is under 5 cal either way. Fetched Aug 18 2026. |
| `romaine lettuce` | g | 0.17 | 0.012 | 0.033 | 0.003 | USDA | USDA romaine, raw: 100 g = 17 cal / 1.2 P / 3.3 C / 0.3 F -> per gram. Fetched Aug 18 2026. |
| `russet potato` | g | 0.79 | 0.021 | 0.175 | 0.001 | USDA | USDA russet potato, flesh and skin, RAW: 100 g = 79 cal / 2.1 P / 17.5 C / 0.1 F -> per gram. ⚠️ The app prices 220 g at 160 cal; USDA gives 174. All his weights are raw, so raw is the right basis. |
| `salmon` | g | 1.46 | 0.216 | 0 | 0.059 | USDA | USDA 'Fish, salmon, coho, wild, raw': 100 g = 146 cal / 21.6 P / 0 C / 5.9 F -> per gram. Fetched Aug 18 2026. Spread covers the purchasable wild Pacific species: sockeye 130 cal/100 g at the low end, chinook/king 179 at the high. Wild Atlantic (142) is excluded on purpose — it cannot legally be sold in the US. Rows are in ounces and convert via the engine; all weights RAW, skin off, per his answer. |
| `salmon farmed` | g | 2.08 | 0.204 | 0 | 0.134 | USDA | USDA salmon, Atlantic, FARMED, raw: 100 g = 208 cal / 20.4 P / 13.4 F -> per gram. If this is what he buys, every 6 oz portion is 354 cal not 250 — 104 cal and 13 g fat per serving, six recipes. AWAITING his answer; nothing changed yet. |
| `salmon sashimi` | piece (20 g) | 42 | 4.1 | 0 | 2.7 | derived | Atlantic farmed, 208 cal / 20.4 P per 100 g raw |
| `salmon wild` | g | 1.42 | 0.198 | 0 | 0.065 | USDA | USDA salmon, Atlantic, WILD, raw: 100 g = 142 cal / 19.8 P / 6.3 F -> per gram. This is what his rows are currently priced at (1.47 cal/g). |
| `scallion` | g | 0.32 | 0.0183 | 0.074 | 0.002 | USDA | USDA onions, spring/scallions, raw, tops and bulb: 100 g = 32 cal / 1.83 P / 7.4 C / 0.2 F -> per gram. Fetched Aug 18 2026. |
| `sf choc syrup` | g | 0.33 | 0 | 0.13 | 0 | derived | matches the 15 g = 5 cal / 2 C row already used in b7 + b11, so the salvage/Creami toppings agree with the yogurt bowls |
| `sf pudding mix` | g | 2.9 | 0.1 | 0.7 | 0 | derived | Jell-O Sugar Free Fat Free instant: vanilla 1/4 pkg (7 g) = 20 cal, chocolate 1/4 pkg (10 g) = 30 cal / 1 P / 7 C -> ~2.9 cal per gram, essentially all modified starch. Cups use 5 g = ~14 cal / 3.5 C. |
| `sliced almonds` | g | 5.79 | 0.212 | 0.216 | 0.499 | USDA | USDA raw almonds, 100 g = 579 cal / 21.2 P / 21.6 C / 49.9 F -> per gram. Almonds are a commodity so USDA is reliable here; a bag photo would only matter if his are roasted or salted. HIS ONE ALLOWED NUT. Batch 5 cup 1. |
| `smoked half chicken` | half bird | 620 | 85 | 2 | 29 | derived | DERIVED, not a published label: his own ~85 g protein figure for the Southside half chicken, at 29 P per 100 g roasted meat = ~293 g meat = ~557 cal, plus the breast skin he keeps (~20 g, ~90 cal) and rub. Cross-check: 85P*4 + 2C*4 + 29F*9 = 609. Treat as +/-15% like every restaurant number. |
| `smucker sf jelly` | g | 0.59 | 0 | 0.294 | 0 | label | Smucker's Sugar Free jam label: 1 tbsp (17 g) = 10 cal / 5 C total (3 net) -> per gram. His 32 g row reads 20/0/10/0; this gives 18.8/9.4. Already right, not changed. |
| `sola everything bagel` | each | 140 | 15 | 36 | 5 | label | Sola everything bagel label, verified Jul 24 2026: 140 cal / 15 P / 36 C (24 g fibre) / 5 F. I had doubted these numbers as too high in protein and fibre and was WRONG — Sola genuinely is a high-protein high-fibre bagel. Flagging beat correcting. |
| `soy sauce` | mL | 0.33 | 0.03 | 0.05 | 0 | derived | Category figure for regular soy sauce (~0.5 cal/mL for Kikkoman; low-sodium similar). His rows use 0.33 (15 mL = 5 cal), slightly light but under 3 cal on any row he uses. NOT brand-verified. |
| `spinach` | g | 0.23 | 0.029 | 0.037 | 0.004 | USDA | USDA spinach, raw: 100 g = 23 cal / 2.9 P / 3.7 C / 0.4 F -> per gram. App prices 150 g at 35 cal; USDA gives 34.5. Already right, not changed. |
| `sriracha` | g | 1 | 0 | 0.2 | 0 | label | Huy Fong Sriracha label: 1 tsp (5 g) = 5 cal / 1 C -> per gram. Fetched Aug 18 2026. |
| `strawberries` | g | 0.32 | 0.007 | 0.077 | 0.003 | USDA | USDA raw strawberries, 100 g = 32 cal / 0.67 P / 7.7 C / 0.3 F -> per gram. Cups use 70 g. |
| `string beans` | g | 0.31 | 0.018 | 0.07 | 0.002 | USDA | USDA beans, snap, green, raw: 100 g = 31 cal / 1.83 P / 6.97 C / 0.22 F -> per gram. |
| `sweet potato` | g | 0.86 | 0.016 | 0.2 | 0.001 | USDA | USDA sweet potato, raw: 100 g = 86 cal / 1.6 P / 20.1 C / 0.05 F -> per gram. His 225 g row reads 190; USDA gives 194. Within 2%, confirmed correct — and this is the row I wrongly told him would move with the white-potato answer. It does not. |
| `tomato` | g | 0.18 | 0.009 | 0.039 | 0.002 | USDA | USDA tomatoes, red, ripe, raw, year-round average (FDC 170457): 100 g = 18 cal / 0.9 P / 3.9 C / 0.2 F -> per gram. Fetched Aug 18 2026. |
| `tuna packet` | packet | 70 | 17 | 0 | 0.5 | label | HIS label, stated Aug 18 2026: 70 cal / 17 P per pouch, in water. Fat not stated on his figure; USDA light tuna canned in water drained is ~0.8 g fat per 85 g, so ~0.5 g for a 2.6 oz pouch. The app rows round fat to 0, matching l7/l9. |
| `tuna roll` | 6-pc roll | 190 | 11 | 32 | 1.5 | derived | EATOUT_ORDER sushi carb anchor |
| `tuna sashimi` | piece (20 g) | 22 | 4.9 | 0 | 0.1 | derived | yellowfin, 109 cal / 24.4 P per 100 g raw |
| `turkey breast` | oz cooked | 38 | 8.5 | 0 | 0.3 | derived | roast, 135 cal / 30 P per 100 g |
| `white rice dry` | g | 3.62 | 0.071 | 0.8 | 0.007 | USDA | USDA white rice, long-grain, regular, RAW: 100 g = 365 cal / 7.13 P / 80 C. Short-grain sushi rice is ~358, so 3.62 cal/g is the midpoint of the two he cooks and is within 2% of either. ⚠️ The app rows were priced at ~3.40 — about 7% light across all five. Carbs were already right (0.80/g exactly), which is why only calories moved. |
| `whole egg` | each | 72 | 6.3 | 0.4 | 4.8 | USDA | HE BUYS LARGE — confirmed Aug 12 2026. USDA large egg (50 g) = 72 cal / 6.3 P / 0.4 C / 4.8 F. The app rows were priced at 80/7/0/5, i.e. EXTRA-LARGE, so every egg was 8 cal high; corrected. Old note: USDA large egg (50 g) = 72 cal / 6 P / 4.8 F; extra-large (56 g) = 80 / 7 / 5.3, which is exactly what the rows use. Left at 80 because that is the existing basis, but OPEN: which size does he buy? Large would make every egg row 8 cal high. |

## Still to source — 21 foods, most-used first

Every row below is a hand-typed number with no source anywhere in the repo.

| food | times it appears in the plan |
|---|---:|
| berries | 4 |
| frozen berries | 2 |
| sf chocolate syrup, drizzled | 2 |
| cinnamon roll cor | 2 |
| elev8 cor | 1 |
| balsamic drizzle | 1 |
| sf chocolate chips / cacao nibs | 1 |
| frozen mixed berries | 1 |
| cereal | 1 |
| israeli salad | 1 |
| mayo: hellmann’s real 8 g | 1 |
| pickles | 1 |
| mayo: hellmann’s real 10 g | 1 |
| brownie dry: all-purpose flour 18 g · lakanto 28 g · ryse choc cookie blast 12 g · dark cocoa 8 g · baking soda scant ¼ tsp · baking powder ¼ tsp · salt | 1 |
| cookie dough | 1 |
| topping / mix-in | 1 |
| baking powder ½ tsp · cinnamon ¾ tsp · vanilla ¼ tsp · pinch salt | 1 |
| sugar-free ketchup | 1 |
| seaweed packet | 1 |
| sf ketchup | 1 |
| chosen foods avocado oil spray | 1 |

