# CALculator (cal-calculator-2)

A nutrition-tracking PWA for a two-person household (the user and their partner), used as a
home-screen app on an iPhone. Stack, architecture, data model, commands and deployment are in
`README.md`.

**Every commit adds a patch-notes entry** (Settings › tap the version line), in the same commit:
date and hour (local time) and what changed in plain, neutral words. The list lives in
`src/features/patchNotes/patchNotes.ts`.

**How we work (user's rules):** plan with the user first (`/ecc:plan`), then build 2–3 items,
push, and stop with a short summary for the user to test on the iPhone. Docs-only changes are
never committed alone: they go with the next functional commit. Keep README.md current in the
same commit as any feature, setup or architecture change. Production: migrations with
`bash scripts/db-push-prod.sh`, Edge Functions with `bash scripts/deploy-functions.sh prod` (both
allowed), always proven on dev first; never push app code that needs a migration that isn't on
production yet. After a push, watch CI with a background `gh run watch`; a red journey run is
rerun once first (load flakes happen), then investigated.
Data the app keeps on the phone (TanStack Query persistence) survives updates: when the shape of
a cached query changes, give its query key a new version (like `RECIPES_SHAPE` in
`src/features/recipes/hooks.ts`), so an old copy is ignored instead of crashing the new version.
Don't bump `CACHE_BUSTER` for that: it would also drop changes still waiting to be sent.

**State (2026-10-25):** items 1–47 are all built and confirmed; their plan
(`docs/plan-2026-10-20.md`) was removed at the user's request, the decisions live in README.md
and the code. Latest: a unit name with an amount in it ("1 Packung") is counted with a ×
("1 × 1 Packung", `amountSuffix` in `nutrition/unitNames.ts`); user tests it. What to know:

- Meal pages: addresses in `src/features/meals/mealPages.ts` (`/today/meal-<meal>-<date>-<person>`,
  `/history/<date>/meal-…`, Add food at `…/food`, Add from recipe at `…/recipes`); every tab is a
  page stack (`roots` in `app/TabShell.tsx`); the picked person travels in navigation state
  (`app/stackNavigate.ts`). Old `/cook` links (still sent by the notifications) are redirected in
  `addFood/legacyCookLink.ts`. Kept on purpose from the Cook days: the `cook_drafts` table and
  the phone's `cook-draft:` storage key (renaming them would lose waiting dishes).
- Edit dish is `DishComposer` in compact mode (`dishes/CompactDish.tsx`); Move to… is
  `meals/moveMeal.ts` (a dish moves by giving its portion a new eater, through `save_dish`).
- The amount step's values table: `ingredients/referenceValues.ts` (+ `ReferenceValues.tsx`,
  `useReferenceTable.ts`); tests rendering a meal page mock `goals/goalsApi`.
- Clear buttons: `components/ios/clearable.ts`; automatic ones are named just "Clear" (a
  "Clear <label>" name would also match the field's label in label queries).
- Back swipe and tab swipe ignore the bottom 44 px (`stackMotion.startsAtBottomEdge`), so the
  iOS home-indicator swipe doesn't close a page.
- `pnpm knip` (`knip.json`, also in CI) finds unused files, exports and dependencies.
- Journeys locally: build against dev (`VITE_SUPABASE_URL=$SUPABASE_TEST_URL
VITE_SUPABASE_ANON_KEY=$SUPABASE_TEST_ANON_KEY`, README); without them the build talks to prod
  and every login fails. Pushing a migration to dev with `npx supabase db push --linked` may need
  the user's OK in auto mode.

**Earlier (2026-10-20):** items 1–31 are built; their build plan
(`docs/plan-2026-10-15.md`) was removed at the user's request, its decisions live in README.md
and the code. Being tried by the user over the next days, ask how it went:

- **Recipes with choices** (Cook › Recipes, Swap ingredient, recipes that learn on Save meal).
- **Notifications:** the test notification works on the iPhone; the timed ones (reminders, day
  summary, partner changes, unsaved dish, weekly review) are being watched. If one doesn't come:
  `push_sent` / `push_subscriptions.last_success_at` on prod, the `push-tick` logs in the
  Supabase dashboard, `cron.job_run_details` and `net._http_response` (`supabase db query
--linked --project-ref <ref>`). Known noise: editing only my own amount in a shared dish
  re-logs both portions, so the partner gets "changed your meals".
- **Reading nutrition labels:** if a package fails, get the recognised text (a dev-server debug
  script importing `/src/features/label/*.ts` via Vite) or a description of the photo, add it as
  a `labelParser.test.ts` / `tableRegion.test.ts` case first, then fix. A lost decimal comma
  ("9,8 g" → "98 g") can't be told; the value warnings usually flag it.
- **Weekly review routine:** "CALculator weekly review" (`trig_01VXELkADLv2a7QDTytUPWtD`),
  Sundays 08:00 UTC; it reads `scripts/review/ROUTINE.md` from `main`.
- **Ideas, not planned:** meal photos (discuss with the user first).
