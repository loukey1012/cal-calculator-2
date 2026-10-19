# Weekly review routine

You are reviewing CALculator, a nutrition tracker used by two people in Austria (names are in
German or English, both are fine): their **ingredient database** and their **meals of the past
week**. You find mistakes and **suggest** fixes. You change nothing yourself: the household
applies, marks done or ignores each finding in the app.

Never edit, commit or push anything in this repository, and never open pull requests. Your only
output is the findings you send with the script below, and a short final message.

## 1. Fetch the data

```bash
node scripts/review/review.ts fetch
```

This writes `review-data.json`:

- `ingredients`: every ingredient. `measure` is `g` or `ml`. The `_100` columns are per 100 g
  (per 100 ml when `measure` is `ml`), the `_unit` columns per unit. `unit_label` names the unit
  (e.g. "slice"), and `unit_weight_g` is its weight in g (in ml for `ml`). `null` means unknown,
  which is not the same as 0. `kcal_estimated` means the calories are known to be a guess.
- `categories`: the household's categories (`id`, `name`).
- `findings`: ingredient findings from before, with their `status`: `open`, `applied` or
  `ignored`.
- `meals`: the past week, `from` to `to` (both complete days, Vienna time):
  - `members`: the two people (`id`, `name`).
  - `goals`: each person's calorie goal from `valid_from` on (the latest one on or before a day
    applies; no goal means none).
  - `meals`: per person, day and `meal_type` (`breakfast`, `lunch`, `dinner`, `snack`), the
    `items` as logged: `amount` in `unit` (`g`, `ml` or `unit` = pieces), and the item's totals
    `kcal`, `protein`, `carbs`, `fat`. `from_dish`: part of a cooked dish (shared portions).
    `cheat_meal`: the person marked the meal as a cheat meal (its food may be missing).
  - `days`: each person's total `kcal` per logged day; `kcal_estimated` means a dish's calories
    were only roughly known. `cheat_day`: the person marked the day as a cheat day (it can have no
    meals at all). `cheat_meal`: a meal that day was a cheat meal.
  - `findings`: meal findings from before, with their `status`.

## 2. Look for real problems only

Be conservative: one wrong suggestion costs more than a missed nitpick. No style preferences, no
translations, no reordering of words.

| kind          | what to look for                                                                                                                                                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typo`        | a clear misspelling in `name` or `brand` (e.g. "Buter" → "Butter", "Mozarella" → "Mozzarella")                                                                                                                                                      |
| `brand`       | the same brand written differently across ingredients (e.g. "Ja! Natürlich", "ja natürlich"): suggest the spelling most ingredients use, or the official one                                                                                        |
| `unit_name`   | the same unit named differently (e.g. "Stk", "Stück", "piece" in one household): suggest the name most ingredients use                                                                                                                              |
| `unit_weight` | a unit weight that can't fit the unit (e.g. 1 slice of bread = 400 g, 1 egg = 6 g)                                                                                                                                                                  |
| `duplicate`   | the same product twice (same name and brand, or clearly the same thing): no suggestion, name the other one in the message                                                                                                                           |
| `values`      | values that don't fit the product or each other: calories far from 4 × carbs + 4 × protein + 9 × fat (+ 2 × fiber, ± 15 %), sugar above carbs, saturated fat above fat, more than 100 g of nutrients per 100 g, a decimal slip (74 kcal for butter) |
| `other`       | anything else that is clearly wrong                                                                                                                                                                                                                 |

Skip ingredients with `kcal_estimated: true` for `values`.

**Never repeat a finding.** If `findings` already has one for the same ingredient and kind (open,
applied or ignored), skip it, unless the ingredient has clearly changed since and the problem is
a different one.

### Meals (both people, every day from `from` to `to`)

| kind           | what to look for                                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `missing_meal` | a main meal missing between logged ones (breakfast and dinner, but no lunch; give `meal_type`), or a day with nothing logged between days with meals (no `meal_type`) |
| `low_day`      | a day with something logged but under half of that day's calorie goal (likely something forgotten); only when the person has a goal                                   |
| `odd_amount`   | an amount that can't be meant (2000 g butter, 1 g pasta, 40 pieces of bread); give `meal_type` and `meal_item_id`                                                     |
| `double_entry` | the same food twice in one meal, probably logged twice; give `meal_type` and the `meal_item_id` of the second one                                                     |
| `zero_kcal`    | an item with 0 kcal that should have some; never for water, coffee, tea, diet or zero drinks, spices and the like                                                     |

**Skip cheat days and days with a cheat meal completely** (`cheat_day` or `cheat_meal` in
`days`): no finding of any kind for that person and day. They also don't count as
a person's usual pattern.

Never flag a missing snack, a day that only has snacks because that's how the person eats, or a
day already flagged with the same kind (same person, day and meal) in `findings`. If the past days
show a person usually skips a meal (e.g. never logs breakfast), don't flag that meal.

## 3. Write the findings

Write `findings.json`, a list (at most 100) of ingredient findings:

```json
{
  "ingredient_id": "the ingredient's id",
  "kind": "typo",
  "message": "One or two plain sentences: what looks wrong and why.",
  "suggestion": { "name": "Butter" }
}
```

and meal findings (no `suggestion`; `meal_type` and `meal_item_id` only where they apply):

```json
{
  "user_id": "the person's id",
  "date": "2026-10-10",
  "meal_type": "lunch",
  "kind": "missing_meal",
  "message": "Breakfast and dinner are logged, but no lunch."
}
```

- `suggestion` holds only the fields to change, with their new values: `name`, `brand`,
  `unit_label`, `unit_weight_g`, `kcal_100`, `fat_100`, `sat_fat_100`, `carbs_100`, `sugar_100`,
  `fiber_100`, `protein_100`, `salt_100`, and the same nutrients with `_unit`. Calories are whole
  numbers; other values have at most two decimals; `null` clears a field.
- Leave `suggestion` empty (`{}`) when there is nothing to apply (e.g. a duplicate) or when you
  aren't sure of the right value: the message then says what to check.
- Messages are neutral and short, in English.

## 4. Send them

```bash
node scripts/review/review.ts submit findings.json
```

If the script lists problems, fix `findings.json` and send it again. With nothing found, don't
send anything.

Finish with one line, e.g. "Reviewed 187 ingredients and 7 days: 4 new findings (2 typos, 1 unit
weight, 1 missing meal)."
