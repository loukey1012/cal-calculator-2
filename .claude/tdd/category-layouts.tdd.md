# TDD evidence: Ingredients category layouts and broad categories

**Source plan:** the `/ecc:plan` conversation of 2026-10-05 (Phases 1, 1b, 2, 3, 4); journeys derived there.

## User journeys

1. As a household member, I pick how the category chips look: one scrolling line, all on screen, or grouped.
2. As a household member, I tap a broad category (e.g. Fresh) to filter by it and see its categories, then narrow to one.
3. As a household member, I create a category inside a broad category while adding an ingredient.
4. As a household member, I manage broad categories and categories in Settings: add, rename, move, delete.
5. On a Settings sub-page, a swipe to the right goes back to Settings.

## Task report

| Phase                          | Commits                             | RED evidence                                                                             | GREEN evidence                                                                       |
| ------------------------------ | ----------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1 layout setting (line / wrap) | `493371e`                           | 5 failing tests before the setting existed (`pnpm vitest run src/features/appearance …`) | `pnpm test` 421 passed; CI green                                                     |
| 1b preview + swipe back        | `dd77e3e`                           | 3 failing (`TabShell.swipe`, preview)                                                    | 429 passed; CI green                                                                 |
| 2 broad categories data        | `74896af`                           | `pnpm test:db`: 5 failed (no `category_groups`)                                          | `pnpm test:db` 45 passed on dev; 433 unit; ingredients journey (dev) passed          |
| 3 grouped chips                | `9661633` (RED) → `46a9cb5` (GREEN) | 13 failed: missing `chipGroups`, `GroupedCategoryChips`, `grouped` option                | 452 passed                                                                           |
| 4 Settings › Categories        | `531fb81` (RED) → `fcfcef5` (GREEN) | modules missing; Settings row test failed                                                | 482 passed; journeys categories/ingredients/appearance passed against dev (Chromium) |

## Test specification

| #   | What is guaranteed                                                                                                                       | Test                                                           | Type                 | Result |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------- | ------ |
| 1   | Unknown/absent `categoryLayout` falls back to `line`; `wrap`/`grouped` are kept                                                          | `appearance.test.ts`                                           | unit                 | PASS   |
| 2   | Filter by broad category includes all its categories; "Other" = ungrouped + uncategorized                                                | `listing.test.ts`                                              | unit                 | PASS   |
| 3   | `chipGroups` sorts by name, hides empty broad categories, puts Other last and only when needed                                           | `listing.test.ts`                                              | unit                 | PASS   |
| 4   | Grouped chips: open/close panel, one panel at a time, All resets, no sideways scroll                                                     | `GroupedCategoryChips.test.tsx`                                | component            | PASS   |
| 5   | Ingredients page filters by broad category and by a category inside it                                                                   | `IngredientsPage.test.tsx`                                     | component            | PASS   |
| 6   | Swipe right on a Settings sub-page goes back; History day still switches tabs                                                            | `TabShell.swipe.test.tsx`                                      | component            | PASS   |
| 7   | Broad categories: unique per household (any case), 1–40 chars, RLS, same-household link, delete keeps categories                         | `supabase/tests/schema.test.ts`                                | integration (dev DB) | PASS   |
| 8   | New category in the ingredient form is created inside the chosen broad category                                                          | `IngredientSheet.test.tsx`, `e2e/journeys/ingredients.spec.ts` | component + E2E      | PASS   |
| 9   | Settings › Categories: add/rename/delete broad categories, add/move/delete categories, confirmations, validation, taken name, load error | `CategoriesPage.test.tsx`, `e2e/journeys/categories.spec.ts`   | component + E2E      | PASS   |

## Coverage and known gaps

- `pnpm coverage`: All files 98.49 % statements, 93.38 % branches, 98.38 % functions, 99.06 % lines.
- WebKit could not run locally (missing system libraries); journeys ran in Chromium locally and run in WebKit on CI.
- The iOS-only paint bug fix (`stable-paint-layer`) can't be reproduced by any test browser; the user confirmed it on the device.
- The production migration (`20261005120000_category_groups.sql`) was dry-run on dev in a rolled-back transaction with the 12 production category names; applying it to production was blocked by the permission check and is left to the user.
