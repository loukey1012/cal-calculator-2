-- Recipes with choices: a recipe line ("slot") can hold several products, each with its own
-- amount (toast bread from Clever or from Spar; Gouda or Edamer), and can be optional
-- (Frischkäse sometimes). Each choice is a recipe_lines row; rows of one slot share slot_id.
-- The slot remembers the choice used last time (picked) and whether an optional slot was left
-- out last time; those flags are kept on every row of the slot (the app reads the picked row).
-- Existing recipes: every line becomes its own slot with one choice, required and picked.

alter table public.recipe_lines
  add column slot_id uuid,
  add column optional boolean not null default false,
  add column picked boolean not null default true,
  add column left_out boolean not null default false;

update public.recipe_lines set slot_id = id;

alter table public.recipe_lines alter column slot_id set not null;

create index recipe_lines_slot_id_idx on public.recipe_lines (slot_id);

-- save_recipe stores the slots and checks each has exactly one picked choice (otherwise
-- unchanged)
-- Saves a whole recipe at once: creates it, or replaces its name, split, portions and lines.
-- The last save wins (recipes are changed rarely and never logged from directly).
create or replace function public.save_recipe(p_recipe jsonb)
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
  v_recipe_id uuid := (p_recipe ->> 'id')::uuid;
  v_existing public.recipes;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if v_household is null then
    raise exception 'You are not in a household' using errcode = '42501';
  end if;
  if v_recipe_id is null then
    raise exception 'A recipe needs an id' using errcode = '22023';
  end if;
  if nullif(btrim(p_recipe ->> 'name'), '') is null then
    raise exception 'Give the recipe a name' using errcode = '22023';
  end if;

  select * into v_existing from public.recipes where id = v_recipe_id for update;
  if found then
    if v_existing.household_id <> v_household then
      raise exception 'Not allowed to change this recipe' using errcode = '42501';
    end if;
    update public.recipes set
      name = btrim(p_recipe ->> 'name'),
      split_mode = coalesce((p_recipe ->> 'split_mode')::public.dish_split_mode, 'equal'),
      cooked_weight_g = (p_recipe ->> 'cooked_weight_g')::numeric,
      kcal_estimated = coalesce((p_recipe ->> 'kcal_estimated')::boolean, false)
    where id = v_recipe_id;
    -- removes the own amounts with them
    delete from public.recipe_portions where recipe_id = v_recipe_id;
    delete from public.recipe_lines where recipe_id = v_recipe_id;
  else
    insert into public.recipes (id, household_id, name, split_mode, cooked_weight_g, kcal_estimated)
    values (
      v_recipe_id,
      v_household,
      btrim(p_recipe ->> 'name'),
      coalesce((p_recipe ->> 'split_mode')::public.dish_split_mode, 'equal'),
      (p_recipe ->> 'cooked_weight_g')::numeric,
      coalesce((p_recipe ->> 'kcal_estimated')::boolean, false)
    );
  end if;

  -- portions
  insert into public.recipe_portions (id, recipe_id, position, user_id, split_value)
  select p.id, v_recipe_id, (e.ord - 1)::smallint, p.user_id, p.split_value
  from jsonb_array_elements(coalesce(p_recipe -> 'portions', '[]')) with ordinality as e (value, ord),
    jsonb_to_record(e.value) as p (id uuid, user_id uuid, split_value numeric);

  select count(*) into v_count from public.recipe_portions where recipe_id = v_recipe_id;
  if v_count = 0 or v_count > c_max_portions then
    raise exception 'A recipe needs 1 to % portions', c_max_portions using errcode = '22023';
  end if;
  if exists (
    select 1 from public.recipe_portions
    where recipe_id = v_recipe_id and user_id is not null
      and not private.is_household_member(user_id)
  ) then
    raise exception 'Portions can only go to members of your household' using errcode = '42501';
  end if;

  -- lines
  insert into public.recipe_lines (
    id, recipe_id, position, slot_id, optional, picked, left_out, allocation, ingredient_id,
    name, brand, entered_amount, entered_unit, basis, basis_multiplier,
    kcal, protein, carbs, sugar, fat, sat_fat, fiber, salt
  )
  select
    l.id, v_recipe_id, (e.ord - 1)::smallint,
    -- left out by older app versions: every line its own slot, required and picked
    coalesce(l.slot_id, l.id), coalesce(l.optional, false), coalesce(l.picked, true),
    coalesce(l.left_out, false), l.allocation,
    -- an ingredient deleted meanwhile loses the link; the line keeps its snapshot
    (select i.id from public.ingredients i where i.id = l.ingredient_id),
    btrim(l.name), l.brand,
    l.entered_amount, l.entered_unit, l.basis, l.basis_multiplier,
    l.kcal, l.protein, l.carbs, l.sugar, l.fat, l.sat_fat, l.fiber, l.salt
  from jsonb_array_elements(coalesce(p_recipe -> 'lines', '[]')) with ordinality as e (value, ord),
    jsonb_to_record(e.value) as l (
      id uuid, slot_id uuid, optional boolean, picked boolean, left_out boolean,
      allocation public.dish_line_allocation, ingredient_id uuid, name text, brand text,
      entered_amount numeric, entered_unit public.amount_unit, basis public.nutrition_basis,
      basis_multiplier numeric, kcal integer, protein numeric, carbs numeric, sugar numeric,
      fat numeric, sat_fat numeric, fiber numeric, salt numeric
    );

  select count(*) into v_count from public.recipe_lines where recipe_id = v_recipe_id;
  if v_count = 0 or v_count > c_max_lines then
    raise exception 'A recipe needs 1 to % ingredients', c_max_lines using errcode = '22023';
  end if;
  if exists (
    select 1 from public.recipe_lines l
    where l.recipe_id = v_recipe_id
    group by l.slot_id
    having count(*) filter (where l.picked) <> 1
  ) then
    raise exception 'Each ingredient of a recipe needs one choice picked' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.recipe_lines l
    where l.recipe_id = v_recipe_id and l.ingredient_id is not null
      and not exists (
        select 1 from public.ingredients i
        where i.id = l.ingredient_id and i.household_id = v_household
      )
  ) then
    raise exception 'Ingredient does not belong to this household' using errcode = '42501';
  end if;

  -- own amounts (only for per_portion lines)
  insert into public.recipe_line_amounts (recipe_id, line_id, portion_id, amount)
  select v_recipe_id, line.id, a.portion_id, a.amount
  from jsonb_array_elements(coalesce(p_recipe -> 'lines', '[]')) as e (value),
    jsonb_to_record(e.value) as line (id uuid, allocation public.dish_line_allocation),
    jsonb_to_recordset(coalesce(e.value -> 'amounts', '[]')) as a (portion_id uuid, amount numeric)
  where line.allocation = 'per_portion';

  if exists (
    select 1 from public.recipe_lines l
    where l.recipe_id = v_recipe_id and l.allocation = 'per_portion'
      and abs(l.entered_amount - coalesce((
        select sum(a.amount) from public.recipe_line_amounts a where a.line_id = l.id
      ), 0)) > c_amount_tolerance
  ) then
    raise exception 'Own amounts must add up to the ingredient''s total' using errcode = '22023';
  end if;
end;
$$;

