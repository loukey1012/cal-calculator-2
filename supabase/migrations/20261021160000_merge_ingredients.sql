-- Merging duplicates (item 39): a duplicate finding names the other ingredient in its suggestion
-- ({"duplicate_of": "<id>"}), and merge_ingredients folds one ingredient into the other.

-- one-off: the open duplicate findings written before named the other one only in the message,
-- as "Name" (Brand)
update public.review_findings f
  set suggestion = jsonb_build_object('duplicate_of', o.id)
  from public.ingredients o
  where f.kind = 'duplicate'
    and f.status = 'open'
    and f.suggestion = '{}'::jsonb
    and o.household_id = f.household_id
    and o.id <> f.ingredient_id
    and f.message like '%"' || o.name || '"' || coalesce(' (' || o.brand || ')', '') || '%';

-- Keeps p_keep with the fields of p_patch taken over (e.g. values of the other one), moves every
-- meal item, dish line and recipe line of p_drop to it, then deletes p_drop. Logged food keeps
-- its snapshot values. Marks p_finding applied (a finding about p_drop goes with it).
create function public.merge_ingredients(
  p_keep uuid,
  p_drop uuid,
  p_patch jsonb,
  p_finding uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_fields constant text[] := array[
    'name', 'brand', 'category_id', 'note', 'barcode', 'measure', 'kcal_estimated',
    'unit_label', 'unit_weight_g',
    'kcal_100', 'protein_100', 'carbs_100', 'sugar_100', 'fat_100', 'sat_fat_100', 'fiber_100',
    'salt_100',
    'kcal_unit', 'protein_unit', 'carbs_unit', 'sugar_unit', 'fat_unit', 'sat_fat_unit',
    'fiber_unit', 'salt_unit'
  ];
  v_household uuid := private.my_household_id();
  v_keep public.ingredients;
  v_drop public.ingredients;
  v_patch jsonb;
  v_row public.ingredients;
begin
  if auth.uid() is null or v_household is null then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_keep = p_drop then
    raise exception 'Pick two different ingredients' using errcode = '22023';
  end if;
  if jsonb_typeof(coalesce(p_patch, '{}'::jsonb)) <> 'object' then
    raise exception 'The values to take over must be an object' using errcode = '22023';
  end if;

  select * into v_keep from public.ingredients
    where id = p_keep and household_id = v_household for update;
  select * into v_drop from public.ingredients
    where id = p_drop and household_id = v_household for update;
  if v_keep.id is null or v_drop.id is null then
    raise exception 'Not allowed to merge these ingredients' using errcode = '42501';
  end if;

  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_patch
    from jsonb_each(coalesce(p_patch, '{}'::jsonb))
    where key = any (c_fields);
  -- barcodes are unique per household: the dropped one gives its own up first, and passes it on
  -- when the kept one has none
  if v_keep.barcode is null and v_drop.barcode is not null and not v_patch ? 'barcode' then
    v_patch := v_patch || jsonb_build_object('barcode', v_drop.barcode);
  end if;
  update public.ingredients set barcode = null where id = p_drop;

  v_row := jsonb_populate_record(v_keep, v_patch);
  update public.ingredients set
    name = v_row.name, brand = v_row.brand, category_id = v_row.category_id, note = v_row.note,
    barcode = v_row.barcode, measure = v_row.measure, kcal_estimated = v_row.kcal_estimated,
    unit_label = v_row.unit_label, unit_weight_g = v_row.unit_weight_g,
    kcal_100 = v_row.kcal_100, protein_100 = v_row.protein_100, carbs_100 = v_row.carbs_100,
    sugar_100 = v_row.sugar_100, fat_100 = v_row.fat_100, sat_fat_100 = v_row.sat_fat_100,
    fiber_100 = v_row.fiber_100, salt_100 = v_row.salt_100,
    kcal_unit = v_row.kcal_unit, protein_unit = v_row.protein_unit,
    carbs_unit = v_row.carbs_unit, sugar_unit = v_row.sugar_unit, fat_unit = v_row.fat_unit,
    sat_fat_unit = v_row.sat_fat_unit, fiber_unit = v_row.fiber_unit, salt_unit = v_row.salt_unit
  where id = p_keep;

  update public.meal_items set ingredient_id = p_keep where ingredient_id = p_drop;
  update public.dish_lines set ingredient_id = p_keep where ingredient_id = p_drop;

  -- a recipe line offering both as choices keeps one: the one picked last time
  delete from public.recipe_lines d
    using public.recipe_lines k
    where d.ingredient_id = p_drop and k.ingredient_id = p_keep and k.slot_id = d.slot_id
      and not d.picked;
  delete from public.recipe_lines k
    using public.recipe_lines d
    where k.ingredient_id = p_keep and d.ingredient_id = p_drop and k.slot_id = d.slot_id;
  update public.recipe_lines set ingredient_id = p_keep where ingredient_id = p_drop;
  -- a changed recipe tells the partner's phone (its trigger is on the recipe row)
  update public.recipes set updated_at = now()
    where id in (select recipe_id from public.recipe_lines where ingredient_id = p_keep);

  if p_finding is not null then
    update public.review_findings
      set status = 'applied', decided_by = auth.uid(), decided_at = now()
      where id = p_finding and household_id = v_household;
  end if;

  delete from public.ingredients where id = p_drop;
end;
$$;

revoke execute on function public.merge_ingredients(uuid, uuid, jsonb, uuid) from public, anon;
grant execute on function public.merge_ingredients(uuid, uuid, jsonb, uuid) to authenticated;
