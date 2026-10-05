-- Broad categories ("groups") that hold the household's categories, e.g. Fresh › Meat & Fish.
-- Households create, rename and delete their own; a category without a group shows as "Other".

create table public.category_groups (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  created_at timestamptz not null default now(),
  unique (id, household_id)
);

create unique index category_groups_household_name_key
  on public.category_groups (household_id, lower(name));

alter table public.category_groups enable row level security;

create policy "household manages category groups" on public.category_groups
  for all to authenticated
  using (household_id = (select private.my_household_id()))
  with check (household_id = (select private.my_household_id()));

-- the group must belong to the same household; deleting a group leaves its categories ungrouped
alter table public.categories
  add column group_id uuid,
  add constraint categories_group_fkey foreign key (group_id, household_id)
    references public.category_groups (id, household_id) on delete set null (group_id);

create index categories_group_id_idx on public.categories (group_id);

-- ─── one-time: group the categories of the household imported from the old app ─────────────

create temporary table imported_households on commit drop as
  select distinct household_id from public.ingredients where legacy_id is not null;

update public.categories set name = 'McDonald''s'
  where name = 'Mci' and household_id in (select household_id from imported_households);
update public.categories set name = 'Ready Meals'
  where name = 'Meals' and household_id in (select household_id from imported_households);

insert into public.category_groups (household_id, name)
  select h.household_id, g.name
  from imported_households h
  cross join (values
    ('Bread & Carbs'), ('Dairy & Spreads'), ('Fresh'),
    ('Cooking'), ('Meals'), ('Snacks & Drinks')
  ) as g (name)
  on conflict do nothing;

update public.categories c
  set group_id = g.id
  from (values
    ('Bread', 'Bread & Carbs'), ('Carbs', 'Bread & Carbs'),
    ('Dairy', 'Dairy & Spreads'), ('Spreads', 'Dairy & Spreads'),
    ('Meat & Fish', 'Fresh'), ('Veggies & Fruit', 'Fresh'),
    ('Ingredients', 'Cooking'), ('Sauces', 'Cooking'),
    ('McDonald''s', 'Meals'), ('Ready Meals', 'Meals'),
    ('Snacks', 'Snacks & Drinks'), ('Drinks', 'Snacks & Drinks')
  ) as m (category, grp)
  join public.category_groups g on g.name = m.grp
  where c.name = m.category
    and g.household_id = c.household_id
    and c.household_id in (select household_id from imported_households);
