-- daily_totals tells whether lunch and dinner have food (new columns at the end, otherwise
-- unchanged): a day without both is flagged as missing a meal and left out of averages.
create or replace view public.daily_totals with (security_invoker = true) as
select
  t.user_id,
  t.date,
  (count(*) filter (where t.item_count > 0))::integer as meal_count,
  sum(t.kcal) as kcal,
  sum(t.protein) as protein,
  sum(t.carbs) as carbs,
  sum(t.sugar) as sugar,
  sum(t.fat) as fat,
  sum(t.sat_fat) as sat_fat,
  sum(t.fiber) as fiber,
  sum(t.salt) as salt,
  bool_or(t.protein_missing) as protein_missing,
  bool_or(t.carbs_missing) as carbs_missing,
  bool_or(t.sugar_missing) as sugar_missing,
  bool_or(t.fat_missing) as fat_missing,
  bool_or(t.sat_fat_missing) as sat_fat_missing,
  bool_or(t.fiber_missing) as fiber_missing,
  bool_or(t.salt_missing) as salt_missing,
  bool_or(t.kcal_estimated) as kcal_estimated,
  bool_or(t.cheat_meal) as cheat_meal,
  exists (
    select 1 from public.cheat_days n where n.user_id = t.user_id and n.date = t.date
  ) as cheat_day,
  bool_or(t.meal_type = 'lunch' and t.item_count > 0) as lunch_logged,
  bool_or(t.meal_type = 'dinner' and t.item_count > 0) as dinner_logged
from public.meal_totals t
group by t.user_id, t.date
union all
select
  n.user_id,
  n.date,
  0,
  null::numeric,
  null::numeric,
  null::numeric,
  null::numeric,
  null::numeric,
  null::numeric,
  null::numeric,
  null::numeric,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  false,
  true,
  false,
  false
from public.cheat_days n
where not exists (select 1 from public.meals m where m.user_id = n.user_id and m.date = n.date);
