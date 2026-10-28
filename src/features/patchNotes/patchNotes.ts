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

type PatchNoteDay = { readonly day: string; readonly notes: readonly PatchNote[] }

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
    at: '2026-10-28T15:52',
    kind: 'fix',
    title: 'Settings › Notifications opens again',
    items: [
      'The page crashed with the settings saved on the phone before the weekly summary existed; it now fills in the new setting',
      'If a page ever crashes, the app shows “Something went wrong” with Reload instead of a black screen',
    ],
  },
  {
    at: '2026-10-28T15:35',
    kind: 'new',
    title: 'Weekly summary notification',
    items: [
      'Every Monday at 08:00 (Settings › Notifications › Weekly summary: on or off, any time): last week’s calories saved, the Ø calories and the days within goal, counted days only; tap it to open that week',
    ],
  },
  {
    at: '2026-10-28T15:25',
    kind: 'new',
    title: 'Calories burned is one setting',
    items: [
      'Calories burned per day is now a single setting in Settings › Goals (“Calories burned per day”), no longer part of the daily goal; it applies to every day, also past weeks. The value you had is kept',
    ],
  },
  {
    at: '2026-10-28T14:55',
    kind: 'new',
    title: 'Calories burned and the week page',
    items: [
      'Settings › Goals: Calories burned per day (optional), kept with the goal’s history',
      'Week page: tap a week’s Ø in the calendar, or ⋯ › This week. It shows the calories saved that week (burned − eaten, counted days only) and since October 10, the days of the week, the averages against your goals, highest and lowest day, Ø per meal, most eaten foods and the week’s notes; for the running week also how much a day keeps the week within goal',
      'Each calendar row shows the week’s calories saved under its Ø',
      'Back from the week returns to the day that was open; pages now also slide in when a day is open',
    ],
  },
  {
    at: '2026-10-28T13:55',
    kind: 'fix',
    title: 'History: the month name fits again',
    items: [
      'The filter and ⋯ buttons moved up next to the History title (in the calendar only), so the month row has room for “September 2026”',
    ],
  },
  {
    at: '2026-10-28T13:43',
    kind: 'new',
    title: 'History: year overview, month summary removed',
    items: [
      'Year overview: ⋯ › Year overview, or tap the month name; ‹ 2026 › shows 12 small months with every day in its color (missing meals, cheat meals, cheat and alcohol days tinted); tap a month to open it. The filter works there too',
      'The two summary lines under the calendar are gone, so the open day starts right under the calendar',
    ],
  },
  {
    at: '2026-10-28T13:20',
    kind: 'internal',
    title: 'History journey test corrected (the open day is never faded)',
  },
  {
    at: '2026-10-28T12:50',
    kind: 'new',
    title: 'History reorganised: Calendar, Notes and Trends',
    items: [
      'History has three views: Calendar, Notes and Trends; an opened day now starts right under the calendar and its month summary',
      'The filter (Notes, Alcohol, Cheat, Missing) moved to the funnel button at the month title; while one is on, a pill under the calendar says so, with Clear',
      'The key to the colors and symbols is under ⋯ at the month title (hidden at first)',
      'Notes lists every note of all months, newest first, with a search; tap one to open its day in the calendar',
    ],
  },
  {
    at: '2026-10-28T12:00',
    kind: 'new',
    title: 'History: month summary, filters and notes',
    items: [
      'The month summary also shows the days within goal (“18 of 24 days within goal”), the longest streak within goal and the change in weight over the month; days that don’t count are left out',
      'Filter chips under the calendar: Notes, Alcohol, Cheat and Missing; the other days fade, and the filter stays while days are opened',
      'Notes of the month: every day note and meal note of the month as a list; tap one to open its day',
    ],
  },
  {
    at: '2026-10-27T18:40',
    kind: 'new',
    title: 'History easier to read',
    items: [
      'Days in the calendar show small symbols: a glass for an alcohol day (purple outline), a star for a cheat meal, “!” when lunch or dinner is missing, a dot for a note, a scale for a weigh-in and “~” for estimated calories',
      'Today has a ring and the open day is filled; the current week is lightly tinted, and each week ends with its Ø kcal of the counted days',
      'A key under the calendar explains the colors and symbols (Hide key / Show key)',
      'Swipe sideways for the month before or after, Today jumps back; hold a day for a quick look',
      'An open day starts with a status pill (e.g. “Within goal · 140 kcal over”, “Alcohol day · not counted”) and its note as a card; meal notes show with a dot',
    ],
  },
  {
    at: '2026-10-27T18:07',
    kind: 'new',
    title: 'Save in the day options',
    items: [
      'The day mark, cheat meals and notes are kept when you tap Save',
      'Closing or swiping down with unsaved changes asks whether to discard them',
    ],
  },
  {
    at: '2026-10-27T17:54',
    kind: 'new',
    title: 'Alcohol days',
    items: [
      'In the day options, a day can be marked as a cheat day or an alcohol day (None / Cheat day / Alcohol day); choosing one replaces the other',
      'An alcohol day is for days whose calories aren’t known; like a cheat day it is left out of averages, Trends and the weekly review, and the rings show no over colors',
      'It shows an “Alcohol day” label, cheat meals can still be marked on it, and the export has a column for it',
    ],
  },
  {
    at: '2026-10-27T17:20',
    kind: 'new',
    title: 'Weigh later',
    items: [
      'In Add food, Weigh later adds an ingredient without an amount, so the rest can be added first',
      'It shows “To weigh” and counts in no total; tap it to give who and the amount, or remove it',
      'Save meal and Save as recipe wait until everything is weighed',
    ],
  },
  {
    at: '2026-10-27T17:20',
    kind: 'new',
    title: 'Calories per person',
    items: [
      'With own amounts, each person’s calories show under their amount, with the total below',
      'The dish shows the whole dish’s calories and macros when more than one portion is eaten',
    ],
  },
  {
    at: '2026-10-27T16:55',
    kind: 'fix',
    title: 'Your partner’s days in History',
    items: [
      'Tapping a day in your partner’s calendar opens their day instead of switching back to yours',
      'The month shown stays when you switch person or close a day',
    ],
  },
  {
    at: '2026-10-27T16:55',
    kind: 'new',
    title: 'Over the goal: calories only, with new limits',
    items: [
      'Up to 10 % over the calorie goal still counts as within the goal, in History and Trends too',
      'More than 10 % over shows the first over color, more than 300 kcal over the second',
      'Carbs and fat no longer change color when over',
    ],
  },
  {
    at: '2026-10-27T16:55',
    kind: 'new',
    title: 'Weight per unit and values per unit',
    items: [
      'A scanned or searched product fills in only the values Open Food Facts states; Calculate missing values works out the rest when tapped',
      'The ingredient form flags a weight per unit without values per unit, and values per unit without a weight',
      'The weekly review flags saved ingredients with the same mismatch',
    ],
  },
  {
    at: '2026-10-25T13:20',
    kind: 'fix',
    title: '“1 × 1 Packung” instead of “1 1 Packung”',
    items: [
      'A unit name that already says how much one unit is, like “1 Packung” or “3 Stück”, is counted with a × when choosing an amount and in the values table',
      'Long unit names next to the amount stay on one line',
    ],
  },
  {
    at: '2026-10-25T13:08',
    kind: 'internal',
    title: 'Clean-up: tests named after Add food',
    items: ['The automatic tests and their helpers no longer speak of the Cook tab'],
  },
  {
    at: '2026-10-25T13:02',
    kind: 'internal',
    title: 'Clean-up: unused code removed',
    items: [
      'Names only used inside their own file are no longer shared, and one unused value and one unused package are gone',
      'A check for unused files, code and packages now runs with every change',
    ],
  },
  {
    at: '2026-10-25T12:58',
    kind: 'fix',
    title: 'No more mentions of the old Cook tab',
    items: [
      'The notification for a dish not logged yet says it is still waiting to be logged',
      'Settings › Notifications calls that section Unsaved dish; the sort menu and recipe hints name Add food',
      'Behind the scenes, the Add food code has its own name and folder',
    ],
  },
  {
    at: '2026-10-25T12:54',
    kind: 'internal',
    title: 'Clean-up: leftovers of finished one-off work removed',
    items: [
      'The database no longer keeps the ids from the old Firebase import',
      'The script that sorted the ingredients into the two-level categories is gone (it has done its job)',
    ],
  },
  {
    at: '2026-10-25T12:45',
    kind: 'new',
    title: 'More values while choosing an amount',
    items: [
      'Under the amount field, a small table shows the ingredient’s values per 100 g and per unit',
      'It has the calories and every nutrient your goal has a target for (protein, carbs, fat, fiber)',
    ],
  },
  {
    at: '2026-10-21T15:02',
    kind: 'new',
    title: 'Calories while choosing an amount, and a clear button in every field',
    items: [
      'When choosing how much of an ingredient, its calories per 100 g and per unit show right under its name',
      'Every text and number field has a small × to empty it, e.g. the weight, goals, amounts, names and notes',
    ],
  },
  {
    at: '2026-10-21T14:26',
    kind: 'fix',
    title: 'Add food no longer asks for the day',
    items: [
      'The day and the meal are the ones you opened Add food from; only who eats is chosen there',
    ],
  },
  {
    at: '2026-10-21T14:17',
    kind: 'fix',
    title: 'Meal pages: smaller changes',
    items: [
      'An empty meal opens its page too, so a recipe can be cooked from there',
      'Add food no longer asks for the meal: it is the one you opened',
      'A meal with an unsaved dish has a dot by its name on Today',
    ],
  },
  {
    at: '2026-10-21T14:06',
    kind: 'new',
    title: 'Move to…',
    items: [
      'Next to Copy to…, Move to… moves a meal to another meal, day or person',
      'A single food or a dish moves the same way from its page',
      'A dish shared with your partner stays one dish: only your portion moves',
    ],
  },
  {
    at: '2026-10-21T14:00',
    kind: 'new',
    title: 'Editing a logged dish is quicker',
    items: [
      'Edit dish shows what everyone got and each ingredient with its amount, to change right in the list',
      '+ Add ingredient goes straight to the search',
      'Who ate it and the split, and the name, leftovers and estimate, open only when tapped',
    ],
  },
  {
    at: '2026-10-21T13:47',
    kind: 'new',
    title: 'Every meal is a page of its own; no more Cook tab',
    items: [
      'Tap a meal on Today or on a day in History: it opens as a page with what was eaten, + Add food, Add from recipe and the leftovers',
      'An empty meal opens straight at Add food; Save meal leads back to the meal',
      'A dish not logged yet shows on its meal as "Unsaved dish"',
      'Recipes are managed under Ingredients › Recipes',
      'The tab bar has four tabs: Today, History, Ingredients and Settings',
    ],
  },
  {
    at: '2026-10-21T11:49',
    kind: 'fix',
    title: 'Merging duplicates: every name and value shown in full',
    items: [
      'Long names, brands and values wrap onto more lines instead of being cut off, in clearer colors',
    ],
  },
  {
    at: '2026-10-21T11:12',
    kind: 'new',
    title: 'Merging duplicate ingredients',
    items: [
      'A duplicate found by the weekly review has Compare: both ingredients side by side, the rows that differ highlighted',
      'Pick the one to keep and tap values of the other one to take them over',
      'Merge moves every meal, dish and recipe of the other one to the kept one and deletes it; logged food keeps its calories',
    ],
  },
  {
    at: '2026-10-21T10:40',
    kind: 'fix',
    title: 'Each note says what it is for',
    items: ['In the day options, every note row shows "Day" or the meal on the left'],
  },
  {
    at: '2026-10-21T10:36',
    kind: 'new',
    title: 'Notes on days and meals',
    items: [
      'The … day options have a Notes section: a note for the day and for each meal, e.g. why it was a cheat day',
      'It is saved when you leave the field; clearing it removes the note',
      'The day note shows under Meals, a meal note on its card, on Today and in History',
    ],
  },
  {
    at: '2026-10-21T10:15',
    kind: 'new',
    title: 'Categories in two levels',
    items: [
      'Every ingredient now sits in a category inside a broad category, e.g. Meat › Wurst or Snacks › Protein Bars',
      'The ingredients are sorted into the new categories; Snacks and Drinks are separate now',
      'Picking a category is two steps: first the broad category, then one inside it; every ingredient needs one',
      'The category chips show the broad categories first; tapping one shows its categories',
      'Settings › Categories deletes a category or broad category only once it is empty and says what to move first',
    ],
  },
  {
    at: '2026-10-20T19:03',
    kind: 'fix',
    title: 'Swipes at the bottom no longer close pages, and other small fixes',
    items: [
      'Swiping along the bottom edge to switch apps, or up into the app switcher, no longer closes the page you are on',
      'A new or changed ingredient keeps what you typed until it is saved, even if the page closes; "Discard" drops it',
      'In the value fields, a Next button on top of the keyboard moves to the next field; on the last one Done closes the keyboard',
      'Clear values asks first, and only its words are the button',
      'A clear (×) button in the search fields',
      'History shows days over the goal in the rings’ two over colors: over, and well over (above 110 %)',
      'Today no longer repeats the day’s calories and macros under Meals; a thicker C in the Today tab icon',
    ],
  },
  {
    at: '2026-10-20T18:01',
    kind: 'fix',
    title: 'Recipes open again after the update',
    items: [
      'The recipe pages on Cook no longer break on a phone that still had the recipe list from before recipes had choices',
    ],
  },
  {
    at: '2026-10-20T17:15',
    kind: 'new',
    title: 'Recipes with choices that learn',
    items: [
      'A recipe line can hold several products, each with its own amount (e.g. toast bread from Clever or Spar), and can be optional (e.g. Frischkäse)',
      'Cook shows the products as chips and optional lines as switches, set as last time',
      'Logging a meal from a recipe teaches it: a swapped-in product becomes a new choice, a left-out ingredient becomes optional, an added one joins as optional',
      'On a recipe’s page, tap a line to remove a product or make it optional or required',
    ],
  },
  {
    at: '2026-10-20T17:02',
    kind: 'new',
    title: 'Swap an ingredient',
    items: [
      'Tap an ingredient of a dish, then Swap ingredient: the search starts in its category (e.g. Cheese)',
      'The new product keeps the amount and who has it; one measured differently asks for its amount first',
    ],
  },
  {
    at: '2026-10-20T16:26',
    kind: 'new',
    title: 'A dish not logged yet, and the weekly review',
    items: [
      'A notification when a dish has waited on Cook for 30 minutes without being logged (15 min, 1 h or 2 h instead); it opens Cook',
      'A notification when the weekly review found something new; it opens Ingredients',
      'Both can be switched off in Settings › Notifications',
    ],
  },
  {
    at: '2026-10-20T16:16',
    kind: 'new',
    title: 'Meal reminders, day summary and partner changes',
    items: [
      'Settings › Notifications: choose what you are notified about; saved to your account for all your phones',
      'Meal reminders for breakfast, lunch and dinner (10:00, 14:00, 20:00 by default) when that meal is still empty; they open Cook for it',
      'A day summary with calories and macros against your goal: the next morning about the day before, or the same day at a time you pick',
      'When your partner changes your meals, one notification once they are done, naming the meals',
    ],
  },
  {
    at: '2026-10-20T16:04',
    kind: 'new',
    title: 'Notifications, first part',
    items: [
      'Settings › Notifications switches push notifications on or off for this iPhone (the app opened from the Home Screen)',
      'Send test notification checks that they arrive; tapping a notification opens the app',
      'Signing out turns them off on that phone',
    ],
  },
  {
    at: '2026-10-20T15:20',
    kind: 'new',
    title: 'Recipes, and copying a meal',
    items: [
      'Save as recipe on Cook keeps the dish by name: its ingredients, who eats, the split and own amounts. Shared with your household',
      'Cook › Recipes lists them; Cook this fills Cook with the ingredients’ current values. Rename or delete a recipe on its page',
      'A dish cooked from a recipe can update that recipe, or be saved as a new one',
      'In a meal: Save as recipe (a meal of several foods becomes one dish) and Copy to… another day, meal or person, with the values as logged',
    ],
  },
  {
    at: '2026-10-19T17:19',
    kind: 'fix',
    title: 'Small nutrition tables are found by themselves',
    items: [
      'A photo of the whole package is enough: the table is found, cut out, enlarged and read at full detail',
      'Tables read column by column, ingredient lists and common misreads (g as 9, l as 1) are handled',
    ],
  },
  {
    at: '2026-10-19T16:34',
    kind: 'new',
    title: 'Read nutrition labels',
    items: [
      'In an ingredient, Fill in values › Read nutrition label: take a photo of the nutrition table (or pick one) and the values per 100 g or ml are filled in',
      'The text is read on the phone, German or English; the first time it loads about 8 MB, after that it also works offline',
      'Check the values before saving; Undo takes them back',
    ],
  },
  {
    at: '2026-10-19T16:14',
    kind: 'new',
    title: 'Every past week in Trends',
    items: [
      'The Week view now goes back to any earlier calendar week with an entry: ‹ and › skip the empty ones',
      'Tap the week to pick one from a list of all of them, with each week’s average calories',
    ],
  },
  {
    at: '2026-10-19T15:55',
    kind: 'new',
    title: 'Only complete days count; missing meals are flagged',
    items: [
      'Averages and Trends only count past days with lunch and dinner logged, no cheat day and no cheat meal; today never counts',
      'History marks every day since October 10 without lunch or dinner with an amber dot, and the day says which one is missing',
      'Trends: a cheat day is a dashed grey bar as high as the goal, a day missing a meal and today are grey; tap one to see why',
    ],
  },
  {
    at: '2026-10-19T15:08',
    kind: 'new',
    title: 'Cheat days and cheat meals',
    items: [
      'The … next to the day total (Today and any day in History) marks the day as a cheat day, or single meals as cheat meals',
      'Either leaves the whole day out of the History averages and Trends, without over colors on the rings; the weekly review skips it',
      'The day shows a label, the calendar marks it, and the export has a column for each',
    ],
  },
  {
    at: '2026-10-19T14:30',
    kind: 'internal',
    title: 'Plan: quick picks dropped',
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
