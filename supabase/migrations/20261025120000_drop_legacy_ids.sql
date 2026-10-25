-- The Firebase import (2026-10-05) is done and its scripts are gone: nothing reads its document
-- ids any more. Dropping the column also drops its unique (household_id, legacy_id) constraint.
-- review_ingredients still removes a 'legacy_id' key from its JSON; that is now simply a no-op.
alter table public.ingredients drop column legacy_id;
