# CALculator

A household meal and nutrition tracker with a modern, card-based look that each person can customize. It runs as a Progressive Web App (PWA) installed on the iPhone home screen, is hosted on Vercel and stores its data in Supabase.

Built for a two-person household: both members log their own meals, can see and edit each other's days, and share one ingredient database.

**Live app:** https://cal-calculator-2.vercel.app

---

## Features

### Logging food (Cook tab)

- **One place for everything you eat**, alone or together: a snack, a quick breakfast or a dish cooked for two. The Today and History pages only show, change and delete.
- **Who eats:** tap yourself and/or your partner. **When:** the day (today, or an earlier one) and the meal, which follows the time of day until you pick one (e.g. Dinner in the evening).
- Add ingredients from the shared **ingredient database** (with search) or as a **custom one-off item** that isn't saved to the database. Amounts in **grams (or millilitres, for an ingredient measured in ml) or the ingredient's own unit** (e.g. "Riegel"), with a **live preview** of calories and macros. For units, **amount chips** in two rows: **whole numbers** (1 to 5) set the amount, and **fractions** (¼ ⅓ ½ ⅔ ¾) fill in parts the iPhone number pad can't type: 2 then ½ makes "2 1/2", and ⅓ stays an exact third. Typed fractions such as "1/3" work too.
- The ingredient search has the **category chips** of the Ingredients page, in the layout chosen under Appearance › Category chips. The search and the chosen chip stay while you look at an amount and go back; a new search starts over.
- Not in the database yet? **New ingredient** in the search creates it right there (the name you searched for already filled in, same form as on the Ingredients page). It is saved to the shared ingredients and goes straight to its amount; Back from there leads to the search. Also in the dish editor on Today and History.
- Adding an ingredient goes **step by step like the Settings pages**: the search and the amount each slide in as a page of their own. **‹ Back** or a **swipe to the right** goes back one step (amount → search, still showing what you searched for → dish), never to another tab. Back in the dish editor on Today and History goes one step at a time too.
- With two people, each ingredient is **Shared** (split by the dish's split), **only for one person** (e.g. the tomato on her burger) or has **own amounts** per person (noodles 120 g / 100 g). The split for shared ingredients: **Equal**, **Count** (3 toasts : 2 toasts), **%**, or **Weight** (weigh the cooked dish and each plate). What each portion gets is shown live; a split that can't work (e.g. 110 %) says why.
- **Swap ingredient** (tap an ingredient of the dish): another product for it, e.g. Edamer from Spar instead of Gouda from Billa. The search starts in its category; the new product keeps the amount and who has it. If it can't be measured that way (e.g. slices, but no slice size), its amount is asked for first. Also in the dish editor on Today and History.
- Optional **dish name** and **leftover portions** (each takes its share like a person would).
- While a dish waits on Cook without being logged, the **Cook tab shows a dot**, wherever you are in the app.
- **Calories are an estimate:** a switch for food whose calories you only roughly know (eaten out, cooked by someone else; e.g. a custom item "Pizza, 900 kcal"). It applies to the whole dish and can be changed later with Edit dish. Adding an ingredient that is **marked as an estimate** switches it on by itself, with a note naming that ingredient; it can still be switched off for the dish. The calories still count in full, but show as **"~900 kcal"** with an "Estimate" label.
- **Save meal** logs everything at once (each person's portion into their own meal) and goes back to where you came from.
- The draft is **kept on the phone** while you put it together, so switching tabs or iOS closing the app loses nothing. **Discard** starts over.
- **Leftovers** of the last 7 days are listed at the top of Cook: eat one in any meal (for you or your partner), or **throw it away** (it keeps its share, so the eaten portions never change). While food is left, a **"Chili left"** pill sits next to "Meals" on Today and opens Cook.
- Every logged food keeps a **snapshot of its nutrition values**. Editing an ingredient updates the food logged with it in the **last 14 days** (today and the 13 days before, for both of you, plain food and dishes alike) and says how many meals changed; older meals keep the values they were logged with.
- Works offline like every change (queued on the phone, sent in order once back online).
- **Recipes** for what you cook often, even with changing products (toast with Clever or Spar bread, Gouda or Edamer, Frischkäse only sometimes):
  - **Save as recipe** keeps the dish on Cook by name (who eats, the split, own amounts, leftover portions), shared by both of you. **Cook › Recipes** lists them with their calories; **Cook this** fills Cook (asking first if a dish is already there) with the **current values** of the ingredients (custom items and deleted ingredients keep the values they were saved with). No scaling.
  - A recipe line can hold **several products**, each with its own amount, and can be **optional**. On Cook, "From “Toast”" shows the products as chips and optional lines as switches, set as **last time**.
  - **It learns when the meal is logged:** a product swapped in (Swap ingredient) becomes a new choice and next time's pick, an ingredient removed becomes optional and stays off next time, one added joins as an optional line, amounts follow what was used. Offline it learns the next time.
  - On a recipe's page: tap a line to remove a product from it or switch it between optional and required; rename and delete the recipe. **Save as recipe** on a dish cooked from a recipe offers **Update** (the same learning) or **Save as new recipe**. Saving and renaming need a connection.

### Today

- One **Breakfast, Lunch, Dinner and Snacks** per person and day, with **day total** and per-meal totals. Unknown nutrients show as "–" instead of a misleading 0.
- **Weight** next to the "Today" title (it costs no height): your current weight; tap to enter today's. On your partner's day it shows their weight.
- Tapping an **empty meal opens Cook** already set to that person, day and meal.
- In a meal, a food logged alone shows as a **plain row**: tap to change its amount, swipe to delete. Anything else is **one block** (its name, or "Pasta, Pesto +2"; "Shared" when you both ate it) with your share, opening to its ingredients and **Edit dish** (who eats, amounts, split, name, leftovers). Sharing a meal afterwards is simply adding your partner there.
- Below a meal: **Copy to…** copies it to another day, meal or person (e.g. the same breakfast for your partner), each dish with exactly the logged amounts and values; **Save as recipe** keeps a meal of one dish as that whole dish (everyone who ate it), and merges a meal of several foods into one dish of what that person ate.
- Either of you can change or delete a dish; all portions follow. Deleting a dish that has other portions **asks first**. If both of you changed it at the same time, the later save is refused instead of overwriting the other.
- On the Today cards a dish counts as **one item**. The whole page (person switch, goal card and all four meals) **fits an iPhone screen without scrolling**.
- "Today" moves on at midnight, and when the app comes back to the foreground on a later day.
- **Cheat days and cheat meals** (the **…** next to the day total, on Today and on any day in History): mark the whole day as a **cheat day**, or single meals as **cheat meals** (also an empty one). Either leaves the whole day out of the History averages and Trends, the rings show no over colors that day and the weekly review skips it. The food still counts in the day's totals. The day shows a "Cheat day" or "Cheat meal" label, a cheat meal's card says "Cheat meal". Either of you can set or remove them on any day; they work offline like meals.
- **Notes** (same sheet, on any day, cheat or not): a short note for the day and for each meal ("Birthday at Oma's", "Pizza with colleagues"), up to 500 characters, saved when you leave the field; clearing it removes the note. The day's note shows under the Meals heading, a meal's note as a line on its card. Either of you can write them; they work offline like meals.

### Daily goals and progress

- Per-person daily goal: **calories required**; protein, carbs, fat and **fiber** optional, plus an optional **target weight** (shown on the weight chart).
- A **progress card** on each day: a large calorie ring with the kcal left (or over) in the middle, and a bar per macro (protein, carbs, fat, fiber; **Ring + bars**, the default). Shows consumed / target and how much is left or over. Calories always show; each macro only if it has a target. Also available as a small ring per macro, all **bars**, or **compact** bars (Settings › Appearance).
- Goals have a history: a new goal applies **from today on**, and past days keep the goal they had.
- A "≥" marks totals that are only a lower bound (some logged items had no value for that nutrient).
- A "~" marks calories that are only approximate: once a meal holds a dish marked as an estimate, its meal card, the day total and the calorie ring (consumed and left) show "~".

### History

- **Month calendar** (Monday first): every logged day is marked green (within that day's calorie goal), red (over) or neutral (logged, no goal yet). A cheat day has a dashed outline instead, a day with a cheat meal is neutral with a small dot. A past day since October 10 (when tracking started) without food at **lunch or dinner** is neutral with an **amber dot** ("lunch or dinner missing"), also when nothing was logged at all; breakfast and snacks may be empty. Opening it says which one ("Dinner missing").
- **Which days count:** only complete past days: lunch and dinner logged, not a cheat day and no cheat meal. Today never counts, it isn't over yet. The same rule applies to the month summary and to Trends.
- Month summary: days logged (those that count), average calories and protein, and how many days with food were left out (cheat days, days with a cheat meal, days missing lunch or dinner). The average shows "~" when a day in it had estimated calories.
- **Tap any past day** to show its rings, totals and meals **right beneath the calendar**, and **edit it like today**. A forgotten dinner: tap the empty Dinner, which opens Cook for that day and comes back here after saving. Tap another day to switch, or the same day again to close it. The selected day is kept in the address (`/history/YYYY-MM-DD`), so reopening the app keeps it. Also for your partner's days.
- Under the day's meals, its **weight**: the latest entry up to that day ("72.4 kg, since Mon, Oct 5"). Tap it to set that day's weight (also for past days) or delete the day's entry. Your partner's weight is shown, but only you change yours.
- **Calendar | Trends** at the top switches to the trends:
  - **Range:** **Week** (a calendar week, Monday to Sunday, with weekday labels and compared with the week before; the default is the current one). **‹ ›** step to the previous or next week with at least one entry, and tapping **Week 43** lists every such week, newest first, with its Ø calories, to jump to one; 4 weeks, 3 months, 6 months or 1 year. **Chips** for what has a goal: Calories always, each nutrient with a target (protein, carbs, fat, fiber), and **Weight** once there is a target weight or an entry.
  - **Calories and nutrients:** one bar per logged day in the ring color (per week, as the average of its counted days, for 6 months and 1 year), the goal as a dashed line that follows the goal history. Days that don't count still show, so nothing looks like a gap: a cheat day or a day with a cheat meal is a **dashed grey bar exactly as high as the goal** (its numbers don't matter and never stretch the chart), a day missing lunch or dinner shows what was logged **in grey**, and today shows what's logged **so far in grey**. Tapping one says why ("cheat day · not counted", "700 kcal · lunch or dinner missing · not counted"). The figures below only use counted days. Tap a bar for its value; days with estimated calories are lighter and read "~". Below: Ø per logged day, days within the goal (calories) or reaching it (nutrients), and the change against the range before.
  - **Weight:** a line through the entries (the weight from before the range starts it, hollow), the **target weight** as a dashed line, and Current, Change over the range and **To goal** (to lose or gain, or Reached). **Add weight** for any day up to today, and the latest entries to change or delete.
  - The charts are drawn by the app itself (no chart library), with a hidden table of the values for VoiceOver.

### Household

- Accounts with email and password. One person creates a **household**, the other joins with a **12-character invite code** (shareable through the iOS share sheet).
- A **person switch** on Today shows a household member's day, rings and meals. Members can log and edit meals for each other.
- Your **name** shown to the household is under Settings › Account.
- **Your partner, your way** (Settings › Members › your partner): give them a **nickname** (default **“baby”**, up to 20 characters) and a **symbol** in place of the initial: a **heart** (default) or one of 65 emojis in three groups: **Hearts** (❤️ 🩷 🧡 💛 💚 🩵 💙 💜 🖤 🤍 ❤️‍🔥 💕 🥰 …), **Cute** (🌸 🐻 🧸 🐰 🐱 🦄 🍓 🌙 …) and **Cool** (🔥 ⚡ 😎 👑 💎 🚀 🦊 🐉 👻 🎧 …), in any color (the shared color list, default Rose, or a custom one). Only you see it, everywhere they appear (person switch, goal card, cooking together, members); their account name stays unchanged and is shown next to the nickname in Settings. Saved to your account in `profiles.appearance` (`partnerLooks`, by member id), so it follows you to every device. Leaving the nickname empty goes back to “baby”; **Reset** goes back to “baby” and the heart.
- **Your own symbol** (Settings › Account › Symbol): show yourself with a heart or any of the same emojis, in any color, instead of your initial in your accent color. Only you see it (your partner keeps seeing what they picked for you); your name stays your account name. Saved in `profiles.appearance` (`ownLook`). **Reset** goes back to your initial.

### Export (Settings › Export)

- Pick a date range (the last 30 days to start) and get two CSV files of **both of you**: every logged food (person, date, meal, food, brand, amount, unit, kcal and nutrients in label order, estimate) and each day's totals with weight, cheat day and cheat meal. Semicolons and decimal commas, so Excel and Numbers open them in columns. On the iPhone they go to the share sheet (Save to Files, Mail, …), elsewhere they download.

### Ingredient database (Ingredients tab)

- Shared per household, with **accent-insensitive search** (`kase` finds `Käse`) and category filter chips: **broad categories first** (Meat, Snacks, …); tapping one filters by it and shows its categories (Wurst, Leberkäse, …). As one sideways-scrolling line, all on screen, or **grouped** with the categories opening below (Settings › Appearance).
- **Sorting** (the button at the right, under the category chips): **Newest first** (default: the ingredient added last is on top), **A–Z** (grouped by category, as before), **Most used** (how often it went into a dish or was logged on its own; a dish eaten by two counts once) or **Fewest calories** (per 100 g or ml; ingredients with values per unit only come after them). The same order applies to the Ingredients tab and the Cook search, and is saved to your account, like Appearance (`appearance.ingredientSort`).
- **Brands stand out:** each ingredient's brand is a small label in the accent color above its name (in the Ingredients tab, the Cook search and Copy from an ingredient), so a list can be read for brands alone.
- **Filter by brand** (under the category chips, on the Ingredients tab and in the Cook search): a list of the saved brands with how many ingredients each has, searchable; the chosen brand works together with the search and the category, and ⓧ shows every brand again. On Cook it stays chosen while you look at an ingredient's amount and come back.
- Nutrition **per 100 g and/or per unit**: calories (whole numbers, rounded up), protein, carbs, sugar, fat, saturated fat, fiber, salt. Only calories are required.
- **Measured in grams or millilitres** (above the values): for a drink, choose **Millilitres** and enter the values **per 100 ml** and the **millilitres per unit** (e.g. 250 ml per glass). It is then added to dishes in ml or in its unit, and shows in ml on the dish, Today and History ("300 ml"). There is no conversion between grams and ml. Copying values from another ingredient takes over its measure too.
- Unit name and grams per unit, with **Calculate missing values**, which only fills empty fields and never replaces what you typed: calories from protein, carbs and fat (4/4/9 kcal per gram, fiber 2; this marks the ingredient as an estimate, which can be switched off), the grams per unit from the calories per 100 g and per unit, and then each section's empty values from the other with the grams per unit.
- **Clearing values:** every filled value (and the unit name and grams per unit) has a grey ⓧ to empty just that field; **Clear values per 100 g / per unit** empties a whole section, which stays switched on for the right values. An **Undo** shows in place of the button for a few seconds.
- **Split into smaller units** (in Per unit): when the values per unit are for a portion of several pieces (e.g. "3 Kekse (30 g)"), enter how many pieces a portion is and every value per unit and the grams per unit are divided by it; per 100 g stays. For scanned products the package's portion is shown and its count already filled in.
- **Read nutrition label** (Fill in values, first row): take a photo of the nutrition table or pick one from your photos, and the values **per 100 g** (or per 100 ml, when the label says so) are filled in: calories (from kJ when kcal are missing), fat, saturates, carbs, sugars, fiber, protein and salt, German or English, decimal commas, mg, "< 0,5 g". **No cropping needed:** a small table on a whole package is found by itself: the photo is read once to find where the table's header and energy row are (Nährwerte, Energie, Brennwert, kcal, kJ; never "Zucker" or "Salz" from the ingredients), then that part of the full-size photo is cut out, scaled so its letters are about 24 px high, made grey with more contrast and read again; the reading with more values wins and fills the other's gaps (a close-up with very big letters is searched again at half size). It always takes a row's first column (per 100 g, before per portion and %), also when a value sits on the line after its name or the table was read column by column (all names, then all values), skips ingredient lists and the "pro 100 g" header, and fixes what text recognition typically gets wrong: a "9" in place of the unit "g" ("9,89" → 9.8, "589g" → 58), l, I or | for 1 and O for 0 next to numbers. Per unit, the unit and the name stay; **Undo** takes the values back, and the value checks below flag anything odd. Nothing is saved before you tap Save. The **text recognition runs on the phone** (tesseract.js, no online service): about 8 MB (the engine, German and English) are served by the app itself under `/ocr/<version>/`, loaded only the first time you read a label and kept by the service worker from then on, so it also works offline. Photos are made smaller (2000 px) first, so reading takes a few seconds.
- **Fill in values** for food without values on it: **Copy from an ingredient** (search your saved ones; takes over the values, unit and estimate mark, the name only when still empty) or **Search Open Food Facts** by name (photo, brand and calories per result; a similar product's values, never its barcode). It searches when you tap Search, through the app's own address (`/off/search`, forwarded to Open Food Facts' search service by Vercel and by the dev server), because Open Food Facts doesn't allow searches straight from the browser. Both have Undo.
- **Check these values:** while you type, values that look wrong are listed above the values and shown in red: per unit not matching per 100 g and the grams per unit, calories that don't fit protein, carbs and fat, more than 100 g of nutrients per 100 g (not per 100 ml: 100 ml of honey or syrup weighs more than 100 g) or over 900 kcal, more sugar than carbs or saturated fat than fat (per 100 g and per unit). They go away once fixed; saving is never blocked. Ingredients already saved are checked by the weekly review (point 20).
- **Values are an estimate:** a switch for values you guessed, e.g. a dish from your favorite restaurant saved as an ingredient. Lists show its calories with "~" (e.g. "~900 kcal / pizza"), and dishes with it are marked as an estimate.
- **Brand** with suggestions: typing shows the brands already saved (those starting with the text first, then those containing it; case and accents don't matter, each brand once in its usual spelling). Tap one to take it exactly as saved; a new brand can still be typed.
- **Category, in two steps:** first the broad category (Meat), then a category inside it (Wurst), or a new one created on the fly inside it. Every ingredient has one; saving without is refused. Note.
- Categories are **deleted automatically** once their last ingredient leaves them.
- **Barcodes:** each ingredient can carry its package's barcode (EAN-8, EAN-13, UPC-A, ITF-14; one ingredient per barcode in a household). Type it or scan it in the ingredient form. For a saved ingredient with a barcode, **Fill empty values from Open Food Facts** looks it up and fills in only what is still empty.

### Barcode scanner

- A **barcode button** sits at the end of the search on **Cook › Add ingredient** and on the **Ingredients** tab.
- **Already saved:** Cook goes straight to the amount; the Ingredients tab opens the ingredient.
- **New package:** the New ingredient form opens **filled in from [Open Food Facts](https://world.openfoodfacts.org)**: name (each word capitalised, e.g. "Low Sugar Gummies"; the brand as it is), brand, and the values **per 100 g and per portion** (the portion's weight as grams per unit; the unit name is left for you, e.g. bar or pack). A product sold or portioned in **ml, cl or litres** (a drink) is filled in **in ml**: values per 100 ml and the portion in ml. Values the package states are used as they are; a missing side is worked out from the other with the portion weight (without a weight, per 100 g stays empty). A note shows the **product photo, pack size and portion** as printed, to tell it's the right product, and asks to check the values against the package; **Reset to the values from Open Food Facts** undoes your changes. Gaps in the product data (no calories, a portion bigger than the pack, per-portion values without a portion weight) are listed under **"Check the product data"**; the values themselves are checked live in the form (see Ingredient database). Nothing is saved before you tap Save. Unknown values stay empty instead of 0. Not found, offline or too slow (6 s): an empty form with the barcode (and on Cook the searched name) already in it.
- **A package you already saved without its barcode:** above the new form, the saved ingredient it most likely is gets suggested ("Is this Skyr (Milbona)?", from the name and brand; only ingredients without a barcode). **Use it** saves the barcode on that ingredient and goes on as if it had been found (Cook: its amount; Ingredients: the ingredient). **Add to an existing ingredient** picks any saved one; replacing an ingredient's other barcode asks first. Ignoring both just leaves the new form as it is.
- **Scanner page:** full-screen camera with a scan frame and a **torch** switch (where the phone offers one). It reads a few times a second and closes by itself. If the camera can't be used (permission off, no camera), it says so and offers the two fallbacks, which are always there: **Take photo** (the iOS camera, then the photo is read) and **Type number** (the check digit catches typos).
- iPhone browsers have no built-in barcode reader, so the app ships ZXing (WebAssembly, ~1 MB, via `barcode-detector`). It is loaded only when you scan, served by the app itself (no CDN) and stored for offline use. The camera is turned off as soon as a code is read or the page closes, and restarted when the app comes back from the background.
- **Settings › Categories** manages them: add, rename and delete broad categories; add, rename, move between broad categories and delete categories. Only an empty one can be deleted (it says what to move first). Swipe right to go back to Settings.

### Notifications (Settings › Notifications)

- **Push notifications on the iPhone**, for the app opened from the Home Screen (iOS 16.4 or later; a Safari tab says to add it to the Home Screen first). Switched on per phone: the switch asks iOS for permission right from the tap. If they are blocked in the iPhone's settings, the page says where to allow them.
- **Send test notification** sends one to every phone of yours that has them on and says how many it reached. Tapping a notification opens the app on the right page.
- Signing out turns them off on that phone; signing in as the other person there and opening this page takes the phone over.
- **What you are notified about** is saved to your account (only you see it), so all your phones follow it; each kind is on by default:
  - **Your partner changes your meals**: they log, change or delete food in one of your meals, mark it as a cheat meal, or log a dish you eat too. Told once they stopped for 3 minutes, as one notification ("baby changed your meals · Today: Lunch, Dinner"), using your nickname for them. It opens that day.
  - **Meal reminders** for breakfast, lunch and dinner (10:00, 14:00, 20:00; each on or off, any time): only if that meal is still empty (or not marked as a cheat meal). It opens Cook for that meal.
  - **Day summary**: calories and macros against your goal. By default the **next morning at 08:00 about the day before** (so late snacks count); it can be the **same day** at any time instead (e.g. 23:00). Days with nothing logged get none. It opens that day.
  - The times follow the time zone of the phone that last opened this page. A notification is sent at most once and up to 2 hours late (e.g. if the server was busy), never later.
  - **A dish not logged yet**: a dish has waited on Cook without changes for 30 minutes (15 min, 1 h or 2 h instead); told once per change of the dish. It opens Cook. Only its name (or first ingredients) and when it last changed leave the phone; logging or discarding it forgets that at once.
  - **Weekly review found something**: new open findings of the weekly review (point 20), once per review. It opens Ingredients.

### Works offline

- The last loaded data (days, ingredients, goals, profile) is **stored on the phone for 7 days**, so the app opens without a connection.
- **Meal and weight changes made offline** still show immediately, are queued, and are sent in order when the connection returns, even after the app was closed. Every change is idempotent (items get their ID on the phone), so resending can never create duplicates. Network failures are retried until they succeed. The moment the app goes to the background, the queue is written to the phone right away, so iOS closing it straight after a change loses nothing.
- A pill above the tab bar shows the state: _Offline_, _Offline · 2 changes pending_, _Saving 2 changes…_
- iOS doesn't run web apps in the background, so queued changes go out the next time the app is open with a connection.

### Live updates

- **Your partner's changes appear on your phone within about a second**, without reloading: food they log or change (also in your meals, e.g. a shared dish), leftovers, recipes, ingredients and categories, goals, and their name. The same works for your own changes made on another phone. Nothing pops up; the numbers just change in place.
- **While you edit a dish your partner saves the same dish**: your draft stays as it is, and a line _Updated on another phone · Load changes_ lets you load their version. Saving over it is held back with a short explanation (your draft stays), so neither edit is lost silently.
- While your own changes are still being saved, a partner's change waits until yours are through, so your change never briefly flickers back.
- iOS cuts the connection when the app goes to the background; when it comes back, it reconnects and catches up on everything that changed meanwhile.

### App updates

- A new version (every deploy) downloads in the background and **waits** instead of taking over while you use the app. If it arrives while the app is open, a toast **"New version ready · Update"** offers to switch right away; ignored, it comes back whenever the app returns from the background, and the new version starts with the next app start anyway. The app looks for updates on every return from the background, since iOS otherwise only checks at start.
- The **first start on a new version** shows **"Updated to the latest version"**; the next start doesn't. Remembered per phone (a first install or a new phone shows nothing).
- The bottom of **Settings** shows the running version: build day and short commit, e.g. _Version 8 Oct 2026 · 9a26e06_.

### Look and feel

- Rounded cards on a soft background, the Manrope font, meals as a 2×2 grid of cards, avatars (your initial on your accent color, your partner's symbol on a soft tint of its color) in the person switch and member list. Bottom sheets (drag down to close), segmented controls, switches and swipe actions.
- **Floating tab bar** (Today · Cook · History · Ingredients · Settings): the active tab shows its label in an accent tint. **Swipe left and right** to switch tabs with an animated settle, and tap the active tab to scroll to the top. Dragging a slider or a draggable spot moves only that control, never the tabs or the page.
- **Pages inside Settings** (Appearance and its pages, Categories, your partner) behave like an iOS navigation stack: an opened page slides in over the one it came from, Back slides it away, and **swiping right drags it away with your finger** while the page below moves in from the left (let go past a third of the screen, or flick, to go back; otherwise it springs back). Each page keeps its scroll position. With Reduce Motion on, pages switch at once. Pages and sheets scroll without a visible scroll indicator.
- Installable to the home screen (manifest, icons, safe areas, no zoom on input focus). Headers without buttons (Today, History, Settings) leave extra room at the top so titles stay clear of the fade iOS draws below the status bar.

### Appearance (Settings › Appearance)

Everything here is saved **to your account**, never to the device: you get the same look on every phone or browser you log in on. Changes apply instantly. Appearance is a menu of four pages, each row summarising its current choices; the back button or a swipe to the right goes up one level.

- **App colors**
  - **Theme:** System, Light or Dark.
  - **Light style:** **Classic** (cool grey and white) or **Pink** (blush page, rose-tinted cards, text and tracks, pink-leaning goal colors). Used whenever the app is light, also with System during the day.
  - **Dark style:** **Soft** (deep grey, rounded) or **Graphite** (near-black, Space Grotesk numbers, uppercase labels; stored as `bento`). Used whenever the app is dark, also with System at night.
  - **Liquid Glass:** **Off**, **Minimal** (the tab bar, sheets and every field turn to translucent, blurred glass: lists, form groups, search fields, chips, pills, buttons, meal cards, segmented controls; only the big progress card stays solid) or **Full** (the progress card too, over a soft color background made from the style's own ring colors). Works on top of every light and dark style; rows you can swipe to delete stay solid.
  - **Background** (with Liquid Glass Full): the colors behind the glass, as soft spots, set by three independent choices. **Spots**: how many, 1 to 6, each with its own size (in a sheet). **Position**: **Specified** (drag each spot in the preview, or move it with the arrow keys), **Random** (each spot moves a little from where it was, up to about 15 % of the screen, on every tab change or once per app start; the next app start carries on from there) or **Moving** (the spots wander on their own, up to a quarter of the screen, slow, medium or fast; they stay still when the phone asks for less motion, and the page says so). **Colors**: **Custom** (each spot's own color), **Preset** (the style's ring colors, Sunset, Ocean, Forest, Candy), **Cycle** (through your own list of colors) or **Random** (both on every tab change or once per app start). A Strength slider. Changes fade over; the preview shows the same spots, moving ones included.
  - **Accent color:** any color (buttons, the active tab, your avatar). Text in the accent color is darkened or lightened automatically so it stays readable, e.g. Lime or White on a light background; a White accent gets a thin edge on its buttons, chips and avatar.
- **Progress** (with a live preview at the top)
  - **Progress style:** Rings, **Ring + bars** (default: a calorie ring, bars for the macros), Bars or Compact.
  - **Goal colors:** Vivid, Pastel, Accent shades or High contrast.
  - **Ring colors:** give Calories, Protein, Carbs, Fat or Fiber **its own color**; the others keep the palette's. "Use palette color" undoes one, and choosing a palette resets them all. A custom color stays the same in every theme, except that a White ring is darkened just enough to show on light cards.
  - **When over:** calories, carbs and fat change color once full: one color up to 10 % over, another above (protein and fiber keep theirs). **Signal** (amber, then red; default), **Ember**, **Neon**, your own two colors, or **Off**; a second preview shows a day that's over.
- **Choosing a color** works the same everywhere (accent, ring colors, your partner's and your own symbol color): **35 preset colors** in one list by hue (every color the separate lists offered before, plus **White**), and **Custom** (the rainbow circle) for any color with the system color picker: moving through the picker only previews the color, **Use this color** saves it (saving every color passed on the way would close the picker on the iPhone).
- **Category chips** (with a preview): **One line** (default, scrolls sideways), **All on screen** (slimmer chips wrapping into rows) or **Grouped** (tapping a broad category opens its categories below; in the other two, its categories take the place of the broad ones until All is tapped) for the category filter on the Ingredients page. Wrapped chips are **arranged automatically to fill as few rows as possible** ("All" stays first; alphabetical within each row), measured on the device and re-arranged when the width or fonts change.
- **Patch notes:** tap the version line at the bottom of Settings to see every change with its day and hour, newest first.
- **App icon:** eight versions of the C-ring icon: **Graphite** (default), Classic, Pink, Sunset, Progress, Ember, Leaf and Violet. Used when you add the app to the home screen (also before signing in, on a phone you used before) and in the browser tab. Picking a new icon **copies the app's link** (a short message confirms it), ready to paste into Safari when adding the app again. To change an installed icon, see [Installing on the iPhone](#installing-on-the-iphone).

---

## Fixes and improvements, noted 2026-10-20 (planned)

Build plan with every decision: [`docs/plan-2026-10-20.md`](docs/plan-2026-10-20.md). Order: quick fixes → categories and duplicates → meals and Cook → clean-up.

**Quick fixes**

- [x] **32.** A swipe along the bottom of the screen (switching apps) or up into the app switcher no longer closes the page you're on; a new ingredient's values are kept on the phone until saved
- [x] **33.** In the value fields, a **Next** button on top of the keyboard moves to the next field (keyboard stays open); on the last one **Done** closes the keyboard (the ✓ of the iPhone's bar keeps closing it: iOS opens the keyboard only for a field tapped in the page)
- [x] **34.** Clear values asks first, and the button is just its text
- [x] **35.** A clear (×) button in the Ingredients search
- [x] **36.** A thicker "C" in the Today tab icon, closer to the app icon
- [x] **37.** History: days over the goal in the ring's two "over" colors (over, and well over above 110 %)

**Categories and duplicates**

- [x] **38.** Categories redone in two levels: broad ones like Meat, specific ones inside like Leberkäse; every ingredient must have one, and only a specific one; picked in two steps (the new tree, reviewed: `scripts/recategorize/tree.json`)
- [x] **39.** The review merges duplicates: both side by side with their differences, pick which one stays (and single values from the other); everything logged with the other moves over

**Meals and Cook**

- [ ] **40.** No Cook tab: tapping a meal on Today or in History opens it as a page with **Add food** (the Cook form, set to that person, day and meal; an empty meal opens it straight away); leftovers there and as the pill on Today; recipes via **Add from recipe**, managed under Ingredients; an unsaved dish shows on its meal
- [ ] **41.** Editing past meals without the Cook form: change amounts and remove foods right in the meal page; a dish in a compact view
- [ ] **42.** **Move to…** next to Copy to…: a meal or a single food to another meal, day or person
- [x] **43.** Today tidied: the day's kcal and macros under "Meals" go (the rings already show them); the layout stays

**Added 2026-10-21**

- [x] **45.** Notes on any day and meal (e.g. why it was a cheat day), written in the day options, shown on Today and History

**Clean-up**

- [ ] **44.** A full tidy-up behind the scenes: unused files and code removed, files in a clearer structure, unused database parts dropped

## Fixes and improvements, October 11–20 (done)

Noted 2026-10-11.

**1. Checking the data automatically** (replaced by the weekly review, point 20; the push comes with point 10)

- [x] ~~Ingredients whose values look wrong say **Check values** in both lists, with a **Check values · N** filter~~ (removed 2026-10-16: the weekly review covers it, under **Review** in the Ingredients header)
- [x] A push notification when the weekly review finds something new (see point 10)

**2. Keeping the Supabase projects awake** (done)

- [x] An automatic request now and then to **both** Supabase projects (the real one and the dev one), so a project without use for a while isn't paused (and later deleted) by Supabase

**3. Ingredient changes in past meals** (done)

- [x] When an ingredient is edited, meals with it from the **last 14 days** (today and the 13 days before) get the new values automatically, for both of you; older meals keep their old values
- [x] After saving, a short note says how many meals were updated (e.g. "Updated in 5 meals")

**4. Cook: New ingredient and Custom item at the top** (done)

- [x] In the Cook ingredient search, New ingredient and Custom item move from the list to a small **+** at the top, like on the Ingredients tab

Noted 2026-10-15.

**5. Nutrients in label order** (done)

- [x] Everywhere nutrients are listed or entered (ingredient form, ingredient details, dish and day totals, barcode prefill), they follow the order of a nutrition label: Energy, Fat, _of which saturates_, Carbohydrate, _of which sugars_, Fibre, Protein, Salt
- [x] Saturates and sugars are shown indented as "of which" lines
- [x] The progress rings and bars on Today keep their order (kcal · protein · carbs · fat)

**6. One place to change your symbol** (done)

- [x] Your symbol is changed only under **Account** (next to your name)
- [x] Under **Members** you're still listed, but your row can't be tapped; only your partner's row opens a page

**7. New Today tab icon** (done)

- [x] The Today tab icon becomes the app icon's "C" ring with the dot at its opening, in one color like the other tab icons

**8. Liquid Glass** (done)

- [x] Both versions from the comparison, as one setting in Settings › Appearance › App colors: **Off**, **Controls** (tab bar and sheets as glass) or **Everything** (the cards too, over a soft color background)
- [x] Works on top of every style, light and dark; saved to your account like every other appearance setting

**Order from 2026-10-16** (small first, big last): 11 (Cook badge) · 15 · 29 · 12 · 13 · 9 · 14 · 10 (with the push of 11).

**29. Rings and bars when over** (done)

- [x] Calories, carbs and fat change color once full: one color from 100 % up to 110 %, another above 110 % (protein and fiber keep theirs)
- [x] One pair of colors for all three in Appearance › Progress › **When over**: signal presets (**Signal**: amber and red, the default; **Ember**: orange and deep red; **Neon**: purple and magenta), your own two colors, or **Off**

**30. Only complete days count** (done)

- [x] Averages in History and Trends count only past days with lunch and dinner logged, no cheat day and no cheat meal; today never counts
- [x] History marks every day since October 10 without lunch or dinner (also empty ones) with an amber dot; the day says which one is missing
- [x] Trends: a cheat day is a dashed grey bar as high as the goal, a day missing a meal and today are grey

**31. Every past calendar week in Trends** (done)

- [x] Besides 4 weeks, 3 and 6 months and 1 year, the **Week** view can show **any past calendar week** (Monday to Sunday) that has at least one entry, plus the current one
- [x] Step back and forth with arrows (weeks without any entry are skipped), or tap the week to pick one from a list of all of them, newest first, with each week's Ø calories
- [x] Everything else works as for the current week: bars per day, the figures, and "vs. previous" against the week before it

**9. Reading nutrition labels** (done; being tried on real packages over the next days, as of 2026-10-20)

- [x] For products without a barcode: take a photo of the nutrition table (or pick one from your photos) and the ingredient form gets filled in
- [x] Text recognition runs on the phone (no online service, works offline); it loads only the first time you use it
- [x] Reads German and English labels and takes the per-100 g / per-100 ml column; you always check the values before saving

**10. Notifications** (done; the test notification arrives on the iPhone, confirmed 2026-10-20; the timed ones are being watched over the next days)

- [x] Push notifications on the iPhone (home-screen app), switched on once in Settings
- [x] **Everything is set per person**, saved to your account: each kind on or off, and every time below can be changed
- [x] A **Send test notification** button
- [x] **Partner changes your day**: your partner logs, edits or deletes a meal for you, or shares a dish with you
- [x] **Unsaved Cook dish**: a dish has been sitting on Cook without being logged for a while (default 30 minutes, adjustable)
- [x] **Meal reminders**: nothing logged for breakfast, lunch or dinner by a time you set (defaults 10:00, 14:00, 20:00; each one on or off)
- [x] **Day summary**: kcal and macros vs. your goal. Default: the **next morning** about the day before (so evening snacks count); each person can switch to the same day and pick the time (e.g. 23:00)
- [x] **Weekly review**: the weekly review (point 20) found something new

**11. Unsaved Cook dishes** (done)

- [x] A dish on Cook that hasn't been logged yet gets a badge on the Cook tab
- [x] Combined with the "Unsaved Cook dish" notification from point 10 (the phone tells the server only the dish's name and when it last changed; the draft itself stays on the phone)

**12. Quick picks** (dropped: the "Most used" sort already covers it)

**13. Cheat days and cheat meals** (done; first planned as "doesn't count" and "eaten out")

- [x] **Cheat day**: mark a whole day
- [x] **Cheat meal**: mark single meals (also an empty one); this leaves the whole day out too
- [x] Both: a label on Today and in History, the day is left out of the averages and Trends, the rings show no over colors that day (point 29), the weekly review skips it, and the export has a column for each
- [x] Both can be set, changed and removed on any day, also past ones, by either of you (like meals)

**14. Recipes** (done; reworked 2026-10-20 for changing products, being tried in daily use)

- [x] Save a dish or a whole meal by name as a **recipe**: its ingredient lines, split and own amounts; shared by both of you (a meal of several foods is merged into one dish)
- [x] A **Recipes** list on Cook: tap one and Cook is filled in as saved; change anything, then log. Rename, change and delete recipes
- [x] Recipes use the current values of their ingredients
- [x] **Copy a meal** to another day, meal or person, with the values as logged
- [x] **Swap ingredient** on Cook (same category, keeps amount and who has it)
- [x] Recipe lines with **several products** and **optional** lines, picked as last time; the recipe **learns** from every logged meal

**15. Export** (done)

- [x] Settings › Export: pick a date range and get CSV files of both of you: every logged food (person, date, meal, food, amount, nutrients) and the daily totals with weight (with "Cheat day" and "Cheat meal" columns since point 13)

Noted 2026-10-15 after testing points 1–8 on the iPhone (these come before point 9).

**21. Patch notes** (done)

- [x] A **Patch notes** page, a little hidden: tap the version line at the bottom of Settings
- [x] Every change with its date and hour and what it does, newest first, in plain words
- [x] Starts with the history so far; from now on every change adds an entry when it ships

Noted 2026-10-15 after testing point 18 (these come next, before point 20).

**23. Dragging without swiping away** (done)

- [x] Anywhere something is dragged (sliders, the spots in the Background preview, and any such control later), a sideways drag moves the control and never switches tabs or swipes back

**22. Background: amount, position and colors** (done, changes point 18)

- [x] The Background page is reorganized into three choices, all independent of each other:
  - **Spots**: how many, **1 to 6**
  - **Position**: **Specified** (each spot where you drag it), **Random** (new places **on every tab change** or **once per app start**) or **Moving** (the spots wander around on their own at a speed you choose: slow, medium, fast)
  - **Colors**: **Custom** (you pick each spot's color), **Preset** (ready-made palettes: your style's ring colors, Sunset, Ocean, Forest, Candy), **Cycle** (moves through your own list of colors) or **Random**; Cycle and Random change **on every tab change** or **once per app start**
- [x] Each spot's size can still be set; the Strength slider stays
- [x] **Slow drift** is removed (Moving replaces it) and the **Goal** colors are removed

Noted 2026-10-16 after testing points 22 and 23 (these come next, before point 20).

**24. Preset colors that fit** (done)

- [x] The color dots on the Background presets are evenly spaced and all fit inside their card

**25. Random places nearby** (done, changes point 22)

- [x] With Position › Random, each change moves every spot only a little (up to about 15 % of the screen) from where it was last, never off the screen
- [x] The next app start carries on from where the spots were; moving a spot in the preview starts over from there

**26. Seeing what's selected with Liquid Glass** (done)

- [x] The selected choice (e.g. the light and dark style cards) keeps its frame with Liquid Glass Minimal and Full

Noted 2026-10-16 after trying the review (point 20).

**27. Review in the header, Check values removed** (done)

- [x] **Review · N** sits in the Ingredients header next to +, so it never covers the brand filter
- [x] The Check values label, its filter and **Values are correct** are gone; the warnings while typing in the ingredient form stay

**28. The review checks meals too** (done)

- [x] For both of you, the past week: a meal missing between others or a day with nothing logged, days far below the calorie goal, and odd entries (implausible amounts, the same food twice in one meal, 0 kcal items)
- [x] Meal findings show under Review with the person, day and meal; **Open day** opens it in History; **Done** or **Ignore**. Meals are never changed automatically

**16. Cook search: + and a custom item button** (done, changes point 4)

- [x] The **+** above the Cook search works like the one on the Ingredients tab: it opens a new ingredient straight away (named after the search), no menu
- [x] Next to it a **pencil** button opens a custom item straight away

**17. Liquid Glass: Minimal and Full** (done, changes point 8)

- [x] **Controls** is renamed **Minimal** and covers every field: search fields, chips and pills (categories, Brand, Sort, Check values, Add weight), input fields, buttons, segmented controls, the meal cards on Today and the rows in lists. Only the big progress card stays solid
- [x] **Everything** is renamed **Full**: all of Minimal, the progress card too, over the color background
- [x] Rows you can swipe to delete stay solid in both

**18. The background behind the glass** (done; reorganized by point 22)

- [x] For Full, a **Background** page in Appearance with these modes:
  - **Style colors** (default): from your style's ring colors
  - **Custom**: 2–4 color spots, each with its own color; drag them where you want on a preview, set their size and the overall strength
  - **Random**: new colors and positions
  - **Cycle**: you pick a set of colors and it moves on to the next ones
  - **Goal-aware**: calm colors early in the day, warmer as you near your calorie goal, a red tint once over it
- [x] For Random and Cycle you choose when it changes: **on every tab change** or **once per app start**
- [x] **Slow drift**: the spots float slowly, in any mode (off by itself when the phone asks for reduced motion)
- [x] Saved to your account like every other appearance setting

**19. "Values are correct"** (removed 2026-10-16: ignoring a finding in the weekly review replaces it)

- [x] A flagged ingredient can be marked **Values are correct**; the flag goes away for both of you
- [x] If someone later changes its values and a warning still applies, it is flagged again

**20. Ingredient review by Claude** (done)

- [x] A Claude Code routine reviews the ingredient database **every week** (and whenever you ask): typos in names, brand spellings that don't match (e.g. "Milbona" and "Milbonna"), odd unit names and unit weights, likely duplicates, values that don't fit the product
- [x] What it finds shows up on a **Review** page on the Ingredients tab: the reason and a suggested fix, with **Apply fix** (changes the ingredient; recent meals follow as in point 3) or **Ignore**. Nothing is changed without you

## Fixes and improvements, October 11 (done)

Noted and shipped 2026-10-11.

**1. Millilitres** (done)

- [x] When entering an ingredient's values, choose **g or ml**: values per 100 g or per 100 ml, grams or ml per unit (no conversion between the two)
- [x] Adding it to a dish asks for the amount in **ml** (and in its unit), and shows ml in the dish, on Today and in History

**2. Whole numbers next to the fractions** (done)

- [x] When choosing an amount in units, chips for **whole numbers** next to the fraction chips (¼ ⅓ ½ ⅔ ¾), e.g. 2 and ½ make 2 ½

**3. Brands** (done)

- [x] **Brands easier to see** in the ingredient lists (Ingredients tab and the ingredient search on Cook): the brand as a small accent-colored label above the name
- [x] **Filter by brand**

**4. Sorting the ingredient lists** (done)

- [x] **Newest first**, so an ingredient you just added is at the top
- [x] **Other sort orders** to choose from: A–Z by category, Most used, Fewest calories; one choice for both lists, saved to the account

## Fixes and improvements, October 7 (done)

Planned 2026-10-07, all five groups shipped 2026-10-08, one group at a time.

**1. Cook: step-by-step navigation (bug fixes)** (done)

- [x] Adding an ingredient (search → amount) is a real stack of steps: a swipe to the right goes back **one step** (amount → search → dish), like the Settings pages, instead of jumping to the Today tab
- [x] The **‹ Back** button also goes back one step instead of all the way to the dish, on the Cook tab and in the dish editor on Today and History

**2. Cook: ingredient search** (done)

- [x] **New ingredient** in the ingredient search: if it doesn't exist yet, create it right there (the name you searched for already filled in). It is saved to the shared ingredients and goes straight to choosing the amount
- [x] **Category chips** in the ingredient search, using the layout chosen under Appearance › Category chips (one line, all on screen or grouped)

**3. Updates: knowing you're on a new version** (done)

- [x] The **first start on a new version** (any new deploy) shows a short toast: "Updated to the latest version". The next start doesn't. Remembered per phone, so each phone shows it once; a first install or a new phone shows nothing
- [x] **New version ready**: if an update finishes downloading while the app is open, a toast offers to reload right away instead of at the next start
- [x] **Version line** at the bottom of Settings (build date and short commit), to check which version is running

**4. Colors: one color picker everywhere** (done)

- [x] The same preset colors everywhere a color is chosen (accent color, ring colors, member colors, your own symbol color): the current accent, ring and member colors merged into one list, duplicates removed, plus **White**
- [x] Every color choice also has **Custom**: any color from the color picker (accent text stays readable automatically)

**5. Symbols for you and more emojis** (done)

- [x] Choose a **symbol for yourself** (heart or emoji, in a color) instead of the letter in your accent color. Only you see it; your partner keeps seeing what they picked for you. Your name stays your account name
- [x] **More emojis**: all the classic hearts, including the **pink heart 🩷** (❤️ 🩷 🧡 💛 💚 🩵 💙 💜 🖤 🤍 🤎 ❤️‍🔥 💞 💘 …) and some cool ones (e.g. 🔥 ⚡ 🦊 🐺 🦁 🐉 👑 💎 🚀 🎧 🍕 🏋️ 😎 👻)

## Coming next

Next up is the list noted 2026-10-20 above. Recipes with choices, the notifications and the label reader are being tried in daily use.

**Ideas for later (not planned yet, need discussing first):**

- **Meal photos:** take a picture of a meal and keep it with the meal (where it's stored, who sees it, how long it's kept and what it costs in storage are still open)

---

## Tech stack

| Area               | Choice                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------- |
| App                | React 19, TypeScript (strict), Vite 8                                                    |
| Styling            | Tailwind CSS 4; theme colors as CSS variables per scheme (light, soft, bento)            |
| Fonts              | Manrope and Space Grotesk (Fontsource, bundled so they work offline)                     |
| Data               | TanStack Query 5 (+ persistence to `localStorage`), supabase-js                          |
| Routing / gestures | React Router, Embla Carousel                                                             |
| Validation         | Zod                                                                                      |
| Barcodes           | barcode-detector (ZXing WebAssembly), Open Food Facts API                                |
| Nutrition labels   | tesseract.js (on-device text recognition, German and English)                            |
| PWA                | vite-plugin-pwa (own service worker with Workbox precache; updates wait and are offered) |
| Push               | Web Push (VAPID) from Supabase Edge Functions with `web-push`                            |
| Backend            | Supabase: Postgres, Auth, Row Level Security                                             |
| Hosting            | Vercel (deploys on push to `main`)                                                       |
| Tests              | Vitest + Testing Library, Supabase integration tests, Playwright (WebKit / iPhone)       |
| Lint / format      | oxlint, Prettier                                                                         |

## Architecture

```
src/
  app/            tab shell, swipe navigation, page stack (Settings sub-pages and Cook steps: push/pop and back swipe), current user, offline lifecycle, sync status, app version and update toasts
  components/ios/ UI building blocks (Sheet, ListRow, TabBar, SegmentedControl, Avatar, …)
  features/
    appearance/   per-account theme, light/dark style, accent, goal and ring colors, progress style, category chips, app icon; Appearance pages
    auth/         login, sign-up, session (clears cached data on sign-out / account change)
    household/    profile, household, invite codes, onboarding
    ingredients/  ingredient database: API, form parsing, listing, category chips, screens
    categories/   Settings › Categories: broad categories and categories (create, rename, move, delete)
    cook/         Cook tab: draft (kept on the phone), who/when, leftovers, links from an empty meal, recipe pages
    recipes/      recipes: model (from a dish or meal, back to a dish at current values), API, list, page, save form
    meals/        day model, meal sheet (show, change, delete), offline-capable day changes
    dishes/       dishes: share maths (portions.ts), composer and editor, dish API, offline dish changes (same queue as meal changes)
    goals/        goal history, goal form, progress card (rings / ring + bars / bars / compact)
    live/         live updates: the household's Realtime channel, hint → query mapping, batched refreshes
    nutrition/    pure nutrition math: units, totals, goals, formatting
    notifications/ Settings › Notifications: push support, this phone's subscription, the test
    patchNotes/   the patch notes list (every commit adds an entry) and its page
    today/ history/ settings/   tab pages
  lib/            supabase client, env validation, errors, persistence, dates, numbers
  sw/             the service worker: precache and offline pages (Workbox), push notifications
e2e/
  smoke.spec.ts   no-backend checks (shell loads, installable)
  journeys/       real user journeys against the dev project, throwaway users per test
supabase/
  migrations/     database schema, RLS policies, RPCs, views, triggers
  tests/          integration tests against the dev Supabase project
  functions/      Edge Functions (Deno): push-test, push-tick (timed and partner notifications);
                  _shared: web push sending, plus plain-TypeScript settings and scheduling that the
                  app's tests cover and Settings › Notifications reuses
scripts/
  recategorize/   the category tree of 2026-10-21 and the SQL that applies it to a household
  review/         the weekly review routine's instructions
```

### Data model (Supabase)

- `households`, `profiles` (one per auth user, created by a trigger; holds the name, accent color and `appearance` JSON, up to 4 KB)
- `goal_history` (goal valid from a date; calories, and optionally protein, carbs, fat, fiber and a target weight), `weight_entries` (one weight per person and day, counting until the next; the household reads them, only you write yours)
- `category_groups` (the household's broad categories), `categories` (each in a group; a group with categories can't be deleted), `ingredients` (each in a category, which can't be deleted while it has any; per-100 g and/or per-unit columns; `measure` `g` or `ml`: for ml the `_100` columns are per 100 ml and `unit_weight_g` is the ml per unit, and the at-most-100-g-per-100-g check doesn't apply; at least one calorie value required; optional `barcode`, 8–14 digits, unique per household; `kcal_estimated` for guessed values)
- `meals` (unique per user, local date and meal type; `cheat_meal`, `note` set via `set_meal_note`), `cheat_days` (a person's cheat days; the household manages them like meals), `day_notes` (a note per person and day, managed the same way), `meal_items` (nutrition snapshot plus a basis multiplier; amounts in `g`, `ml` or `unit`, where `per_100g` means per 100 ml for an amount in ml)
- `meal_items` of a cooked dish point to their `dish_portions` row and `dish_lines` row; plain items leave both empty
- `dishes` (a cooking; split mode equal / count / percent / weight, cooked weight, `kcal_estimated` when its calories are only roughly known, a revision changed by every save), `dish_portions` (who ate it on which day and meal, or nobody yet = a leftover; split value; `discarded` for a thrown-away leftover, which keeps its share), `dish_lines` (ingredient snapshot like `meal_items`, either `shared` or `per_portion`), `dish_line_amounts` (own amount of a `per_portion` line per portion)
- `recipes` (name, split, cooked weight, estimate flag; shared by the household), `recipe_portions` (who eats, or nobody = a leftover; split value), `recipe_lines` (one row per product of a line: ingredient link plus a snapshot like `dish_lines`, used for custom items and deleted ingredients; rows of one line share `slot_id`, with `optional`, `picked` = used last time, `left_out` = an optional line left out last time), `recipe_line_amounts` (own amounts per portion). Written only through `save_recipe` (create or replace, the last save wins) and `delete_recipe`
- Views `meal_totals` and `daily_totals` (with `kcal_estimated`: some food came from a dish marked as an estimate; `cheat_meal` and `cheat_day`; a cheat day without any meal still has a row). RPCs `create_household`, `join_household`, `ensure_meal`, `set_cheat_meal` (marks a meal, creating an empty one), `save_dish` and `delete_dish`; `ingredient_use_counts` (how often each ingredient was used, for sorting by Most used; runs with the caller's rights, so RLS keeps it to the household). `keep_alive` returns `true` to anyone, for the keep-alive workflow.
- `push_subscriptions` (each phone that allowed notifications: its push address and keys, whose it is, when a push last arrived). Members only see their own phones and never the keys; `save_push_subscription` (also takes a phone over from the other account) and `delete_push_subscription` write them; only the Edge Functions (service role) read the keys to send.
- `notification_preferences` (per person, only they see it: which notifications and when, as JSON read with defaults by `supabase/functions/_shared/notificationSettings.ts`, and the phone's time zone), `push_sent` (each notification sent once: kind + key, e.g. a reminder per day and meal), `partner_changes` (filled by triggers on `meals` / `meal_items` when someone changes another person's meal; cleared once told). Members can't read the last two. `cook_drafts` (per person, own row only: the label and ingredient count of a dish waiting on Cook, `updated_at` set by the database on every change).
- **Timed notifications:** pg_cron runs `push-tick` every 5 minutes through pg_net; its address and shared secret are in Vault (`push_tick_url`, `push_tick_secret`), never in a migration. Without them the job does nothing.
- `review_findings` (what the weekly review routine found: about an ingredient, with a suggested fix as `column → value`, or about a person's day, optionally one meal and item; `open` / `applied` / `ignored`, who decided when). Members read them and only change the decision; the routine reads through `review_ingredients` and `review_meals` (members, goals, meals with item totals and day totals for up to 31 days) and adds findings through `submit_review_findings`, all authorized by the household's review key (`review_keys`, stored as a SHA-256 hash, readable by nobody). A finding is never added twice (same ingredient, kind and fix; or same person, day, kind, meal and item). `merge_ingredients` (keep, drop, values taken over, finding) folds a duplicate into the kept one in one step: meal items, dish lines and recipe lines move over (a recipe line offering both keeps the one picked last), the barcode passes on when the kept one has none, the finding is marked applied and the other ingredient deleted (its findings with it).
- **Live updates:** triggers on the household's tables send a small hint over Supabase Realtime Broadcast to the private channel `household:<id>` (what changed: a person's day, a dish, the ingredient database, …). Hints carry no data: the app marks the matching queries out of date, and what's on screen re-fetches through the normal RLS-checked queries. A failed hint never fails a save.
- `save_dish` stores a whole dish at once and re-logs every eaten portion as meal items in its eater's meal (shared lines × the portion's share, own amounts as entered), so the totals views count dishes like any other food. Resending the same save does nothing; a save based on an outdated revision is rejected ("changed meanwhile"). It can also take over plain items of a meal ("share this meal").

### Security

- **Row Level Security on every table.** Household members can read each other's data and edit each other's meals. Goals and profiles can only be changed by their owner. Other households and signed-out visitors see nothing.
- Dishes and their meal items are only written through `save_dish` / `delete_dish`, which check that every portion goes to a household member and every ingredient belongs to the household. Recipes likewise, through `save_recipe` / `delete_recipe`.
- Only household members can listen to their household's live channel (a policy on `realtime.messages`), and nobody can send on it from a phone: hints come from the database alone.
- Joining a household only works through an invite code. Profiles can't be moved between households directly.
- The anon key in the app is public by design; RLS is the protection. The service-role key is only used in local scripts and CI (dev project), never in the app.
- **Sign-ups are disabled in Supabase**, since both accounts exist. Nobody new can create an account.
- The **weekly review routine** never gets the service-role key: with the anon key and its household's review key it can only read that household's ingredients and the members' meals of up to 31 days, and add findings. It changes no data; members apply, mark done or ignore each finding.

---

## Development

### Prerequisites

- Node 24 and pnpm 11
- [Supabase CLI](https://supabase.com/docs/guides/cli) (installed as a dev dependency, run with `pnpm exec supabase`)
- Two Supabase projects: **production** and a separate **dev/test** project
- Optional: Vercel CLI for deployments

### Environment files (all git-ignored)

| File                 | Contents                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| `.env.local`         | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` of the project the app talks to                          |
| `.env.test.local`    | `SUPABASE_TEST_URL`, `SUPABASE_TEST_ANON_KEY`, `SUPABASE_TEST_SERVICE_ROLE_KEY` (**dev project only**) |
| `.env.secrets.local` | `PROD_DB_PASSWORD`, `DEV_DB_PASSWORD` for `supabase link` / `db push`                                  |

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

**End-to-end journeys** (log a meal on Cook, Back and the back swipe going one step at a time on Cook, category chips and creating a missing ingredient from the Cook search, the new-version toast on the first start only, a White and a custom accent color, your own symbol, a single food changed in place, a meal eaten out logged as an estimate, a saved brand picked from the suggestions, a package scanned from a photo and filled in from Open Food Facts, a scanned portion of 3 biscuits split into single units with a wrong value cleared, values of a similar product found by name, an unknown package on Cook added to the saved ingredient it is plus an estimated ingredient marking the dish, a live camera scan on Cook, weight for today and an earlier day with calorie and weight trends, cooking together for two, sharing a meal afterwards, leftovers, goals and partner, partner nickname and symbol, Today fitting the screen, history, ingredients, category management, offline, a partner's change showing up live and after the app was in the background, appearance following the account to a new device, the Pink style surviving a restart, a custom ring color, a drink saved and logged in ml, the newest ingredient on top with a brand filter and a saved sort order, Liquid Glass Minimal for every field and Full for everything, kept across a restart, random background colors changing with the tab and moving spots, an edited ingredient reaching both people's meals of the last two weeks but not older ones, weekly review findings applied, ignored and a meal finding opening its day, a cheat meal today and a past cheat day in History, a day with only a lunch flagged until its dinner is added, a photo of a nutrition table read by the real text recognition, a dish saved as a recipe and cooked again at an ingredient's new values, a meal copied to the partner's snacks and saved as a recipe) run the real app against the dev project. Build it against dev and pass the test credentials:

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
bash scripts/db-push-prod.sh    # then production: links it, lists and pushes, links dev again
```

### Ingredient review routine

A Claude Code routine (cloud, weekly and on request) follows `scripts/review/ROUTINE.md`: it fetches the household's ingredients and both members' meals of the last 7 complete days (Vienna time) with `node scripts/review/review.ts fetch`, looks for typos, brand and unit-name variants, implausible unit weights, duplicates and values that don't fit, and in the meals for gaps in a day, days far below the goal and odd entries, and sends findings with `node scripts/review/review.ts submit findings.json` (checked by `scripts/review/findings.ts`, then again by the database). They show up under **Review** in the Ingredients header; a meal finding's **Open day** opens that person's day in History. A **duplicate** names the other ingredient (`{"duplicate_of": id}`); its **Compare** shows both side by side (the one used more is kept unless you pick the other; rows that differ are highlighted, tap a value of the other one to take it over), and **Merge into …** moves every meal, dish and recipe of the other one to the kept one and deletes it (logged food keeps its values), or **Not duplicates: ignore**.

The routine is **CALculator weekly review** on claude.ai/code/routines (Sundays 08:00 UTC, Sonnet 5.5, environment "CALculator review"); **Run now** there reviews on request. The routine's environment needs `REVIEW_SUPABASE_URL`, `REVIEW_SUPABASE_ANON_KEY` (the app's public key) and `REVIEW_KEY`, plus network access to the Supabase project. A review key is created once per household; only its hash is stored:

```bash
KEY=$(openssl rand -base64 32 | tr -d '=+/')
HASH=$(printf '%s' "$KEY" | sha256sum | cut -d' ' -f1)
pnpm exec supabase db query --linked \
  "insert into public.review_keys (household_id, key_hash) values ('<household-id>', decode('$HASH', 'hex'))
   on conflict (household_id) do update set key_hash = excluded.key_hash"
echo "$KEY"   # goes into the routine's environment as REVIEW_KEY, nowhere else
```

### Re-sorting the categories

`scripts/recategorize/tree.json` holds broad categories → categories → products ("Name (Brand)"). `print.ts` turns it into one SQL block for a household: it creates what is missing, moves every ingredient to its place, removes the categories the tree no longer has, and changes nothing if a product and the ingredients don't match.

```bash
node scripts/recategorize/print.ts <household-id> > tree.sql
pnpm exec supabase db query --linked -f tree.sql   # dev first, then production
```

## Deployment

- **Vercel** builds every push to `main` (`vercel.json`: SPA rewrites, long-lived caching for hashed assets, no caching for the service worker and `index.html`).
- Vercel environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (production project).
- **Edge Functions** (`supabase/functions`): `bash scripts/deploy-functions.sh dev` or `… prod` sets their secrets (`VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `PUSH_TICK_SECRET` from `.env.secrets.local`), puts the tick's address and secret into Vault for the cron job, and deploys every function (`push-tick` without Supabase's JWT check: it checks the shared secret itself). Web push uses one VAPID key pair for both projects; the public key is also in `src/features/notifications/pushDevice.ts`. `push-test` checks the caller's sign-in itself (Supabase's JWT check stays on).
- **Keep-alive** (`.github/workflows/keep-alive.yml`): every other day (and on demand from the Actions tab) it calls the `keep_alive()` function on both Supabase projects, so neither is paused for a week without use. It uses the public anon keys from the repository secrets `SUPABASE_PROD_URL` / `SUPABASE_PROD_ANON_KEY` and `SUPABASE_TEST_URL` / `SUPABASE_TEST_ANON_KEY`. GitHub switches scheduled workflows off after 60 days without any repository activity; if that happens, switch it back on in the Actions tab.
- **GitHub Actions** (`.github/workflows/ci.yml`) on every push and pull request: lint, typecheck, format, unit tests with coverage. On pushes to `main` it also runs, against the dev project with the `SUPABASE_TEST_*` repository secrets, the database integration tests and the WebKit smoke tests plus end-to-end journeys (WebKit with an iPhone profile, 4 at a time; the offline restart additionally in Chromium, since Playwright's WebKit has no service workers); pull requests run the smoke tests alone. The jobs run side by side (about 2½–3 minutes); browser installs get a time limit and one retry, and each job a time limit, so a hanging install fails fast.

## Installing on the iPhone

Open the live URL in Safari, then **Share → Add to Home Screen**. The app then starts full-screen like a native app, keeps you signed in, and updates itself when a new version is deployed (fully close and reopen the app to pick it up; occasionally twice). The home-screen icon is the one chosen under Settings › Appearance › App icon at the moment you add the app; to change it later, pick a new one (this copies the app's link), remove the app from the home screen, paste the link into Safari and add it again.

New accounts are turned off in Supabase (Authentication → Sign In / Providers → **Allow new users to sign up**). To add someone, switch it on briefly, let them sign up and join with the invite code, then switch it off again.
