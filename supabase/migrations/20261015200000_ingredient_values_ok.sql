-- "Values are correct": a flagged ingredient (values that look wrong by the ingredient form's
-- checks) can be marked as fine. Holds the value columns as they were when marked; the app flags
-- it again once the current values differ. Shared by the household like the ingredient itself.
alter table public.ingredients add column values_ok jsonb;

comment on column public.ingredients.values_ok is
  'Value columns at the time someone marked them as correct; null when not marked.';
