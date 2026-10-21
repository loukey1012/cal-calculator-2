-- Notes on a day and on a meal ("Birthday at Oma's"), for any day or meal of either person.

create table public.day_notes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null, -- the user's local calendar day
  note text not null check (char_length(btrim(note)) between 1 and 500),
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table public.day_notes enable row level security;
revoke all on public.day_notes from anon;

create policy "household manages day notes" on public.day_notes
  for all to authenticated
  using (private.is_household_member(user_id))
  with check (private.is_household_member(user_id));

create trigger day_notes_set_updated_at
  before update on public.day_notes
  for each row execute function private.set_updated_at();

create trigger day_notes_broadcast_live_change
  after insert or update or delete on public.day_notes
  for each row execute function private.broadcast_live_change();

alter table public.meals
  add column note text check (char_length(btrim(note)) between 1 and 500);

-- Sets a meal's note (creating the meal when empty); an empty note removes it.
create function public.set_meal_note(
  p_user_id uuid,
  p_date date,
  p_meal_type public.meal_type,
  p_note text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_note text := nullif(btrim(p_note), '');
  v_meal_id uuid;
begin
  if v_note is not null then
    v_meal_id := public.ensure_meal(p_user_id, p_date, p_meal_type);
    update public.meals set note = v_note where id = v_meal_id;
  else
    -- nothing to remove from a meal that doesn't exist: no empty meal is created for it
    update public.meals set note = null
    where user_id = p_user_id and date = p_date and meal_type = p_meal_type;
  end if;
end;
$$;

revoke execute on function public.set_meal_note(uuid, date, public.meal_type, text)
  from public, anon;
grant execute on function public.set_meal_note(uuid, date, public.meal_type, text)
  to authenticated;

-- live updates: a day note is a change to that person's day (otherwise unchanged)
create or replace function private.live_change_of(p_table text, p_row jsonb)
returns table (household_id uuid, hint jsonb)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  case p_table
    when 'meals', 'cheat_days', 'day_notes' then
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
