-- Fiber can be a daily goal too, like protein, carbs and fat (optional).

alter table public.goal_history
  add column fiber_g numeric(6, 1) check (fiber_g >= 0);
