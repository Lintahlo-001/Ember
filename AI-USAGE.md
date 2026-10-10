# AI usage

![Made with Claude](https://img.shields.io/badge/Made_with-Claude-D97757?logo=anthropic&logoColor=white)

This project was built with AI assistance. This file is the record of it.

## 1. How I used AI

### 2026-09-26 - NavBar visual iteration (translucency, active-tab fill, shape)

- **Tool:** Claude (Sonnet 5)
- **What I asked for:** Several rounds of visual changes against the
  wireframe: make the pill actually translucent (not just labeled that way),
  give the active tab a filled chip behind its icon, move the label inside
  that chip, switch the fill color when it didn't meet the design doc's
  documented contrast pairings, change the shape from a full stadium/pill to
  a 12px rounded rectangle, tighten spacing, shrink the whole bar, and make
  the active chip's fill touch the navbar's own border.
- **What it gave back:** Incremental restyles each round, alpha value fixes,
  a restructured chip (icon+label stacked, fixed width), a shared 12px radius
  between the outer pill and each tab cell, `hitSlop` added to keep the
  48×48dp accessibility minimum once the visual chip shrank below that size.
- **What I kept, what I changed, and why:** Kept the accessibility-preserving
  approach (hitSlop instead of shrinking the actual tap target) since it
  matched the checklist requirement without a visual tradeoff. Changed the
  fill color from primary to accent mid-way through, after it was flagged
  that primary+surface only cleared ~3.1:1 contrast, what the rest of
  the palette uses, while accent+surface is the doc's own verified 6.47:1
  pairing.
- **Commit:** [790b1b5](https://github.com/Lintahlo-001/Ember/commit/790b1b5f67ce5069b588a8ce8516d8a9f0eb0c28)

### 2026-09-28 - Postgres catalog mirror

- **Tool:** Claude (Sonnet 5)
- **What I asked for:** Build the Postgres mirror cache described in my project plan, a schema for TCG sets and cards, functions to pull data from the TCGdex API and save it into Postgres, Express routes that check Postgres first and only hit TCGdex live on a cache miss, a daily refresh job, and a way to auto-discover new sets TCGdex adds over time.
- **What it gave back:** A `catalog` schema (kept separate from Supabase's `public` schema so the anon key can't see it), two tables (`sets` and `cards`), a TCGdex API client, `syncSet`/`syncCard` functions that fetch-and-save, a `syncAllSets` function that compares TCGdex's set list against what's already saved to catch new or changed sets, three Express routes (`/sets`, `/sets/:id`, `/cards/:id`), and a standalone script to run the daily sync.
- **What I kept, what I changed, and why:** Kept the overall structure as given. Tested it against live TCGdex responses before moving on to image fallbacks (basically a feature to fetch missing card images from another 3rd party API), and it worked as built, no changes needed to the field names or sync logic at that time of development.
- **Commit:** [b5b9d7d](https://github.com/Lintahlo-001/Ember/commit/b5b9d7d536f426872896b16d77cf8df6b2b70642)

### 2026-09-30 - Backend: saving cards, searching, and putting the server online

- **Tool:** Claude (Sonnet 5.5)
- **What I asked for:** Help planning how the app should save the cards a person owns
  (quantity, condition, variant, notes), how card search should work, and how to
  put my server online on Render so the phone app can reach it.
- **What it gave back:**
  - A plan where the app saves ownership straight to the database, with a rule
    that each person can only ever see and change their own rows.
  - A small database function that adds a card, or, if I already have that exact
    version and condition, adds the quantities together. This had to live in the
    database because a normal "save" from the app would have replaced the old
    number instead of adding to it.
  - A search feature that treats what you type as plain text, so it can't be used
    to mess with the database.
  - A login check on the server, so only signed-in users can use it, plus a limit
    on which websites can talk to it.
  - A Render config file for deploying, so no passwords sit in the code.
- **What I kept, what I changed, and why:** I kept the whole design. The product
  decisions were mine: merging duplicate entries, turning the minus button into a
  delete button at quantity 1, one Pokémon pill per Pokémon on a card, and the
  sort and filter options. I also checked its work against my security checklist.
  The server and the Render deploy were set up from its files, and I tested them
  before moving on.
- **Commit:** [d0c762d](https://github.com/Lintahlo-001/Ember/commit/d0c762db72b25b9bd9836e7552bae1813115b82b), [5c82d8a](https://github.com/Lintahlo-001/Ember/commit/5c82d8a13e00bef8434bc6e3e2fa3e795bd5a7a8), [a2000e2](https://github.com/Lintahlo-001/Ember/commit/a2000e28d7f58f23949581779fb81b1c0f847fd4)

### 2026-10-02 - Mirror set filters (`--set` and `--exclude-set`)

- **Tool:** Claude (Sonnet 5.5)
- **What I asked for:** I wanted to control which sets the image mirror job downloads, so I could skip certain sets or download only one. I also wanted to know if the app already tries the bucket images first and uses the TCGdex links only as a backup.
- **What it gave back:** A shared helper, `cliFilters.ts`, that adds `--set` and `--exclude-set` options to the mirror job. It checks that every set ID is in the right format and actually exists, and it passes them to the database safely instead of pasting them into the query. It also confirmed the app already uses the bucket image first, and noted that if a bucket image fails to load, the app shows "No image" instead of retrying TCGdex.
- **What I kept, what I changed, and why:** I kept the check that rejects set IDs that don't exist, because a typo in `--exclude-set` would otherwise quietly download the very set I meant to skip. I kept the shared helper so the mirror and purge jobs filter sets the same way.
- **Commit:** [f9b2ffe](https://github.com/Lintahlo-001/Ember/commit/f9b2ffe39f6bc6737f01efc1d12f2c3905ab6a90)

### 2026-10-02 - Purge job and bucket size queries

- **Tool:** Claude (Sonnet 5.5)
- **What I asked for:** I wanted to see how much space each storage bucket was using, and a way to delete the card images of specific sets to free up space.
- **What it gave back:** SQL queries showing bucket size by bucket, by TCGdex copy vs. PokeWallet copy, and by set. It also gave me a new `purgeMirror` job that deletes the mirrored files and clears their database links in the same step, so the app goes back to using TCGdex right away.
- **What I kept, what I changed, and why:** I kept the purge limited to files in the `tcgdex/` folder. The PokeWallet images are never touched, because for some cards they may be the only copy I have. I kept the approach of deleting files through Supabase's Storage API instead of deleting rows with SQL, since a raw SQL delete can remove the record but leave the real file behind, still taking up space. I also kept the safety checks: the job refuses to run without a set filter or `--all`, and it has a `--dry-run` option so I can preview what would be removed first.
- **Commit:** [ade5d3c](https://github.com/Lintahlo-001/Ember/commit/ade5d3cff4a05150450e537a431575e033107938)

### 2026-10-03 - Navigation behavior pass (back button, scroll-to-top, tab order)

- **Tool:** Claude (Sonnet 5.5)
- **What I asked for:** Three fixes to how the app's tabs behave. Pressing the phone's back button on the Wishlist or Pokédex tab should go to the Dashboard instead of closing the app. Tapping a tab icon in the bottom bar while that tab is scrolled down should jump the list back to the top. The bottom bar's tab order (Wishlist, Home, Pokédex) must never get shuffled.
- **What it gave back:** A back-button handler that only turns on when I'm on a tab's main screen, so screens opened on top (like Card Detail) still go back normally. A small reusable hook that listens for taps on the bottom bar and scrolls the visible list to the top, but only when I tap the tab I'm already on. A fixed tab order in the bottom bar that doesn't depend on whatever order the navigation library happens to list tabs in.
- **What I kept, what I changed, and why:** I kept the plan of handling back only on tab main screens, because it avoids breaking back on pushed screens, and the "scroll only when tapping the active tab" rule, since that is how most apps behave. I dropped the swipe-between-cards feature entirely, since it wasn't worth the complexity (this was initially an intended feature). I also fixed a typing mistake it made in CardGrid.tsx (an awkward import alias) by using the normal FlatList import.
- **Commit:** [fd8213b](https://github.com/Lintahlo-001/Ember/commit/fd8213baeee89da9f89bc9dc8f06a3a18369ec2a), [4df431a](https://github.com/Lintahlo-001/Ember/commit/4df431a95cb29ad4ac5441d2cfa86cf1f918f75c)

## 2. Where the AI got it wrong

### Case 1 - NavBar prop types

- **What it gave me:** First pass hand-rolled a local `NavBarProps` type for
  the `tabBar` render prop. When that didn't compile, the second attempt
  imported `BottomTabBarProps` directly from `@react-navigation/bottom-tabs`, which also failed, since that package isn't resolvable as a direct named
  import in this install even though `expo-router` depends on it internally.
- **What was wrong with it:** Both attempts guessed at where the correct type
  lived instead of deriving it from something already known to work. The
  first guessed the shape by hand; the second guessed a valid import path
  that turned out not to be resolvable here.
- **What I did instead:** Used
  `Parameters<ComponentProps<typeof Tabs>['tabBar']>[0]` to pull the exact
  prop type straight from `expo-router`'s own `Tabs` component, no direct
  import of `@react-navigation/bottom-tabs` needed at all.
- **Commit:** [cf427b3](https://github.com/Lintahlo-001/Ember/commit/cf427b363fe130cf6a95f2a67651d2da6ec7828f)

### Case 2 - Fallback images being skipped

- **What it gave me:** I reported that some Mega Evolution Promo cards (Froakie) weren't getting fallback images while others (Riolu) were. The AI compared the two PokeWallet records and said the likely cause was duplicate entries. Froakie's `clean_name` was "Froakie 060", so it assumed PokeWallet listed several Froakie entries with the same card number. The code took the first one, which may have had no image. The AI rewrote the sweep to try every matching entry in turn. It presented this as the "most likely cause", not a confirmed one. It also left the sweep file's `main()` unguarded. When `syncAll` imported the file, it ran a second sweep and closed the shared database connection, which caused the "Cannot use a pool after calling end" error.
- **What was wrong with it:** The guess was never checked against the real PokeWallet data. When I ran the fix, all 60 cards still failed and almost no requests were made, so the code was giving up before even trying to fetch images. The likely real problem is that the two sites number their cards differently (like `TG03` vs `3`), so nothing matched.
- **What I did instead:** I stopped relying on the guess and made the code tell me what's really happening. Matching is now looser: it tries the exact number first, then compares just the digits (so `TG03` can match `3`) as long as the card name also matches. When a card still doesn't match, the log prints a sample of the numbers PokeWallet actually uses, so I can see the real format. I made the sweep's start-up code only run when I launch it directly, which fixed the crash. I also cleared the "already checked" marks and tested on 10 cards instead of 60, so a failed run doesn't lock out lots of cards for a week (I have a "checked" column on my schema which prevent card images from being scanned by the fallback sweep for 7 days). 
- **Commit:** [4e59294](https://github.com/Lintahlo-001/Ember/commit/4e5929489caaa8c482a1a80110530e9b3706f602)

### Case 3 - Suggestions route answered the same request twice

- **What it gave me:** When the search suggestions were rebuilt to use a
  fast in-memory list (`suggest.ts`) instead of asking the database on every
  keystroke, the AI gave me the new code for the `/cards/suggest` route.
- **What was wrong with it:** It added the new way but never deleted the old
  way. The route sent the answer from the new list, then kept going, ran the
  old database search anyway, and tried to send a second answer. The server refused the second
  hand-off and logged `ERR_HTTP_HEADERS_SENT`. The app still looked fine
  because the first answer got through, so I only spotted it in the
  render production logs. It also made a pointless database query on every
  keystroke.
- **What I did instead:** Deleted the leftover old database block so the
  route sends one answer only, from the in-memory list. Each request now
  gets exactly one response and no extra database call.
- **Commit:** [c98daec](https://github.com/Lintahlo-001/Ember/commit/c98daec863031ec3a1f7a8b7286db31fbcc96ba3)

## 3. Who wrote what

### Written by me

#### Design tokens

- **File:** `src/theme/theme.ts`
- **Commit:** [8453784](https://github.com/Lintahlo-001/Ember/commit/84537849304bfeda9c0393fad8f8417e1e096395)
- **What it does and why it is built this way:** This file
  holds every design constant the app uses, colors, font names, spacing
  values, breakpoints, and accessibility minimums as plain exported
  objects, instead of scattering hex codes and pixel numbers across every
  screen's `StyleSheet`. It's a direct translation of the design system doc:
  every value here traces back to a specific row in that doc's tables, so if
  a token ever changes (say, the accent red), it changes in exactly one
  place instead of every file that used it. It's built as plain constants
  rather than a styling library because the design doc explicitly avoids a
  styling-library dependency in favor of React Native's built-in
  `StyleSheet`.

#### Basic building blocks (atoms)

- **Files:** `src/components/atoms/Button.tsx`, `Icon.tsx`, `IconButton.tsx`, `ProgressBar.tsx`
- **Commit:** [0043376](https://github.com/Lintahlo-001/Ember/commit/0043376e4cc0a31a3029d26f0d476d351e490c3a), [fa1a76b](https://github.com/Lintahlo-001/Ember/commit/fa1a76bec3cb1e13204f85dc1cad361902786367), [43667c3](https://github.com/Lintahlo-001/Ember/commit/43667c3c362f3add66a5abfe0ad9c3508e35bc1a)
- **What they do and why they are built this way:** These are the smallest
  pieces the rest of the app is assembled from, like Lego bricks.
  - `Button` is a tappable rectangle with a label. It has two looks: solid red
    for the main action and outlined for the secondary one. It greys out when
    disabled and shows a spinner while loading, so a user can't tap "Log In"
    twice while waiting. It's always at least 48 units tall so it's easy to hit
    with a thumb, which is a rule from my design doc.
  - `Icon` is a thin wrapper around the Feather icon set. Every icon in the
    app goes through it, so if I ever swap icon sets, I change one file.
  - `IconButton` is a round button with an icon in it (heart, plus, X). The
    visible circle is 40 units, but it has an invisible extra tap area so the
    real touch target still reaches 48. When "active", it flips to the filled
    red look.
  - `ProgressBar` is a grey track with a red bar on top. You give it a number
    between 0 and 1, it clamps it so it can never go below 0% or above 100%,
    and sets the red bar's width to that percentage.
  They exist as separate files so every screen looks the same without
  copy-pasting styles.

#### Page wrappers

- **Files:** `src/components/layout/Screen.tsx`, `src/components/molecules/ScreenHeader.tsx`, `src/components/PlaceholderScreen.tsx`
- **Commit:** [b598350](https://github.com/Lintahlo-001/Ember/commit/b5983502dfa354a364a723c45a8a8b27cee44893), [0b49f39](https://github.com/Lintahlo-001/Ember/commit/0b49f39021acd3ef1c927a4294db819ce72b9997), [fa1a76b](https://github.com/Lintahlo-001/Ember/commit/fa1a76bec3cb1e13204f85dc1cad361902786367)
- **What they do and why they are built this way:**
  - `Screen` is the frame every page sits inside. It adds the cream
    background, the side padding, and a gap at the top so content doesn't hide
    under the phone's status bar or camera notch. Without it, every screen
    would repeat the same few lines.
  - `ScreenHeader` is the top row of pushed screens: a back arrow and a title.
    The arrow just calls "go back one page".
  - `PlaceholderScreen` is a temporary "this screen isn't built yet" page with
    a title and a description of what will go there. It let me build the whole
    navigation map first and fill in the real screens one at a time.

#### Empty route screens and stack layouts

- **Files:** `src/app/(tabs)/dashboard/_layout.tsx`, `wishlist/_layout.tsx`, `pokedex/_layout.tsx`, `pokedex/index.tsx`, `pokedex/pokemon-detail/[pokemonId].tsx`, `dashboard/statistics.tsx`, `dashboard/set-breakdown/[setId].tsx`, `dashboard/settings/index.tsx`, `dashboard/settings/my-account/index.tsx`, `change-username.tsx`, `change-email.tsx`, `change-password.tsx`, `src/app/modals/pricing-detail.tsx`
- **Commit:** [b598350](https://github.com/Lintahlo-001/Ember/commit/b5983502dfa354a364a723c45a8a8b27cee44893)
- **What they do and why they are built this way:** The app uses
  file-based routing, meaning a file's name and folder become its page
  address. Each `_layout.tsx` wraps a tab in its own stack so pages can be
  opened on top of each other while the bottom bar stays visible. The other
  files are placeholder pages that show the name of the screen and, where
  needed, read an ID from the address (like which Pokémon or which set was
  tapped). The pricing modal is a small static box with a Close button. The
  point was to get every screen from the screen map clickable early, so the
  navigation could be tested before any real features existed.

#### Small display pieces (molecules)

- **Files:** `src/components/molecules/StatBox.tsx`, `Pill.tsx`, `NavCard.tsx`, `SetCard.tsx`, `src/components/atoms/CardPlaceholder.tsx`, `LogoPlaceholder.tsx`
- **Commit:** [fa1a76b](https://github.com/Lintahlo-001/Ember/commit/fa1a76bec3cb1e13204f85dc1cad361902786367), [1cc1713](https://github.com/Lintahlo-001/Ember/commit/1cc17138f47df2b21470c55b61bb15ac00f960d1), [d379ecc](https://github.com/Lintahlo-001/Ember/commit/d379ecc8d9f22c92f3c7a8f9e1645121eb6a49e9)
- **What they do and why they are built this way:** These are
  display-only components that take some data and draw a box.
  - `StatBox` shows a label with a big number underneath, like "Total Cards: 42".
  - `Pill` is a small rounded tag with an optional icon, used for the artist
    name, the price, and the sort/filter buttons.
  - `NavCard` is the "My Cards" / "Statistics" tile on the Dashboard, with the
    label top-right and a big icon bottom-left.
  - `SetCard` shows a set's logo, name, a progress bar, and "owned / total".
    The percentage is just owned divided by total, rounded.
  - `CardPlaceholder` and `LogoPlaceholder` are the dashed "No image" boxes
    shown when a card or logo picture is missing, so a gap never looks broken.
  Each one takes its data from the screen using it, which means the same piece
  can be reused anywhere.

#### Express + Postgres connection

- **Files:** `server/src/db.ts`, `server/src/index.ts` (the `/health` route only), `server/.env.example`
- **Commit:** [cb1f309](https://github.com/Lintahlo-001/Ember/commit/cb1f30910c12a4e989585ea2cb937b46c16d71ee), [e407de8](https://github.com/Lintahlo-001/Ember/commit/e407de85dd1db53ba4591477fc7c479c6e174ebc)
- **What it does and why it is built this way:**
  - `db.ts` loads the `.env` file, stops the server with a clear error if
    `DATABASE_URL` is missing, and creates one shared connection pool that every
    route reuses. This is faster than opening a new connection on each request.
    The `ssl` setting is there because Supabase's pooler requires an encrypted
    connection.
  - `/health` runs `SELECT NOW()` and returns `ok` plus the database time. If
    the query fails, it logs the real error on the server and sends back only a
    generic "Database unreachable" message, so no connection details leak. It's
    public on purpose: Render and my cron-job.org ping both use it to check the
    server is awake.
  - `.env.example` lists every variable the server needs, with placeholder
    values only, so anyone cloning the repo knows what to fill in without seeing
    my real keys.

#### TCGdex API client

- **File:** `server/src/tcgdex.ts`
- **Commit:** [c8803f6](https://github.com/Lintahlo-001/Ember/commit/c8803f65de88263c58d48205a3869b1241f4183f)
- **What it does and why it is built this way:** This is the only file that
  talks to TCGdex. One small `get` helper adds a 15-second timeout, turns a 404
  into a named `TcgdexNotFound` error, and throws on any other failure. The three
  public functions (`listSets`, `getSet`, `getCard`) are one-liners on top of it.
  `isUsableTcgdexAsset` treats any image URL containing `/univ/` as unusable,
  because I confirmed with curl that those URLs don't return a real image. Having
  one file means a change to the TCGdex address or error handling happens in one
  place. `EXCLUDED_SERIES` lists the series I don't want in the catalog (TCG
  Pocket, `tcgp`).

#### Database tables for the catalog, wishlist and favorites

- **Files:** `server/sql/001_catalog_schema.sql`, `005_wishlist.sql`, `006_favorites.sql`
- **Commit:** [b5b9d7d](https://github.com/Lintahlo-001/Ember/commit/b5b9d7d536f426872896b16d77cf8df6b2b70642), [5c1d945](https://github.com/Lintahlo-001/Ember/commit/5c1d9450d5b6a19863dffd7263f333b333904535), [ce0b97b](https://github.com/Lintahlo-001/Ember/commit/ce0b97ba3e71876fe0c251e1f47c828abb2b1ad0)
- **What they do and why they are built this way:**
  - `001` creates the `sets` and `cards` tables in a separate `catalog` schema,
    so Supabase's public API can't see them. Row Level Security is on with no
    policies, which locks the tables to everyone except my own server. Indexes
    are on the columns I search by (set, illustrator, Pokémon number).
  - `005` and `006` are the same pattern for the wishlist and favorite sets: one
    row per user per card or set, with the pair as the primary key so duplicates
    are impossible. Each user can only read, add and delete their own rows. I
    deliberately gave no update permission, since a wishlist entry either exists
    or it doesn't.

#### Simple one-off scripts

- **Files:** `server/src/jobs/backfillDetails.ts`, `syncAll.ts`, `purgeEmptySets.ts`
- **Commit:** [3ea146c](https://github.com/Lintahlo-001/Ember/commit/3ea146c4a3dfa33eb1dddbfcb4bbe3d7f3dd4b2c), [b77c667](https://github.com/Lintahlo-001/Ember/commit/b77c6678dedd6c2548b3e8c05ef87ba09f0a93ef), [c8803f6](https://github.com/Lintahlo-001/Ember/commit/c8803f65de88263c58d48205a3869b1241f4183f)
- **What they do and why they are built this way:**
  - `backfillDetails.ts` and `syncAll.ts` are thin wrappers. Each one calls a
    function that lives elsewhere, prints how long it took or the summary, and
    always closes the database connection at the end so the script exits instead
    of hanging.
  - `purgeEmptySets.ts` finds sets that have zero cards and deletes them along
    with their stored image files. It has a `--dry-run` option that only lists
    what would be deleted, so I can check before removing anything. Files are
    deleted before database rows, so if the script crashes halfway I can re-run
    it safely.

### The AI-written part I understand best

- **File:** `server/src/auth.ts`
- **Commit:** [5c82d8a](https://github.com/Lintahlo-001/Ember/commit/5c82d8a13e00bef8434bc6e3e2fa3e795bd5a7a8)
- **What it does and why we kept it:** This file handles authentication for the server. Each request from the phone includes a Supabase login token. Before processing the request, it checks that the token exists and isn't unusually long, then verifies it with Supabase. If the token is invalid, the server returns "Unauthorized" and stops. To avoid contacting Supabase on every request, valid tokens are cached for 60 seconds. The cache holds up to 500 tokens and is cleared when it reaches that limit. Invalid tokens are removed immediately. This helps keep server data restricted to logged-in users while reducing unnecessary network requests.