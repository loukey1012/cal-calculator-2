# CALculator

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
- The whole Today page (person switch, goal card and all four meals) **fits an iPhone screen without scrolling**.
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
- Your **name** shown to the household is under Settings › Account.

### Ingredient database (Ingredients tab)

- Shared per household, **grouped by category**, with **accent-insensitive search** (`kase` finds `Käse`) and category filter chips: one sideways-scrolling line, all on screen, or **grouped** into broad categories that open their categories when tapped (Settings › Appearance).
- Nutrition **per 100 g and/or per unit**: calories (whole numbers, rounded up), protein, carbs, sugar, fat, saturated fat, fiber, salt. Only calories are required.
- Unit name and grams per unit, brand, category (created on the fly, optionally inside a **broad category** such as Fresh › Meat & Fish), note.
- Categories are **deleted automatically** once their last ingredient leaves them.
- **Settings › Categories** manages them: add, rename and delete broad categories (their categories move to Other); add, rename, move between broad categories and delete categories (their ingredients stay, without a category). Swipe right to go back to Settings.

### Works offline

- The last loaded data (days, ingredients, goals, profile) is **stored on the phone for 7 days**, so the app opens without a connection.
- **Meal changes made offline** still show immediately, are queued, and are sent in order when the connection returns, even after the app was closed. Every change is idempotent (items get their ID on the phone), so resending can never create duplicates. Network failures are retried until they succeed.
- A pill above the tab bar shows the state: _Offline_, _Offline · 2 changes pending_, _Saving 2 changes…_
- iOS doesn't run web apps in the background, so queued changes go out the next time the app is open with a connection.

### Look and feel

- Rounded cards on a soft background, the Manrope font, meals as a 2×2 grid of cards, avatars (initial on each person's accent color) in the person switch and member list. Bottom sheets (drag down to close), segmented controls, switches and swipe actions.
- **Floating tab bar** (Today · History · Ingredients · Settings): the active tab shows its label in an accent tint. **Swipe left and right** to switch tabs with an animated settle (on a page inside Settings, like Appearance, a swipe to the right goes back one level instead), and tap the active tab to scroll to the top. Pages and sheets scroll without a visible scroll indicator.
- Installable to the home screen (manifest, icons, safe areas, no zoom on input focus). Headers without buttons (Today, History, Settings) leave extra room at the top so titles stay clear of the fade iOS draws below the status bar.

### Appearance (Settings › Appearance)

Everything here is saved **to your account**, never to the device: you get the same look on every phone or browser you log in on. Changes apply instantly. Appearance is a menu of four pages, each row summarising its current choices; the back button or a swipe to the right goes up one level.

- **App colors**
  - **Theme:** System, Light or Dark.
  - **Light style:** **Classic** (cool grey and white) or **Pink** (blush page, rose-tinted cards, text and tracks, pink-leaning goal colors). Used whenever the app is light, also with System during the day.
  - **Dark style:** **Soft** (deep grey, rounded) or **Graphite** (near-black, Space Grotesk numbers, uppercase labels; stored as `bento`). Used whenever the app is dark, also with System at night.
  - **Accent color:** 12 colors (buttons, the active tab, your avatar). Text in the accent color is darkened or lightened automatically so it stays readable, e.g. Lime on a light background.
- **Progress** (with a live preview at the top)
  - **Progress style:** Rings, **Ring + bars** (default: a calorie ring, bars for the macros), Bars or Compact.
  - **Goal colors:** Vivid, Pastel, Accent shades or High contrast.
  - **Ring colors:** give Calories, Protein, Carbs or Fat **its own color** (18 swatches, or any color with the color picker); the others keep the palette's. "Use palette color" undoes one, and choosing a palette resets them all. A custom color stays the same in every theme.
- **Category chips** (with a preview): **One line** (default, scrolls sideways), **All on screen** (slimmer chips wrapping into rows) or **Grouped** (broad categories such as Fresh; tapping one filters by it and opens its categories below) for the category filter on the Ingredients page. Wrapped chips are **arranged automatically to fill as few rows as possible** ("All" stays first; alphabetical within each row), measured on the device and re-arranged when the width or fonts change.
- **App icon:** eight versions of the C-ring icon: **Graphite** (default), Classic, Pink, Sunset, Progress, Ember, Leaf and Violet. Used when you add the app to the home screen (also before signing in, on a phone you used before) and in the browser tab. To change an installed icon, see [Installing on the iPhone](#installing-on-the-iphone).

---

## Coming next

| Area             | Planned                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------- |
| Cook together    | _In progress._ Log a dish cooked together once; each person gets their portion (see below)               |
| Recipes          | Save dishes and meals by name as recipes, and cook or log them again (with remembered own amounts)       |
| Nicknames        | Give household members your own display name (a per-viewer nickname; their account name stays unchanged) |
| Barcode scanning | Find or create an ingredient by scanning its barcode                                                     |
| Quick picks      | Recent and favorite ingredients                                                                          |
| Meal reuse       | Copy a meal to another day, or save it as a template                                                     |
| Trends           | Charts of calories and macros over weeks and months                                                      |
| Weight           | Track body weight over time                                                                              |
| Export           | Download your logged data as CSV                                                                         |
| Reminders        | Push reminders to log meals                                                                              |
| Invite code      | Rotate the household invite code                                                                         |
| Live updates     | See your partner's edits to a meal without reloading                                                     |

**Cook together (planned shape).** A _dish_ is one cooking: its ingredients plus one or more portions. Each ingredient is either **shared** (split by the dish's split: equal, count such as 3 : 2 toasts, percent, or by weight of the cooked pot and each plate) or has **own amounts** per portion (noodles 120 g / 100 g; "only her" for the tomato). A portion not yet eaten is a **leftover** that can be logged later. Each eaten portion shows as one grouped, expandable block in that person's meal, either of you can edit the dish, and a meal logged alone can be turned into a dish afterwards ("Share this meal"). Recipes will reuse the same ingredient lines and splits.

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
    appearance/   per-account theme, light/dark style, accent, goal and ring colors, progress style, category chips, app icon; Appearance pages
    auth/         login, sign-up, session (clears cached data on sign-out / account change)
    household/    profile, household, invite codes, onboarding
    ingredients/  ingredient database: API, form parsing, listing, category chips, screens
    categories/   Settings › Categories: broad categories and categories (create, rename, move, delete)
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
- `meal_items` of a cooked dish point to their `dish_portions` row and `dish_lines` row; plain items leave both empty
- `dishes` (a cooking; split mode equal / count / percent / weight, cooked weight, a revision changed by every save), `dish_portions` (who ate it on which day and meal, or nobody yet = a leftover; split value), `dish_lines` (ingredient snapshot like `meal_items`, either `shared` or `per_portion`), `dish_line_amounts` (own amount of a `per_portion` line per portion)
- Views `meal_totals` and `daily_totals`. RPCs `create_household`, `join_household`, `ensure_meal`, `save_dish` and `delete_dish`.
- `save_dish` stores a whole dish at once and re-logs every eaten portion as meal items in its eater's meal (shared lines × the portion's share, own amounts as entered), so the totals views count dishes like any other food. Resending the same save does nothing; a save based on an outdated revision is rejected ("changed meanwhile"). It can also take over plain items of a meal ("share this meal").

### Security

- **Row Level Security on every table.** Household members can read each other's data and edit each other's meals. Goals and profiles can only be changed by their owner. Other households and signed-out visitors see nothing.
- Dishes and their meal items are only written through `save_dish` / `delete_dish`, which check that every portion goes to a household member and every ingredient belongs to the household.
- Joining a household only works through an invite code. Profiles can't be moved between households directly.
- The anon key in the app is public by design; RLS is the protection. The service-role key is only used in local scripts and CI (dev project), never in the app.
- **Sign-ups are disabled in Supabase**, since both accounts exist. Nobody new can create an account.

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
pnpm icons          # regenerate the icon PNGs: the default set from public/icon.svg (Graphite)
                    # and one home-screen icon per choice from public/icons/<name>/icon.svg
```

To add an app icon choice: put its SVG in `public/icons/<name>/icon.svg`, add `<name>` to `APP_ICONS` (`src/features/appearance/appearance.ts`) and a label to `APP_ICON_OPTIONS`, then run `pnpm icons`.

**End-to-end journeys** (log a meal, goals and partner, Today fitting the screen, history, ingredients, category management, offline, appearance following the account to a new device, the Pink style surviving a restart, a custom ring color) run the real app against the dev project. Build it against dev and pass the test credentials:

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

Open the live URL in Safari, then **Share → Add to Home Screen**. The app then starts full-screen like a native app, keeps you signed in, and updates itself when a new version is deployed (fully close and reopen the app to pick it up; occasionally twice). The home-screen icon is the one chosen under Settings › Appearance › App icon at the moment you add the app; to change it later, pick a new one, remove the app from the home screen and add it again.

New accounts are turned off in Supabase (Authentication → Sign In / Providers → **Allow new users to sign up**). To add someone, switch it on briefly, let them sign up and join with the invite code, then switch it off again.
