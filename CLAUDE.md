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

**Current work:** `docs/plan-2026-10-20.md` has the build plan for items 32–44 (the user's list of
2026-10-20): every decision, the approach per item and a status table. Read it before working on
any of them; keep its status table and the README checkboxes current. Batch A (32–37, 43) is
built (2026-10-20, user tests it); next is batch B: 38 (categories, starts with a draft tree for
the user to review) and 39 (merge duplicates).

**State (2026-10-20, evening):** items 1–31 are built; their build plan
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
