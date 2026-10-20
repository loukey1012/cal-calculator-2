-- Push notifications, part 3: a dish left on Cook. The draft itself stays on the phone; the
-- server only learns what the notice says and when the dish last changed, so push-tick can
-- tell after the person's delay (once per change). Only the owner sees or changes their row.

create table public.cook_drafts (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  -- what the notice names: the dish's name, or its first ingredients
  label text not null check (char_length(label) between 1 and 120),
  line_count integer not null check (line_count between 0 and 200),
  -- the last change (set here, not by the phone, so its clock doesn't matter)
  updated_at timestamptz not null default now()
);

create trigger cook_drafts_set_updated_at
  before update on public.cook_drafts
  for each row execute function private.set_updated_at();

alter table public.cook_drafts enable row level security;

create policy "members read their own cook draft" on public.cook_drafts
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "members add their own cook draft" on public.cook_drafts
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "members change their own cook draft" on public.cook_drafts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "members remove their own cook draft" on public.cook_drafts
  for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.cook_drafts from anon, authenticated;
-- an upsert sets user_id too; the policies keep it the member's own
grant select, delete, insert (user_id, label, line_count), update (user_id, label, line_count)
  on public.cook_drafts to authenticated;
