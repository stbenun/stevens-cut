# FOOD_FACTS — every per-unit food number in the app

**GENERATED FILE — do not edit.** Source of truth is `FOOD_FACTS` inside `index.html`.
Regenerate with `node tools/food-doc.js`. `[food-doc]` in check-food.js fails if this is stale.

## Coverage: 22 / 125 foods in the meal plan (**18%**)

`cal/p/c/f` are **per one unit** shown in the `per` column. Multiply by the amount eaten.

Provenance of the 35 rows: **12** label · **12** derived · **9** USDA · **2** UNVERIFIED

| food | per | cal | P | C | F | provenance | source |
|---|---|---:|---:|---:|---:|---|---|
| `arak 40%` | mL | 2.21 | 0 | 0 | 0 | derived | 0.40 ABV x 0.789 g/mL x 7 kcal/g — pure distillate, no sugar. 1.5 oz = 44.4 mL = 98 cal |
| `bare coconut chips` | g | 6.07 | 0.07 | 0.5 | 0.43 | label | Bare Baked Crunchy Toasted Coconut Chips label, his brand confirmed Aug 11 2026: 28 g = 170 cal / 2 P / 14 C / 12 F -> per gram. Sat fat 11 g per 28 g. |
| `biscoff` | g | 4.84 | 0.065 | 0.742 | 0.194 | label | lotusbiscoff.com US Classic panel: 4 cookies (31 g) = 150 cal / 2 P / 23 C / 6 F -> per gram. 7.75 g per cookie. Airline/snack packs differ (2 cookies 25 g = 120 cal) — this is the Classic box. 4 cups. |
| `blueberries` | g | 0.57 | 0.007 | 0.145 | 0.003 | USDA | USDA raw blueberries, 100 g = 57 cal / 0.7 P / 14.5 C / 0.33 F -> per gram. Cups use 70 g. |
| `brisket flat` | oz cooked | 70 | 8.2 | 0 | 4 | derived | 248 cal / 29 P per 100 g — his own Southside figure |
| `chicken breast` | oz cooked | 47 | 8.8 | 0 | 1 | derived | grilled skinless, 165 cal / 31 P per 100 g |
| `cinnamon apples` | g | 0.52 | 0.003 | 0.138 | 0.002 | USDA | USDA raw apple with skin, 100 g = 52 cal / 0.26 P / 13.8 C / 0.17 F -> per gram; the cinnamon and the warming add nothing. Cups use 100 g. |
| `cinnamon toast crunch` | g | 4.15 | 0.049 | 0.805 | 0.098 | label | General Mills Cinnamon Toast Crunch label: 1 cup (41 g) = 170 cal / 2 P / 33 C / 4 F -> per gram. 2 cups. |
| `edamame` | g | 1.21 | 0.119 | 0.089 | 0.052 | USDA | USDA edamame, frozen, PREPARED: 100 g = 121 cal / 11.9 P / 8.9 C total (5.2 g fibre, so 3.7 net — an earlier search handed me the NET figure as if it were total) / 5.2 F -> per gram. He confirmed Aug 12 2026 it is just regular frozen edamame, so USDA is the right basis. ⚠️ The app rows ran ~17% high (85 g priced at 120 cal, real 103) and are corrected. |
| `eye of round` | oz cooked | 40.5 | 7.7 | 0 | 1 | derived | lean roast beef, 143 cal / 27 P per 100 g |
| `ezekiel bread` | slice | 80 | 4 | 15 | 0.5 | label | Food For Life Ezekiel 4:9 Sprouted Whole Grain label: 1 slice = 80 cal / 4 P / 15 C total (3 g fiber) / 0.5 F. ⚠️ The app rows use 5 P per slice, so every Ezekiel row overstates protein by 1 g per slice. |
| `fd strawberries` | g | 3.5 | 0.1 | 0.8 | 0.01 | label | Freeze-dried strawberries published panel: 10 g = 35 cal / 1 P / 8 C (2 g fiber, 5 g sugar) -> per gram. Brand-to-brand variation is small. Batch 5 cup 8 uses 10 g. |
| `ff whip` | g | 1 | 0 | 0.2 | 0 | label | Reddi-wip Fat Free label: 2 tbsp (5 g) = 5 cal / 0 P / 1 C / 0 F -> 1 cal per g. STANDARD SERVING 15 g = 15 cal / 3 C. ✅ BRAND CONFIRMED BY HIM Aug 11 2026 — it is Reddi-wip Fat Free, and the published label matches this row exactly, so the derived figure was right. |
| `fiber one bar` | bar | 70 | 2 | 17 | 3 | label | Fiber One 70 Calorie Soft-Baked Bar label, HIS version confirmed Aug 11 2026: 1 bar (~25 g) = 70 cal / 2 P / 17 C total / 3 F, 7 g fiber, 2 g sugar. Cinnamon Coffee Cake and Chocolate Fudge Brownie are identical panels. The 90-cal product is a DIFFERENT bar — do not mix them up. |
| `fruity pebbles` | g | 3.89 | 0.028 | 0.861 | 0.056 | label | Post Fruity Pebbles label: 1 cup (36 g) = 140 cal / 1 P / 31 C / 2 F -> per gram. 3 cups. |
| `graham cracker` | g | 4.19 | 0.065 | 0.774 | 0.097 | label | Honey Maid Original label: 31 g (8 crackers / 2 full sheets) = 130 cal / 2 P / 24 C / 3 F -> per gram. Batch 5 cup 4 Key Lime takes 25 g. |
| `miso soup` | cup (240 g) | 40 | 3 | 5 | 1 | USDA | USDA-style restaurant miso: 240 g cup ~50 cal / 3 P / 5 C / 1 F; 40 is the Atwater-consistent value for that split. Tofu-heavy bowls run 6 P / ~80 cal. ~700 mg sodium. |
| `nilla wafer` | g | 4.67 | 0.033 | 0.7 | 0.2 | label | Nabisco Nilla Wafers label: 8 wafers (30 g) = 140 cal / 1 P / 21 C / 6 F -> per gram. 3.75 g per wafer, which matches his own "9 crushed Nilla wafers (34 g)" row to within 0.03 g. 11 cups use these. |
| `oikos triple zero` | cup (150 g) | 80 | 15 | 6 | 0 | derived | FLAVOUR-VARIABLE — his call Aug 12 2026 when shown the 80-vs-90 conflict: "depends on flavor." oikos.com official for VANILLA: 1 cup (150 g) = 80 cal / 15 P / 6 C / 0 F. Retailers list 90 for other flavours. So treat as 80-90 per cup and do NOT pin one number; the app row of 90 is the top of the range and stands. Same handling as almond butter. |
| `oreo mini` | g | 4.83 | 0.034 | 0.724 | 0.207 | label | Oreo Mini Bite Size label: 9 cookies (29 g) = 140 cal / 1 P / 21 C / 6 F -> per gram, 3.22 g per cookie. Identical per-gram to oreo thin, which is expected — same cookie, smaller format. He eats these WHOLE, not de-creamed. |
| `oreo thin` | g | 4.83 | 0.034 | 0.724 | 0.207 | label | Oreo Thins label: 4 cookies (29 g) = 140 cal / 1 P / 21 C / 6 F -> per gram. 7.25 g per WHOLE cookie. ⚠️ 6 cups specify DE-CREAMED and the filling conversion is UNKNOWN — do not apply this to a de-creamed cup until he says whether he weighs before or after. |
| `oreo thin wafer` | g | 4.78 | 0.044 | 0.752 | 0.168 | UNVERIFIED | DERIVED, not a label: Oreo Thins whole (4 cookies / 29 g = 140 cal / 1 P / 21 C / 6 F) minus an assumed 22% cream fraction. A de-creamed Thin ~= 5.65 g / 27 cal / 0.25 P / 4.25 C / 0.95 F, so 5 of them ~= 135 cal vs 175 whole. NEEDS ONE WEIGH-IN TO CONFIRM. |
| `pineapple` | g | 0.5 | 0.005 | 0.131 | 0.001 | USDA | USDA raw pineapple, 100 g = 50 cal / 0.54 P / 13.1 C / 0.12 F -> per gram. Cups use 150 g. |
| `pita` | piece | 190 | 6.3 | 38.5 | 0.8 | UNVERIFIED | HIS 190 cal/piece; split derived from USDA white pita 275 cal / 9.1 P / 55.7 C / 1.2 F per 100 g -> a 69 g piece. ⚠️⚠️ BRAND IS SHORE PITA (he said so Aug 11 2026) AND THE FIGURES CONFLICT: a crowd-sourced listing for Shore Pita Plain gives 230 cal / 6 P / 40 C / 0.5 F per pita, 40 cal ABOVE his 190. Neither is a label photo — his 190 is from memory, the 230 is user-submitted. He eats one EVERY Friday, so 40 cal x every Friday is worth settling. DO NOT overwrite 190 with 230 without the package; Shore sells more than one size. |
| `potato skin-on` | g | 0.76 | 0.0205 | 0.1745 | 0.001 | USDA | Midpoint of USDA russet flesh-and-skin raw (79 cal/100 g) and Yukon Gold flesh-and-skin raw (73), because he alternates and always eats the skin. RANGE 0.73-0.79 cal/g. All his weights are raw. Corrected 5 rows that were priced at the gold end. |
| `russet potato` | g | 0.79 | 0.021 | 0.175 | 0.001 | USDA | USDA russet potato, flesh and skin, RAW: 100 g = 79 cal / 2.1 P / 17.5 C / 0.1 F -> per gram. ⚠️ The app prices 220 g at 160 cal; USDA gives 174. All his weights are raw, so raw is the right basis. |
| `salmon sashimi` | piece (20 g) | 42 | 4.1 | 0 | 2.7 | derived | Atlantic farmed, 208 cal / 20.4 P per 100 g raw |
| `sf choc syrup` | g | 0.33 | 0 | 0.13 | 0 | derived | matches the 15 g = 5 cal / 2 C row already used in b7 + b11, so the salvage/Creami toppings agree with the yogurt bowls |
| `sf pudding mix` | g | 2.9 | 0.1 | 0.7 | 0 | derived | Jell-O Sugar Free Fat Free instant: vanilla 1/4 pkg (7 g) = 20 cal, chocolate 1/4 pkg (10 g) = 30 cal / 1 P / 7 C -> ~2.9 cal per gram, essentially all modified starch. Cups use 5 g = ~14 cal / 3.5 C. |
| `sliced almonds` | g | 5.79 | 0.212 | 0.216 | 0.499 | USDA | USDA raw almonds, 100 g = 579 cal / 21.2 P / 21.6 C / 49.9 F -> per gram. Almonds are a commodity so USDA is reliable here; a bag photo would only matter if his are roasted or salted. HIS ONE ALLOWED NUT. Batch 5 cup 1. |
| `smoked half chicken` | half bird | 620 | 85 | 2 | 29 | derived | DERIVED, not a published label: his own ~85 g protein figure for the Southside half chicken, at 29 P per 100 g roasted meat = ~293 g meat = ~557 cal, plus the breast skin he keeps (~20 g, ~90 cal) and rub. Cross-check: 85P*4 + 2C*4 + 29F*9 = 609. Treat as +/-15% like every restaurant number. |
| `strawberries` | g | 0.32 | 0.007 | 0.077 | 0.003 | USDA | USDA raw strawberries, 100 g = 32 cal / 0.67 P / 7.7 C / 0.3 F -> per gram. Cups use 70 g. |
| `tuna roll` | 6-pc roll | 190 | 11 | 32 | 1.5 | derived | EATOUT_ORDER sushi carb anchor |
| `tuna sashimi` | piece (20 g) | 22 | 4.9 | 0 | 0.1 | derived | yellowfin, 109 cal / 24.4 P per 100 g raw |
| `turkey breast` | oz cooked | 38 | 8.5 | 0 | 0.3 | derived | roast, 135 cal / 30 P per 100 g |

## Still to source — 103 foods, most-used first

Every row below is a hand-typed number with no source anywhere in the repo.

| food | times it appears in the plan |
|---|---:|
| almond butter | 15 |
| fairlife 0% milk | 15 |
| fage 2% greek yogurt | 14 |
| banana | 8 |
| mini guac cup | 4 |
| potatoes | 4 |
| rice cakes | 3 |
| egg whites | 3 |
| low-moisture mozzarella | 3 |
| tuna packets | 3 |
| rice | 3 |
| cucumber | 3 |
| keto bun | 3 |
| asparagus | 3 |
| tuna packet | 2 |
| berries | 2 |
| lakanto sugar-free maple syrup | 2 |
| justin’s classic almond butter | 2 |
| frozen berries | 2 |
| chocolate cookie blast protein | 2 |
| 🔥 cinnamon roll cor | 2 |
| 🔥 oats | 2 |
| 🔥 cinnamon toast protein | 2 |
| 🥶 fage 2% greek yogurt | 2 |
| 🥶 berries | 2 |
| 🥶 almond butter | 2 |
| cinnamon + lakanto | 2 |
| string beans | 2 |
| white rice | 2 |
| eggs | 2 |
| 4% cottage cheese | 2 |
| broccoli | 2 |
| salmon | 2 |
| soy sauce | 2 |
| egg | 2 |
| smucker’s sf jelly | 1 |
| elev8 cor | 1 |
| oats | 1 |
| ryse/raw protein | 1 |
| sola everything bagel | 1 |
| philadelphia ⅓-less-fat cream cheese | 1 |
| acme nova lox | 1 |
| balsamic drizzle | 1 |
| banana 1 med | 1 |
| kodiak thick &amp; fluffy b&amp;v power waffles | 1 |
| fage 2% plain greek yogurt | 1 |
| kodiak buttermilk power flapjacks | 1 |
| fage total 0% plain greek yogurt | 1 |
| vanilla ice cream protein + ½ tsp banana extract | 1 |
| vanilla ice cream protein + ¼ tsp lemon extract | 1 |
| vanilla ice cream protein + 1 tsp vanilla bean paste | 1 |
| raw piña colada protein + ½ tsp coconut extract | 1 |
| toasted coconut chips | 1 |
| cinnamon toast protein + ½ tsp caramel extract + golden lakanto | 1 |
| lemon cake protein + ¼ tsp lemon extract | 1 |
| mint chip ice cream protein | 1 |
| sf chocolate chips / cacao nibs | 1 |
| cinnamon toast protein + ½ tsp cinnamon | 1 |
| vanilla ice cream protein | 1 |
| frozen mixed berries | 1 |
| ld strawberry shortcake protein | 1 |
| raw grandma’s apple pie protein + ¾ tsp cinnamon | 1 |
| cereal | 1 |
| justin’s almond butter | 1 |
| 🥶 banana | 1 |
| sweet potato | 1 |
| spinach | 1 |
| apple | 1 |
| israeli salad | 1 |
| hummus | 1 |
| shawarma rub: cumin ½ tsp · paprika ½ tsp · turmeric ¼ tsp · garlic ¼ tsp · salt | 1 |
| mayo: hellmann’s real 8 g | 1 |
| rice cake, crushed on top | 1 |
| salmon, pulsed to patties | 1 |
| hummus + sriracha | 1 |
| pickles | 1 |
| patty spices: garlic ½ tsp · paprika ½ tsp · salt ¼ tsp · pepper | 1 |
| mayo: hellmann’s real 10 g | 1 |
| cucumber, quick-pickled | 1 |
| scallion, sliced | 1 |
| everything-bagel seasoning | 1 |
| brownie wet: egg whites 60 ml · pumpkin purée 40 g · oikos vanilla 40 g · ¼ tsp vanilla | 1 |
| brownie dry: all-purpose flour 18 g · lakanto 28 g · ryse choc cookie blast 12 g · dark cocoa 8 g · baking soda scant ¼ tsp · baking powder ¼ tsp · salt | 1 |
| cookie dough | 1 |
| ryse protein | 1 |
| topping / mix-in | 1 |
| ryse loaded protein, cinnamon toast | 1 |
| kodiak classic protein rolled oats | 1 |
| baking powder ½ tsp · cinnamon ¾ tsp · vanilla ¼ tsp · pinch salt | 1 |
| sugar-free ketchup | 1 |
| tomato paste | 1 |
| salmon, sushi-grade | 1 |
| seaweed packet | 1 |
| rub: paprika ½ tsp · garlic ¼ tsp · salt ¼ tsp · pinch cayenne | 1 |
| sf ketchup | 1 |
| salmon cubes | 1 |
| glaze: soy 20 ml · rice vinegar 5 ml · lakanto 8 g · sriracha ½ tsp · garlic ¼ tsp | 1 |
| scallion + everything-bagel seasoning | 1 |
| salmon fillet | 1 |
| potatoes, ¾" cubes | 1 |
| glaze: soy 20 ml · rice vinegar 5 ml · lakanto golden 8 g · sriracha ½ tsp · garlic powder ¼ tsp | 1 |
| almond-chili drizzle: almond butter 8 g · sriracha 5 g · lakanto 2 g · squeeze of lemon · warm water 2 tsp | 1 |
| chosen foods avocado oil spray | 1 |

