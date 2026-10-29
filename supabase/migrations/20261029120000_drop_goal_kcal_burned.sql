-- Calories burned per day moved to profiles.kcal_burned (20261028150000), one figure per person.
-- The app stopped writing goal_history.kcal_burned with 37b51b7, so the old column goes.
alter table public.goal_history
  drop column kcal_burned;
