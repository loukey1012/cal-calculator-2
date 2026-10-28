-- Calories burned per day (total daily energy use) is one setting per person, not part of the
-- goal history: set once, it holds for every day, past weeks included. Optional: null = not set.
-- RLS needs no change: household members already read each other's profiles, and the
-- "update own profile" policy covers the new column once it is granted below.

alter table public.profiles
  add column kcal_burned integer check (kcal_burned > 0);

grant update (kcal_burned) on public.profiles to authenticated;

-- Carry over each person's latest figure from their goal history.
update public.profiles p
set kcal_burned = latest.kcal_burned
from (
  select distinct on (user_id) user_id, kcal_burned
  from public.goal_history
  where kcal_burned is not null
  order by user_id, valid_from desc
) latest
where latest.user_id = p.id;

-- goal_history.kcal_burned is kept for now: the app version deployed at the time of this
-- migration still writes it. A later migration drops it once the new app is live.
