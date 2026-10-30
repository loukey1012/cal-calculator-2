-- Review re-checks (item 64): the routine sees each earlier finding's id and creation time, and
-- withdraws the open ones that no longer apply (they just disappear; the delete trigger on
-- review_findings tells the app). review_ingredients is recreated from 20261016130000_review_meals,
-- review_meals from 20261027120000_alcohol_days; only the findings objects gain id and created_at.

create or replace function public.review_ingredients(p_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_household uuid := private.review_household(p_key);
begin
  return jsonb_build_object(
    'ingredients', coalesce((
      select jsonb_agg(
        to_jsonb(i) - 'household_id' - 'legacy_id' - 'created_by'
        order by i.name
      )
      from public.ingredients i
      where i.household_id = v_household
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name)
      from public.categories c
      where c.household_id = v_household
    ), '[]'::jsonb),
    'findings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id,
        'created_at', f.created_at,
        'ingredient_id', f.ingredient_id,
        'kind', f.kind,
        'message', f.message,
        'suggestion', f.suggestion,
        'status', f.status
      ) order by f.created_at)
      from public.review_findings f
      where f.household_id = v_household and f.ingredient_id is not null
    ), '[]'::jsonb)
  );
end;
$$;

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
        'id', f.id,
        'created_at', f.created_at,
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

-- Withdraws open findings of the key's household (at most 200 at a time); returns how many went.
-- Applied and ignored findings stay: they are the household's decisions.
create or replace function public.withdraw_review_findings(p_key text, p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household uuid := private.review_household(p_key);
  v_removed integer;
begin
  if p_ids is null or cardinality(p_ids) > 200 then
    raise exception 'withdraw at most 200 findings at a time' using errcode = '22023';
  end if;

  with removed as (
    delete from public.review_findings f
    where f.household_id = v_household
      and f.status = 'open'
      and f.id = any(p_ids)
    returning 1
  )
  select count(*) into v_removed from removed;
  return v_removed;
end;
$$;

revoke all on function public.withdraw_review_findings(text, uuid[]) from public;
grant execute on function public.withdraw_review_findings(text, uuid[]) to anon, authenticated;
