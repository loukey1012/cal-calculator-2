-- Day marks (items 58/59): a gym day (per person, like a cheat day) and a sex day (one per
-- household day, shown on both calendars). Neither changes any counting (not in daily_totals) and
-- neither reaches push notifications (no partner_changes trigger).

create table public.gym_days (
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null, -- the user's local calendar day
  created_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.gym_days enable row level security;
revoke all on public.gym_days from anon;

create policy "household manages gym days" on public.gym_days
  for all to authenticated
  using (private.is_household_member(user_id))
  with check (private.is_household_member(user_id));

create table public.sex_days (
  household_id uuid not null references public.households (id) on delete cascade,
  date date not null, -- the household's local calendar day
  created_at timestamptz not null default now(),
  primary key (household_id, date)
);

alter table public.sex_days enable row level security;
revoke all on public.sex_days from anon;

create policy "household manages sex days" on public.sex_days
  for all to authenticated
  using (household_id = (select private.my_household_id()))
  with check (household_id = (select private.my_household_id()));

create trigger gym_days_broadcast_live_change
  after insert or update or delete on public.gym_days
  for each row execute function private.broadcast_live_change();
create trigger sex_days_broadcast_live_change
  after insert or update or delete on public.sex_days
  for each row execute function private.broadcast_live_change();

-- live updates: a gym day is a change to that person's day, like a cheat day (so older app
-- versions refresh the day and month too); a sex day is a household mark with its own hint,
-- heard by both members. Neither is a partner change: no trigger writes partner_changes for them.
create or replace function private.live_change_of(p_table text, p_row jsonb)
returns table (household_id uuid, hint jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  case p_table
    when 'meals', 'cheat_days', 'day_notes', 'gym_days' then
      return query
        select p.household_id,
          jsonb_build_object('table', 'meals', 'user_id', p.id, 'date', p_row ->> 'date')
        from public.profiles p
        where p.id = (p_row ->> 'user_id')::uuid;
    when 'sex_days' then
      return query
        select (p_row ->> 'household_id')::uuid,
          jsonb_build_object('table', 'sex_days', 'date', p_row ->> 'date');
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
