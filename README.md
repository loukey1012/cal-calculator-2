# CALculator2

A household meal and nutrition tracker with a modern, card-based look that each person can customize. It runs as a Progressive Web App (PWA) installed on the iPhone home screen, is hosted on Vercel and stores its data in Supabase.

Built for a two-person household: both members log their own meals, can see and edit each other's days, and share one ingredient database.

**Live app:** https://cal-calculator-2.vercel.app

---

## Features

### Logging meals (Today tab)

- One **Breakfast, Lunch, Dinner and Snacks** per person and day.
- Add food from the shared **ingredient database** (with search) or as a **custom one-off item** that isn't saved to the database.
- Amounts in **grams or the ingredient's own unit** (e.g. "Riegel"). Grams per unit converts between the two. Type the amount or use − / +, with a **live preview** of calories and macros.
- Change an item's amount by tapping it, or remove it with **swipe to delete**.
- Every logged item keeps a **snapshot of its nutrition values**, so editing an ingredient later never changes past meals.
- **Day total** and per-meal totals. Unknown nutrients show as "–" instead of a misleading 0.
- "Today" moves on at midnight, and when the app comes back to the foreground on a later day.

### Daily goals and progress

- Per-person daily goal: **calories required**; protein, carbs and fat optional.
- A **progress card** on each day: a large calorie ring with the kcal left (or over) in the middle, and a bar per macro (**Ring + bars**, the default). Shows consumed / target and how much is left or over. Calories always show; each macro only if it has a target. Also available as a small ring per macro, all **bars**, or **compact** bars (Settings › Appearance).
- Goals have a history: a new goal applies **from today on**, and past days keep the goal they had.
- A "≥" marks totals that are only a lower bound (some logged items had no value for that nutrient).

### History

- **Month calendar** (Monday first): every logged day is marked green (within that day's calorie goal), red (over) or neutral (logged, no goal yet).
- Month summary: days logged, average calories and protein.
- **Tap any past day** to show its rings, totals and meals **right beneath the calendar**, and **edit it like today**, e.g. add a forgotten dinner. Tap another day to switch, or the same day again to close it. The selected day is kept in the address (`/history/YYYY-MM-DD`), so reopening the app keeps it. Also for your partner's days.

### Household

- Accounts with email and password. One person creates a **household**, the other joins with a **12-character invite code** (shareable through the iOS share sheet).
- A **person switch** on Today shows a household member's day, rings and meals. Members can log and edit meals for each other.

### Ingredient database (Ingredients tab)

- Shared per household, **grouped by category**, with **accent-insensitive search** (`kase` finds `Käse`) and category filter chips: one sideways-scrolling line, all on screen, or **grouped** into broad categories that open their categories when tapped (Settings › Appearance).
- Nutrition **per 100 g and/or per unit**: calories (whole numbers, rounded up), protein, carbs, sugar, fat, saturated fat, fiber, salt. Only calories are required.
- Unit name and grams per unit, brand, category (created on the fly, optionally inside a **broad category** such as Fresh › Meat & Fish), note.
- Categories are **deleted automatically** once no ingredient uses them.

### Works offline

- The last loaded data (days, ingredients, goals, profile) is **stored on the phone for 7 days**, so the app opens without a connection.
- **Meal changes made offline** still show immediately, are queued, and are sent in order when the connection returns, even after the app was closed. Every change is idempotent (items get their ID on the phone), so resending can never create duplicates. Network failures are retried until they succeed.
- A pill above the tab bar shows the state: _Offline_, _Offline · 2 changes pending_, _Saving 2 changes…_
- iOS doesn't run web apps in the background, so queued changes go out the next time the app is open with a connection.

### Look and feel

- Rounded cards on a soft background, the Manrope font, meals as a 2×2 grid of cards, avatars (initial on each person's accent color) in the person switch and member list. Bottom sheets (drag down to close), segmented controls, switches and swipe actions.
- **Floating tab bar** (Today · History · Ingredients · Settings): the active tab shows its label in an accent tint. **Swipe left and right** to switch tabs with an animated settle (on a page inside Settings, like Appearance, a swipe to the right goes back to Settings instead), and tap the active tab to scroll to the top. Pages and sheets scroll without a visible scroll indicator.
- Installable to the home screen (manifest, icons, safe areas, no zoom on input focus).

### Appearance (Settings › Appearance)

Everything here is saved **to your account**, never to the device: you get the same look on every phone or browser you log in on. Changes apply instantly, with a live preview at the top.

- **Theme:** System, Light or Dark.
- **Dark style:** **Soft** (deep grey, rounded) or **Bento** (near-black, Space Grotesk numbers, uppercase labels). Used whenever the app is dark, also with System at night.
- **Accent color:** 12 colors (buttons, the active tab, your avatar). Text in the accent color is darkened or lightened automatically so it stays readable, e.g. Lime on a light background.
- **Goal colors:** Vivid, Pastel, Accent shades or High contrast.
- **Progress style:** Rings, **Ring + bars** (default: a calorie ring, bars for the macros), Bars or Compact.
- **Category chips** (with a preview): **One line** (default, scrolls sideways), **All on screen** (slimmer chips wrapping into rows) or **Grouped** (broad categories such as Fresh; tapping one filters by it and opens its categories below) for the category filter on the Ingredients page.
- Your **name** shown to the household is under Settings › Account.

### Coming next

| Area      | Planned                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------- |
| Polish    | Real-device pass on your iPhone                                                                          |
| Rename    | App name **CALculator** (without the 2): title, manifest, login screen, README                           |
| Nicknames | Give household members your own display name (a per-viewer nickname, their account name stays unchanged) |

Ideas for later (not planned yet): barcode scanning, recent/favorite ingredients, copying meals or saving templates, trend charts, weight tracking, CSV export, push reminders, rotating the invite code, live updates when your partner edits a meal.

---

## Tech stack

| Area               | Choice                                                                             |
| ------------------ | ---------------------------------------------------------------------------------- |
| App                | React 19, TypeScript (strict), Vite 8                                              |
| Styling            | Tailwind CSS 4; theme colors as CSS variables per scheme (light, soft, bento)      |
| Fonts              | Manrope and Space Grotesk (Fontsource, bundled so they work offline)               |
| Data               | TanStack Query 5 (+ persistence to `localStorage`), supabase-js                    |
| Routing / gestures | React Router, Embla Carousel                                                       |
| Validation         | Zod                                                                                |
| PWA                | vite-plugin-pwa (Workbox precache, auto-update)                                    |
| Backend            | Supabase: Postgres, Auth, Row Level Security                                       |
| Hosting            | Vercel (deploys on push to `main`)                                                 |
| Tests              | Vitest + Testing Library, Supabase integration tests, Playwright (WebKit / iPhone) |
| Lint / format      | oxlint, Prettier                                                                   |

## Architecture

```
src/
  app/            tab shell, swipe navigation, current user, offline lifecycle, sync status
  components/ios/ UI building blocks (Sheet, ListRow, TabBar, SegmentedControl, Avatar, …)
  features/
    appearance/   per-account theme, dark style, accent, goal colors, progress style, category chips; Appearance page
    auth/         login, sign-up, session (clears cached data on sign-out / account change)
    household/    profile, household, invite codes, onboarding
    ingredients/  ingredient database: API, form parsing, listing, screens
    meals/        day model, meal sheet, offline-capable day changes
    goals/        goal history, goal form, progress card (rings / ring + bars / bars / compact)
    nutrition/    pure nutrition math: units, totals, goals, formatting
    today/ history/ settings/   tab pages
  lib/            supabase client, env validation, errors, persistence, dates, numbers
e2e/
  smoke.spec.ts   no-backend checks (shell loads, installable)
  journeys/       real user journeys against the dev project, throwaway users per test
supabase/
  migrations/     database schema, RLS policies, RPCs, views, triggers
  tests/          integration tests against the dev Supabase project
scripts/
  migrate-firebase/  one-off import of the old Firebase `foods` collection
```

### Data model (Supabase)

- `households`, `profiles` (one per auth user, created by a trigger; holds the name, accent color and `appearance` JSON)
- `goal_history` (goal valid from a date)
- `category_groups` (the household's broad categories), `categories` (optionally in a group; deleting a group leaves its categories ungrouped), `ingredients` (per-100 g and/or per-unit columns; at least one calorie value required)
- `meals` (unique per user, local date and meal type), `meal_items` (nutrition snapshot plus a basis multiplier)
- Views `meal_totals` and `daily_totals`. RPCs `create_household`, `join_household` and `ensure_meal`.

### Security

- **Row Level Security on every table.** Household members can read each other's data and edit each other's meals. Goals and profiles can only be changed by their owner. Other households and signed-out visitors see nothing.
- Joining a household only works through an invite code. Profiles can't be moved between households directly.
- The anon key in the app is public by design; RLS is the protection. The service-role key is only used in local scripts and CI (dev project), never in the app.
- Sign-ups should be **disabled in Supabase** once both accounts exist.

---

## Development

### Prerequisites

- Node 24 and pnpm 11
- [Supabase CLI](https://supabase.com/docs/guides/cli) (installed as a dev dependency, run with `pnpm exec supabase`)
- Two Supabase projects: **production** and a separate **dev/test** project
- Optional: Vercel CLI for deployments

### Environment files (all git-ignored)

| File                                    | Contents                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `.env.local`                            | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` of the project the app talks to                          |
| `.env.test.local`                       | `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY`, `SUPABASE_TEST_SERVICE_ROLE_KEY` (**dev project only**) |
| `.env.secrets.local`                    | `PROD_DB_PASSWORD`, `DEV_DB_PASSWORD` for `supabase link` / `db push`                                  |
| `secrets/firebase-service-account.json` | only for the Firebase import                                                                           |

See `.env.example` for the app variables.

### Commands

```bash
pnpm install
pnpm dev            # dev server
pnpm build          # typecheck + production build
pnpm preview        # serve the production build (with service worker)

pnpm test           # unit and component tests
pnpm coverage       # with coverage (80% minimum enforced)
pnpm test:db        # schema/RLS integration tests against the DEV Supabase project
pnpm e2e            # Playwright (iPhone profile): smoke tests; journeys need the dev project, see below
pnpm lint && pnpm typecheck && pnpm format:check

pnpm db:types       # regenerate src/lib/database.types.ts from the linked project
```

**End-to-end journeys** (log a meal, goals and partner, history, ingredients, offline, appearance following the account to a new device) run the real app against the dev project. Build it against dev and pass the test credentials:

```bash
set -a; . ./.env.test.local; set +a
VITE_SUPABASE_URL=$SUPABASE_TEST_URL VITE_SUPABASE_ANON_KEY=$SUPABASE_TEST_ANON_KEY \
  pnpm exec playwright test --project=journeys-webkit --project=journeys-chromium
# without WebKit's system libraries (e.g. WSL): add E2E_BROWSER=chromium
```

The unit tests fail on any request that isn't mocked, so they can never reach a real backend. The database tests refuse to run against the production project.

### Database changes

Migrations live in `supabase/migrations/`. The CLI is normally linked to the **dev** project:

```bash
set -a; . ./.env.secrets.local; set +a
pnpm exec supabase link --project-ref <dev-ref> -p "$DEV_DB_PASSWORD"
pnpm exec supabase db push --linked -p "$DEV_DB_PASSWORD"
pnpm test:db                    # prove it on dev first
# then link production, push the same migration, and link dev again
```

### Importing the old Firebase data

`scripts/migrate-firebase/migrate.ts` reads the Firebase `foods` collection (read-only) and imports it into a household's ingredients. It does a dry run by default and is safe to re-run (upserts on `household_id + legacy_id`). Known errors in the source data are fixed on the way in by `corrections.ts` (Firebase itself is never changed); the dry run lists every correction.

```bash
MIGRATION_SUPABASE_URL=... MIGRATION_SUPABASE_SERVICE_ROLE_KEY=... \
  node scripts/migrate-firebase/migrate.ts --household <uuid>          # dry run
  node scripts/migrate-firebase/migrate.ts --household <uuid> --apply  # import
```

## Deployment

- **Vercel** builds every push to `main` (`vercel.json`: SPA rewrites, long-lived caching for hashed assets, no caching for the service worker and `index.html`).
- Vercel environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (production project).
- **GitHub Actions** (`.github/workflows/ci.yml`) on every push and pull request: lint, typecheck, format, unit tests with coverage, WebKit E2E. On pushes to `main` it also runs, against the dev project with the `SUPABASE_TEST_*` repository secrets, the database integration tests and the end-to-end journeys (WebKit with an iPhone profile; the offline restart additionally in Chromium, since Playwright's WebKit has no service workers).

## Installing on the iPhone

Open the live URL in Safari, then **Share → Add to Home Screen**. The app then starts full-screen like a native app, keeps you signed in, and updates itself when a new version is deployed (fully close and reopen the app to pick it up; occasionally twice).

Once everyone in the household has an account, turn off **Allow new users to sign up** in Supabase (Authentication → Sign In / Providers).
