-- How often each ingredient was used, for sorting the ingredient lists by "Most used".
-- A dish counts once per line (not once per person eating it); single foods logged without a
-- dish (e.g. imported history) count once each. Runs with the caller's rights, so RLS limits it
-- to the caller's household.

create function public.ingredient_use_counts()
returns table (ingredient_id uuid, uses integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select used.ingredient_id, count(*)::integer
  from (
    select l.ingredient_id from public.dish_lines l where l.ingredient_id is not null
    union all
    select i.ingredient_id from public.meal_items i
    where i.ingredient_id is not null and i.dish_line_id is null
  ) as used
  group by used.ingredient_id
$$;

revoke execute on function public.ingredient_use_counts() from public, anon;
grant execute on function public.ingredient_use_counts() to authenticated;
