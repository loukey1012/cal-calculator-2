-- Push notifications, part 1: each phone that allowed notifications. A subscription belongs to
-- whoever is signed in on that phone; signing in as someone else takes the phone over. Only the
-- push Edge Function (service role) reads the keys to send; members manage their own phones.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  -- where the phone's push service accepts messages for it
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 1 and 200),
  auth text not null check (char_length(auth) between 1 and 100),
  -- e.g. "iPhone", to tell the phones apart
  device_label text check (char_length(device_label) <= 80),
  created_at timestamptz not null default now(),
  -- the last push the push service accepted
  last_success_at timestamptz
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "members read their own push subscriptions" on public.push_subscriptions
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Saves this phone's subscription for the signed-in person (also when another account had it).
create function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_device_label text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, device_label)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, nullif(btrim(p_device_label), ''))
  on conflict (endpoint) do update set
    user_id = excluded.user_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    device_label = excluded.device_label,
    created_at = now(),
    last_success_at = null;
end;
$$;

-- Forgets this phone (notifications turned off, or signed out). Only your own phone.
create function public.delete_push_subscription(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
end;
$$;

revoke all on function public.save_push_subscription(text, text, text, text) from public, anon;
revoke all on function public.delete_push_subscription(text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.delete_push_subscription(text) to authenticated;

revoke all on public.push_subscriptions from anon, authenticated;
grant select (id, user_id, endpoint, device_label, created_at, last_success_at)
  on public.push_subscriptions to authenticated;
