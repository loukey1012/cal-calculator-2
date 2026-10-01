-- CALculator2 initial schema
-- Households group accounts; every member can read and edit every member's meals.
-- Security model: RLS on every table, helper functions in the non-exposed `private` schema.

create schema if not exists private;
grant usage on schema private to authenticated;

-- ─── enums ──────────────────────────────────────────────────────────────────

create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type public.amount_unit as enum ('g', 'unit');
create type public.nutrition_basis as enum ('per_100g', 'per_unit');

-- ─── shared trigger functions ───────────────────────────────────────────────

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function private.generate_invite_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

-- ─── households & profiles ──────────────────────────────────────────────────

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  invite_code text not null unique default private.generate_invite_code(),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  household_id uuid references public.households (id) on delete set null,
  display_name text not null default '' check (char_length(display_name) <= 40),
  accent_color text not null default '#007aff' check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_household_id_idx on public.profiles (household_id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- ─── access helpers (security definer: they read profiles without RLS recursion) ─

create function private.my_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select household_id from public.profiles where id = auth.uid();
$$;

create function private.is_household_member(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.household_id is not null
      and p.household_id = private.my_household_id()
  );
$$;

revoke all on function private.my_household_id() from public;
revoke all on function private.is_household_member(uuid) from public;
grant execute on function private.my_household_id() to authenticated;
grant execute on function private.is_household_member(uuid) to authenticated;

-- every new auth user gets a profile
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(left(btrim(new.raw_user_meta_data ->> 'display_name'), 40), ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ─── goals (history, so past days are judged against the goal valid back then) ─

create table public.goal_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  valid_from date not null,
  kcal integer not null check (kcal > 0),
  protein_g numeric(6, 1) check (protein_g >= 0),
  carbs_g numeric(6, 1) check (carbs_g >= 0),
  fat_g numeric(6, 1) check (fat_g >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, valid_from)
);

-- ─── ingredient database ────────────────────────────────────────────────────

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (id, household_id)
);

create unique index categories_household_name_key on public.categories (household_id, lower(name));

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  category_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  brand text check (char_length(brand) <= 60),
  note text check (char_length(note) <= 500),

  -- per 100 g (kcal always whole numbers)
  kcal_100 integer check (kcal_100 >= 0),
  protein_100 numeric(7, 2) check (protein_100 >= 0),
  carbs_100 numeric(7, 2) check (carbs_100 >= 0),
  sugar_100 numeric(7, 2) check (sugar_100 >= 0),
  fat_100 numeric(7, 2) check (fat_100 >= 0),
  sat_fat_100 numeric(7, 2) check (sat_fat_100 >= 0),
  fiber_100 numeric(7, 2) check (fiber_100 >= 0),
  salt_100 numeric(7, 2) check (salt_100 >= 0),

  -- per unit (e.g. "1 bar"); unit_weight_g optionally enables g <-> unit conversion
  unit_label text check (char_length(unit_label) <= 30),
  unit_weight_g numeric(7, 2) check (unit_weight_g > 0),
  kcal_unit integer check (kcal_unit >= 0),
  protein_unit numeric(7, 2) check (protein_unit >= 0),
  carbs_unit numeric(7, 2) check (carbs_unit >= 0),
  sugar_unit numeric(7, 2) check (sugar_unit >= 0),
  fat_unit numeric(7, 2) check (fat_unit >= 0),
  sat_fat_unit numeric(7, 2) check (sat_fat_unit >= 0),
  fiber_unit numeric(7, 2) check (fiber_unit >= 0),
  salt_unit numeric(7, 2) check (salt_unit >= 0),

  legacy_id text unique,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint ingredients_has_kcal check (kcal_100 is not null or kcal_unit is not null),
  constraint ingredients_per_100g_needs_kcal check (
    kcal_100 is not null
    or num_nonnulls(protein_100, carbs_100, sugar_100, fat_100, sat_fat_100, fiber_100, salt_100) = 0
  ),
  constraint ingredients_per_unit_needs_kcal check (
    kcal_unit is not null
    or num_nonnulls(protein_unit, carbs_unit, sugar_unit, fat_unit, sat_fat_unit, fiber_unit, salt_unit) = 0
  ),
  -- category must belong to the same household
  constraint ingredients_category_fkey foreign key (category_id, household_id)
    references public.categories (id, household_id) on delete set null (category_id)
);

create index ingredients_household_name_idx on public.ingredients (household_id, lower(name));
create index ingredients_category_id_idx on public.ingredients (category_id);

create trigger ingredients_set_updated_at
  before update on public.ingredients
  for each row execute function private.set_updated_at();

-- ─── meals (one per user, day and type) ─────────────────────────────────────

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null, -- the user's local calendar day, never a timestamp
  meal_type public.meal_type not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date, meal_type)
);

create trigger meals_set_updated_at
  before update on public.meals
  for each row execute function private.set_updated_at();

-- Items snapshot the nutrition they were logged with, so later ingredient edits never
-- rewrite history. Totals = basis_multiplier × snapshot (e.g. 150 g on per_100g → 1.5).
-- ingredient_id is null for custom one-off items.
create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
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
  updated_at timestamptz not null default now()
);

create index meal_items_meal_id_idx on public.meal_items (meal_id);
create index meal_items_ingredient_id_idx on public.meal_items (ingredient_id);

create trigger meal_items_set_updated_at
  before update on public.meal_items
  for each row execute function private.set_updated_at();

create function private.can_access_meal(p_meal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.meals m
    where m.id = p_meal_id and private.is_household_member(m.user_id)
  );
$$;

revoke all on function private.can_access_meal(uuid) from public;
grant execute on function private.can_access_meal(uuid) to authenticated;

-- ─── row level security ─────────────────────────────────────────────────────

alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.goal_history enable row level security;
alter table public.categories enable row level security;
alter table public.ingredients enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;

create policy "members read their household" on public.households
  for select to authenticated
  using (id = (select private.my_household_id()));

create policy "members rename their household" on public.households
  for update to authenticated
  using (id = (select private.my_household_id()))
  with check (id = (select private.my_household_id()));

create policy "read own and household profiles" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or household_id = (select private.my_household_id()));

create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "read own and household goals" on public.goal_history
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_household_member(user_id));

create policy "insert own goals" on public.goal_history
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "update own goals" on public.goal_history
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "delete own goals" on public.goal_history
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "household manages categories" on public.categories
  for all to authenticated
  using (household_id = (select private.my_household_id()))
  with check (household_id = (select private.my_household_id()));

create policy "household manages ingredients" on public.ingredients
  for all to authenticated
  using (household_id = (select private.my_household_id()))
  with check (household_id = (select private.my_household_id()));

create policy "household manages meals" on public.meals
  for all to authenticated
  using (private.is_household_member(user_id))
  with check (private.is_household_member(user_id));

create policy "household manages meal items" on public.meal_items
  for all to authenticated
  using (private.can_access_meal(meal_id))
  with check (private.can_access_meal(meal_id));

-- ─── totals views (security_invoker: RLS of the caller applies) ─────────────

create view public.meal_totals with (security_invoker = true) as
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
  coalesce(bool_or(i.id is not null and i.salt is null), false) as salt_missing
from public.meals m
left join public.meal_items i on i.meal_id = m.id
group by m.id;

create view public.daily_totals with (security_invoker = true) as
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
  bool_or(salt_missing) as salt_missing
from public.meal_totals
group by user_id, date;

-- ─── RPCs ───────────────────────────────────────────────────────────────────

create function public.create_household(p_name text)
returns public.households
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household public.households;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if private.my_household_id() is not null then
    raise exception 'You are already in a household';
  end if;

  insert into public.households (name) values (btrim(p_name)) returning * into v_household;
  update public.profiles set household_id = v_household.id where id = auth.uid();
  return v_household;
end;
$$;

create function public.join_household(p_invite_code text)
returns public.households
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household public.households;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if private.my_household_id() is not null then
    raise exception 'You are already in a household';
  end if;

  select * into v_household
  from public.households
  where invite_code = upper(btrim(p_invite_code));

  if not found then
    raise exception 'Invalid invite code';
  end if;

  update public.profiles set household_id = v_household.id where id = auth.uid();
  return v_household;
end;
$$;

-- Returns the single meal for (user, day, type), creating it if needed. Runs with the
-- caller's rights, so RLS decides whether the caller may touch that user's meals.
create function public.ensure_meal(p_user_id uuid, p_date date, p_meal_type public.meal_type)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_meal_id uuid;
begin
  insert into public.meals (user_id, date, meal_type)
  values (p_user_id, p_date, p_meal_type)
  on conflict (user_id, date, meal_type) do nothing
  returning id into v_meal_id;

  if v_meal_id is null then
    select id into v_meal_id
    from public.meals
    where user_id = p_user_id and date = p_date and meal_type = p_meal_type;
  end if;

  if v_meal_id is null then
    raise exception 'Not allowed to log meals for this user' using errcode = '42501';
  end if;
  return v_meal_id;
end;
$$;

-- ─── privileges ─────────────────────────────────────────────────────────────

revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from public, anon;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.ensure_meal(uuid, date, public.meal_type) to authenticated;

-- households/profiles are only created or re-assigned through the RPCs and auth trigger
revoke insert, update, delete on public.households from authenticated;
grant update (name) on public.households to authenticated;
revoke insert, update, delete on public.profiles from authenticated;
grant update (display_name, accent_color) on public.profiles to authenticated;

-- views are read-only
revoke insert, update, delete on public.meal_totals, public.daily_totals from authenticated;
