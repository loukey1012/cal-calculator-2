# CALculator (cal-calculator-2)

A nutrition-tracking PWA for a two-person household (the user and their partner), used as a
home-screen app on an iPhone. Stack, architecture, data model, commands and deployment are in
`README.md`.

**Every commit adds a patch-notes entry** (Settings › tap the version line), in the same commit:
date and hour (local time) and what changed in plain, neutral words. The list lives in
`src/features/patchNotes/patchNotes.ts`.

**How we work (user's rules):** plan with the user first (`/ecc:plan`), then build 2–3 items,
push, and stop with a short summary for the user to test on the iPhone. **Use ECC fully, without
being asked:** every ECC agent or skill that fits the step is used (`ecc:planner` for plans,
`ecc:tdd-guide` for features and bugs, `ecc:typescript-reviewer` / `ecc:react-reviewer` /
`ecc:code-reviewer` after writing code, `ecc:database-reviewer` for migrations and RLS,
`ecc:security-reviewer` for auth, RLS and Edge Functions, `ecc:e2e-runner` for journeys,
`ecc:build-error-resolver` when the build breaks, `ecc:silent-failure-hunter` for error paths,
`ecc:doc-updater` for README), independent ones in parallel. Docs-only changes are
never committed alone: they go with the next functional commit. Keep README.md current in the
same commit as any feature, setup or architecture change. Production: migrations with
`bash scripts/db-push-prod.sh`, Edge Functions with `bash scripts/deploy-functions.sh prod` (both
allowed), always proven on dev first; never push app code that needs a migration that isn't on
production yet. After a push, watch CI with a background `gh run watch`; a red journey run is
rerun once first (load flakes happen), then investigated.
Data the app keeps on the phone (TanStack Query persistence) survives updates: when the shape of
a cached query changes, give its query key a new version (like `NOTES_SHAPE` in
`src/features/history/hooks.ts`), so an old copy is ignored instead of crashing the new version.
Don't bump `CACHE_BUSTER` for that: it would also drop changes still waiting to be sent.
A query whose data is parsed with defaults (e.g. notification settings) re-parses in `select`, so a new
field missing from the phone's old copy gets its default (a missing `weekly` crashed Settings ›
Notifications on 2026-10-28). A crash while rendering shows `CrashBoundary` (Reload), never a black screen.

**State (2026-10-29):** items 1–47 built and confirmed. Items 48–56 (README ›
Coming next) are planned in `docs/plan-2026-10-27.md` (batches A–G, each with its decisions and
status). **Done and pushed, CI green:** A (54, 52, 51), B (50, 49), C (55, migration on prod), the
Save button in the day options, D (53 part 1: calendar symbols, key, swipe, hold, status pill).
The user confirmed A–D and the Save button on the iPhone (the calendar's readability gets changes
later, when the user brings them). E1 shipped; History then reorganised
into Calendar | Notes | Trends (user's option 2, confirmed; a week-strip calendar maybe later), the
month summary removed (user), E2 year overview built. F1 built (calories burned, migration on prod;
week page, saved figure in the calendar). F2 (weekly notification) built,
push-tick deployed to prod. G1 (48, day summary contents: parts with switches and drag handles,
live preview; `components/ios/ReorderList.tsx`) built 2026-10-29 and confirmed; G2 (weekly
summary contents, shared `notifications/SummaryContentsPage.tsx`) built 2026-10-29, awaits the
iPhone test. `goal_history.kcal_burned` dropped (migration `20261029120000`, dev and prod), so
the 2026-10-27 plan is complete. Items 57–68 (README › Coming next) are planned in
`docs/plan-2026-10-29.md` (batches H → I → L → J → K → J2, decisions per item). H1 (60 Custom goal
colors, 61 Spot brightness, 57 fork-and-knife cheat meal mark) confirmed; H2 (62 categories
without the table, 63 Review stays open) built. I (67 taller calendar days + `WeekBar`, 68 notes as
full-screen pages: `notes/*`, per-page `app/leaveGuard.ts`, drafts in sessionStorage, tab bar hidden
on note pages) confirmed; then the History ⋯ menu lost This week / Year overview, notes got Clear, and L1 (69:
recipes removed from the app; tables stay until L2) built, awaits the iPhone test. **Next:** L2
(migration dropping the recipe tables, once both phones run L1), then J. Sketch of F: https://claude.ai/artifact/KJ5V6j5PCBaN35MXmATmmE. Sketch of D:
https://claude.ai/artifact/Sp4cvXiKk3us9kXNUTrT6g. Working rhythm that worked: `ecc:tdd-guide`
agents build (in parallel only on separate files), then `ecc:typescript-reviewer` +
`ecc:react-reviewer` (+ `ecc:database-reviewer`/`ecc:security-reviewer` for SQL) +
`ecc:e2e-runner` in parallel, one agent fixes the findings, then the final checks and journeys
run locally before the push. Day counting (`isLeftOut`: cheat day, alcohol day, cheat meal) lives
in `supabase/functions/_shared/dayCounting.ts`, shared by the app and push-tick. What to know:

- Meal pages: addresses in `src/features/meals/mealPages.ts` (`/today/meal-<meal>-<date>-<person>`,
  `/history/<date>/meal-…`, Add food at `…/food`, a meal's note at `…/note`); every tab is a
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

**Where to look when something breaks:**

- **Notifications:** if one doesn't come: `push_sent` / `push_subscriptions.last_success_at` on
  prod, the `push-tick` logs in the Supabase dashboard, `cron.job_run_details` and
  `net._http_response` (`supabase db query --linked --project-ref <ref>`). Known noise: editing
  only my own amount in a shared dish re-logs both portions, so the partner gets "changed your
  meals".
- **Reading nutrition labels:** if a package fails, get the recognised text (a dev-server debug
  script importing `/src/features/label/*.ts` via Vite) or a description of the photo, add it as
  a `labelParser.test.ts` / `tableRegion.test.ts` case first, then fix. A lost decimal comma
  ("9,8 g" → "98 g") can't be told; the value warnings usually flag it.
- **Weekly review routine:** "CALculator weekly review" (`trig_01VXELkADLv2a7QDTytUPWtD`),
  Sundays 08:00 UTC; it reads `scripts/review/ROUTINE.md` from `main`.
- **Ideas, not planned:** meal photos (discuss with the user first).
