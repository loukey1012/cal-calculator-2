/**
 * What changed in the app, newest first: shown in Settings › tap the version line › Patch notes.
 * EVERY commit adds its entry here in the same commit (date and hour in local time, plain words;
 * internal-only changes as kind 'internal'). Entries before 2026-10-15 20:40 come from git log.
 */

export type PatchNoteKind = 'new' | 'fix' | 'internal'

export type PatchNote = {
  /** local date and hour, YYYY-MM-DDTHH:mm */
  readonly at: string
  readonly kind: PatchNoteKind
  readonly title: string
  /** more detail, shown under the title */
  readonly items?: readonly string[]
}

export type PatchNoteDay = { readonly day: string; readonly notes: readonly PatchNote[] }

/** The entries of each day together, in the order given (newest first). */
export function groupByDay(notes: readonly PatchNote[]): readonly PatchNoteDay[] {
  return notes.reduce<PatchNoteDay[]>((days, note) => {
    const day = note.at.slice(0, 10)
    const last = days.at(-1)
    return last?.day === day
      ? [...days.slice(0, -1), { day, notes: [...last.notes, note] }]
      : [...days, { day, notes: [note] }]
  }, [])
}

export const PATCH_NOTES: readonly PatchNote[] = [
  {
    at: '2026-10-19T14:30',
    kind: 'internal',
    title: 'Plan: recent ingredients on top, no favorites',
  },
  { at: '2026-10-16T13:15', kind: 'internal', title: 'Notes for the next session' },
  {
    at: '2026-10-16T13:09',
    kind: 'new',
    title: 'Ring colors when over, Export, and a dot on Cook for an unsaved dish',
    items: [
      'Calories, carbs and fat change color once full: one color up to 10 % over, another above. Appearance › Progress › When over: Signal, Ember, Neon, your own colors or Off',
      'Settings › Export: both of you, a date range, as two CSV files (foods and days with weight)',
      'The Cook tab shows a dot while a dish there hasn’t been logged',
    ],
  },
  {
    at: '2026-10-16T12:56',
    kind: 'internal',
    title: 'Planned: ring colors when over, days that don’t count; the remaining items reordered',
  },
  {
    at: '2026-10-16T12:22',
    kind: 'internal',
    title: 'The review routine is now called CALculator weekly review',
  },
  {
    at: '2026-10-16T12:17',
    kind: 'new',
    title: 'The weekly review checks meals too',
    items: [
      'For both of you, the past week: a meal missing between others or a day with nothing logged, days far below the calorie goal, and odd entries such as implausible amounts, the same food twice in one meal or 0 kcal items',
      'Meal findings show under Review with the person, day and meal; Open day opens it in History, then Done or Ignore. Meals are never changed automatically',
    ],
  },
  {
    at: '2026-10-16T11:55',
    kind: 'fix',
    title: 'Review moved to the Ingredients header; the Check values label and filter are gone',
    items: [
      'Review · N sits next to + and no longer covers the brand filter',
      'The weekly review replaces the Check values label, its filter and Values are correct; the warnings while typing in the ingredient form stay',
    ],
  },
  {
    at: '2026-10-16T11:29',
    kind: 'new',
    title:
      'The weekly ingredient review is running: every Sunday morning, findings appear under Ingredients › Review',
  },
  {
    at: '2026-10-16T10:38',
    kind: 'new',
    title: 'Ingredient review: suggestions to apply or ignore',
    items: [
      'A weekly review of the ingredient database (typos, brand and unit spellings, unit weights, duplicates, values that don’t fit) will show its findings under Ingredients › Review',
      'Each finding shows the reason and the suggested change; Apply fix changes the ingredient and recent meals, Ignore keeps it as it is. Nothing changes on its own',
    ],
  },
  {
    at: '2026-10-16T10:17',
    kind: 'fix',
    title: 'Background presets, random places and the selected style',
    items: [
      'The color dots of the Background presets are evenly spaced and fit inside their card',
      'Position › Random moves each spot only a little from where it was, and carries on from there at the next app start',
      'With Liquid Glass, the selected choice (e.g. the light and dark style) keeps its frame',
    ],
  },
  {
    at: '2026-10-16T09:25',
    kind: 'new',
    title: 'Background: choose the number of spots, their position and their colors separately',
    items: [
      'Spots: 1 to 6, each with its own size',
      'Position: Specified (drag them), Random (new places on every tab change or once per app start) or Moving (the spots wander on their own, slow, medium or fast)',
      'Colors: Custom, Preset (style colors, Sunset, Ocean, Forest, Candy), Cycle or Random',
      'Slow drift and the Goal colors are removed; a saved background is carried over',
      'With Reduce Motion on, moving spots stay still and the page says so',
      'More room for appearance settings in your account, so a full background always saves',
    ],
  },
  {
    at: '2026-10-16T09:15',
    kind: 'fix',
    title: 'Dragging a slider or a background spot no longer switches tabs or goes back',
  },
  {
    at: '2026-10-15T22:17',
    kind: 'internal',
    title: 'Planned: background settings by amount, position and colors; no swiping while dragging',
  },
  {
    at: '2026-10-15T22:06',
    kind: 'new',
    title: 'The background behind Liquid Glass Full',
    items: [
      'Settings › Appearance › Background: Style, Custom, Random, Cycle or Goal-aware colors',
      'Custom: your own spots, dragged where you want them; Cycle: your own list of colors',
      'Random and Cycle change on every tab change or once per app start',
      'Strength, and Slow drift to let the colors float',
    ],
  },
  {
    at: '2026-10-15T21:53',
    kind: 'fix',
    title: 'Undid the Liquid Glass and accent color changes for light styles',
    items: ['Everything is as before that change; the Accent on light styles setting is gone'],
  },
  {
    at: '2026-10-15T21:50',
    kind: 'fix',
    title: 'Liquid Glass and accent colors on light styles',
    items: [
      'The chosen light and dark style have their frame again with Liquid Glass Full',
      'Sheets on light styles no longer turn grey; text on the Full background reads better',
      'Accent text and icons on light styles are darkened much less, close to your color',
      'New in App colors: Accent on light styles, Slightly darker or Exact, with an edge',
    ],
  },
  {
    at: '2026-10-15T21:27',
    kind: 'new',
    title: 'Values are correct',
    items: [
      'A flagged ingredient can be marked as correct; the flag goes away for both of you',
      'It comes back if the values change and still look wrong',
    ],
  },
  {
    at: '2026-10-15T21:20',
    kind: 'new',
    title: 'Liquid Glass: Minimal and Full',
    items: [
      'Controls is now called Minimal and covers every field: lists, search fields, chips, buttons, meal cards',
      'Everything is now called Full: the progress card too, over the color background',
    ],
  },
  {
    at: '2026-10-15T21:04',
    kind: 'internal',
    title: 'Steadier test for ingredient edits reaching recent meals',
  },
  {
    at: '2026-10-15T21:00',
    kind: 'new',
    title: 'Cook search: + and a pencil',
    items: [
      'The + opens a new ingredient straight away, named after the search',
      'The pencil next to it opens a custom item straight away',
    ],
  },
  {
    at: '2026-10-15T20:56',
    kind: 'new',
    title: 'Patch notes',
    items: [
      'Tap the version line at the bottom of Settings to see what changed, with day and hour',
    ],
  },
  {
    at: '2026-10-15T20:34',
    kind: 'new',
    title: 'Liquid Glass, for the controls or for everything, on any style',
  },
  {
    at: '2026-10-15T20:01',
    kind: 'new',
    title: 'Ingredients with odd values say Check values, with a filter',
  },
  { at: '2026-10-15T19:57', kind: 'new', title: 'Keep both Supabase projects awake' },
  {
    at: '2026-10-15T19:54',
    kind: 'new',
    title: "Editing an ingredient updates the last two weeks' meals",
  },
  { at: '2026-10-15T19:45', kind: 'new', title: 'Nutrients in the order of a nutrition label' },
  { at: '2026-10-15T19:37', kind: 'internal', title: 'Own symbol journey checks the Account row' },
  {
    at: '2026-10-15T19:34',
    kind: 'new',
    title: 'New ingredient and Custom item behind a + above the Cook search',
  },
  {
    at: '2026-10-15T19:32',
    kind: 'new',
    title: "Today tab icon is the app icon's C ring with its dot",
  },
  { at: '2026-10-15T19:31', kind: 'new', title: 'Change your symbol only under Account' },
  {
    at: '2026-10-15T15:26',
    kind: 'internal',
    title: 'Plan items 1-15 with decisions, add handoff plan and CLAUDE.md',
  },
  {
    at: '2026-10-11T19:46',
    kind: 'fix',
    title: 'Ingredients cached before measures existed count as grams',
  },
  {
    at: '2026-10-11T19:44',
    kind: 'new',
    title: 'Ingredients measured in ml: values per 100 ml, logged in ml',
  },
  {
    at: '2026-10-11T19:21',
    kind: 'new',
    title: 'Sort both ingredient lists: newest first, A–Z, most used, fewest calories',
  },
  {
    at: '2026-10-11T19:15',
    kind: 'new',
    title: 'Brands above ingredient names, and a brand filter for both lists',
  },
  { at: '2026-10-11T19:11', kind: 'new', title: 'Whole-number chips next to the fraction chips' },
  {
    at: '2026-10-10T16:15',
    kind: 'fix',
    title: "Open Food Facts name search through the app's own address",
  },
  {
    at: '2026-10-10T15:54',
    kind: 'new',
    title: 'Clear buttons, portion split, smarter Calculate, estimated ingredients',
  },
  {
    at: '2026-10-08T16:51',
    kind: 'new',
    title: 'Weight on Today, and the current calendar week in Trends',
  },
  {
    at: '2026-10-08T16:37',
    kind: 'new',
    title: 'Weight tracking, a target weight, and trends in History',
  },
  { at: '2026-10-08T16:10', kind: 'internal', title: 'Eating out on the roadmap' },
  {
    at: '2026-10-08T15:31',
    kind: 'new',
    title: 'Brand suggestions while typing in the ingredient form',
  },
  {
    at: '2026-10-08T15:12',
    kind: 'new',
    title: 'Fiber goal, Calculate missing values, and cleaner scanned names',
  },
  {
    at: '2026-10-08T14:52',
    kind: 'new',
    title: 'Scanned products fill in per portion too, and point out odd values',
  },
  {
    at: '2026-10-08T14:28',
    kind: 'new',
    title: 'Barcode scanner: live camera, photo or typed number, filled in from Open Food Facts',
  },
  { at: '2026-10-08T13:12', kind: 'internal', title: 'Days that don’t count on the roadmap' },
  {
    at: '2026-10-08T12:49',
    kind: 'new',
    title: "Mark a dish's calories as an estimate, shown as ~ on Today, goals and History",
  },
  {
    at: '2026-10-08T10:32',
    kind: 'new',
    title: 'A symbol for yourself, and 65 emojis in Hearts, Cute and Cool',
  },
  {
    at: '2026-10-08T10:32',
    kind: 'fix',
    title: 'An open food editor no longer jumps back to the list when its save comes back',
  },
  {
    at: '2026-10-08T10:19',
    kind: 'internal',
    title: 'An open food editor stays open when its item comes back with a new id',
  },
  {
    at: '2026-10-08T10:13',
    kind: 'internal',
    title: 'Run the checks and the journeys side by side, with time limits on browser installs',
  },
  {
    at: '2026-10-08T10:04',
    kind: 'fix',
    title: 'The custom color picker stays open while choosing',
  },
  {
    at: '2026-10-08T09:48',
    kind: 'new',
    title: 'One color picker everywhere: 35 presets incl. White, plus any custom color',
  },
  {
    at: '2026-10-08T09:29',
    kind: 'new',
    title:
      'A toast on the first start of a new version, an update offer, and the version in Settings',
  },
  {
    at: '2026-10-08T09:07',
    kind: 'new',
    title: 'Cook search: create a missing ingredient right there, and category chips',
  },
  {
    at: '2026-10-08T08:37',
    kind: 'fix',
    title: 'Cook steps are pages: Back and the back swipe go one step at a time',
  },
  {
    at: '2026-10-06T19:22',
    kind: 'new',
    title: "Live updates: a partner's changes show up without reloading",
  },
  {
    at: '2026-10-06T18:37',
    kind: 'new',
    title:
      'Settings pages as an iOS navigation stack: slide in, slide away, interactive back swipe',
  },
  { at: '2026-10-06T18:22', kind: 'internal', title: 'UseToast in its own file (fast refresh)' },
  {
    at: '2026-10-06T18:21',
    kind: 'new',
    title: 'Picking an app icon copies the app link, with a toast saying so',
  },
  {
    at: '2026-10-06T18:05',
    kind: 'new',
    title:
      'Empty meal sheet leads to Cook, single foods open as dishes; write the cache at once when hidden',
  },
  {
    at: '2026-10-06T17:36',
    kind: 'new',
    title: 'Cook tab is the one place food is logged; Today only shows, edits and deletes',
  },
  {
    at: '2026-10-06T17:22',
    kind: 'new',
    title: 'Cook draft model, local draft storage, dish titles, single foods on Today (GREEN)',
  },
  {
    at: '2026-10-06T17:20',
    kind: 'internal',
    title: 'Cook draft, draft storage, dish titles, single foods on Today (RED)',
  },
  {
    at: '2026-10-06T16:59',
    kind: 'new',
    title: 'Partner nickname and symbol (default "baby" with a heart)',
  },
  { at: '2026-10-06T16:59', kind: 'fix', title: 'Send profile changes one at a time' },
  {
    at: '2026-10-05T22:14',
    kind: 'new',
    title: 'Leftovers — cook extra portions, eat them later or throw them away (GREEN)',
  },
  {
    at: '2026-10-05T22:05',
    kind: 'internal',
    title: 'Leftovers — cook extra portions, take them later, throw them away (RED)',
  },
  {
    at: '2026-10-05T22:00',
    kind: 'new',
    title: 'Share a meal afterwards, a dish counts as one item (GREEN)',
  },
  {
    at: '2026-10-05T21:56',
    kind: 'internal',
    title: 'Share a meal afterwards, a dish counts as one item, cook-together journey (RED)',
  },
  { at: '2026-10-05T21:45', kind: 'new', title: 'Cook together in the meal sheet (GREEN)' },
  { at: '2026-10-05T21:40', kind: 'internal', title: 'Cook together in the meal sheet (RED)' },
  { at: '2026-10-05T21:34', kind: 'new', title: 'Save dishes through the offline queue (GREEN)' },
  {
    at: '2026-10-05T21:29',
    kind: 'internal',
    title: 'Save dishes through the offline queue (RED)',
  },
  {
    at: '2026-10-05T21:25',
    kind: 'new',
    title: 'Save and delete cooked dishes in the database (GREEN)',
  },
  {
    at: '2026-10-05T21:20',
    kind: 'internal',
    title: 'Save and delete cooked dishes in the database (RED)',
  },
  { at: '2026-10-05T21:09', kind: 'new', title: 'Split a cooked dish into portions (GREEN)' },
  { at: '2026-10-05T21:08', kind: 'internal', title: 'Split a cooked dish into portions (RED)' },
  {
    at: '2026-10-05T21:07',
    kind: 'internal',
    title: 'Plan cook together and recipes in Coming next',
  },
  { at: '2026-10-05T20:40', kind: 'internal', title: 'Partner setup done, sign-ups disabled' },
  {
    at: '2026-10-05T20:39',
    kind: 'internal',
    title: 'Replace the polish step with the remaining partner setup',
  },
  {
    at: '2026-10-05T20:35',
    kind: 'internal',
    title: 'Tidy README and turn later ideas into the Coming next list',
  },
  {
    at: '2026-10-05T20:21',
    kind: 'new',
    title: 'Pick the app icon in Settings › Appearance (GREEN)',
  },
  {
    at: '2026-10-05T20:13',
    kind: 'internal',
    title: 'Pick the app icon in Settings › Appearance (RED)',
  },
  { at: '2026-10-05T20:10', kind: 'new', title: 'Rename the app to CALculator (GREEN)' },
  { at: '2026-10-05T20:10', kind: 'internal', title: 'The app is called CALculator (RED)' },
  {
    at: '2026-10-05T20:03',
    kind: 'internal',
    title: 'Temporary probe for swapping the home-screen icon on iOS',
  },
  {
    at: '2026-10-05T19:10',
    kind: 'fix',
    title: 'Keep header-less page titles clear of the iOS status bar fade (GREEN)',
  },
  {
    at: '2026-10-05T19:08',
    kind: 'internal',
    title: 'Header without buttons stays clear of the iOS status bar fade (RED)',
  },
  {
    at: '2026-10-05T18:58',
    kind: 'new',
    title: 'Pick a custom color for each goal ring and bar (GREEN)',
  },
  { at: '2026-10-05T18:53', kind: 'internal', title: 'A custom color per goal ring and bar (RED)' },
  {
    at: '2026-10-05T18:15',
    kind: 'new',
    title: 'Pink light style next to Classic, mirroring the dark styles (GREEN)',
  },
  {
    at: '2026-10-05T18:11',
    kind: 'internal',
    title: 'Pink light style next to the dark styles (RED)',
  },
  {
    at: '2026-10-05T18:01',
    kind: 'new',
    title:
      'Appearance as a menu of App colors, Progress and Category chips; Bento renamed Graphite (GREEN)',
  },
  {
    at: '2026-10-05T17:57',
    kind: 'internal',
    title: 'Appearance as a menu of three pages, Bento renamed Graphite (RED)',
  },
  {
    at: '2026-10-05T17:47',
    kind: 'new',
    title: 'Compact Today page that fits the iPhone screen (GREEN)',
  },
  {
    at: '2026-10-05T17:45',
    kind: 'internal',
    title: 'Today page fits the iPhone screen without scrolling (RED)',
  },
  {
    at: '2026-10-05T17:23',
    kind: 'new',
    title: 'Pack wrapped category chips into the fewest rows (GREEN)',
  },
  {
    at: '2026-10-05T17:18',
    kind: 'internal',
    title: 'Pack category chips into the fewest rows (RED)',
  },
  {
    at: '2026-10-05T16:15',
    kind: 'internal',
    title: 'TDD evidence report for the category layouts work',
  },
  { at: '2026-10-05T16:14', kind: 'new', title: 'Manage categories in Settings (GREEN)' },
  { at: '2026-10-05T16:09', kind: 'internal', title: 'Category management in Settings (RED)' },
  { at: '2026-10-05T16:06', kind: 'new', title: 'Grouped category chips (GREEN)' },
  { at: '2026-10-05T16:01', kind: 'internal', title: 'Grouped category chips (RED)' },
  {
    at: '2026-10-05T15:57',
    kind: 'new',
    title: 'Broad categories (category groups) for ingredient categories',
  },
  {
    at: '2026-10-05T15:22',
    kind: 'new',
    title: 'Category chips preview; swipe back from Settings sub-pages',
  },
  {
    at: '2026-10-05T15:01',
    kind: 'new',
    title: 'Choose between one-line and all-on-screen category chips',
  },
  {
    at: '2026-10-05T14:35',
    kind: 'fix',
    title: 'Keep tab pages painted when switching ingredient categories in Safari',
  },
  {
    at: '2026-10-05T13:55',
    kind: 'fix',
    title: 'Import brands from Firebase and apply known data corrections',
  },
  { at: '2026-10-04T20:23', kind: 'internal', title: 'Remove screen diagnostics and dead code' },
  {
    at: '2026-10-04T20:09',
    kind: 'fix',
    title: 'Fill the empty strip at the bottom of the iOS home-screen app',
  },
  {
    at: '2026-10-04T19:51',
    kind: 'new',
    title: 'Hide scroll indicators; temporary screen diagnostics',
  },
  {
    at: '2026-10-04T19:40',
    kind: 'new',
    title: 'Ring + bars progress style as default; lower tab bar on iPhone',
  },
  {
    at: '2026-10-04T19:21',
    kind: 'new',
    title: 'Modern UI revamp with per-account appearance settings',
  },
  { at: '2026-10-02T15:54', kind: 'internal', title: 'Plan app rename and per-viewer nicknames' },
  {
    at: '2026-10-02T15:47',
    kind: 'new',
    title: 'Show the selected history day beneath the calendar',
  },
  { at: '2026-10-02T15:35', kind: 'internal', title: 'Drop unused exports found by knip' },
  {
    at: '2026-10-02T15:15',
    kind: 'internal',
    title: 'README covers e2e journeys in CI, e2e folder and post-setup steps',
  },
  {
    at: '2026-10-02T13:32',
    kind: 'fix',
    title: 'Keep tabs aligned after edge swipes; clear header buttons of the iOS fade',
  },
  {
    at: '2026-10-02T12:53',
    kind: 'fix',
    title: 'Tab pages sliding half into view after reopening the app',
  },
  {
    at: '2026-10-02T12:25',
    kind: 'internal',
    title: 'End-to-end journeys against the dev project (Phase 11)',
  },
  {
    at: '2026-10-02T12:17',
    kind: 'new',
    title: 'Edit name and accent color in Settings (Phase 9)',
  },
  {
    at: '2026-10-02T12:09',
    kind: 'new',
    title: 'History calendar with editable past days (Phase 8)',
  },
  {
    at: '2026-10-02T11:55',
    kind: 'new',
    title: 'Daily goals, progress rings and partner view (Phase 7)',
  },
  { at: '2026-10-02T11:18', kind: 'new', title: 'Offline meal logging (Phase 6b)' },
  {
    at: '2026-10-02T10:52',
    kind: 'new',
    title: 'Import script for the old Firebase foods collection',
  },
  { at: '2026-10-01T15:40', kind: 'new', title: 'Meal editor on the Today tab (Phase 6)' },
  {
    at: '2026-10-01T15:25',
    kind: 'new',
    title: 'Remove categories automatically once no ingredient uses them',
  },
  { at: '2026-10-01T15:16', kind: 'new', title: 'Household ingredient database (Phase 5)' },
  { at: '2026-10-01T15:06', kind: 'fix', title: 'Animate tab swipe settle instead of snapping' },
  {
    at: '2026-10-01T14:58',
    kind: 'new',
    title: 'IOS navigation shell with swipeable tabs (Phase 4)',
  },
  { at: '2026-10-01T14:43', kind: 'new', title: 'Nutrition math (Phase 3)' },
  { at: '2026-10-01T14:32', kind: 'new', title: 'Accounts and household onboarding (Phase 2)' },
  { at: '2026-10-01T14:14', kind: 'new', title: 'Database schema with household RLS (Phase 1)' },
  { at: '2026-10-01T13:54', kind: 'internal', title: 'Scaffold iOS PWA shell (Phase 0)' },
  { at: '2026-09-29T16:50', kind: 'internal', title: 'Initial commit' },
]
