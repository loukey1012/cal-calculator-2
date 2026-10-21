-- Two levels only: every category sits in a broad category and every ingredient has a category.
-- Deleting a broad category or category that still holds something is refused.

-- anything still loose goes into "Other" (none on production once the new tree is applied)
insert into public.category_groups (household_id, name)
  select distinct household_id, 'Other' from public.categories where group_id is null
  union
  select distinct household_id, 'Other' from public.ingredients where category_id is null
  on conflict do nothing;

insert into public.categories (household_id, name, group_id)
  select distinct i.household_id, 'Other', g.id
  from public.ingredients i
  join public.category_groups g on g.household_id = i.household_id and lower(g.name) = 'other'
  where i.category_id is null
  on conflict do nothing;

update public.categories c set group_id = g.id
  from public.category_groups g
  where c.group_id is null and g.household_id = c.household_id and lower(g.name) = 'other';

update public.ingredients i set category_id = c.id
  from public.categories c
  where i.category_id is null and c.household_id = i.household_id and lower(c.name) = 'other';

alter table public.categories
  alter column group_id set not null,
  drop constraint categories_group_fkey,
  add constraint categories_group_fkey foreign key (group_id, household_id)
    references public.category_groups (id, household_id) on delete restrict;

alter table public.ingredients
  alter column category_id set not null,
  drop constraint ingredients_category_fkey,
  add constraint ingredients_category_fkey foreign key (category_id, household_id)
    references public.categories (id, household_id) on delete restrict;
