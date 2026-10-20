-- Push notifications, part 2: what each person wants (saved to the account), where they are,
-- a sent-log so every notification goes out once, the partner's changes waiting to be told, and
-- the tick: pg_cron calls the push-tick Edge Function every 5 minutes through pg_net.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- ─── each person's choices (only they see them; the partner can read profiles) ─

create table public.notification_preferences (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  -- read with defaults by supabase/functions/_shared/notificationSettings.ts
  settings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(settings) = 'object' and pg_column_size(settings) <= 4096),
  -- IANA name from the phone, e.g. Europe/Vienna; notifications follow its clock
  time_zone text check (char_length(time_zone) between 1 and 64),
  updated_at timestamptz not null default now()
);

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function private.set_updated_at();

alter table public.notification_preferences enable row level security;

create policy "members read their own notification preferences"
  on public.notification_preferences
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "members add their own notification preferences"
  on public.notification_preferences
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "members change their own notification preferences"
  on public.notification_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.notification_preferences from anon, authenticated;
-- an upsert sets user_id too; the policies keep it the member's own
grant select, insert (user_id, settings, time_zone), update (user_id, settings, time_zone)
  on public.notification_preferences to authenticated;

-- ─── sent-log and waiting partner changes (only the Edge Functions use them) ─

create table public.push_sent (
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- e.g. reminder / summary
  kind text not null check (char_length(kind) between 1 and 40),
  -- e.g. 2026-10-20:lunch
  key text not null check (char_length(key) between 1 and 100),
  sent_at timestamptz not null default now(),
  primary key (user_id, kind, key)
);

create index push_sent_sent_at_idx on public.push_sent (sent_at);

-- someone changed another person's meal: one row per changed meal, the latest change counts
create table public.partner_changes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  meal_type public.meal_type not null,
  changed_at timestamptz not null default now(),
  primary key (user_id, actor_id, date, meal_type)
);

create index partner_changes_actor_id_idx on public.partner_changes (actor_id);

alter table public.push_sent enable row level security;
alter table public.partner_changes enable row level security;
revoke all on public.push_sent, public.partner_changes from anon, authenticated;

create function private.note_partner_change(p_owner uuid, p_date date, p_meal_type public.meal_type)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  -- my own changes, and changes without a signed-in person (scripts, the review), aren't told
  if v_actor is null or p_owner is null or v_actor = p_owner then
    return;
  end if;
  insert into public.partner_changes (user_id, actor_id, date, meal_type)
  values (p_owner, v_actor, p_date, p_meal_type)
  on conflict (user_id, actor_id, date, meal_type) do update set changed_at = now();
end;
$$;

revoke all on function private.note_partner_change(uuid, date, public.meal_type) from public;

-- A failure is only logged: a notification must never make a save fail.
create function private.queue_partner_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_meal public.meals;
begin
  if tg_table_name = 'meals' then
    perform private.note_partner_change(
      (v_row ->> 'user_id')::uuid, (v_row ->> 'date')::date,
      (v_row ->> 'meal_type')::public.meal_type
    );
  else
    -- a meal deleted with its items is noted by the meals trigger
    select * into v_meal from public.meals where id = (v_row ->> 'meal_id')::uuid;
    if found then
      perform private.note_partner_change(v_meal.user_id, v_meal.date, v_meal.meal_type);
    end if;
  end if;
  return null;
exception
  when others then
    raise warning 'partner change not noted for %: %', tg_table_name, sqlerrm;
    return null;
end;
$$;

revoke all on function private.queue_partner_change() from public;

create trigger meal_items_queue_partner_change
  after insert or update or delete on public.meal_items
  for each row execute function private.queue_partner_change();

-- marking a cheat meal or deleting a whole meal
create trigger meals_queue_partner_change
  after update of cheat_meal or delete on public.meals
  for each row execute function private.queue_partner_change();

-- ─── the tick ───────────────────────────────────────────────────────────────

-- The function's address and shared secret live in Vault (set by scripts/deploy-functions.sh,
-- never in a migration); without them the job does nothing.
select cron.schedule(
  'push-tick',
  '*/5 * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'push_tick_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-tick-secret',
        (select decrypted_secret from vault.decrypted_secrets where name = 'push_tick_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 25000
    )
    where exists (select 1 from vault.decrypted_secrets where name = 'push_tick_url')
      and exists (select 1 from vault.decrypted_secrets where name = 'push_tick_secret');
  $job$
);
