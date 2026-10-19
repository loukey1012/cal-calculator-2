-- Renamed (user, 2026-10-19): a day that doesn't count is a "cheat day", and a meal is marked as a
-- "cheat meal" instead of "eaten out". A cheat meal leaves its whole day out of averages, like a
-- cheat day; its food still counts in the day's totals.

alter table public.not_counted_days rename to cheat_days;
alter table public.cheat_days rename constraint not_counted_days_pkey to cheat_days_pkey;
alter table public.cheat_days
  rename constraint not_counted_days_user_id_fkey to cheat_days_user_id_fkey;
alter policy "household manages days that don't count" on public.cheat_days
  rename to "household manages cheat days";
alter trigger not_counted_days_broadcast_live_change on public.cheat_days
  rename to cheat_days_broadcast_live_change;

alter table public.meals rename column eaten_out to cheat_meal;
alter view public.meal_totals rename column eaten_out to cheat_meal;
alter view public.daily_totals rename column eaten_out to cheat_meal;
alter view public.daily_totals rename column not_counted to cheat_day;

drop function public.set_meal_eaten_out(uuid, date, public.meal_type, boolean);

-- Marks a meal as a cheat meal (creating it when empty) or takes the mark back.
create function public.set_cheat_meal(
  p_user_id uuid,
  p_date date,
  p_meal_type public.meal_type,
  p_cheat_meal boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_meal_id uuid;
begin
  if p_cheat_meal then
    -- first, on its own: inside the update's filter it would only run for rows that exist
    v_meal_id := public.ensure_meal(p_user_id, p_date, p_meal_type);
    update public.meals set cheat_meal = true where id = v_meal_id;
  else
    -- nothing to take back from a meal that doesn't exist: no empty meal is created for it
    update public.meals set cheat_meal = false
    where user_id = p_user_id and date = p_date and meal_type = p_meal_type;
  end if;
end;
$$;

revoke execute on function public.set_cheat_meal(uuid, date, public.meal_type, boolean)
  from public, anon;
grant execute on function public.set_cheat_meal(uuid, date, public.meal_type, boolean)
  to authenticated;

-- live updates: a cheat day is a change to that person's day (otherwise unchanged)
create or replace function private.live_change_of(p_table text, p_row jsonb)
returns table (household_id uuid, hint jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  case p_table
    when 'meals', 'cheat_days' then
      return query
        select p.household_id,
          jsonb_build_object('table', 'meals', 'user_id', p.id, 'date', p_row ->> 'date')
        from public.profiles p
        where p.id = (p_row ->> 'user_id')::uuid;
    when 'meal_items' then
      return query
        select p.household_id,
          jsonb_build_object('table', 'meals', 'user_id', m.user_id, 'date', m.date)
        from public.meals m
        join public.profiles p on p.id = m.user_id
        where m.id = (p_row ->> 'meal_id')::uuid;
    when 'dishes' then
      return query
        select (p_row ->> 'household_id')::uuid,
          jsonb_build_object('table', 'dishes', 'dish_id', p_row ->> 'id');
    when 'weight_entries' then
      return query
        select p.household_id,
          jsonb_build_object('table', 'weight_entries', 'user_id', p.id)
        from public.profiles p
        where p.id = (p_row ->> 'user_id')::uuid;
    when 'goal_history' then
      return query
        select p.household_id,
          jsonb_build_object('table', 'goal_history', 'user_id', p.id)
        from public.profiles p
        where p.id = (p_row ->> 'user_id')::uuid;
    when 'profiles' then
      return query
        select (p_row ->> 'household_id')::uuid,
          jsonb_build_object('table', 'profiles', 'user_id', p_row ->> 'id');
    when 'households' then
      return query
        select (p_row ->> 'id')::uuid, jsonb_build_object('table', 'households');
    else
      -- ingredients, categories, category_groups, review_findings
      return query
        select (p_row ->> 'household_id')::uuid, jsonb_build_object('table', p_table);
  end case;
end;
$$;

-- the meal review reads both marks under their new names, to skip those days (otherwise unchanged)
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
        'cheat_day', t.cheat_day
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
