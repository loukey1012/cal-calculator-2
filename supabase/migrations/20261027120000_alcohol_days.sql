-- Alcohol days (item 55): a whole day can be marked as an alcohol day. Its calories are unknown,
-- so it is left out of every figure like a cheat day, but it is its own mark. There is one row
-- per person and day, so a day is a cheat day or an alcohol day, never both; switching the kind
-- is an upsert. Cheat meals may sit inside an alcohol day.

alter table public.cheat_days
  add column kind text not null default 'cheat' check (kind in ('cheat', 'alcohol'));

-- daily_totals: cheat_day is now only kind 'cheat'; alcohol_day is new, at the end of both
-- branches (otherwise unchanged). Days with either mark but no meals still show up.
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
    select 1 from public.cheat_days n
    where n.user_id = t.user_id and n.date = t.date and n.kind = 'cheat'
  ) as cheat_day,
  bool_or(t.meal_type = 'lunch' and t.item_count > 0) as lunch_logged,
  bool_or(t.meal_type = 'dinner' and t.item_count > 0) as dinner_logged,
  exists (
    select 1 from public.cheat_days n
    where n.user_id = t.user_id and n.date = t.date and n.kind = 'alcohol'
  ) as alcohol_day
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
  n.kind = 'cheat',
  false,
  false,
  n.kind = 'alcohol'
from public.cheat_days n
where not exists (select 1 from public.meals m where m.user_id = n.user_id and m.date = n.date);

-- the meal review tells alcohol days next to cheat days (otherwise unchanged)
create or replace function public.review_meals(p_key text, p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_household uuid := private.review_household(p_key);
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 31 then
    raise exception 'the range must be 1 to 31 days' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.display_name) order by p.created_at)
      from public.profiles p
      where p.household_id = v_household
    ), '[]'::jsonb),
    'goals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', g.user_id,
        'valid_from', g.valid_from,
        'kcal', g.kcal,
        'protein_g', g.protein_g,
        'carbs_g', g.carbs_g,
        'fat_g', g.fat_g
      ) order by g.user_id, g.valid_from)
      from public.goal_history g
      join public.profiles p on p.id = g.user_id
      where p.household_id = v_household and g.valid_from <= p_to
    ), '[]'::jsonb),
    'meals', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', m.user_id,
        'date', m.date,
        'meal_type', m.meal_type,
        'cheat_meal', m.cheat_meal,
        'items', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', i.id,
            'name', i.name,
            'brand', i.brand,
            'amount', i.entered_amount,
            'unit', i.entered_unit,
            'kcal', round(i.kcal * i.basis_multiplier),
            'protein', round(i.protein * i.basis_multiplier, 1),
            'carbs', round(i.carbs * i.basis_multiplier, 1),
            'fat', round(i.fat * i.basis_multiplier, 1),
            'from_dish', i.dish_portion_id is not null,
            'saved_ingredient', i.ingredient_id is not null
          ) order by i.created_at)
          from public.meal_items i
          where i.meal_id = m.id
        ), '[]'::jsonb)
      ) order by m.user_id, m.date, m.meal_type)
      from public.meals m
      join public.profiles p on p.id = m.user_id
      where p.household_id = v_household and m.date between p_from and p_to
    ), '[]'::jsonb),
    'days', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', t.user_id,
        'date', t.date,
        'kcal', round(t.kcal),
        'kcal_estimated', t.kcal_estimated,
        'cheat_meal', t.cheat_meal,
        'cheat_day', t.cheat_day,
        'alcohol_day', t.alcohol_day
      ) order by t.user_id, t.date)
      from public.daily_totals t
      join public.profiles p on p.id = t.user_id
      where p.household_id = v_household and t.date between p_from and p_to
    ), '[]'::jsonb),
    'findings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', f.user_id,
        'date', f.date,
        'meal_type', f.meal_type,
        'meal_item_id', f.meal_item_id,
        'kind', f.kind,
        'message', f.message,
        'status', f.status
      ) order by f.created_at)
      from public.review_findings f
      where f.household_id = v_household and f.ingredient_id is null
    ), '[]'::jsonb)
  );
end;
$$;
