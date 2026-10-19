-- Two marks on a person's day, settable by either household member on any day, past ones too:
-- - "Doesn't count": the whole day is left out of averages and shows no over-goal colors.
-- - "Eaten out" on a meal (also an empty one): its calories are unknown, so the day is a lower
--   bound ("≥ 900 kcal") and, like a day that doesn't count, left out of averages.
-- Older app versions don't know either mark; they keep working and simply don't show them.

alter table public.meals
  add column eaten_out boolean not null default false;

create table public.not_counted_days (
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null, -- the user's local calendar day
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.not_counted_days enable row level security;
revoke all on public.not_counted_days from anon;

create policy "household manages days that don't count" on public.not_counted_days
  for all to authenticated
  using (private.is_household_member(user_id))
  with check (private.is_household_member(user_id));

-- Marks a meal as eaten out (creating it when empty) or takes the mark back.
create function public.set_meal_eaten_out(
  p_user_id uuid,
  p_date date,
  p_meal_type public.meal_type,
  p_eaten_out boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_eaten_out then
    update public.meals set eaten_out = true
    where id = public.ensure_meal(p_user_id, p_date, p_meal_type);
  else
    -- nothing to take back from a meal that doesn't exist: no empty meal is created for it
    update public.meals set eaten_out = false
    where user_id = p_user_id and date = p_date and meal_type = p_meal_type;
  end if;
end;
$$;

revoke execute on function public.set_meal_eaten_out(uuid, date, public.meal_type, boolean)
  from public, anon;
grant execute on function public.set_meal_eaten_out(uuid, date, public.meal_type, boolean)
  to authenticated;

-- totals views: new eaten_out column at the end of meal_totals (otherwise unchanged)
create or replace view public.meal_totals with (security_invoker = true) as
select
  m.id as meal_id,
  m.user_id,
  m.date,
  m.meal_type,
  count(i.id)::integer as item_count,
  coalesce(sum(i.kcal * i.basis_multiplier), 0) as kcal,
  coalesce(sum(i.protein * i.basis_multiplier), 0) as protein,
  coalesce(sum(i.carbs * i.basis_multiplier), 0) as carbs,
  coalesce(sum(i.sugar * i.basis_multiplier), 0) as sugar,
  coalesce(sum(i.fat * i.basis_multiplier), 0) as fat,
  coalesce(sum(i.sat_fat * i.basis_multiplier), 0) as sat_fat,
  coalesce(sum(i.fiber * i.basis_multiplier), 0) as fiber,
  coalesce(sum(i.salt * i.basis_multiplier), 0) as salt,
  -- true when at least one item has no value for that nutrient (total is a lower bound)
  coalesce(bool_or(i.id is not null and i.protein is null), false) as protein_missing,
  coalesce(bool_or(i.id is not null and i.carbs is null), false) as carbs_missing,
  coalesce(bool_or(i.id is not null and i.sugar is null), false) as sugar_missing,
  coalesce(bool_or(i.id is not null and i.fat is null), false) as fat_missing,
  coalesce(bool_or(i.id is not null and i.sat_fat is null), false) as sat_fat_missing,
  coalesce(bool_or(i.id is not null and i.fiber is null), false) as fiber_missing,
  coalesce(bool_or(i.id is not null and i.salt is null), false) as salt_missing,
  -- true when food of a dish marked as an estimate is in the meal (kcal are only roughly known)
  coalesce(bool_or(d.kcal_estimated), false) as kcal_estimated,
  m.eaten_out
from public.meals m
left join public.meal_items i on i.meal_id = m.id
left join public.dish_portions p on p.id = i.dish_portion_id
left join public.dishes d on d.id = p.dish_id
group by m.id;

-- daily_totals: eaten_out and not_counted at the end. A day that doesn't count shows up even
-- without any meal (no totals then). Two branches instead of a full join, so a filter on a
-- person and days still narrows each branch.
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
  bool_or(t.eaten_out) as eaten_out,
  exists (
    select 1 from public.not_counted_days n where n.user_id = t.user_id and n.date = t.date
  ) as not_counted
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
  true
from public.not_counted_days n
where not exists (select 1 from public.meals m where m.user_id = n.user_id and m.date = n.date);

-- live updates: a day marked as not counting is a change to that person's day (otherwise
-- unchanged since the weight migration)
create or replace function private.live_change_of(p_table text, p_row jsonb)
returns table (household_id uuid, hint jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  case p_table
    when 'meals', 'not_counted_days' then
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

create trigger not_counted_days_broadcast_live_change
  after insert or update or delete on public.not_counted_days
  for each row execute function private.broadcast_live_change();

-- the meal review learns both marks, to skip those days and meals (otherwise unchanged)
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
        'eaten_out', m.eaten_out,
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
        'eaten_out', t.eaten_out,
        'not_counted', t.not_counted
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
