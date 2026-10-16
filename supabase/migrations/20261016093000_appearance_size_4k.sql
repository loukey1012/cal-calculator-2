-- The Background settings (up to six spots, position, colors) together with the rest of the
-- appearance no longer fit in 1 KB. 4 KB still only guards against misuse.

alter table public.profiles
  drop constraint profiles_appearance_size,
  add constraint profiles_appearance_size check (pg_column_size(appearance) <= 4096);
