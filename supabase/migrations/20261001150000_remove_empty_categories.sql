-- Categories only exist while at least one ingredient uses them.

-- Runs with the caller's rights: RLS already lets household members delete their categories.
create function private.delete_empty_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.category_id is not null
     and (tg_op = 'DELETE' or new.category_id is distinct from old.category_id)
     and not exists (select 1 from public.ingredients where category_id = old.category_id) then
    delete from public.categories where id = old.category_id;
  end if;
  return null;
end;
$$;

revoke all on function private.delete_empty_category() from public;

create trigger ingredients_delete_empty_category
  after delete or update of category_id on public.ingredients
  for each row execute function private.delete_empty_category();

-- one-time cleanup of categories that are already empty
delete from public.categories c
where not exists (select 1 from public.ingredients i where i.category_id = c.id);
