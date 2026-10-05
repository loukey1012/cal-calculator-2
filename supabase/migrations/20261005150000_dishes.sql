-- Cooked dishes ("cook together"): one cooking = ingredient lines + one or more portions.
-- Shared lines are divided by the dish's split; lines with own amounts give each portion exactly
-- its amount. A portion without an eater is a leftover. Every eaten portion is materialised as
-- ordinary meal_items in its eater's meal, so meal_totals / daily_totals need no change.
-- Dishes are only written through save_dish / delete_dish, which keep those items in step.
-- Recipes can later reuse the line shape (allocation + amounts) and add dishes.recipe_id.

create type public.dish_split_mode as enum ('equal', 'count', 'percent', 'weight');
create type public.dish_line_allocation as enum ('shared', 'per_portion');

-- ─── tables ─────────────────────────────────────────────────────────────────

create table public.dishes (
  id uuid primary key, -- generated on the device
  household_id uuid not null references public.households (id) on delete cascade,
  name text check (char_length(btrim(name)) between 1 and 60),
  split_mode public.dish_split_mode not null default 'equal',
  -- the whole cooked pot, for the weight split
  cooked_weight_g numeric(8, 2) check (cooked_weight_g > 0),
  -- changes with every save; a save names the revision it was based on (stale saves fail)
  revision uuid not null,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dishes_household_id_idx on public.dishes (household_id);
create index dishes_created_by_idx on public.dishes (created_by);

create trigger dishes_set_updated_at
  before update on public.dishes
  for each row execute function private.set_updated_at();

create table public.dish_portions (
  id uuid primary key,
  dish_id uuid not null references public.dishes (id) on delete cascade,
  position smallint not null check (position >= 0),
  -- who ate it, where; all empty = a leftover nobody has eaten yet
  user_id uuid references public.profiles (id) on delete cascade,
  date date,
  meal_type public.meal_type,
  -- count, percent or plate grams, depending on the dish's split; unused for equal
  split_value numeric(8, 2) check (split_value >= 0),
  created_at timestamptz not null default now(),
  unique (id, dish_id),
  constraint dish_portions_eater check (
    (user_id is null and date is null and meal_type is null)
    or (user_id is not null and date is not null and meal_type is not null)
  )
);

create index dish_portions_dish_id_idx on public.dish_portions (dish_id);
create index dish_portions_user_date_idx on public.dish_portions (user_id, date);

-- Same nutrition snapshot as meal_items; entered_amount is the whole amount cooked
-- (for own amounts: their sum).
create table public.dish_lines (
  id uuid primary key,
  dish_id uuid not null references public.dishes (id) on delete cascade,
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
  created_at timestamptz not null default now(),
  unique (id, dish_id)
);

create index dish_lines_dish_id_idx on public.dish_lines (dish_id);
create index dish_lines_ingredient_id_idx on public.dish_lines (ingredient_id);

-- Own amounts of a per_portion line; no row = that portion doesn't have the ingredient.
-- Line and portion must belong to the same dish.
create table public.dish_line_amounts (
  dish_id uuid not null,
  line_id uuid not null,
  portion_id uuid not null,
  amount numeric(9, 2) not null check (amount > 0),
  primary key (line_id, portion_id),
  constraint dish_line_amounts_line_fkey foreign key (line_id, dish_id)
    references public.dish_lines (id, dish_id) on delete cascade,
  constraint dish_line_amounts_portion_fkey foreign key (portion_id, dish_id)
    references public.dish_portions (id, dish_id) on delete cascade
);

create index dish_line_amounts_portion_idx on public.dish_line_amounts (portion_id, dish_id);
create index dish_line_amounts_dish_id_idx on public.dish_line_amounts (dish_id);

-- a meal item either is plain food or belongs to a portion of a dish (and one of its lines)
alter table public.meal_items
  add column dish_portion_id uuid references public.dish_portions (id) on delete cascade,
  add column dish_line_id uuid references public.dish_lines (id) on delete cascade,
  add constraint meal_items_dish_link check ((dish_portion_id is null) = (dish_line_id is null));

create index meal_items_dish_portion_id_idx on public.meal_items (dish_portion_id);
create index meal_items_dish_line_id_idx on public.meal_items (dish_line_id);

-- ─── row level security: household members read; writes only via the RPCs ──

create function private.can_access_dish(p_dish_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.dishes d
    where d.id = p_dish_id and d.household_id = private.my_household_id()
  );
$$;

revoke all on function private.can_access_dish(uuid) from public;
grant execute on function private.can_access_dish(uuid) to authenticated;

alter table public.dishes enable row level security;
alter table public.dish_portions enable row level security;
alter table public.dish_lines enable row level security;
alter table public.dish_line_amounts enable row level security;

create policy "household reads dishes" on public.dishes
  for select to authenticated
  using (household_id = (select private.my_household_id()));

create policy "household reads dish portions" on public.dish_portions
  for select to authenticated
  using (private.can_access_dish(dish_id));

create policy "household reads dish lines" on public.dish_lines
  for select to authenticated
  using (private.can_access_dish(dish_id));

create policy "household reads dish line amounts" on public.dish_line_amounts
  for select to authenticated
  using (private.can_access_dish(dish_id));

-- a dish's meal items are read like any other, but only save_dish / delete_dish change them
drop policy "household manages meal items" on public.meal_items;

create policy "household reads meal items" on public.meal_items
  for select to authenticated
  using (private.can_access_meal(meal_id));

create policy "household adds plain meal items" on public.meal_items
  for insert to authenticated
  with check (
    private.can_access_meal(meal_id) and dish_portion_id is null and dish_line_id is null
  );

create policy "household changes plain meal items" on public.meal_items
  for update to authenticated
  using (private.can_access_meal(meal_id) and dish_portion_id is null)
  with check (
    private.can_access_meal(meal_id) and dish_portion_id is null and dish_line_id is null
  );

create policy "household removes plain meal items" on public.meal_items
  for delete to authenticated
  using (private.can_access_meal(meal_id) and dish_portion_id is null);

-- ─── RPCs ───────────────────────────────────────────────────────────────────

-- Validates the dish's split; raises a readable error when it can't be applied.
create function private.check_dish_split(p_dish_id uuid)
returns void
language plpgsql
stable
set search_path = ''
as $$
declare
  v_dish public.dishes;
  v_sum numeric;
begin
  select * into v_dish from public.dishes where id = p_dish_id;
  if v_dish.split_mode = 'equal' then
    return;
  end if;

  if exists (
    select 1 from public.dish_portions where dish_id = p_dish_id and split_value is null
  ) then
    raise exception 'Every portion needs a value for this split' using errcode = '22023';
  end if;

  select sum(split_value) into v_sum from public.dish_portions where dish_id = p_dish_id;
  if v_dish.split_mode = 'count' and v_sum <= 0 then
    raise exception 'At least one portion needs a count above zero' using errcode = '22023';
  end if;
  if v_dish.split_mode = 'percent' and v_sum > 100 then
    raise exception 'The percentages add up to more than 100 %%' using errcode = '22023';
  end if;
  if v_dish.split_mode = 'weight' then
    if v_dish.cooked_weight_g is null then
      raise exception 'Weigh the cooked dish to split it by weight' using errcode = '22023';
    end if;
    if v_sum > v_dish.cooked_weight_g then
      raise exception 'The plates weigh more than the cooked dish' using errcode = '22023';
    end if;
  end if;
end;
$$;

revoke all on function private.check_dish_split(uuid) from public;

-- Writes every eaten portion into its eater's meal (same maths as src/features/dishes/portions.ts).
create function private.log_dish_portions(p_dish_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_dish public.dishes;
  v_portion_count integer;
  v_sum numeric;
begin
  select * into v_dish from public.dishes where id = p_dish_id;
  select count(*), sum(split_value) into v_portion_count, v_sum
  from public.dish_portions where dish_id = p_dish_id;

  insert into public.meal_items (
    meal_id, dish_portion_id, dish_line_id, ingredient_id, name, brand,
    entered_amount, entered_unit, basis, basis_multiplier,
    kcal, protein, carbs, sugar, fat, sat_fat, fiber, salt, created_at
  )
  select
    public.ensure_meal(part.user_id, part.date, part.meal_type),
    part.portion_id, part.line_id, part.ingredient_id, part.name, part.brand,
    round(part.entered_amount * part.fraction, 2), part.entered_unit, part.basis,
    round(part.basis_multiplier * part.fraction, 4),
    part.kcal, part.protein, part.carbs, part.sugar, part.fat, part.sat_fat, part.fiber, part.salt,
    -- keeps the dish where it was in the meal, lines in their order
    v_dish.created_at + part.line_position * interval '1 millisecond'
  from (
    select
      p.id as portion_id, p.user_id, p.date, p.meal_type,
      l.id as line_id, l.position as line_position, l.ingredient_id, l.name, l.brand,
      l.entered_amount, l.entered_unit, l.basis, l.basis_multiplier,
      l.kcal, l.protein, l.carbs, l.sugar, l.fat, l.sat_fat, l.fiber, l.salt,
      case
        when l.allocation = 'per_portion' then coalesce(a.amount, 0) / l.entered_amount
        when v_dish.split_mode = 'equal' then 1::numeric / v_portion_count
        when v_dish.split_mode = 'count' then p.split_value / v_sum
        when v_dish.split_mode = 'percent' then p.split_value / 100
        else p.split_value / v_dish.cooked_weight_g
      end as fraction
    from public.dish_portions p
    join public.dish_lines l on l.dish_id = p.dish_id
    left join public.dish_line_amounts a on a.line_id = l.id and a.portion_id = p.id
    where p.dish_id = p_dish_id and p.user_id is not null
  ) as part
  -- a part too small to log is left out instead of logging zero
  where round(part.entered_amount * part.fraction, 2) > 0
    and round(part.basis_multiplier * part.fraction, 4) > 0;
end;
$$;

revoke all on function private.log_dish_portions(uuid) from public;

-- Saves a whole dish at once (create or replace) and re-logs every eaten portion.
-- Safe to resend: a save whose revision is already stored does nothing.
-- p_base_revision: the revision this save was based on (null for a new dish).
-- p_replace_item_ids: plain meal items this dish replaces ("share this meal").
create function public.save_dish(
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
      revision = v_revision
    where id = v_dish_id;
    -- removes the old portions' meal items, lines and own amounts with them
    delete from public.dish_portions where dish_id = v_dish_id;
    delete from public.dish_lines where dish_id = v_dish_id;
  elsif p_base_revision is not null then
    raise exception 'This dish was deleted meanwhile' using errcode = 'PT409';
  else
    insert into public.dishes (id, household_id, name, split_mode, cooked_weight_g, revision)
    values (
      v_dish_id,
      v_household,
      nullif(btrim(p_dish ->> 'name'), ''),
      coalesce((p_dish ->> 'split_mode')::public.dish_split_mode, 'equal'),
      (p_dish ->> 'cooked_weight_g')::numeric,
      v_revision
    );
  end if;

  -- portions
  insert into public.dish_portions (id, dish_id, position, user_id, date, meal_type, split_value)
  select p.id, v_dish_id, (e.ord - 1)::smallint, p.user_id, p.date, p.meal_type, p.split_value
  from jsonb_array_elements(coalesce(p_dish -> 'portions', '[]')) with ordinality as e (value, ord),
    jsonb_to_record(e.value) as p (
      id uuid, user_id uuid, date date, meal_type public.meal_type, split_value numeric
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

-- Deletes a dish with its portions (and their meal items). Deleting it again does nothing.
create function public.delete_dish(p_dish_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  delete from public.dishes
  where id = p_dish_id and household_id = private.my_household_id();
end;
$$;

-- ─── privileges ─────────────────────────────────────────────────────────────

revoke all on function public.save_dish(jsonb, uuid, uuid[]) from public, anon;
revoke all on function public.delete_dish(uuid) from public, anon;
grant execute on function public.save_dish(jsonb, uuid, uuid[]) to authenticated;
grant execute on function public.delete_dish(uuid) to authenticated;

revoke all on public.dishes, public.dish_portions, public.dish_lines, public.dish_line_amounts
  from anon, authenticated;
grant select on public.dishes, public.dish_portions, public.dish_lines, public.dish_line_amounts
  to authenticated;
