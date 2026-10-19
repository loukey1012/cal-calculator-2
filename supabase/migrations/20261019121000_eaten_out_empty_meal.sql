-- set_meal_eaten_out: an empty meal that didn't exist yet wasn't marked. ensure_meal sat in the
-- update's filter, which only runs for rows that already exist; now it runs first, on its own.
create or replace function public.set_meal_eaten_out(
  p_user_id uuid,
  p_date date,
  p_meal_type public.meal_type,
  p_eaten_out boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_meal_id uuid;
begin
  if p_eaten_out then
    v_meal_id := public.ensure_meal(p_user_id, p_date, p_meal_type);
    update public.meals set eaten_out = true where id = v_meal_id;
  else
    -- nothing to take back from a meal that doesn't exist: no empty meal is created for it
    update public.meals set eaten_out = false
    where user_id = p_user_id and date = p_date and meal_type = p_meal_type;
  end if;
end;
$$;
