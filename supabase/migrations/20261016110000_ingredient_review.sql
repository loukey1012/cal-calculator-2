-- Ingredient review: a Claude Code routine looks through the household's ingredients (weekly and
-- on request) and writes findings: typos, brand variants, unit names, unit weights, duplicates,
-- values that don't fit the product. Findings change nothing on their own: a member applies or
-- ignores each one in the app.
--
-- The routine has only the public anon key and a review key for one household. It reads and
-- writes through the two functions below; the key is stored as a SHA-256 hash only.

create table public.review_keys (
  household_id uuid primary key references public.households (id) on delete cascade,
  key_hash bytea not null unique,
  created_at timestamptz not null default now()
);

-- nobody reaches the keys through the API: no policies, no grants (the functions read them)
alter table public.review_keys enable row level security;
revoke all on public.review_keys from anon, authenticated;

create type public.finding_kind as enum (
  'typo', 'brand', 'unit_name', 'unit_weight', 'duplicate', 'values', 'other'
);
create type public.finding_status as enum ('open', 'applied', 'ignored');

create table public.ingredient_findings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  kind public.finding_kind not null,
  message text not null check (char_length(btrim(message)) between 1 and 500),
  -- the suggested fix: ingredient column -> new value (empty when there is nothing to apply)
  suggestion jsonb not null default '{}'::jsonb
    check (jsonb_typeof(suggestion) = 'object' and pg_column_size(suggestion) <= 2048),
  status public.finding_status not null default 'open',
  run_id text not null check (char_length(run_id) between 1 and 100),
  created_at timestamptz not null default now(),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz
);

create index ingredient_findings_household_status on public.ingredient_findings (household_id, status);
-- the same finding (ingredient, kind, fix) only once, even from two runs at the same moment
create unique index ingredient_findings_once
  on public.ingredient_findings (ingredient_id, kind, md5(suggestion::text));

alter table public.ingredient_findings enable row level security;

create policy "household reads its findings" on public.ingredient_findings
  for select to authenticated
  using (household_id = (select private.my_household_id()));

create policy "household decides its findings" on public.ingredient_findings
  for update to authenticated
  using (household_id = (select private.my_household_id()))
  with check (household_id = (select private.my_household_id()));

-- members only decide: the routine writes findings through submit_ingredient_findings
revoke all on public.ingredient_findings from anon, authenticated;
grant select on public.ingredient_findings to authenticated;
grant update (status, decided_by, decided_at) on public.ingredient_findings to authenticated;

create trigger ingredient_findings_broadcast_live_change
  after insert or update or delete on public.ingredient_findings
  for each row execute function private.broadcast_live_change();

-- The household a review key belongs to; a wrong key is refused.
create function private.review_household(p_key text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_household uuid;
begin
  select k.household_id into v_household
  from public.review_keys k
  where k.key_hash = sha256(convert_to(coalesce(p_key, ''), 'UTF8'));
  if v_household is null then
    raise exception 'invalid review key' using errcode = '28000';
  end if;
  return v_household;
end;
$$;

revoke all on function private.review_household(text) from public;

-- What the routine reviews: the household's ingredients and categories, and its earlier findings
-- (open and decided), so it doesn't repeat one.
create function public.review_ingredients(p_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_household uuid := private.review_household(p_key);
begin
  return jsonb_build_object(
    'ingredients', coalesce((
      select jsonb_agg(
        to_jsonb(i) - 'household_id' - 'legacy_id' - 'created_by' - 'values_ok'
        order by i.name
      )
      from public.ingredients i
      where i.household_id = v_household
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.name)
      from public.categories c
      where c.household_id = v_household
    ), '[]'::jsonb),
    'findings', coalesce((
      select jsonb_agg(jsonb_build_object(
        'ingredient_id', f.ingredient_id,
        'kind', f.kind,
        'message', f.message,
        'suggestion', f.suggestion,
        'status', f.status
      ) order by f.created_at)
      from public.ingredient_findings f
      where f.household_id = v_household
    ), '[]'::jsonb)
  );
end;
$$;

-- Adds a run's findings; returns how many were new. Findings for another household's
-- ingredients, and repeats of an earlier finding (same ingredient, kind and suggestion, whatever
-- became of it), are skipped. At most 100 per call.
create function public.submit_ingredient_findings(p_key text, p_run_id text, p_findings jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household uuid := private.review_household(p_key);
  v_added integer;
begin
  if jsonb_typeof(p_findings) <> 'array' or jsonb_array_length(p_findings) > 100 then
    raise exception 'findings must be a list of at most 100' using errcode = '22023';
  end if;

  with given as (
    select distinct on (f.ingredient_id, f.kind, coalesce(f.suggestion, '{}'::jsonb))
      f.ingredient_id, f.kind, f.message, coalesce(f.suggestion, '{}'::jsonb) as suggestion
    from jsonb_to_recordset(p_findings)
      as f(ingredient_id uuid, kind public.finding_kind, message text, suggestion jsonb)
  ),
  added as (
    insert into public.ingredient_findings
      (household_id, ingredient_id, kind, message, suggestion, run_id)
    select v_household, g.ingredient_id, g.kind, g.message, g.suggestion, p_run_id
    from given g
    join public.ingredients i on i.id = g.ingredient_id and i.household_id = v_household
    where not exists (
      select 1 from public.ingredient_findings e
      where e.ingredient_id = g.ingredient_id
        and e.kind = g.kind
        and e.suggestion = g.suggestion
    )
    on conflict do nothing
    returning 1
  )
  select count(*) into v_added from added;
  return v_added;
end;
$$;

revoke all on function public.review_ingredients(text) from public;
revoke all on function public.submit_ingredient_findings(text, text, jsonb) from public;
grant execute on function public.review_ingredients(text) to anon, authenticated;
grant execute on function public.submit_ingredient_findings(text, text, jsonb) to anon, authenticated;
