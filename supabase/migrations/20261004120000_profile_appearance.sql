-- Per-user look of the app (theme, dark style, goal colors, progress style).
-- Bound to the account, never to a device. The app validates the fields and falls back to
-- defaults for anything unknown, so the database only guards the shape and size.

alter table public.profiles
  add column appearance jsonb not null default '{}'::jsonb
    constraint profiles_appearance_is_object check (jsonb_typeof(appearance) = 'object')
    constraint profiles_appearance_size check (pg_column_size(appearance) <= 1024);

grant update (appearance) on public.profiles to authenticated;
