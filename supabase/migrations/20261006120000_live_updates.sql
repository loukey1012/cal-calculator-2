-- Live updates: every change to household data sends a small hint ("this person's day changed",
-- "this dish changed", …) on the household's private Realtime channel `household:<id>`.
-- Hints never carry data: phones re-fetch what changed through the normal, RLS-checked queries.
--
-- Dish saves need no extra hints: they rewrite the dish row (→ dish + leftovers) and its
-- portions' meal items (→ every eaten portion's day, before and after).

-- Which household hears about a changed row, and what the hint says. null household = no hint
-- (e.g. a meal item whose meal was deleted in the same statement: the meal's own hint covers it).
create function private.live_change_of(p_table text, p_row jsonb)
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

-- Sends the hints for a changed row (its old and new version, once each). A failure is only
-- logged: live updates must never make a save fail.
create function private.broadcast_live_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_versions jsonb[] := array_remove(array[
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end
  ], null);
  v_version jsonb;
  v_household uuid;
  v_hint jsonb;
  v_sent text[] := '{}';
begin
  foreach v_version in array v_versions loop
    select c.household_id, c.hint into v_household, v_hint
    from private.live_change_of(tg_table_name, v_version) c;
    continue when v_household is null or (v_household || v_hint::text) = any (v_sent);
    v_sent := v_sent || (v_household || v_hint::text);
    perform realtime.send(
      v_hint || jsonb_build_object('actor', auth.uid()),
      'change',
      'household:' || v_household,
      true
    );
  end loop;
  return null;
exception
  when others then
    raise warning 'live update not sent for %: %', tg_table_name, sqlerrm;
    return null;
end;
$$;

revoke all on function private.live_change_of(text, jsonb) from public;
revoke all on function private.broadcast_live_change() from public;

create trigger meals_broadcast_live_change
  after insert or update or delete on public.meals
  for each row execute function private.broadcast_live_change();
create trigger meal_items_broadcast_live_change
  after insert or update or delete on public.meal_items
  for each row execute function private.broadcast_live_change();
create trigger dishes_broadcast_live_change
  after insert or update or delete on public.dishes
  for each row execute function private.broadcast_live_change();
create trigger ingredients_broadcast_live_change
  after insert or update or delete on public.ingredients
  for each row execute function private.broadcast_live_change();
create trigger categories_broadcast_live_change
  after insert or update or delete on public.categories
  for each row execute function private.broadcast_live_change();
create trigger category_groups_broadcast_live_change
  after insert or update or delete on public.category_groups
  for each row execute function private.broadcast_live_change();
create trigger goal_history_broadcast_live_change
  after insert or update or delete on public.goal_history
  for each row execute function private.broadcast_live_change();
create trigger profiles_broadcast_live_change
  after insert or update or delete on public.profiles
  for each row execute function private.broadcast_live_change();
create trigger households_broadcast_live_change
  after insert or update or delete on public.households
  for each row execute function private.broadcast_live_change();

-- Only members hear their household's channel. Nobody may send on it from a phone (no insert
-- policy): hints come from the database alone.
create policy "members receive their household's live changes" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) = 'household:' || (select private.my_household_id())::text
  );
