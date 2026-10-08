-- An ingredient can carry the barcode of its package (EAN-8, UPC-A stored as EAN-13, EAN-13,
-- ITF-14), so scanning it finds the ingredient again. One ingredient per barcode and household.

alter table public.ingredients
  add column barcode text constraint ingredients_barcode_digits check (barcode ~ '^[0-9]{8,14}$'),
  add constraint ingredients_household_barcode_key unique (household_id, barcode);
