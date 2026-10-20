-- Recipes: a dish (or a whole meal, merged into one dish) saved by name, shared by the
-- household, to fill the Cook tab again. Same shape as a dish without day and meal: portions
-- name who eats (or nobody: a leftover), lines keep their allocation and own amounts. Lines
-- keep a nutrition snapshot, but the app uses the ingredient's current values when it fills
-- Cook; the snapshot counts only for custom items and ingredients deleted meanwhile.
-- Recipes are only written through save_recipe / delete_recipe.

-- ─── tables ─────────────────────────────────────────────────────────────────

create table public.recipes (
  id uuid primary key, -- generated on the device
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  split_mode public.dish_split_mode not null default 'equal',
  cooked_weight_g numeric(8, 2) check (cooked_weight_g > 0),
  kcal_estimated boolean not null default false,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recipes_household_id_idx on public.recipes (household_id);
create index recipes_created_by_idx on public.recipes (created_by);

create trigger recipes_set_updated_at
  before update on public.recipes
  for each row execute function private.set_updated_at();

create table public.recipe_portions (
  id uuid primary key,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position smallint not null check (position >= 0),
  -- who eats it; empty = a leftover
  user_id uuid references public.profiles (id) on delete cascade,
  split_value numeric(8, 2) check (split_value >= 0),
  unique (id, recipe_id)
);

create index recipe_portions_recipe_id_idx on public.recipe_portions (recipe_id);
create index recipe_portions_user_id_idx on public.recipe_portions (user_id);

create table public.recipe_lines (
  id uuid primary key,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position smallint not null check (position >= 0),
  allocation public.dish_line_allocation not null,
  ingredient_id uuid references public.ingredients (id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  brand text check (char_length(brand) <= 60),
  entered_amount numeric(9, 2) not null check (entered_amount > 0),
  entered_unit public.amount_unit not null,
  basis public.nutrition_basis not null,
  basis_multiplier numeric(10, 4) not null check (basis_multiplier > 0),
  kcal integer not null check (kcal >= 0),
  protein numeric(7, 2) check (protein >= 0),
  carbs numeric(7, 2) check (carbs >= 0),
  sugar numeric(7, 2) check (sugar >= 0),
  fat numeric(7, 2) check (fat >= 0),
  sat_fat numeric(7, 2) check (sat_fat >= 0),
  fiber numeric(7, 2) check (fiber >= 0),
  salt numeric(7, 2) check (salt >= 0),
  unique (id, recipe_id)
);

create index recipe_lines_recipe_id_idx on public.recipe_lines (recipe_id);
create index recipe_lines_ingredient_id_idx on public.recipe_lines (ingredient_id);

-- own amounts of a per_portion line; line and portion belong to the same recipe
create table public.recipe_line_amounts (
  recipe_id uuid not null,
  line_id uuid not null,
  portion_id uuid not null,
  amount numeric(9, 2) not null check (amount > 0),
  primary key (line_id, portion_id),
  constraint recipe_line_amounts_line_fkey foreign key (line_id, recipe_id)
    references public.recipe_lines (id, recipe_id) on delete cascade,
  constraint recipe_line_amounts_portion_fkey foreign key (portion_id, recipe_id)
    references public.recipe_portions (id, recipe_id) on delete cascade
);

create index recipe_line_amounts_portion_idx on public.recipe_line_amounts (portion_id, recipe_id);
create index recipe_line_amounts_recipe_id_idx on public.recipe_line_amounts (recipe_id);

-- ─── row level security: household members read; writes only via the RPCs ──

create function private.can_access_recipe(p_recipe_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.recipes r
    where r.id = p_recipe_id and r.household_id = private.my_household_id()
  );
$$;

revoke all on function private.can_access_recipe(uuid) from public;
grant execute on function private.can_access_recipe(uuid) to authenticated;

alter table public.recipes enable row level security;
alter table public.recipe_portions enable row level security;
alter table public.recipe_lines enable row level security;
alter table public.recipe_line_amounts enable row level security;

create policy "household reads recipes" on public.recipes
  for select to authenticated
  using (household_id = (select private.my_household_id()));

create policy "household reads recipe portions" on public.recipe_portions
  for select to authenticated
  using (private.can_access_recipe(recipe_id));

create policy "household reads recipe lines" on public.recipe_lines
  for select to authenticated
  using (private.can_access_recipe(recipe_id));

create policy "household reads recipe line amounts" on public.recipe_line_amounts
  for select to authenticated
  using (private.can_access_recipe(recipe_id));

-- ─── RPCs ───────────────────────────────────────────────────────────────────

-- Saves a whole recipe at once: creates it, or replaces its name, split, portions and lines.
-- The last save wins (recipes are changed rarely and never logged from directly).
create function public.save_recipe(p_recipe jsonb)
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
    id, recipe_id, position, allocation, ingredient_id, name, brand,
    entered_amount, entered_unit, basis, basis_multiplier,
    kcal, protein, carbs, sugar, fat, sat_fat, fiber, salt
  )
  select
    l.id, v_recipe_id, (e.ord - 1)::smallint, l.allocation,
    -- an ingredient deleted meanwhile loses the link; the line keeps its snapshot
    (select i.id from public.ingredients i where i.id = l.ingredient_id),
    btrim(l.name), l.brand,
    l.entered_amount, l.entered_unit, l.basis, l.basis_multiplier,
    l.kcal, l.protein, l.carbs, l.sugar, l.fat, l.sat_fat, l.fiber, l.salt
  from jsonb_array_elements(coalesce(p_recipe -> 'lines', '[]')) with ordinality as e (value, ord),
    jsonb_to_record(e.value) as l (
      id uuid, allocation public.dish_line_allocation, ingredient_id uuid, name text, brand text,
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

-- Deletes a recipe. Deleting it again does nothing.
create function public.delete_recipe(p_recipe_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  delete from public.recipes
  where id = p_recipe_id and household_id = private.my_household_id();
end;
$$;

-- ─── live updates: the generic branch of live_change_of sends {table: 'recipes'} ──

-- every save updates the recipe row, so its trigger covers portions and lines too
create trigger recipes_broadcast_live_change
  after insert or update or delete on public.recipes
  for each row execute function private.broadcast_live_change();

-- ─── privileges ─────────────────────────────────────────────────────────────

revoke all on function public.save_recipe(jsonb) from public, anon;
revoke all on function public.delete_recipe(uuid) from public, anon;
grant execute on function public.save_recipe(jsonb) to authenticated;
grant execute on function public.delete_recipe(uuid) to authenticated;

revoke all on public.recipes, public.recipe_portions, public.recipe_lines,
  public.recipe_line_amounts from anon, authenticated;
grant select on public.recipes, public.recipe_portions, public.recipe_lines,
  public.recipe_line_amounts to authenticated;
