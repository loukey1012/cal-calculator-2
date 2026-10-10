-- An ingredient's values can be marked as an estimate (e.g. a restaurant dish entered by guess,
-- or calories worked out from protein, carbs and fat). A dish that uses one is marked as an
-- estimate by the app when it is saved. Older app versions don't send it: "not an estimate".

alter table public.ingredients
  add column kcal_estimated boolean not null default false;
