# CALculator

A household meal and nutrition tracker with a modern, card-based look that each person can customize. It runs as a Progressive Web App (PWA) installed on the iPhone home screen, is hosted on Vercel and stores its data in Supabase.

Built for a two-person household: both members log their own meals, can see and edit each other's days, and share one ingredient database.

**Live app:** https://cal-calculator-2.vercel.app

---

## Features

### Logging food (Cook tab)

- **One place for everything you eat**, alone or together: a snack, a quick breakfast or a dish cooked for two. The Today and History pages only show, change and delete.
- **Who eats:** tap yourself and/or your partner. **When:** the day (today, or an earlier one) and the meal, which follows the time of day until you pick one (e.g. Dinner in the evening).
- Add ingredients from the shared **ingredient database** (with search) or as a **custom one-off item** that isn't saved to the database. Amounts in **grams or the ingredient's own unit** (e.g. "Riegel"), with a **live preview** of calories and macros.
- With two people, each ingredient is **Shared** (split by the dish's split), **only for one person** (e.g. the tomato on her burger) or has **own amounts** per person (noodles 120 g / 100 g). The split for shared ingredients: **Equal**, **Count** (3 toasts : 2 toasts), **%**, or **Weight** (weigh the cooked dish and each plate). What each portion gets is shown live; a split that can't work (e.g. 110 %) says why.
- Optional **dish name** and **leftover portions** (each takes its share like a person would).
- **Save meal** logs everything at once (each person's portion into their own meal) and goes back to where you came from.
- The draft is **kept on the phone** while you put it together, so switching tabs or iOS closing the app loses nothing. **Discard** starts over.
- **Leftovers** of the last 7 days are listed at the top of Cook: eat one in any meal (for you or your partner), or **throw it away** (it keeps its share, so the eaten portions never change). While food is left, a **"Chili left"** pill sits next to "Meals" on Today and opens Cook.
- Every logged food keeps a **snapshot of its nutrition values**, so editing an ingredient later never changes past meals.
- Works offline like every change (queued on the phone, sent in order once back online).

### Today

- One **Breakfast, Lunch, Dinner and Snacks** per person and day, with **day total** and per-meal totals. Unknown nutrients show as "–" instead of a misleading 0.
- Tapping an **empty meal opens Cook** already set to that person, day and meal.
- In a meal, a food logged alone shows as a **plain row**: tap to change its amount, swipe to delete. Anything else is **one block** (its name, or "Pasta, Pesto +2"; "Shared" when you both ate it) with your share, opening to its ingredients and **Edit dish** (who eats, amounts, split, name, leftovers). Sharing a meal afterwards is simply adding your partner there.
- Either of you can change or delete a dish; all portions follow. Deleting a dish that has other portions **asks first**. If both of you changed it at the same time, the later save is refused instead of overwriting the other.
- On the Today cards a dish counts as **one item**. The whole page (person switch, goal card and all four meals) **fits an iPhone screen without scrolling**.
- "Today" moves on at midnight, and when the app comes back to the foreground on a later day.

### Daily goals and progress

- Per-person daily goal: **calories required**; protein, carbs and fat optional.
- A **progress card** on each day: a large calorie ring with the kcal left (or over) in the middle, and a bar per macro (**Ring + bars**, the default). Shows consumed / target and how much is left or over. Calories always show; each macro only if it has a target. Also available as a small ring per macro, all **bars**, or **compact** bars (Settings › Appearance).
- Goals have a history: a new goal applies **from today on**, and past days keep the goal they had.
- A "≥" marks totals that are only a lower bound (some logged items had no value for that nutrient).

### History

- **Month calendar** (Monday first): every logged day is marked green (within that day's calorie goal), red (over) or neutral (logged, no goal yet).
- Month summary: days logged, average calories and protein.
- **Tap any past day** to show its rings, totals and meals **right beneath the calendar**, and **edit it like today**. A forgotten dinner: tap the empty Dinner, which opens Cook for that day and comes back here after saving. Tap another day to switch, or the same day again to close it. The selected day is kept in the address (`/history/YYYY-MM-DD`), so reopening the app keeps it. Also for your partner's days.

### Household

- Accounts with email and password. One person creates a **household**, the other joins with a **12-character invite code** (shareable through the iOS share sheet).
- A **person switch** on Today shows a household member's day, rings and meals. Members can log and edit meals for each other.
- Your **name** shown to the household is under Settings › Account.
- **Your partner, your way** (Settings › Members › your partner): give them a **nickname** (default **“baby”**, up to 20 characters) and a **symbol** in place of the initial: a **heart** (default) or one of 17 cute emojis (💕 🌸 🐻 🧸 🐰 🐱 🦋 🍓 🌙 …), in one of 12 soft colors (default Rose). Only you see it, everywhere they appear (person switch, goal card, cooking together, members); their account name stays unchanged and is shown next to the nickname in Settings. Saved to your account in `profiles.appearance` (`partnerLooks`, by member id), so it follows you to every device. Leaving the nickname empty goes back to “baby”; **Reset** goes back to “baby” and the heart.

### Ingredient database (Ingredients tab)

- Shared per household, **grouped by category**, with **accent-insensitive search** (`kase` finds `Käse`) and category filter chips: one sideways-scrolling line, all on screen, or **grouped** into broad categories that open their categories when tapped (Settings › Appearance).
- Nutrition **per 100 g and/or per unit**: calories (whole numbers, rounded up), protein, carbs, sugar, fat, saturated fat, fiber, salt. Only calories are required.
- Unit name and grams per unit, brand, category (created on the fly, optionally inside a **broad category** such as Fresh › Meat & Fish), note.
- Categories are **deleted automatically** once their last ingredient leaves them.
- **Settings › Categories** manages them: add, rename and delete broad categories (their categories move to Other); add, rename, move between broad categories and delete categories (their ingredients stay, without a category). Swipe right to go back to Settings.

### Works offline

- The last loaded data (days, ingredients, goals, profile) is **stored on the phone for 7 days**, so the app opens without a connection.
- **Meal changes made offline** still show immediately, are queued, and are sent in order when the connection returns, even after the app was closed. Every change is idempotent (items get their ID on the phone), so resending can never create duplicates. Network failures are retried until they succeed. The moment the app goes to the background, the queue is written to the phone right away, so iOS closing it straight after a change loses nothing.
- A pill above the tab bar shows the state: _Offline_, _Offline · 2 changes pending_, _Saving 2 changes…_
- iOS doesn't run web apps in the background, so queued changes go out the next time the app is open with a connection.

### Live updates

- **Your partner's changes appear on your phone within about a second**, without reloading: food they log or change (also in your meals, e.g. a shared dish), leftovers, ingredients and categories, goals, and their name. The same works for your own changes made on another phone. Nothing pops up; the numbers just change in place.
- **While you edit a dish your partner saves the same dish**: your draft stays as it is, and a line _Updated on another phone · Load changes_ lets you load their version. Saving over it is held back with a short explanation (your draft stays), so neither edit is lost silently.
- While your own changes are still being saved, a partner's change waits until yours are through, so your change never briefly flickers back.
- iOS cuts the connection when the app goes to the background; when it comes back, it reconnects and catches up on everything that changed meanwhile.

### Look and feel

- Rounded cards on a soft background, the Manrope font, meals as a 2×2 grid of cards, avatars (your initial on your accent color, your partner's symbol on a soft tint of its color) in the person switch and member list. Bottom sheets (drag down to close), segmented controls, switches and swipe actions.
- **Floating tab bar** (Today · Cook · History · Ingredients · Settings): the active tab shows its label in an accent tint. **Swipe left and right** to switch tabs with an animated settle, and tap the active tab to scroll to the top.
- **Pages inside Settings** (Appearance and its pages, Categories, your partner) behave like an iOS navigation stack: an opened page slides in over the one it came from, Back slides it away, and **swiping right drags it away with your finger** while the page below moves in from the left (let go past a third of the screen, or flick, to go back; otherwise it springs back). Each page keeps its scroll position. With Reduce Motion on, pages switch at once. Pages and sheets scroll without a visible scroll indicator.
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
- **App icon:** eight versions of the C-ring icon: **Graphite** (default), Classic, Pink, Sunset, Progress, Ember, Leaf and Violet. Used when you add the app to the home screen (also before signing in, on a phone you used before) and in the browser tab. Picking a new icon **copies the app's link** (a short message confirms it), ready to paste into Safari when adding the app again. To change an installed icon, see [Installing on the iPhone](#installing-on-the-iphone).

---

## Coming next

| Area             | Planned                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| Recipes          | Save dishes and meals by name as recipes, and cook or log them again (with remembered own amounts) |
| Barcode scanning | Find or create an ingredient by scanning its barcode                                               |
| Quick picks      | Recent and favorite ingredients                                                                    |
| Meal reuse       | Copy a meal to another day, or save it as a template                                               |
| Trends           | Charts of calories and macros over weeks and months                                                |
| Weight           | Track body weight over time                                                                        |
| Export           | Download your logged data as CSV                                                                   |
| Reminders        | Push reminders to log meals                                                                        |

**Recipes** and meal templates will build on the Cook tab: a recipe fills in a dish (the same ingredient lines and splits), saved by name.

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
  app/            tab shell, swipe navigation, page stack (sub-page push/pop and back swipe), current user, offline lifecycle, sync status
  components/ios/ UI building blocks (Sheet, ListRow, TabBar, SegmentedControl, Avatar, …)
  features/
    appearance/   per-account theme, light/dark style, accent, goal and ring colors, progress style, category chips, app icon; Appearance pages
    auth/         login, sign-up, session (clears cached data on sign-out / account change)
    household/    profile, household, invite codes, onboarding
    ingredients/  ingredient database: API, form parsing, listing, category chips, screens
    categories/   Settings › Categories: broad categories and categories (create, rename, move, delete)
    cook/         Cook tab: draft (kept on the phone), who/when, leftovers, links from an empty meal
    meals/        day model, meal sheet (show, change, delete), offline-capable day changes
    dishes/       dishes: share maths (portions.ts), composer and editor, dish API, offline dish changes (same queue as meal changes)
    goals/        goal history, goal form, progress card (rings / ring + bars / bars / compact)
    live/         live updates: the household's Realtime channel, hint → query mapping, batched refreshes
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
- `dishes` (a cooking; split mode equal / count / percent / weight, cooked weight, a revision changed by every save), `dish_portions` (who ate it on which day and meal, or nobody yet = a leftover; split value; `discarded` for a thrown-away leftover, which keeps its share), `dish_lines` (ingredient snapshot like `meal_items`, either `shared` or `per_portion`), `dish_line_amounts` (own amount of a `per_portion` line per portion)
- Views `meal_totals` and `daily_totals`. RPCs `create_household`, `join_household`, `ensure_meal`, `save_dish` and `delete_dish`.
- **Live updates:** triggers on the household's tables send a small hint over Supabase Realtime Broadcast to the private channel `household:<id>` (what changed: a person's day, a dish, the ingredient database, …). Hints carry no data: the app marks the matching queries out of date, and what's on screen re-fetches through the normal RLS-checked queries. A failed hint never fails a save.
- `save_dish` stores a whole dish at once and re-logs every eaten portion as meal items in its eater's meal (shared lines × the portion's share, own amounts as entered), so the totals views count dishes like any other food. Resending the same save does nothing; a save based on an outdated revision is rejected ("changed meanwhile"). It can also take over plain items of a meal ("share this meal").

### Security

- **Row Level Security on every table.** Household members can read each other's data and edit each other's meals. Goals and profiles can only be changed by their owner. Other households and signed-out visitors see nothing.
- Dishes and their meal items are only written through `save_dish` / `delete_dish`, which check that every portion goes to a household member and every ingredient belongs to the household.
- Only household members can listen to their household's live channel (a policy on `realtime.messages`), and nobody can send on it from a phone: hints come from the database alone.
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

**End-to-end journeys** (log a meal on Cook, a single food changed in place, cooking together for two, sharing a meal afterwards, leftovers, goals and partner, partner nickname and symbol, Today fitting the screen, history, ingredients, category management, offline, a partner's change showing up live and after the app was in the background, appearance following the account to a new device, the Pink style surviving a restart, a custom ring color) run the real app against the dev project. Build it against dev and pass the test credentials:

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

Open the live URL in Safari, then **Share → Add to Home Screen**. The app then starts full-screen like a native app, keeps you signed in, and updates itself when a new version is deployed (fully close and reopen the app to pick it up; occasionally twice). The home-screen icon is the one chosen under Settings › Appearance › App icon at the moment you add the app; to change it later, pick a new one (this copies the app's link), remove the app from the home screen, paste the link into Safari and add it again.

New accounts are turned off in Supabase (Authentication → Sign In / Providers → **Allow new users to sign up**). To add someone, switch it on briefly, let them sign up and join with the invite code, then switch it off again.
