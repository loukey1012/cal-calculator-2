-- Body weight: one entry per person and day. An entry counts until the next one (worked out in
-- the app). The household sees each other's weight, like meals and goals; only you change yours.
-- goal_history gets an optional target weight.

create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null, -- the user's local calendar day
  weight_kg numeric(4, 1) not null check (weight_kg between 20 and 400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create trigger weight_entries_set_updated_at
  before update on public.weight_entries
  for each row execute function private.set_updated_at();

alter table public.weight_entries enable row level security;

create policy "read own and household weight" on public.weight_entries
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_household_member(user_id));

create policy "insert own weight" on public.weight_entries
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "update own weight" on public.weight_entries
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "delete own weight" on public.weight_entries
  for delete to authenticated
  using (user_id = (select auth.uid()));

alter table public.goal_history
  add column weight_goal_kg numeric(4, 1) check (weight_goal_kg between 20 and 400);

-- live updates: a changed weight tells the household whose weight changed (otherwise unchanged)
create or replace function private.live_change_of(p_table text, p_row jsonb)
returns table (household_id uuid, hint jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  case p_table
    when 'meals' then
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
      -- ingredients, categories, category_groups
      return query
        select (p_row ->> 'household_id')::uuid, jsonb_build_object('table', p_table);
  end case;
end;
$$;

create trigger weight_entries_broadcast_live_change
  after insert or update or delete on public.weight_entries
  for each row execute function private.broadcast_live_change();
