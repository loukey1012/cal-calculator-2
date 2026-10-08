-- A whole dish can be marked "calories are an estimate" (eaten out, cooked by someone else).
-- The numbers still count in full; the meal and the day only show they are approximate.
-- Older app versions don't send the mark, which reads as "not an estimate".

alter table public.dishes
  add column kcal_estimated boolean not null default false;

-- totals views: new kcal_estimated column at the end (otherwise unchanged)
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
  coalesce(bool_or(d.kcal_estimated), false) as kcal_estimated
from public.meals m
left join public.meal_items i on i.meal_id = m.id
left join public.dish_portions p on p.id = i.dish_portion_id
left join public.dishes d on d.id = p.dish_id
group by m.id;

create or replace view public.daily_totals with (security_invoker = true) as
select
  user_id,
  date,
  (count(*) filter (where item_count > 0))::integer as meal_count,
  sum(kcal) as kcal,
  sum(protein) as protein,
  sum(carbs) as carbs,
  sum(sugar) as sugar,
  sum(fat) as fat,
  sum(sat_fat) as sat_fat,
  sum(fiber) as fiber,
  sum(salt) as salt,
  bool_or(protein_missing) as protein_missing,
  bool_or(carbs_missing) as carbs_missing,
  bool_or(sugar_missing) as sugar_missing,
  bool_or(fat_missing) as fat_missing,
  bool_or(sat_fat_missing) as sat_fat_missing,
  bool_or(fiber_missing) as fiber_missing,
  bool_or(salt_missing) as salt_missing,
  bool_or(kcal_estimated) as kcal_estimated
from public.meal_totals
group by user_id, date;

-- save_dish stores kcal_estimated (otherwise unchanged)
create or replace function public.save_dish(
  p_dish jsonb,
  p_base_revision uuid default null,
  p_replace_item_ids uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_max_portions constant integer := 20;
  c_max_lines constant integer := 100;
  -- own amounts are stored with 2 decimals; their sum may differ from the total by rounding
  c_amount_tolerance constant numeric := 0.01;
  v_household uuid := private.my_household_id();
  v_dish_id uuid := (p_dish ->> 'id')::uuid;
  v_revision uuid := (p_dish ->> 'revision')::uuid;
  v_existing public.dishes;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if v_household is null then
    raise exception 'You are not in a household' using errcode = '42501';
  end if;
  if v_dish_id is null or v_revision is null then
    raise exception 'A dish needs an id and a revision' using errcode = '22023';
  end if;

  select * into v_existing from public.dishes where id = v_dish_id for update;
  if found then
    if v_existing.household_id <> v_household then
      raise exception 'Not allowed to change this dish' using errcode = '42501';
    end if;
    if v_existing.revision = v_revision then
      return; -- already saved: a resent request
    end if;
    if p_base_revision is distinct from v_existing.revision then
      raise exception 'This dish was changed meanwhile' using errcode = 'PT409';
    end if;
    update public.dishes set
      name = nullif(btrim(p_dish ->> 'name'), ''),
      split_mode = coalesce((p_dish ->> 'split_mode')::public.dish_split_mode, 'equal'),
      cooked_weight_g = (p_dish ->> 'cooked_weight_g')::numeric,
      kcal_estimated = coalesce((p_dish ->> 'kcal_estimated')::boolean, false),
      revision = v_revision
    where id = v_dish_id;
    -- removes the old portions' meal items, lines and own amounts with them
    delete from public.dish_portions where dish_id = v_dish_id;
    delete from public.dish_lines where dish_id = v_dish_id;
  elsif p_base_revision is not null then
    raise exception 'This dish was deleted meanwhile' using errcode = 'PT409';
  else
    insert into public.dishes (
      id, household_id, name, split_mode, cooked_weight_g, kcal_estimated, revision
    )
    values (
      v_dish_id,
      v_household,
      nullif(btrim(p_dish ->> 'name'), ''),
      coalesce((p_dish ->> 'split_mode')::public.dish_split_mode, 'equal'),
      (p_dish ->> 'cooked_weight_g')::numeric,
      coalesce((p_dish ->> 'kcal_estimated')::boolean, false),
      v_revision
    );
  end if;

  -- portions
  insert into public.dish_portions (
    id, dish_id, position, user_id, date, meal_type, split_value, discarded
  )
  select
    p.id, v_dish_id, (e.ord - 1)::smallint, p.user_id, p.date, p.meal_type, p.split_value,
    coalesce(p.discarded, false)
  from jsonb_array_elements(coalesce(p_dish -> 'portions', '[]')) with ordinality as e (value, ord),
    jsonb_to_record(e.value) as p (
      id uuid, user_id uuid, date date, meal_type public.meal_type, split_value numeric,
      discarded boolean
    );

  select count(*) into v_count from public.dish_portions where dish_id = v_dish_id;
  if v_count = 0 or v_count > c_max_portions then
    raise exception 'A dish needs 1 to % portions', c_max_portions using errcode = '22023';
  end if;
  if exists (
    select 1 from public.dish_portions
    where dish_id = v_dish_id and user_id is not null
      and not private.is_household_member(user_id)
  ) then
    raise exception 'Portions can only go to members of your household' using errcode = '42501';
  end if;

  -- lines
  insert into public.dish_lines (
    id, dish_id, position, allocation, ingredient_id, name, brand,
    entered_amount, entered_unit, basis, basis_multiplier,
    kcal, protein, carbs, sugar, fat, sat_fat, fiber, salt
  )
  select
    l.id, v_dish_id, (e.ord - 1)::smallint, l.allocation,
    -- an ingredient deleted meanwhile (e.g. while this save waited offline) loses the link;
    -- the line keeps its snapshot, like logged items do
    (select i.id from public.ingredients i where i.id = l.ingredient_id),
    btrim(l.name), l.brand,
    l.entered_amount, l.entered_unit, l.basis, l.basis_multiplier,
    l.kcal, l.protein, l.carbs, l.sugar, l.fat, l.sat_fat, l.fiber, l.salt
  from jsonb_array_elements(coalesce(p_dish -> 'lines', '[]')) with ordinality as e (value, ord),
    jsonb_to_record(e.value) as l (
      id uuid, allocation public.dish_line_allocation, ingredient_id uuid, name text, brand text,
      entered_amount numeric, entered_unit public.amount_unit, basis public.nutrition_basis,
      basis_multiplier numeric, kcal integer, protein numeric, carbs numeric, sugar numeric,
      fat numeric, sat_fat numeric, fiber numeric, salt numeric
    );

  select count(*) into v_count from public.dish_lines where dish_id = v_dish_id;
  if v_count = 0 or v_count > c_max_lines then
    raise exception 'A dish needs 1 to % ingredients', c_max_lines using errcode = '22023';
  end if;
  if exists (
    select 1 from public.dish_lines l
    where l.dish_id = v_dish_id and l.ingredient_id is not null
      and not exists (
        select 1 from public.ingredients i
        where i.id = l.ingredient_id and i.household_id = v_household
      )
  ) then
    raise exception 'Ingredient does not belong to this household' using errcode = '42501';
  end if;

  -- own amounts (only for per_portion lines)
  insert into public.dish_line_amounts (dish_id, line_id, portion_id, amount)
  select v_dish_id, line.id, a.portion_id, a.amount
  from jsonb_array_elements(coalesce(p_dish -> 'lines', '[]')) as e (value),
    jsonb_to_record(e.value) as line (id uuid, allocation public.dish_line_allocation),
    jsonb_to_recordset(coalesce(e.value -> 'amounts', '[]')) as a (portion_id uuid, amount numeric)
  where line.allocation = 'per_portion';

  if exists (
    select 1 from public.dish_lines l
    where l.dish_id = v_dish_id and l.allocation = 'per_portion'
      and abs(l.entered_amount - coalesce((
        select sum(a.amount) from public.dish_line_amounts a where a.line_id = l.id
      ), 0)) > c_amount_tolerance
  ) then
    raise exception 'Own amounts must add up to the ingredient''s total' using errcode = '22023';
  end if;

  perform private.check_dish_split(v_dish_id);

  -- "share this meal": the plain items now live in the dish
  if exists (
    select 1 from public.meal_items mi
    where mi.id = any (p_replace_item_ids)
      and (mi.dish_portion_id is not null or not private.can_access_meal(mi.meal_id))
  ) then
    raise exception 'Not allowed to move these items' using errcode = '42501';
  end if;
  delete from public.meal_items where id = any (p_replace_item_ids);

  perform private.log_dish_portions(v_dish_id);
end;
$$;
