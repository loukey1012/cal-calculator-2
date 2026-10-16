-- "Values are correct" is replaced by the weekly ingredient review: ignoring a finding there keeps
-- it from coming back. The app no longer reads or writes this column.
alter table public.ingredients drop column values_ok;
