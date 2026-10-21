/** Broad category → category → the products in it, each as "Name (Brand)" or "Name". */
export type CategoryTree = Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>

// an ingredient as written in the tree (spaces around name and brand don't count)
const LABEL = `btrim(i.name) || coalesce(' (' || nullif(btrim(i.brand), '') || ')', '')`

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * One SQL block that moves every ingredient of the household into its place in the tree:
 * creates the missing broad categories and categories (an existing category of the same name is
 * moved instead), then removes the ones the tree no longer has. It changes nothing when a
 * product of the tree isn't an ingredient, or an ingredient isn't in the tree.
 */
export function treeSql(tree: CategoryTree, householdId: string): string {
  if (!UUID.test(householdId)) throw new Error(`Not a household id: ${householdId}`)
  const json = JSON.stringify(tree).replaceAll("'", "''")
  return `do $tree$
declare
  h uuid := '${householdId}';
  tree jsonb := '${json}';
  problem text;
begin
  if not exists (select 1 from public.households where id = h) then
    raise exception 'No household %', h;
  end if;

  create temporary table tree_rows on commit drop as
    select b.key as broad, s.key as specific, l.value #>> '{}' as label
    from jsonb_each(tree) b, jsonb_each(b.value) s, jsonb_array_elements(s.value) l;

  select string_agg(distinct specific, ', ') into problem from tree_rows t
    where exists (
      select 1 from tree_rows o where lower(o.specific) = lower(t.specific) and o.broad <> t.broad
    );
  if problem is not null then raise exception 'In more than one broad category: %', problem; end if;

  select string_agg(label, ', ') into problem from tree_rows t
    where not exists (
      select 1 from public.ingredients i where i.household_id = h and ${LABEL} = t.label
    );
  if problem is not null then raise exception 'Not an ingredient: %', problem; end if;

  select string_agg(${LABEL}, ', ') into problem from public.ingredients i
    where i.household_id = h and not exists (select 1 from tree_rows t where t.label = ${LABEL});
  if problem is not null then raise exception 'Not in the tree: %', problem; end if;

  insert into public.category_groups (household_id, name)
    select distinct h, broad from tree_rows
    on conflict (household_id, lower(name)) do nothing;

  insert into public.categories (household_id, name, group_id)
    select distinct h, t.specific, g.id
    from tree_rows t
    join public.category_groups g on g.household_id = h and lower(g.name) = lower(t.broad)
    on conflict (household_id, lower(name))
      do update set name = excluded.name, group_id = excluded.group_id;

  -- a category left empty is removed by the ingredients_delete_empty_category trigger
  update public.ingredients i set category_id = c.id
    from tree_rows t
    join public.categories c on c.household_id = h and lower(c.name) = lower(t.specific)
    where i.household_id = h and ${LABEL} = t.label and i.category_id is distinct from c.id;

  delete from public.categories
    where household_id = h and lower(name) not in (select lower(specific) from tree_rows);
  delete from public.category_groups
    where household_id = h and lower(name) not in (select lower(broad) from tree_rows);
end
$tree$;
`
}
