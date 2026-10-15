-- Keep-alive: Supabase pauses a free project after a week without use. A scheduled GitHub
-- Actions workflow (.github/workflows/keep-alive.yml) calls this with the public anon key every
-- other day. It runs a real query and reveals nothing.
create function public.keep_alive()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select true;
$$;

revoke all on function public.keep_alive() from public;
grant execute on function public.keep_alive() to anon, authenticated;
