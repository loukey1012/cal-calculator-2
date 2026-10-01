-- Hardening after review of the initial schema.

-- ─── invite codes: 12 chars from an unambiguous alphabet (no I/O/0/1), ~60 bits ─

create or replace function private.generate_invite_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (get_byte(bytes, i) % 32) + 1, 1), '')
  from extensions.gen_random_bytes(12) as bytes, generate_series(0, 11) as i;
$$;

-- ─── household RPCs: lock the caller's profile, fail loudly if it is missing ─

create or replace function public.create_household(p_name text)
returns public.households
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household public.households;
  v_current_household uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select household_id into v_current_household
  from public.profiles where id = auth.uid()
  for update;
  if not found then
    raise exception 'Profile not found';
  end if;
  if v_current_household is not null then
    raise exception 'You are already in a household';
  end if;

  insert into public.households (name) values (btrim(p_name)) returning * into v_household;
  update public.profiles set household_id = v_household.id where id = auth.uid();
  return v_household;
end;
$$;

create or replace function public.join_household(p_invite_code text)
returns public.households
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household public.households;
  v_current_household uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select household_id into v_current_household
  from public.profiles where id = auth.uid()
  for update;
  if not found then
    raise exception 'Profile not found';
  end if;
  if v_current_household is not null then
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

-- ─── ingredients ────────────────────────────────────────────────────────────

alter table public.ingredients drop constraint ingredients_legacy_id_key;
alter table public.ingredients
  add constraint ingredients_household_legacy_id_key unique (household_id, legacy_id);

-- grams of a nutrient per 100 g can never exceed 100
alter table public.ingredients add constraint ingredients_per_100g_max check (
  protein_100 <= 100 and carbs_100 <= 100 and sugar_100 <= 100 and fat_100 <= 100
  and sat_fat_100 <= 100 and fiber_100 <= 100 and salt_100 <= 100
);

create index ingredients_created_by_idx on public.ingredients (created_by);

-- ─── meal items may only reference ingredients of the meal owner's household ─
-- (FK checks bypass RLS, so this is enforced explicitly)

create function private.check_meal_item_ingredient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ingredient_id is not null and not exists (
    select 1
    from public.meals m
    join public.profiles p on p.id = m.user_id
    join public.ingredients i on i.household_id = p.household_id
    where m.id = new.meal_id and i.id = new.ingredient_id
  ) then
    raise exception 'Ingredient does not belong to this household' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.check_meal_item_ingredient() from public;

create trigger meal_items_check_ingredient
  before insert or update of ingredient_id, meal_id on public.meal_items
  for each row execute function private.check_meal_item_ingredient();

-- ─── privileges ─────────────────────────────────────────────────────────────

-- TRUNCATE bypasses RLS; nobody outside the service role needs these
revoke truncate, references, trigger on all tables in schema public from anon, authenticated;

-- future objects start closed: grant explicitly per table/function in later migrations
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke truncate, references, trigger on tables from authenticated;
alter default privileges in schema public revoke execute on functions from anon, public;
