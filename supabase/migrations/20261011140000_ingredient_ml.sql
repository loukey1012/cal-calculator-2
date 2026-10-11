-- An ingredient is measured in grams or in millilitres; there is no conversion between them.
-- For ml, the "_100" columns hold the values per 100 ml and unit_weight_g the ml per unit,
-- and amounts are logged in ml (amount_unit 'ml', basis per_100g meaning per 100 ml).
-- Older app versions don't send it: grams, as before.

create type public.ingredient_measure as enum ('g', 'ml');

alter table public.ingredients
  add column measure public.ingredient_measure not null default 'g';

alter type public.amount_unit add value if not exists 'ml';

-- 100 ml of something denser than water (e.g. honey or syrup) can hold more than 100 g of a
-- nutrient, so the limit only applies per 100 g
alter table public.ingredients drop constraint ingredients_per_100g_max;
alter table public.ingredients add constraint ingredients_per_100g_max check (
  measure = 'ml' or (
    protein_100 <= 100 and carbs_100 <= 100 and sugar_100 <= 100 and fat_100 <= 100
    and sat_fat_100 <= 100 and fiber_100 <= 100 and salt_100 <= 100
  )
);
