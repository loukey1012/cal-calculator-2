-- Partner changes (item 71): besides meals, a partner's flags (cheat day, alcohol day, cheat meal,
-- gym) and notes (day and meal notes) on my days are told too. A row is one change to one thing:
-- kind meal / flag / note, subject says which. Flags keep the value from before the first change
-- not told yet (before), so a change that was undone can be dropped when the tick sends.
-- Sex days have no trigger on purpose: they are about both people and are never notified.

-- ─── partner_changes ────────────────────────────────────────────────────────

alter table public.partner_changes
  add column kind text not null default 'meal' check (kind in ('meal', 'flag', 'note')),
  add column subject text,
  add column before text;

-- waiting rows are migrated, never deleted
update public.partner_changes set subject = meal_type::text;

alter table public.partner_changes
  alter column subject set not null,
  add constraint partner_changes_subject_check check (char_length(subject) between 1 and 30);

alter table public.partner_changes drop constraint partner_changes_pkey;
alter table public.partner_changes drop column meal_type;
alter table public.partner_changes
  add primary key (user_id, actor_id, date, kind, subject);

-- ─── noting a change ────────────────────────────────────────────────────────

create function private.note_partner_change(
  p_owner uuid,
  p_date date,
  p_kind text,
  p_subject text,
  p_before text default null
)
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
  -- on a repeat only changed_at moves: before stays the value from the first change
  insert into public.partner_changes (user_id, actor_id, date, kind, subject, before)
  values (p_owner, v_actor, p_date, p_kind, p_subject, p_before)
  on conflict (user_id, actor_id, date, kind, subject) do update set changed_at = now();
end;
$$;

revoke all on function private.note_partner_change(uuid, date, text, text, text) from public;

-- ─── triggers ───────────────────────────────────────────────────────────────
-- Every trigger function only logs a failure: a notification must never make a save fail.

-- food in a meal (the meal itself is looked up; a meal deleted with its items is noted by the
-- meals trigger)
create or replace function private.queue_partner_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_meal public.meals;
begin
  select * into v_meal from public.meals where id = (v_row ->> 'meal_id')::uuid;
  if found then
    perform private.note_partner_change(v_meal.user_id, v_meal.date, 'meal', v_meal.meal_type::text);
  end if;
  return null;
exception
  when others then
    raise warning 'partner change not noted for %: %', tg_table_name, sqlerrm;
    return null;
end;
$$;

-- a whole meal deleted
create function private.queue_partner_meal_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.note_partner_change(old.user_id, old.date, 'meal', old.meal_type::text);
  return null;
exception
  when others then
    raise warning 'partner change not noted for meals: %', sqlerrm;
    return null;
end;
$$;

-- a cheat meal marked or taken back, a meal note changed (only real changes fire this)
create function private.queue_partner_meal_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.cheat_meal is distinct from new.cheat_meal then
    perform private.note_partner_change(
      new.user_id, new.date, 'flag', 'cheat_meal:' || new.meal_type::text,
      case when old.cheat_meal then 'on' else 'off' end
    );
  end if;
  if old.note is distinct from new.note then
    perform private.note_partner_change(new.user_id, new.date, 'note', new.meal_type::text);
  end if;
  return null;
exception
  when others then
    raise warning 'partner change not noted for meals: %', sqlerrm;
    return null;
end;
$$;

-- a cheat day or alcohol day set, switched or taken back
create function private.queue_partner_cheat_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.note_partner_change(
    coalesce(new.user_id, old.user_id), coalesce(new.date, old.date), 'flag', 'day_mark',
    case when tg_op = 'INSERT' then 'none' else old.kind end
  );
  return null;
exception
  when others then
    raise warning 'partner change not noted for cheat_days: %', sqlerrm;
    return null;
end;
$$;

-- a gym day set or taken back
create function private.queue_partner_gym_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.note_partner_change(
    coalesce(new.user_id, old.user_id), coalesce(new.date, old.date), 'flag', 'gym',
    case when tg_op = 'INSERT' then 'off' else 'on' end
  );
  return null;
exception
  when others then
    raise warning 'partner change not noted for gym_days: %', sqlerrm;
    return null;
end;
$$;

-- a day note written, changed or removed
create function private.queue_partner_day_note()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.note_partner_change(
    coalesce(new.user_id, old.user_id), coalesce(new.date, old.date), 'note', 'day'
  );
  return null;
exception
  when others then
    raise warning 'partner change not noted for day_notes: %', sqlerrm;
    return null;
end;
$$;

revoke all on function
  private.queue_partner_change(),
  private.queue_partner_meal_delete(),
  private.queue_partner_meal_update(),
  private.queue_partner_cheat_day(),
  private.queue_partner_gym_day(),
  private.queue_partner_day_note()
from public;

-- no insert trigger on meals: the empty meal made for a note or cheat meal is not a change
drop trigger meals_queue_partner_change on public.meals;

create trigger meals_queue_partner_delete
  after delete on public.meals
  for each row execute function private.queue_partner_meal_delete();
create trigger meals_queue_partner_update
  after update of cheat_meal, note on public.meals
  for each row
  when (old.cheat_meal is distinct from new.cheat_meal or old.note is distinct from new.note)
  execute function private.queue_partner_meal_update();

create trigger cheat_days_queue_partner_change
  after insert or delete on public.cheat_days
  for each row execute function private.queue_partner_cheat_day();
create trigger cheat_days_queue_partner_change_kind
  after update on public.cheat_days
  for each row when (old.kind is distinct from new.kind)
  execute function private.queue_partner_cheat_day();

create trigger gym_days_queue_partner_change
  after insert or delete on public.gym_days
  for each row execute function private.queue_partner_gym_day();

create trigger day_notes_queue_partner_change
  after insert or delete on public.day_notes
  for each row execute function private.queue_partner_day_note();
create trigger day_notes_queue_partner_change_text
  after update on public.day_notes
  for each row when (old.note is distinct from new.note)
  execute function private.queue_partner_day_note();

-- sex_days: deliberately no trigger (see the top)

-- nothing uses the old three-argument version any more
drop function private.note_partner_change(uuid, date, public.meal_type);

