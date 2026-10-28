-- Calories burned per day (total daily energy use), saved with the goal so past weeks keep
-- their value. Optional: null = not set.

alter table public.goal_history
  add column kcal_burned integer check (kcal_burned > 0);
