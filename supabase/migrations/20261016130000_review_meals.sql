-- The weekly review checks meals too: gaps in a day, days far below the goal and odd entries, for
-- every member of the household over the days the routine asks for. A finding is now about either
-- an ingredient (as before) or a person's day (optionally one meal, optionally one item). Day
-- findings change nothing: a member opens the day, then marks the finding done or ignores it.

alter table public.ingredient_findings rename to review_findings;
alter index public.ingredient_findings_household_status rename to review_findings_household_status;
alter index public.ingredient_findings_once rename to review_findings_ingredient_once;
alter trigger ingredient_findings_broadcast_live_change on public.review_findings
  rename to review_findings_broadcast_live_change;

alter type public.finding_kind add value 'missing_meal';
alter type public.finding_kind add value 'low_day';
alter type public.finding_kind add value 'odd_amount';
alter type public.finding_kind add value 'double_entry';
alter type public.finding_kind add value 'zero_kcal';

alter table public.review_findings
  alter column ingredient_id drop not null,
  add column user_id uuid references public.profiles (id) on delete cascade,
  add column date date,
  add column meal_type public.meal_type,
  -- a deleted item takes its finding along: there is nothing left to look at
  add column meal_item_id uuid references public.meal_items (id) on delete cascade,
  add constraint review_findings_subject check (
    (ingredient_id is not null and num_nulls(user_id, date, meal_type, meal_item_id) = 4)
    or (ingredient_id is null and user_id is not null and date is not null)
  );

-- a day finding only once: same person, day, kind, meal and item
create unique index review_findings_day_once
  on public.review_findings (user_id, date, kind, meal_type, meal_item_id) nulls not distinct
  where ingredient_id is null;

-- the ingredient review reads only ingredient findings now
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

-- What the meal review looks at, for p_from to p_to (at most 31 days): the members, their goals,
-- their meals with each item's amount and totals as logged, each day's totals, and the earlier day
-- findings (open and decided), so it doesn't repeat one.
create function public.review_meals(p_key text, p_from date, p_to date)
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
        'kcal_estimated', t.kcal_estimated
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

-- Adds a run's findings, about ingredients or members' days; returns how many were new. Skipped:
-- other households' ingredients and people, items not in that person's meals of that day, and
-- repeats of an earlier finding. At most 100 per call.
create function public.submit_review_findings(p_key text, p_run_id text, p_findings jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household uuid := private.review_household(p_key);
  v_added integer;
begin
  if jsonb_typeof(p_findings) <> 'array' or jsonb_array_length(p_findings) > 100 then
    raise exception 'findings must be a list of at most 100' using errcode = '22023';
  end if;

  with given as (
    select f.ingredient_id, f.user_id, f.date, f.meal_type, f.meal_item_id, f.kind, f.message,
      -- day findings have nothing to apply
      case when f.ingredient_id is null then '{}'::jsonb
        else coalesce(f.suggestion, '{}'::jsonb) end as suggestion
    from jsonb_to_recordset(p_findings) as f(
      ingredient_id uuid, user_id uuid, date date, meal_type public.meal_type,
      meal_item_id uuid, kind public.finding_kind, message text, suggestion jsonb
    )
  ),
  valid as (
    select g.*
    from given g
    where (
      g.ingredient_id is not null
      and exists (
        select 1 from public.ingredients i
        where i.id = g.ingredient_id and i.household_id = v_household
      )
    ) or (
      g.ingredient_id is null
      and g.date is not null
      and exists (
        select 1 from public.profiles p
        where p.id = g.user_id and p.household_id = v_household
      )
      and (
        g.meal_item_id is null
        or exists (
          select 1 from public.meal_items i
          join public.meals m on m.id = i.meal_id
          where i.id = g.meal_item_id and m.user_id = g.user_id and m.date = g.date
        )
      )
    )
  ),
  added as (
    insert into public.review_findings
      (household_id, ingredient_id, user_id, date, meal_type, meal_item_id, kind, message,
       suggestion, run_id)
    select v_household, v.ingredient_id,
      case when v.ingredient_id is null then v.user_id end,
      case when v.ingredient_id is null then v.date end,
      case when v.ingredient_id is null then v.meal_type end,
      case when v.ingredient_id is null then v.meal_item_id end,
      v.kind, v.message, v.suggestion, p_run_id
    from valid v
    where not exists (
      select 1 from public.review_findings e
      where (
        v.ingredient_id is not null
        and e.ingredient_id = v.ingredient_id
        and e.kind = v.kind
        and e.suggestion = v.suggestion
      ) or (
        v.ingredient_id is null
        and e.ingredient_id is null
        and e.user_id = v.user_id
        and e.date = v.date
        and e.kind = v.kind
        and e.meal_type is not distinct from v.meal_type
        and e.meal_item_id is not distinct from v.meal_item_id
      )
    )
    on conflict do nothing
    returning 1
  )
  select count(*) into v_added from added;
  return v_added;
end;
$$;

drop function public.submit_ingredient_findings(text, text, jsonb);

revoke all on function public.review_meals(text, date, date) from public;
revoke all on function public.submit_review_findings(text, text, jsonb) from public;
grant execute on function public.review_meals(text, date, date) to anon, authenticated;
grant execute on function public.submit_review_findings(text, text, jsonb) to anon, authenticated;
