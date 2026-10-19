# CALculator (cal-calculator-2)

A nutrition-tracking PWA for a two-person household (the user and their partner), used as a
home-screen app on an iPhone. Stack, architecture, data model, commands and deployment are in
`README.md`.

**Current work:** `docs/plan-2026-10-15.md` has the approved build plan for README items 1–23
("Fixes and improvements (planned)"): every decision the user made, the technical approach per
item, the working rules, and a status table. Read it before continuing any of those items, and
keep its status table and the README checkboxes up to date as items ship.

**Every commit adds a patch-notes entry** (Settings › tap the version line), in the same commit:
date and hour (local time) and what changed in plain, neutral words. The list lives in
`src/features/patchNotes/patchNotes.ts` once item 21 is built.

**Next up (as of 2026-10-19):** 13 and 30 are confirmed; 31 (every past week in Trends) is built
and waits for the user's test. Then 9 · 14 · 10 (12 was dropped). Read "Handoff (updated 2026-10-19)" at the end of the plan
first. Build 2–3 items, push, then stop with a short summary for the user to test. Docs-only
changes are never committed alone: they go with the next functional commit.
