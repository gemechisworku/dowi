# Dowi — Implementation Plan

Companion to [PRD.md](./PRD.md). Verification steps for every deliverable are in
[TESTING.md](./TESTING.md).

## Principles

1. **Every milestone is independently testable and independently useful.** No
   milestone ends with "it'll work once M+2 lands".
2. **Vertical slices.** A feature milestone ships its data layer, UI, tests and
   empty/error states together.
3. **One branch per milestone**, merged to `main` with a tag `m0`…`m10`. `main`
   always builds and always runs.
4. **Component library first.** Nothing is styled ad hoc; if a screen needs a new
   visual pattern, it becomes a component in the kit first.
5. **Test as you go.** Unit tests for logic that produces numbers (money maths,
   period boundaries, currency conversion) are non-negotiable — they are what makes
   the reports trustworthy.

## Branch / commit convention

```
main                      always green
  m3-money-capture        one branch per milestone
```

Commits: `feat(money): add transaction form`, `fix(report): week boundary off-by-one`,
`test(money): FY boundary cases`, `chore: bump deps`, `docs: update PRD §5.4`.

---

## M0 — Project setup ✅ done

**Deliverable:** an empty but correct, installable app shell.

- [x] Vite 8 + React 19 + TypeScript template; Node 22+
- [x] TypeScript `strict: true`, `noUncheckedIndexedAccess: true`; path alias `@/*`
- [x] Tailwind v4 + `src/styles/tokens.css` (starter token set — colour, spacing,
      radii, motion, light/dark; expanded with component-specific tokens in M1)
- [x] React Router 7 with a root layout route (`AppLayout`) and four routed
      placeholder screens (Home, Money, Notes, Tasks)
- [x] `vite-plugin-pwa` — manifest (name, short_name "Dowi", theme `#2563eb`,
      standalone, portrait, maskable icons, shortcuts), Workbox precache, update prompt
- [x] ESLint + Prettier + `lint-staged` + `husky` pre-commit (lint + format)
- [x] Vitest + RTL + `fake-indexeddb` wired; Playwright wired with Pixel 7 light/dark
      projects
- [x] Scripts: `dev`, `build`, `preview`, `test`, `test:e2e`, `lint`, `typecheck`, `format`
- [x] `README.md` with run/build/install-on-phone instructions

**Pulled forward from M1** (needed to make M0 navigable/testable rather than static
placeholder text): a minimal `TopAppBar` (bell + settings) and floating `BottomNav`
per the Option A design direction, a `ThemeProvider` (system/light/dark, persisted,
no-flash), and a `/kitchen-sink` stub that exercises the theme toggle. **Not yet
built:** the actual component primitive library (buttons, inputs, sheets, dialogs,
charts, etc.) — that is the substance of M1.

**Done when:** `npm run build && npm run preview`, opened on the phone over LAN,
offers "Add to Home screen", launches standalone, and works with Wi-Fi off.
**Tag:** `m0` · **Test guide:** TESTING.md §M0

**Verified:** `typecheck`, `lint`, `test` (Vitest) and `test:e2e` (Playwright, Pixel 7,
light + dark) all pass; production build is 84 KB gzipped JS (budget: 180 KB);
manifest and service worker confirmed served correctly from the preview build.

---

## M1 — Design system & app shell ✅ done

**Deliverable:** the complete reusable component kit + navigation shell, browsable at
`/kitchen-sink`, in light and dark.

- [x] **Tokens** — colour (blue ramp, semantic surface/text/border, income green,
      expense red, warning amber), spacing (4 px base), radii, shadow, type scale,
      motion, z-index layers, `color-scheme`. Light + dark via `[data-theme]` and
      `prefers-color-scheme`.
- [x] **Theme provider** — System / Light / Dark, persisted, no flash on load.
- [x] **Primitives:** `Button` (primary/secondary/ghost/danger, 3 sizes, loading),
      `IconButton`, `Input`, `NumericInput`, `TextArea`, `Select`, `DatePicker`,
      `TimePicker`, `Switch`, `Checkbox`, `Radio`, `Chip`/`ChipGroup`,
      `SegmentedControl`, `Badge`, `Avatar`, `Divider`, `Skeleton`, `Spinner`,
      `Field` (label/hint/error wiring).
- [x] **Layout & feedback:** `Card`, `ListItem`, `SectionHeader`, `Sheet` (bottom
      sheet: scrim/Escape/back-gesture/drag-down dismiss, focus trap), `Dialog`
      (focus trap + restore), `ConfirmDialog`, `Snackbar` with an undo action
      (`Toast` folded into this — one portal-based transient-message component
      covers both), `EmptyState`, `ErrorState`, `SwipeableRow`, `PullToRefresh`.
- [x] **Domain-shaped:** `MoneyText` (currency-aware, minor units, sign colour),
      `AmountKeypad`, `PeriodSelector`, `PeriodStepper`, `StatTile`, `ProgressBar`,
      `TaskCheckbox`, `CategoryIcon`, `CollectionChip`.
- [x] **Charts (own SVG):** `BarChart`, `GroupedBarChart`, `DonutChart`, `Sparkline`
      — theme-aware, each with a `sr-only` accessible data-table fallback.
- [x] **Shell:** `AppLayout` with `TopAppBar` (title / back, bell + badge, settings)
      and `BottomNav` (4 tabs, active state, hides on editor routes), safe-area insets.
- [x] `/kitchen-sink` route rendering every component in every state, grouped into
      Buttons/Forms/Feedback/Domain/Charts sections.

**Done when:** `/kitchen-sink` shows all components correct in both themes, keyboard
navigable, and the four tabs route correctly with the nav preserving scroll position.
**Tag:** `m1` · **Test guide:** TESTING.md §M1

> **Chosen direction: Option A "Soft Cards"** (`design/design-options.html`). Applied
> here as token values plus these component variants: `Card` radius 22 px with a soft
> shadow, `CategoryIcon` as a tinted squircle chip, `BottomNav` floating with a
> filled-pill active tab, and a squircle FAB (used ad hoc per screen, not yet its own
> component — trivial to extract once a second use case shows up in M3+).

**Verified:** 40 Vitest unit/interaction tests (money formatting, focus trap +
restore, Sheet dismiss paths, Snackbar, SegmentedControl, Checkbox, AmountKeypad,
DonutChart edge cases) and 20 Playwright e2e tests (Pixel 7, light + dark), including
an axe accessibility scan of every top-level route with **zero violations**. Build is
93.8 KB gzipped JS (budget 180 KB).

**Bugs the test suite caught and fixed before merge** (kept here as the concrete
argument for why M1's "test as you go" gate matters):

- Native date/time picker icons were invisible in dark mode — missing a `color-scheme`
  declaration (browsers pick light-mode picker chrome by default regardless of your
  own dark background).
- Checkbox/Radio's check-mark/dot never rendered — an absolutely-positioned `<input>`
  paints _above_ a normal-flow sibling regardless of DOM order, hiding the indicator
  drawn "after" it. Fixed by positioning the indicator too.
- `Sheet`'s Android-back-button handling double-invoked `onClose` (once directly,
  once via the `popstate` its own `history.back()` call re-triggered) — found by a
  unit test asserting `history.length` is unchanged after a non-back-button close.
- Four real WCAG AA contrast failures caught by the axe scan: the danger button/swipe
  action (white text on dark-mode's lighter danger red), light-mode income green on
  white (3.3:1), and both soft-badge pairings for expense and warning (3.95:1 and
  2.86:1). Fixed with token changes — see the comments in `tokens.css` for the exact
  ratios and margins chosen.

---

## M2 — Data layer ✅ done

**Deliverable:** a typed, tested, versioned local database with backup/restore.

- [x] Dexie v1 schema: `transactions`, `categories`, `sources`, `accounts`, `rates`,
      `notes`, `noteCollections`, `tasks`, `taskCollections`, `notifications`,
      `settings`, `meta` (no separate `currencies` table — a currency is just an
      ISO code string; the minor-unit-exponent lookup lives in code, not the DB,
      since it's fixed reference data, not something a user edits)
- [x] Indexes chosen for the real queries: `transactions: date, type, categoryId,
[type+date], currency, deletedAt`, plus per-entity indexes for the rest
- [x] Typed repository per entity via a shared `createSoftDeleteRepo` factory:
      `list`, `listTrashed`, `get`, `create`, `update`, `remove`, `restore`,
      `hardDelete`. `transactions` adds `listFiltered` + `reassignCategory`;
      `rates` adds `getRateForCurrency` (latest-as-of-date lookup); `settings` and
      `notifications` are purpose-built (a singleton and a non-trashable inbox,
      respectively, so they don't fit the soft-delete shape)
- [x] Money helpers: `parseAmountToMinorUnits`, `minorUnitExponent`,
      `convertMinorUnits`, `sumConverted` (converts + tallies unconvertible
      currencies rather than dropping them — PRD AC-M7)
- [x] Period helpers: `getWeekRange`/`getMonthRange`/`getFinancialYearRange`/
      `getRangeForPeriod`/`shiftPeriod`/`getIsoWeekKey`, honouring week-start and
      FY-start
- [x] Seed on first run (idempotent, survives the user deleting a seeded row):
      default categories, default settings — base currency **ETB**, FY start
      **January**, week start **Monday**
- [x] `exportAll()` → versioned JSON; `importAll(json, mode: merge|replace)` with
      structural validation and a per-table counts result. **Deferred to M9:** a
      _preview_ diff shown before the user confirms an import — the underlying
      counts are already there, this is a UI-layer addition once the real
      Settings → Data screen exists
- [x] `requestPersistentStorage()` + `getStorageUsage()` (usage/quota/persisted)
- [x] `DatabaseProvider` (React context: opens the DB once, seeds, requests
      persistent storage) + a temporary `/debug/data` screen exercising create,
      export, import, erase, and storage usage — the real UI for these lands
      screen-by-screen in M3–M9

**Done when:** `npm run test` is green and export → erase → import restores state exactly.
**Tag:** `m2` · **Test guide:** TESTING.md §M2

**Verified:** 129 Vitest unit tests (up from M1's 40) covering every repository,
money maths, period-boundary maths (including leap years, year-boundary weeks, and
FY starts other than January), and export/import round-trips (replace _and_ merge
mode, plus validation rejecting a corrupt file without touching existing data) — all
against `fake-indexeddb`. 26 Playwright e2e tests (up from 20), adding real-browser
IndexedDB persistence-across-reload and erase-all checks that the fake-indexeddb
suite can't itself prove. Build is 129.6 KB gzipped JS (budget 180 KB).

---

## M3 — Money: capture & CRUD ✅ done

**Deliverable:** you can record real income and expenses and manage your taxonomy.

- [x] Add-transaction sheet: income/expense toggle, amount keypad, category chips
      (filtered by type, seeded categories in the intended order), date, account,
      source (income only, per the PRD data model), note, tags
- [x] Transaction list: grouped by day with per-currency subtotals, sticky month
      header. **Infinite scroll** via an `IntersectionObserver` sentinel (auto-loads
      60 at a time, with a tap-to-load-more fallback) rather than a windowing
      library — plenty for realistic personal-finance volumes; true virtualisation
      is deferred until M10's perf pass shows it's actually needed
- [x] Filters (type, category, source, account, currency, date range, note text)
      synced to the URL via `useSearchParams` (`replace`, not `push` — see
      `useTransactionFilters.ts` for why); removable chips + Clear all
- [x] Delete with confirm + 5 s undo snackbar. **Deviation from the literal
      checklist:** tapping a transaction opens Edit directly rather than a
      separate read-only Detail screen first — every field is already visible and
      editable in one compact form, so an intermediate detail-only view added a
      tap without adding information
- [x] Categories (icon + colour picker, income/expense tabs) / Sources / Accounts
      (the latter two share one `NamedEntityManager` component — identical shape)
      management screens, full CRUD. Deleting a category in use requires picking a
      **replacement category** before it's removed — nothing is ever silently
      deleted. **Deviation:** PRD's "reassign _or keep as Uncategorised_" — the
      "keep as Uncategorised" branch needs `categoryId` to become optional on
      `Transaction`, a schema/reporting decision better made with M4's aggregation
      logic in hand, so v1.0 requires an explicit replacement category instead
- [x] Exchange-rate table CRUD (currency code, rate to base, effective date),
      surfaced from Money's own nav row (a Settings → Money entry point is added on
      top of this, not instead of it, when M9 builds Settings)

**Done when:** you can log a week of real spending in mixed currencies and edit/delete
any of it. **Tag:** `m3` · **Test guide:** TESTING.md §M3

**Verified:** 144 Vitest unit tests (up from 129) and **50** Playwright e2e tests (up
from 26) — `e2e/money.spec.ts` covers add/edit/delete/undo, filtering, and the
category reassign-on-delete flow against real IndexedDB, and the accessibility sweep
now also covers `/money/categories`, `/money/sources`, `/money/accounts` and
`/money/rates` (zero violations). Build is 135.2 KB gzipped JS (budget 180 KB).

**Bugs the test suite caught and fixed before merge** (this milestone found more of
these than M1 and M2 combined — money math and money UI are exactly where "looks
right in a screenshot" and "is actually right" diverge):

- **A stored expense showed a "+"**: `MoneyText`'s `sign` prop only controlled
  colour, not the +/− prefix — `formatMoney`'s sign logic looked at the raw
  (always non-negative) `amountMinorUnits`. Fixed by having `MoneyText` derive the
  displayed sign from the `sign` prop itself, so an expense is always shown negative
  regardless of how its magnitude was stored.
- **Seeded categories appeared in a scrambled order**: Dexie's `toArray()` with no
  explicit ordering iterates by primary key — for a random UUID id, that's
  unrelated to creation order. Fixed by sorting every `list()`/`listTrashed()` by
  `createdAt` in the shared repo factory. That in turn exposed a second bug: the
  seed script gave every seeded row the _same_ `createdAt` (one timestamp reused
  for the whole batch), making the new sort a no-op for them — fixed by staggering
  seed timestamps by 1 ms per row so the deliberate "Food, Transport, …, Other"
  order survives.
- **The add-transaction sheet silently failed to open on the very first tap**: a
  race between React Strict Mode's synchronous mount→cleanup→mount and `Sheet`'s
  asynchronous `history.back()` (used to consume its own dismiss-tracking history
  entry) meant a stale `popstate` from the _first_ (phantom) mount's cleanup landed
  _after_ the second (real) mount had already pushed its own entry — closing the
  sheet the instant it reopened. Fixed by deferring that `history.back()` one
  microtask and skipping it if a new mount has already reclaimed ownership.
- **A filter sheet's "Apply" silently reverted the filter**: `Sheet`'s history
  cleanup called `history.back()` unconditionally to consume its own pushed entry
  — but `TransactionFilterSheet`'s Apply button calls `setSearchParams`, which
  modifies whatever history entry is _current_ (the sheet's own pushed one, at that
  point). `history.back()` then undid that change along with the dummy entry.
  Fixed by recording the URL at push time and only consuming the entry if the URL
  is still unchanged when closing — a sheet whose content legitimately changed the
  URL keeps that change, at the cost of a rare, harmless extra history frame.

---

## M4 — Money: reports ✅ done

**Deliverable:** the "what did I earn vs spend" answer, for any period.

- [x] `buildReport()` (`src/routes/money/reports/aggregate.ts`) — the pure,
      fixture-tested aggregation core: headline income/expense/net, previous-period
      delta (`null`, not `NaN`/`Infinity`, when the previous period was exactly
      zero), category/source/account breakdowns, sub-period buckets for the chart
      (`FY→months, Month→weeks, Week→days, Day→categories`), and mixed-currency
      handling via M2's `sumConverted` (excluded currencies are reported, never
      silently dropped)
- [x] `ReportsPage` UI: `PeriodSelector` + `PeriodStepper`, headline `StatTile`s,
      `GroupedBarChart`/`BarChart` for the sub-period view, `DonutChart` + ranked
      list for the category breakdown (income/expense toggle) with overflow past 5
      categories folded into an "Other" slice so the donut and the list underneath
      always sum to the same total, source/account breakdown lists, a missing-rate
      warning chip linking to `/money/rates`, "View transactions" (→ M3's list,
      filtered to the period) and "Export CSV"
- [x] CSV export (`csv.ts`) — RFC 4180 quoting/escaping, and amounts written with
      `formatMinorUnitsPlain` (no thousands separator) rather than the display
      formatter — see the bug note below
- [x] Route wired at `/money/reports`, linked from Money's nav row (superseded
      shortly after — see "Money section navigation" below: Reports moved to
      `/money` itself and the list moved to `/money/transactions`)
- [x] Plain-text summary "share" (`summary.ts` + `ReportsPage`'s Share button) — Web
      Share API when available, clipboard + a "Summary copied to clipboard" snackbar
      otherwise
- [x] Full manual verification pass (TESTING.md §M4) and `e2e/reports.spec.ts` +
      `e2e/reports-perf.spec.ts`
- [x] Perf check against a 5,000-row fixture _in the UI path_ (`e2e/reports-perf.spec.ts`
      imports a 5,000-row backup via the M2 debug import screen and times a real
      `/money/reports` load: ~50 ms locally against a 1.5 s budget — the aggregation
      function itself was already covered by a unit test at this scale)

**Done when:** a fixture of known transactions produces exactly the expected totals in
every period, and the numbers match a hand calculation. **Tag:** `m4` · **Test guide:** TESTING.md §M4

**Verified:** 190 Vitest unit tests (up from 144) — `aggregate.test.ts` (25 cases:
headline totals, breakdown-sums-to-total, previous-period delta including the
zero-previous-period edge case, week-start and FY-start configuration, mixed
currency, empty period, every sub-period bucket shape, and a 5,000-transaction
perf case under 100 ms), `csv.test.ts` (8 cases), `periodLabel.test.ts` (4 cases),
`summary.test.ts` (6 cases). **70** Playwright e2e tests (up from 50) —
`e2e/reports.spec.ts` covers headline totals, ranked category breakdowns, the
income/expense toggle, CSV export content, "View transactions", and both Share
code paths against real IndexedDB; `e2e/reports-perf.spec.ts` covers the 5,000-row
UI-path perf budget; the accessibility sweep now also covers `/money` (Reports)
(zero violations, both themes). Build is 138.46 KB gzipped JS (budget 180 KB).

**Bugs found this milestone:**

- **Account breakdown summed income and expense together as if the same sign**,
  producing a meaningless total (e.g. 100,000 income + 30,000 expense through the
  same account showing as "130,000" instead of a net "70,000"). Fixed by giving
  `breakdownBy()` an explicit per-transaction sign function for the one breakdown
  that legitimately mixes both transaction types.
- **CSV amounts used the display formatter**, which adds a thousands-group
  separator (`"1,500"` for ¥1,500) — correctly RFC-4180-quoted since it contains a
  comma, but fragile for a data-interchange format: some spreadsheet locales treat
  `,` as the decimal separator, and it's needless quoting either way. Added
  `formatMinorUnitsPlain()` (no grouping) for CSV/data-export use, keeping the
  grouped `formatMinorUnits()` for on-screen display only.
- **The add-transaction sheet's dev-mode-only flakiness, carried over from M3 as an
  unresolved "known issue," was root-caused and fixed.** Reproduced 100 % (15/15)
  under `test:e2e` pointed at the Vite dev server instead of the production preview
  build, confirming it really was a Strict-Mode-only race, not environmental noise.
  The actual bug: `Sheet`'s history-owning effect pushed a _fresh_ history entry on
  every run, so Strict Mode's synchronous mount → cleanup → mount for one logical
  open pushed **two** entries — and because the ownership refs (`ownsHistoryEntry`,
  `pushedHrefRef`) are shared across that remount, the first run's deferred cleanup
  (the mechanism M3 added for exactly this class of race) couldn't tell "the second
  run has since taken ownership" apart from "nothing has, this is a real close" —
  both look identical through a shared boolean. It ended up consuming whatever
  entry was on top (the second run's) and closed the sheet the instant it reopened.
  Fixed by (a) skipping the push whenever one is already pending, so exactly one
  entry is ever pushed per logical open regardless of Strict Mode, and (b) a
  generation counter each run captures locally, so a superseded run's cleanup can
  correctly stand down instead of guessing from a ref every run overwrites the same
  way. Verified with 25 repeated runs against the dev server (0/15 → 25/25).
- **`DonutChart` keyed its slices by display label**, which collides whenever two
  distinct data points share a fallback label — e.g. two categories that both no
  longer exist rendering as "Uncategorised" (reachable via a malformed/legacy
  import, not through normal in-app deletion, which always requires reassigning to
  a category that still exists). Surfaced as a React "duplicate key" console error
  while exercising the M4 perf fixture (which intentionally clears categories to
  isolate the timing measurement from category-lookup cost). Fixed by keying on
  array index instead, which is safe here since `DonutChart` always receives a full
  replacement array rather than an independently-reordered list.

### Post-M4 fix — Money section navigation

Landing on the Money tab put you on the transaction list, and only that one screen
had links to Reports/Categories/Sources/Accounts/Rates — from any of those five
screens there was no way to a sibling except back to the list first. Two changes:

- **Reports is now `/money`'s index** (what the Money bottom-nav tab opens
  directly), and the transaction list moved to `/money/transactions`. Reports is
  the more useful landing view once there's real data in the app; the trade-off is
  a first-ever launch with zero transactions lands on mostly-empty report cards
  instead of the list's clearer "Tap + to log your first income or expense" — worth
  revisiting if that turns out to matter once M8's Home dashboard exists as an
  alternative entry point.
- **`MoneySubNav`** (`src/routes/money/MoneySubNav.tsx`) — a shared pill-tab row now
  rendered by all six Money screens, replacing the ad hoc link row that used to
  live only on the list. The 6 tabs don't all fit on one line at phone width, so
  the row scrolls horizontally; the active tab scrolls itself into view on every
  navigation so it's never left off-screen with nothing on screen showing which
  section you're on (caught by screenshotting the real preview build at Pixel-7
  width — Accounts and Rates, the two tabs past the fold, landed exactly there
  before the fix).

**Verified:** `e2e/money-nav.spec.ts` (18 cases) — the Money tab opens Reports; each
of the six screens shows the sub-nav with the right tab marked `aria-current` and
in the viewport; the sub-nav carries you directly between non-adjacent sections; the
bottom-nav Money tab stays highlighted throughout. All prior M3/M4 suites updated
for the new paths and still green (190 unit, 88 e2e, both themes).

---

## M5 — Notes ✅ done

**Deliverable:** real writing, organised.

- [x] Tiptap editor (lazy chunk): H1–H3, bold, italic, underline, strike, highlight
      with colours, bullet/ordered/check lists, blockquote, code, code block, rule, link.
      **Deviation:** the editor lives at `/notes/new` and `/notes/:id` as a real route,
      not a Sheet like Money's `TransactionSheet`/Tasks' `TaskSheet` — a rich-text
      editor genuinely wants the full viewport, and `AppLayout`'s chromeless-route
      table already had `/notes/` reserved for exactly this since M1/M3 ("routes that
      render full-screen... hidden on full-screen editors"); `isChromeless()` is now
      precise about it, so `/notes/collections` and `/notes/trash` keep the normal
      chrome + a new `NotesSubNav` (mirroring `MoneySubNav`/`TasksSubNav`) since
      they're ordinary list/CRUD screens, not editors. Highlight colours are stored as
      `var(--note-highlight-*)` token references rather than literal hex — Tiptap's
      Highlight mark writes whatever string it's given straight into an inline
      `background-color` style, so a note painted in light mode keeps resolving
      correctly once the theme switches, with no per-note migration needed
      (tokens.css's `--note-highlight-*` block)
- [x] Sticky formatting toolbar above the keyboard + `/` slash menu. **Deviation:**
      "sticky" is a flex-column layout (toolbar as the last flex child below the
      editor's own scrollable content), not CSS `position: sticky` — this keeps it
      pinned just above wherever the on-screen keyboard currently ends without
      needing visualViewport-inset JS, which behaves inconsistently across mobile
      browsers. The slash menu is a plain positioned `<div>` driven by Tiptap's own
      `coordsAtPos` API, not a popup library — none was already a dependency
- [x] Autosave (debounced 500 ms) + "saved" indicator; survives app kill. Flushes
      immediately on blur/visibilitychange/unmount, not just the debounce timer, so a
      hard kill mid-typing never loses more than 500 ms of edits. **Deviation:** a
      brand-new note (`/notes/new`) isn't written to the database until the first
      real edit — the first debounced/flushed save creates the row and swaps the URL
      to `/notes/:id` via a `replace` navigation, so backing out of an untouched
      draft never litters the list with an empty note
- [x] Notes list: group **by date** or **by collection** (toggle persisted), pinned
      first, card/list density toggle
- [x] Full-text search over title + derived plain text
- [x] Collections CRUD with safe delete (move to Unfiled by default). Per PRD AC-N4,
      deleting a collection in use offers an explicit choice — "move notes to
      Unfiled" (default/primary) or "delete notes too" (destructive) — via `Dialog`
      directly rather than `ConfirmDialog`, which only has room for a confirm/cancel
      pair
- [x] Tags, pin, colour, duplicate, soft-delete Trash with restore + 30-day purge.
      The purge runs once per app open (`sweepExpiredNoteTrash`, from
      `DatabaseProvider` right after `seedIfNeeded`) rather than as a background job,
      since there's no runner for that other than the M7 service worker's
      periodicsync, which can't touch IndexedDB reliably across every target browser

**Done when:** a note using every supported format survives reload byte-identical and
renders correctly in both themes. **Tag:** `m5` · **Test guide:** TESTING.md §M5

**Verified:** 44 new Vitest unit tests (294 total, up from 250) — `noteViews.test.ts`
(19 cases: date-group boundaries including the 23:59/00:01 case and a note edited
"yesterday", pinned-floats-to-top for both grouping modes, by-collection grouping,
search), `noteCollectionDelete.test.ts` (3, the move-vs-delete plan), `notesTrashSweep.test.ts`
(6, the 30-day boundary and a full repo-level sweep), `editorExtensions.test.ts` (4,
contentText derivation from a representative multi-node Tiptap doc), `slashCommands.test.ts`
(8, trigger detection against a real headless Tiptap `Editor` instance) and
`notePrefs.test.ts` (4). **26** new Playwright e2e tests (164 total, up from 138) —
`notes.spec.ts` drives the real Tiptap editor in a real browser: every required
mark/node applied once via the toolbar and confirmed identical after a reload,
highlight readability across a live theme switch, autosave-survives-reload, an
untouched draft never persisting, grouping-toggle persistence, pin-floats-to-top,
a body-only search match, both collection-delete choices, and trash restore; the
accessibility sweep now also covers `/notes`, `/notes/collections`, `/notes/trash`
and `/notes/new` (zero violations in both themes). Build is 151.61 KB gzipped JS for
the initial bundle (budget 180 KB, up from M7's 143.81 KB baseline for the new eager
notes screens) — the Tiptap chunk itself is a separate lazy 125.69 KB gzipped, loaded
only when a note editor actually opens, confirmed by grepping the built initial
bundle for `tiptap`/`ProseMirror` (zero matches; all 24 land in the lazy chunk).

**Bugs found this milestone:**

- **Typing into a brand-new note would silently vanish from the screen the instant
  autosave first fired**, even though the database write itself was correct. The
  lazy `<NoteEditor>` was keyed on the route's `:id` param
  (`key={id ?? 'new'}`), so that autosave's own create-then-`replace`-navigate flow
  (which changes `:id` from undefined to a real UUID under the _same_ mounted
  `NoteEditorPage`) made React remount `NoteEditor` from scratch — with
  `initialContent` frozen at its stale `EMPTY_DOC` value, since content updates
  after the initial load only ever flowed through a ref, never back into that
  state. The DB had the correct content (whatever was captured in the save that
  triggered the remount), which is what made it easy to miss in isolated manual
  testing; it only showed up once the e2e suite exercised a long, continuous typing
  session against a real browser. Fixed by freezing the editor's key at mount
  (`useState(() => id ?? 'new')`, never updated afterward) instead of deriving it
  from the live route param, and by changing "duplicate" to stay on the current note
  rather than navigate to the copy — which would have hit the identical hazard for
  the same reason.
- **The note content editor failed the accessibility sweep**: a plain contenteditable
  `<div>` carries no ARIA role axe recognises, so pairing it with `aria-label` alone
  tripped `aria-prohibited-attr`; the editor route also had no `<h1>`, tripping
  `page-has-heading-one` (every other top-level screen has one; this one's visible
  "heading" is the title `<input>`, not a heading element). Fixed by adding
  `role="textbox"` + `aria-multiline="true"` to the editor's root and a visually
  hidden `<h1>` ("New note"/"Edit note") to the page.
- **Two e2e tests that click a button and immediately `page.goto()` to a different
  route were flaky**: `page.goto` is a full browser reload, and the button's own
  handler (an async repo write followed by a state update) doesn't block the click
  from resolving — reloading could cut the in-flight write short. Fixed the tests,
  not the app, by waiting for each action's own on-screen confirmation (the delete
  dialog closing, a restore's snackbar text) before navigating away.

---

## M6 — Tasks ✅ done

**Deliverable:** the weekly plan → do → review loop.

- [x] Task CRUD (`TaskSheet`): title, notes, collection, priority, due date+time,
      reminder offsets. **Deviation:** `notes` is a plain string, not the Tiptap JSON
      `Task.notes` is typed for — M5 hasn't built the editor yet. Stored as-is in
      that `unknown` field; M5 can upgrade it without a migration, since a bare
      string round-trips through Tiptap's own shape as a single paragraph node
- [x] Subtasks (`SubtaskEditor`): add, rename (inline), toggle, delete, and
      drag-reorder via a pointer-drag handle (no drag-and-drop library — the row
      under the pointer swaps in live, the same "shuffle as you drag" feel as a
      native mobile reorder list); `n/m` progress shown on the parent row
- [x] Views (`TasksPage`, pure logic in `taskViews.ts`): Today (overdue first, then
      due-today by time), Upcoming (grouped by day for 14 days, then one trailing
      "Later" group), All (search + collection filter), Completed (most recently
      completed first — un-completing from here is how a "restore" happens, there's
      no separate soft-delete-style restore for a status change)
- [x] Swipe-to-delete with undo (`TaskListItem`, via the shared `SwipeableRow`);
      complete is the checkbox, not a second swipe action — `SwipeableRow` is
      deliberately single-action (see M1), and every task row already has an
      always-visible checkbox, so a swipe action would just be a redundant second
      way to do the same thing
- [x] Collections CRUD (`TaskCollectionsPage`): icon + colour, safe delete (moves
      affected tasks to Unfiled, mirroring M5's note-collection spec) rather than
      Money's reassign-required flow — PRD requires reassignment specifically for
      Money's categories; nothing says the same for tasks, and Unfiled is the
      friendlier default absent a reason not to
- [x] Plan-the-week (`PlanWeekPage`): week header, quick-add straight into the week,
      carry-forward list from last week with per-item and bulk "move to this week"
- [x] Review-the-week (`ReviewWeekPage`): Done/Not-done split, completion rate via
      `ProgressBar`, a reflection saved as a real note in an on-demand "Weekly
      reviews" collection (M2's notes data layer already exists even without M5's
      editor UI — this writes a plain-text note directly rather than waiting),
      carry-forward for what's left undone
- [x] Both reachable any day via a persistent "This week" card + Plan/Review buttons
      on `TasksPage` (not literally a single "chip" — a small card reads better at
      this width once it needs both actions), plus `TasksSubNav` (mirroring Money's
      own subnav — see its "Post-M4 fix" note above) on every Tasks screen so none
      of Tasks/Collections/Plan/Review is a dead end

**Done when:** you can plan a week, complete part of it, and produce a review whose
counts match reality. **Tag:** `m6` · **Test guide:** TESTING.md §M6

**Verified:** 66 new Vitest unit tests (228 total, up from 190) — `taskViews.test.ts`
(22 cases: overdue/due-today at day granularity not time-of-day, Today's
overdue-first ordering, Upcoming's day-grouping and 14-day horizon, All's
search/collection filters, Completed's ordering), `dueLabel.test.ts` (9),
`week.test.ts` (7, incl. an ISO-week year-boundary case). **34** new Playwright e2e
tests (122 total, up from 88) — `tasks.spec.ts` and `tasks-week.spec.ts` cover
capture, subtasks, all four views, swipe-delete-undo, collections' safe delete, and
the full plan → complete → review → carry-forward → reflection loop against real
IndexedDB; the accessibility sweep now also covers `/tasks`, `/tasks/collections`,
`/tasks/plan`, `/tasks/review`. Build is 143.81 KB gzipped JS (budget 180 KB).

**Bugs found this milestone:**

- **Tapping a task's checkbox also opened the edit sheet.** `TaskListItem` gives
  `ListItem` both an `onClick` (open to edit) and an interactive `leading` element
  (the checkbox) — a click on the checkbox bubbles up through the row's own click
  handler unless stopped, so checking a task off also popped the edit sheet open
  over it. Fixed in `TaskCheckbox` itself (`e.stopPropagation()`), not just this one
  call site, since any future clickable-row-with-a-leading-checkbox combination
  (e.g. M8's "Today's tasks card with inline completion") would hit the same bug.
- **A saved weekly reflection never loaded back in.** `ReviewWeekPage` seeded
  `reflection`'s `useState` initializer from `existingReview?.contentText`, but
  `notes` (from `useLiveQuery`) starts as `EMPTY_ARRAY` on the very first render and
  only resolves to the real data a moment later — so the initializer always
  captured that first, empty render, and a previously-saved reflection would show
  up as blank every time. An effect calling `setState` to "fix" this after the fact
  hit `react-hooks/set-state-in-effect` (correctly — that's cascading-render-prone).
  Fixed by extracting the field into its own `ReflectionField` component that
  `ReviewWeekPage` mounts only once `notes` has actually resolved, so its own
  `useState` initializer captures the right value on a genuinely fresh mount — no
  effect needed.
- **Plan-the-week's quick-add could silently wipe out the _next_ task's title.**
  `handleQuickAdd` cleared the input via `setDraft('')` _after_ `await
repos.tasks.create(...)` — so if a second title got typed into the same field
  before that write resolved (easy to do quickly-add several tasks in a row, which
  is the screen's whole point), the delayed clear fired after the fact and wiped
  the new text back to empty. Surfaced as an e2e test intermittently failing to
  add a second task — looked at first like ordinary test-timing flake, but padding
  the assertion timeout didn't fix it, which is what exposed that the input itself
  was actually being cleared, not just slow to update. Fixed by clearing the field
  synchronously before the write instead of after, removing the race outright
  rather than narrowing its window.
- One e2e-only race (not an app bug): a test navigating away immediately after a
  click, before the async repo write it triggered had actually resolved, produced
  a string of "element not found" failures — fixed by waiting for the on-screen
  confirmation (dialog closed, new text visible) _before_ the next navigation, not
  by adding blind waits.

---

## M7 — Notifications & reminders ✅ done

**Deliverable:** reminders that arrive, and an inbox that never loses one.

- [x] Scheduler (`src/lib/reminders.ts` — pure `computeDueReminders()`, deliberately
      dependency-free so the same logic runs on the main thread, inside the service
      worker's periodicsync handler, and under Vitest): computes the next fire time
      for weekly-plan, weekly-review, task-due (per-task `reminderOffsets`, already
      captured by M6's `TaskSheet`) and daily-agenda reminders, plus a recurring
      backup nudge that reschedules itself from whichever is more recent, the last
      real export or the last nudge. A 3-day catch-up window (not applied to the
      backup nudge) keeps re-opening the app after months away from dumping a huge
      backlog into the inbox
- [x] Service worker (`src/sw.ts`, switched from `generateSW` to `injectManifest` —
      the only way to add handlers of our own): `notificationclick` closes the
      notification and deep-links (focuses an existing tab via `postMessage`, or
      `clients.openWindow` if none is open); `periodicsync` re-runs the same
      scheduler against its own Dexie handle, best-effort or a no-op everywhere
      the API isn't supported
- [x] Catch-up on app open (`useNotificationRuntime`, run once per mount from
      `AppLayout`): writes an inbox entry for everything newly due and attempts OS
      delivery for each, deduplicated against what's already in the `notifications`
      table so nothing fires twice (AC-P2)
- [x] Quiet hours suppression — inbox entry is always written; OS delivery alone is
      skipped when the current time falls inside the (possibly overnight) window
      (AC-P3)
- [x] In-app notification inbox (`NotificationsInboxPage`, `/notifications`) — the
      bell's unread badge is now wired to `notificationsRepo.listUnread()` (it
      existed as UI since M1 but nothing populated it); tap to mark read and
      deep-link, swipe or "Clear all" to remove, "Mark all read"
- [x] In-context permission request — a `ConfirmDialog` explainer shown the first
      time a reminder is turned on while permission is still undecided, _before_
      calling `Notification.requestPermission()`; honest state display in the new
      `SettingsPage` (`/settings`, gear icon)
- [x] "Send a test notification" button — reuses `ReminderScheduler.sendTest()`
      directly rather than duplicating its permission/delivery logic
- [x] `ReminderScheduler` interface (`src/notifications/scheduler.ts`) with
      `WebScheduler` as the only v1.0 implementation, per PRD OD-1. A
      `CapacitorScheduler` can be added in M10 without touching feature code —
      **only if** the real-phone pass below shows delivery is unreliable

**Deviation:** `Settings.reminders.taskDue.offsets` (a global default) is left
unused in this screen — M6 already gives each task its own `reminderOffsets` from
`TaskSheet`, which is the actual per-occurrence control the PRD's "Offsets,
configurable" means; Settings surfaces only the global on/off switch for task-due
reminders. `SettingsPage` also covers Reminders only — Appearance/Money/Data/About
land with the rest of Settings in M9.

**Done when:** a reminder set 2 minutes ahead arrives on the phone, deep-links
correctly, and appears in the inbox. **Tag:** `m7` · **Test guide:** TESTING.md §M7

**Verified:** 250 Vitest unit tests (up from 228) — `reminders.test.ts` (14 cases:
quiet-hours same-day/overnight/disabled/degenerate windows, weekly occurrence
timing and the catch-up-window cutoff, daily-agenda's today/yesterday fallback,
task-due skipping completed/undated tasks, and the backup nudge's
installedAt/last-export/last-nudge baseline logic), `scheduler.test.ts` (7 cases,
permission module mocked: inbox-write-always-happens, OS delivery gated on
permission and quiet hours, no double-fire on repeated catch-up calls, `sendTest`'s
in-context permission request), plus a `notificationsRepo.markDelivered` case.
**138** Playwright e2e tests (up from 122, both themes) — `notifications.spec.ts`
covers the denied-permission state honestly (no re-prompt), quiet hours' UI and
persistence, a real catch-up-generated reminder appearing in the inbox and
deep-linking to the right screen, and Clear all; the accessibility sweep now also
covers `/notifications` and `/settings`. Build is 147.34 KB gzipped JS (budget
180 KB) plus a separately-loaded 40.22 KB gzipped service worker (not part of the
initial-paint budget).

**Bugs found this milestone:**

- **The service worker failed to register at all in the production build** —
  caught by the kitchen-sink suite's "no console error" check, which surfaced
  `ServiceWorker script evaluation failed`. Root cause: `injectManifest`'s default
  build format is ES modules (needed here since the bundle references
  `import.meta`), but vite-plugin-pwa v1.3's auto-generated production register
  script always passes `type: 'classic'` to `navigator.serviceWorker.register()`
  regardless of the service worker's actual build format — a real gap in the
  plugin, confirmed by registering the same built file manually with
  `{ type: 'module' }` (works) versus without (the exact same failure). Fixed by
  building the service worker itself as a classic IIFE
  (`injectManifest.rollupFormat: 'iife'`) instead, which keeps the two in sync
  without a hand-rolled registration call.
- **Not a shipped bug, but the same class M6 already found twice:** the first
  draft of `TasksPage`'s `?taskId=` deep-link handling (for a tapped task-due
  notification) synced the URL into `editing` state from inside a `useEffect`,
  which `react-hooks/set-state-in-effect` correctly flagged before it ever ran.
  Rewritten as a value derived straight from `tasks` + the URL during render
  (`effectiveEditing = editing ?? deepLinkedTask`), with the URL only cleared from
  a real event handler (closing the sheet) — no effect needed, same shape as the
  fix M6 already landed for `ReviewWeekPage`'s reflection field.
- Headless Chromium was found to always report `Notification.permission` as
  `"denied"`, even with `context.grantPermissions(['notifications'])` — confirmed
  empirically, not assumed. Neither the 'default' explainer path nor a real
  'granted' OS-delivery path is reachable through Playwright as a result; both are
  covered by code review and `scheduler.test.ts`'s mocked permission states
  instead, with the real-phone pass below as the actual proof for delivery.

---

## M8 — Home / landing ✅ done

**Deliverable:** the dashboard from PRD §5.1, wired to live data.

- [x] Greeting header with date, week number, FY label
- [x] Money summary card with persisted Week/Month/Year toggle → links to M4
- [x] Today's tasks card with inline completion → links to M6
- [x] Plan/review banner on the configured days, dismissible for the day
- [x] Recent notes card → links to M5
- [x] Quick actions row (add income / expense / note / task)
- [x] First-run empty state
- [x] Skeletons while loading; no layout shift

**Done when:** every number on Home matches its feature screen exactly.
**Tag:** `m8` · **Test guide:** TESTING.md §M8

**Verified:** 21 new Vitest unit tests (315 total, up from 294) — `homePrefs.test.ts`
(4, period-toggle persistence incl. a corrupted-value fallback), `homeBanner.test.ts`
(9, plan/review-day detection incl. the both-configured-same-day tiebreak and
independence from each reminder's own `enabled` flag, plus per-day dismissal),
`taskViews.test.ts` additions (4, `getOverdueCount` counting every overdue task —
not just the 5 Home actually shows — and `toggleCompletePatch`), `noteViews.test.ts`
additions (4, `getRecentNotes` sorting by `updatedAt` not `createdAt`, with a case
that deliberately decouples the two). **44** new Playwright e2e tests (208 total, up
from 164) — `home.spec.ts` seeds deterministic fixtures via `/debug/data`'s JSON
import (same mechanism `reports-perf.spec.ts` uses) rather than driving each
feature's own add-sheet, since only that gives exact control over due-dates,
edit-recency and reminder-day config independent of whatever day the suite
actually runs on: the empty first-run state, money totals matching a same-period
`/money` load exactly, the 7-tasks-capped-to-5 today's-tasks card with a
same-Today-view comparison against `/tasks` and inline completion updating both
screens immediately (AC-H3), the 3-most-recently-_edited_ (not created) notes
card, the plan/review banner appearing only on its configured day and staying
dismissed for the rest of that day across a reload, every quick action opening
its create flow pre-set correctly, and every card's own link to its feature
screen (AC-H4); the accessibility sweep now also explicitly covers `/` populated
with real data in both themes (the existing top-level sweep already covered `/`'s
empty state across both Playwright projects' `colorScheme`, but not populated
cards, which is where the two bugs below were actually caught). Build is
153.03 KB gzipped JS for the initial bundle (budget 180 KB, up from M5's
151.61 KB baseline — Home adds no new heavy dependency, so the ~1.4 KB delta is
just its own code).

**Deviations:**

- `/money/new` and `/tasks/new` didn't exist as real routes before this milestone
  — only the PWA manifest shortcuts (`vite.config.ts`) and `AppLayout`'s
  `CHROMELESS_PREFIXES` anticipated them, and Money/Tasks each only ever opened
  their add-sheet from in-page `addOpen` state. Added `NewTransactionPage`
  (`/money/new[?type=]`) and `NewTaskPage` (`/tasks/new`) as thin chromeless
  wrappers around the exact same `TransactionSheet`/`TaskSheet` each list page
  already uses, rather than inventing a second create flow — Home's quick
  actions and the manifest shortcuts now both genuinely work.
- The money summary card's Week/Month/Year toggle reuses `PeriodSelector`, which
  previously always offered all four periods including "Day". Gave it an
  optional `periods` prop (defaulting to all four, so Reports is unchanged) so
  Home can restrict it to the three the PRD actually asks for, instead of
  forking a second segmented-period control.
- Extracted `toggleCompletePatch()` into `taskViews.ts` — Home's own inline
  completion needed the exact "what does toggling actually set" logic that
  `TasksPage` and `PlanWeekPage` each already duplicated verbatim; all three now
  share it. Similarly extracted `buildRateLookup()` (the "latest known
  exchange rate" lookup `ReportsPage` already built inline) into
  `reports/rateLookup.ts` so Home's money card converts currency exactly the
  same way Reports does, rather than a second copy that could silently drift.
- "No data at all" (Home's single empty-state card, per the PRD's literal
  wording) is judged as zero transactions **and** zero tasks **and** zero notes
  together — any one of the three having data instead shows the normal cards
  with their own per-card empty states (e.g. "Nothing due today"), since a
  blanket empty-state card would be actively wrong once part of the app is
  actually in use.
- Today's-tasks rows don't navigate anywhere by tapping the row itself (only the
  task's own title text is a tap target) — seeded by the first bug below.
  `ListItem`'s whole-row-as-button pattern, used elsewhere with the same
  `TaskCheckbox` as its `leading` content, only became a genuine problem once
  real tasks reached this card; see that bug for why it's flagged rather than
  silently fixed everywhere it appears.

**Bugs found this milestone:**

- **A JSON import that omits `meta` (as a hand-built test fixture naturally
  does) silently resets `settings` back to `DEFAULT_SETTINGS` on the very next
  full page load.** `seedIfNeeded()` (`src/db/seed.ts`) treats a missing
  `seededAt` meta row as "fresh database" and re-seeds default categories _and_
  settings; `importAll`'s `replace` mode clears the `meta` table along with
  everything else, so any imported `settings` survives only until the next
  reload, at which point seeding quietly overwrites it. Existing fixture-driven
  e2e tests (`reports-perf.spec.ts`) never noticed because they don't depend on
  custom settings; Home's plan/review-banner tests do, and initially failed in
  a way that looked like a banner-logic bug (wrong day, or the wrong banner
  entirely) before tracing it back to the settings themselves reverting.
  Home's own fixture now always includes a `seededAt` meta row; not a product
  bug so nothing in `src/` changed, but worth documenting since the next
  fixture-based e2e suite will hit it too.
- **Real (non-empty) task rows fail the accessibility sweep with
  `no-focusable-content`**: `TaskListItem` (and the equivalent inline markup
  this milestone almost duplicated for Home) renders a whole clickable row as a
  `<button>` with `TaskCheckbox` — itself a `<button role="checkbox">` — as its
  leading content, nesting one interactive element inside another. The
  top-level accessibility sweep never caught this because it only ever visits
  `/tasks`, `/tasks/plan` and `/tasks/review` against a fresh, empty database,
  so `TaskListItem` never actually renders there. Home's own a11y test seeds
  real tasks, which is what surfaced it. Fixed in Home's own today's-tasks card
  (no row-level `onClick`; only the task's title text is a separate button),
  and then applied the identical fix to `TaskListItem` itself (shared by
  Tasks/Plan/Review) right after M8 landed, rather than leaving it as debt —
  verified with the full e2e suite (114 affected specs, incl. the existing
  "tap row to edit" / "tap checkbox to complete" behaviour) still green.

### Post-M8 — Home aligned to the chosen Option A design

M8's first pass used the existing generic components (`StatTile`, plain `Button`
grid) rather than the specific "Soft Cards" Home layout from
`design/design-options.html`. Rebuilt to match it: a blue-gradient hero card
(`Card` with an inline gradient/shadow override) replaces the plain money card,
carrying the "THIS {PERIOD}" eyebrow, an inverse-styled `PeriodSelector` toggle,
the signed net figure, and independent income/expense bars sized relative to
whichever is larger; a row of four icon quick-action tiles sits right below it
(reordered to Expense/Income/Note/Task, matching the mockup) in place of the old
bottom 2×2 button grid; the plan/review banner gained a tinted border, real
"N planned · M done" counts (from the tasks tagged to the current `weekKey`,
the same filter `ReviewWeekPage` already uses inline), and a filled "Start"
pill button alongside the existing dismiss control; recent notes gained a
`CategoryIcon` chip per row, tinted by the note's own `color` when set. Section
order now matches the mockup too: hero → quick actions → today's tasks →
banner → recent notes.

Two small, reusable component additions came out of this rather than one-off
inline hacks: `MoneyText` takes an optional `color` override (for a tinted/dark
context where the sign-based green/red would clash), and `SegmentedControl`/
`PeriodSelector` take an optional `variant="inverse"` for a translucent-on-colour
track — both used only by Home today but generic enough for the next screen
that needs the same treatment.

**Deviations from a literal pixel match:** the hero's period toggle keeps full
"Week"/"Month"/"Year" labels rather than the mockup's single-letter "W/M/Y" —
better for accessibility (a screen reader says "Week", not "W") and
localization, at a small cost to compactness. Income/expense figures in the
hero are shown unsigned (as the mockup itself does — colour there would clash
against the blue background); only the headline net figure is signed
(`+`/`-`), which is a deliberate divergence from Reports' own net stat (never
signed) — same underlying number, different headline-vs-detail treatment per
screen.

**Verified:** all existing M8 Vitest/Playwright coverage still passes
unchanged (315 unit, 208 e2e) after updating the handful of e2e assertions
that depended on since-changed copy (quick-action button labels lost their
"+ " prefix, the banner's CTA text lost its arrow now that "Start" is a real
button, and the money summary's sign expectations changed as described
above). Also confirmed visually — real-data screenshots in both light and
dark, not just the automated suite — before considering this done.

### Post-M8 — Home always shows the real dashboard, even at zero

The `hasNoData` branch replaced the _entire_ dashboard with a single
full-screen "Welcome to Dowi" card (icon, description, three stacked create
buttons) whenever transactions+tasks+notes were all empty — jarring in
practice, since it meant the very first thing a new user saw looked nothing
like the app they'd actually use, and the takeover screen was reachable again
any time the database happened to be fully empty (e.g. after erasing
everything), not just on a literal first run.

Removed that branch entirely. The real dashboard (hero → quick actions →
today's tasks → banner → recent notes) now always renders once loading is
done — it already degraded gracefully at zero before this (the hero's bar
math already guards divide-by-zero; Today's-tasks and Recent-notes already
have their own inline `EmptyState` for "nothing here yet"), so no per-section
changes were needed beyond the money hero showing `ETB 0.00` and unstyled
zero-width bars, which it already did correctly.

In its place: a brief, dismissible entry card (only while `hasNoData`) — one
line of intro copy and a single "Take the tour" button, plus the usual ✕
dismiss. Tapping it opens **`GettingStartedTour`**
(`src/routes/home/GettingStartedTour.tsx`), a real stepped walkthrough —
2 short steps each for Money/Tasks/Notes (6 total; content in
`src/routes/home/tourContent.ts`) — built as a `Sheet` (the app's
established container for substantial content, not `Dialog`, which is
reserved for tiny confirms) with a `SegmentedControl` category switcher, a
`ProgressBar` for overall position, and a Back/Next footer that becomes
"Done" on the last step, plus a "Skip" always available. Step navigation is
plain component state (`src/routes/home/tourNav.ts`'s pure `nextTourIndex`)
— deliberately **not** additional history pushes, since `Sheet` already owns
exactly one push/pop per open cycle; the system back button/gesture just
closes the whole tour like any other Sheet. `homeTour.ts`'s existing
dismissal persistence (`dowi:home:tourDismissed`, localStorage, try/catch,
**permanent** unlike the per-day plan/review banner) is unchanged — closing
the tour any way (Skip, Done, scrim, Escape) triggers it, same as the entry
card's own ✕. The entry card also still disappears on its own the moment
there's any real data, with no dismiss required.

**Bug caught before it was ever committed:** the first wiring had the tour's
Skip/Done buttons call only the local `setTourOpen(false)` — closing the
Sheet but never actually marking the tour dismissed, so it would silently
reappear on the next visit despite having just been completed. An e2e
assertion (dismissal persists across reload) caught it immediately; fixed by
having the tour's `onClose` also call the same `handleDismissTour()` the
entry card's own ✕ uses, so every path out of the tour counts as "seen it."

**Verified:** 10 new Vitest unit tests (325 total, up from 315) —
`homeTour.test.ts` (4: dismiss round-trip, fails open on a blocked read,
ignores a blocked write) and `tourNav.test.ts` (6: next/back bounds,
category-jump landing on the right index). Home's e2e "empty state" describe
block now covers: the dashboard renders at zero alongside the entry card;
stepping all the way through the tour via Next, jumping categories via the
switcher, and landing on "Done" at the last step; Skip/Done and the entry
card's own ✕ both dismissing permanently across a reload; and the entry card
disappearing on its own once a fixture with any data is imported — plus a
dedicated accessibility pass with the tour Sheet open, in both themes (the
existing sweep can't reach it, since it only ever runs against a
fixture-seeded, non-empty database). 218 e2e total (up from 208), all
passing. Confirmed visually with a fresh build against a
genuinely empty database, in both themes, before considering this done.

---

## M9 — Settings & data management ✅ done

**Deliverable:** everything configurable, and your data under your control.

- [x] Appearance: theme, text size, density
- [x] Money: base currency, rates CRUD, FY start month, week start, default account,
      hide-amounts privacy blur
- [x] Reminders: per-reminder day/time/offsets, quiet hours, test notification
- [x] Data: export JSON, import (merge/replace with diff preview), storage usage,
      persistent-storage request, Trash, erase-all with type-to-confirm
- [x] About: version, build date, changelog, check for update, licences

**Done when:** every setting persists across a cold restart and takes effect at once.
**Tag:** `m9` · **Test guide:** TESTING.md §M9

Reminders/quiet-hours/test-notification were already built in M7 — this
milestone left that section alone and added Appearance, Money, Data and
About as their own files (`AppearanceSettings.tsx`, `MoneySettings.tsx`,
`DataSettings.tsx`, `AboutSettings.tsx`) composed into the existing
`SettingsPage.tsx`, rather than growing one file past 700+ lines — the same
split Money/Tasks/Notes already use for their own sub-screens.

Two previously-unwired `Settings` fields got wired up: `textSize` (`s`/`m`/`l`)
and `hideAmounts` now do something, applied respectively via a `data-text-size`
root attribute (`ApplyAppearance.tsx`, mirroring how `ThemeProvider` applies
`data-theme`) and a CSS blur in `MoneyText` (the one place every amount
renders, via a new `useHideAmounts()` hook — the same
`useDatabase()`+`useLiveQuery` pattern `baseCurrency`/`weekStartsOn` already
use to reach deep components). `defaultAccountId` now pre-fills a new
transaction's account field. A `density` field (`comfortable`/`compact`) was
added to `Settings` (no schema/Dexie version bump needed — the `settings`
table is keyed `&id` only, so a new plain field on the stored object is
free) and wired to `Card`'s own padding (`--space-card`, `src/styles/tokens.css`)
— deliberately narrow in scope (one shared primitive, not a full spacing-system
rewrite) rather than density-tuning every screen individually, which was
enough to make the setting real and visible without a much larger project.

**Theme reconciliation:** `ThemeProvider`/`useTheme()` (its own `dowi:theme`
localStorage key, applied before React mounts to avoid a flash) stays the
actual source of truth for what's rendered — Appearance's theme control
calls `setPreference()` for the real effect, and separately mirrors the same
choice into `Settings.theme` in Dexie purely so it travels with an
exported/imported backup (`exportAll`/`importAll` already round-trip the
whole `settings` row as-is, so no backup-format change was needed). Restoring
a backup on a different device won't repaint that device before Settings is
opened once — `ThemeProvider` never reads the DB, by design, to keep the
no-flash guarantee — but the choice is there waiting rather than silently lost.

**`/debug/data` (M2's temporary data-layer panel) was kept, not removed** —
its job (a real Settings → Data screen) is done, but `grep -rn "/debug/data" e2e`
showed three specs (`data-persistence.spec.ts`, `reports-perf.spec.ts`,
`home.spec.ts`) depend on its JSON-import input as their fixture-seeding
mechanism, the only way those tests get deterministic due-dates/reminder-days
independent of what day the suite runs on. Its docblock now says so
explicitly, since it's internal dev tooling from here, not a stand-in
Settings screen.

Import's "preview of what will change before confirming" (PRD §5.8) is a
UI-layer read only, per M2's own PLAN.md note that the counts are already
there — `computeImportPreview()` (`src/routes/settings/importPreview.ts`)
just takes each table's array length from the parsed-and-validated file;
`db/backup.ts` gained no new function, only an export of its existing
`TABLE_KEYS`. Erase-all's type-to-confirm is a new, dedicated
`TypeToConfirmDialog` (`src/components/ui/`) rather than a variant bolted
onto `ConfirmDialog`'s plain confirm/cancel API, which every other
destructive action in the app uses as-is — no precedent existed for this
(confirmed via grep) and forcing an unused `confirmPhrase` prop onto
`ConfirmDialog` would have been the wrong trade. The app version comes from
`package.json` via a `vite.config.ts` `define` (`__APP_VERSION__`, declared
in a new `src/vite-env.d.ts`) rather than a JSON import, since not every
tsconfig project (app/node/sw) enables `resolveJsonModule`. A minimal
`CHANGELOG.md` was added (a single "0.1.0 — initial development" entry —
this isn't a release yet); About reads its latest heading via a `?raw`
import and falls back gracefully if it's ever missing. "Check for update"
is a manual one-shot action (`checkForServiceWorkerUpdate()` calling the
registration's own `.update()` and reporting found/not-found) — the passive
new-SW-detected → snackbar → reload flow is explicitly M10's job per its own
PLAN.md checklist, so this deliberately stops short of it.

**Verified:** 13 new Vitest unit tests (338 total, up from 325) —
`textSize.test.ts` (2, normalizing an unknown/missing size to 'm'),
`importPreview.test.ts` (3, per-table counts and the cross-table total),
`TypeToConfirmDialog.test.ts` (6: the trimmed/case-sensitive phrase match,
the confirm button staying disabled until it matches, and the typed text
clearing on every reopen), plus 2 `MoneyText` additions covering the
hide-amounts blur on and off. **26** new Playwright e2e tests (244 total, up
from 218) in `e2e/settings.spec.ts` — theme/text-size/density/base-currency
persisting across a real reload and taking effect immediately; a default
account pre-filling a new transaction; changing the FY start month actually
changing a Year report's total (two fixture transactions straddling the
July boundary); hide-amounts blurring amounts on both Home and the Money
transaction list; export → erase (typed-confirm) → import round-tripping a
category through both light and dark; a corrupted file failing safely with
no data loss; erase-all refusing a wrong phrase or a cancel; storage usage
and the persistent-storage request both reporting something; and About
showing a version and a check-for-update result. The existing top-level
accessibility sweep (`kitchen-sink.spec.ts`) already included `/settings`
against a seeded database and needed no change to cover the new sections;
`settings.spec.ts` adds its own pass against a fresh, empty database too.
Build is 157.59 KB gzipped JS for the initial bundle (budget 180 KB, up
from M8's 154.27 KB baseline — all four new Settings sections plus the new
`TypeToConfirmDialog`/import-preview UI, for a ~3.3 KB delta).

**Bugs found this milestone:**

- **A new transaction's currency/account defaults could never actually
  apply.** `TransactionSheet` read `settings?.baseCurrency`/
  `settings?.defaultAccountId` inside a `useState` initializer — but
  `settings` loads asynchronously (Dexie/IndexedDB) and is always still
  `undefined` on a component's very first render, and a `useState`
  initializer only runs once, so the real value arriving a tick later never
  took effect. Confirmed via a raw-IndexedDB read in a throwaway e2e probe:
  the correct value was genuinely persisted in the database the whole time —
  the sheet's own initial state just never picked it up. Fixed by applying
  the setting once, the moment it actually becomes available, via React's
  "adjusting state during render" pattern (comparing against a tracked
  previous value, as `TypeToConfirmDialog`'s open/close reset already does)
  rather than a `useState` initializer or an effect — this re-runs
  synchronously before anything paints, so there's no flash of the wrong
  default. The same fix applies to `MoneySettings`' own base-currency input,
  which had the identical bug for the identical reason (its local edit
  buffer, `currencyInput`, never resynced after the underlying setting
  changed from its own async-loading default).
- A stale `vite preview` server left running from an earlier local test
  invocation was silently reused by `playwright.config.ts`'s
  `reuseExistingServer: !process.env.CI`, serving pre-fix code against tests
  written for the fix and producing several confusing failures that looked
  like real persistence bugs. Not a product bug, but worth noting here since
  it cost real debugging time before a raw-IndexedDB check ruled out an
  actual data-loss bug and pointed at the stale server instead.

### Pulled forward from M10 — the update flow (new SW → snackbar → reload)

Real, repeated friction during this session's own M8/M9 testing — a rebuilt
app kept looking unchanged because the browser's old service worker was
still serving its old cache, with nothing in the app to tell the user an
update existed — made the case for building this now rather than waiting
for M10.

**A genuine bug surfaced while building it, and it's very likely the actual
root cause of that friction:** `src/sw.ts` called `self.skipWaiting()`
**unconditionally**, at the top level, on every install — meaning a new
worker never actually waited the way `registerType: 'prompt'` (vite.config.ts)
assumes it will. Paired with the immediate `clientsClaim()` already there,
every rebuild silently seized every open tab the moment it finished
installing, with no prompt, no consent, and no way for the app to say
anything about it. Fixed by removing the unconditional call and adding a
`message` listener that only calls `self.skipWaiting()` in response to an
explicit `"SKIP_WAITING"` message — which is exactly what the new update
prompt's "Reload" action sends, and only when a person actually clicks it.

**`src/app/pwa/UpdatePrompt.tsx`** (rendered once, at the top of `App.tsx`)
is the other half: `useRegisterSW()` from `virtual:pwa-register/react` is
now the app's one and only service-worker registration path
(`vite.config.ts` gained `injectRegister: false` to retire the old
auto-injected register script, which had no hook into `needRefresh` at
all and would otherwise register the SW a second, uncoordinated way). When
`needRefresh` flips true, a snackbar reads "Update available" with a
"Reload" action, for up to 15s (longer than the default 5s undo window —
missing it costs nothing, the update just waits). Reloading is never
automatic; it only happens from that click, via
`updateServiceWorker(true)`, which messages the waiting worker and reloads
once it takes control. `src/app/serviceWorker/checkForUpdate.ts` (M9's own
manual "Check for update" button in About) is unaffected — it reads
whatever registration already exists, which is now this one instead of the
old auto-injected one, and remains a genuinely different, complementary
action ("check right now" vs. "tell me the moment you notice, unprompted").

**Verified:** typecheck/lint clean; full suite unaffected (338 Vitest, 248
Playwright, both themes — `UpdatePrompt` renders nothing under normal
conditions, so no existing test needed to change). The mechanism itself
needs a real second build to exercise (there's no "old" and "new" service
worker without one), which doesn't fit the fast, repeatable CI-style
suite — mirroring how M0's install/offline "Done when" criteria were also
one-off verified rather than folded into automated e2e — so it was proven
with a real, disposable script instead of a permanent test: load the app
(service worker A activates), make a genuine code change to `src/sw.ts`
and rebuild against the _same still-running_ preview server (service
worker B, byte-different), call `registration.update()` from the
already-open page, and confirm the whole chain end to end — the "Update
available" snackbar appears, clicking Reload hands control to the new
worker, and the app keeps working afterward with zero console errors.
Also confirmed directly at the registration level (before wiring the
snackbar) that a new worker now genuinely reaches the `waiting` state
instead of self-activating — the concrete proof the `skipWaiting()` bug
above is real and fixed, not assumed.

---

## M10 — Polish & release

**Deliverable:** v1.0 on your phone.

- [ ] Accessibility pass: labels, focus order, contrast in both themes, 200 % text,
      44 px targets, reduced motion
- [ ] Performance: bundle budget ≤ 180 KB gz initial, lazy routes, virtualised lists,
      Lighthouse ≥ 90 Performance/PWA/Accessibility/Best-practices
- [ ] Every empty, loading and error state reviewed
- [ ] Offline verification, install flow
- [x] Update flow (new SW → snackbar → reload) — pulled forward, built ahead
      of schedule (`src/app/pwa/UpdatePrompt.tsx`) after repeated real
      friction during M8/M9 testing (a stale service worker silently serving
      an old build with no way for the app to tell the user). See the
      "Pulled-forward update flow" note after M9's own section for the
      write-up and the real bug it also fixed in `src/sw.ts`.
- [ ] Privacy check: zero outbound network requests after load (automated test)
- [ ] Seed/demo data toggle for screenshots; `docs/DATA-FORMAT.md`; README refresh
- [ ] Hosting decision (GitHub Pages / Netlify / Cloudflare Pages — static, free)
- [ ] Re-read the §M7 step-4 results; add the Capacitor wrap **only** if reminders
      proved unreliable in real use
- [ ] Tag `v1.0.0`, install on the phone, use it for a week

**Tag:** `v1.0.0` · **Test guide:** TESTING.md §M10

---

## Dependency order

```
M0 ─ M1 ─┬─ M2 ─┬─ M3 ─ M4 ─┐
         │      ├─ M5 ──────┼─ M8 ─ M9 ─ M10
         │      └─ M6 ─ M7 ─┘
```

M3+M4 (Money), M5 (Notes) and M6+M7 (Tasks) are independent of one another after M2,
so they can be built in any order — or in parallel if you ever want to.

## Suggested sequencing

| Order | Milestones  | Why                                                                              |
| ----- | ----------- | -------------------------------------------------------------------------------- |
| 1     | M0, M1, M2  | Foundation; nothing meaningful ships without these                               |
| 2     | M3, M4      | Money is the feature with the most day-to-day value — start using it immediately |
| 3     | M6, M7      | Tasks + reminders; the weekly habit loop starts paying off                       |
| 4     | M5          | Notes; the largest single dependency (Tiptap) and the least time-critical        |
| 5     | M8, M9, M10 | Tie together, configure, polish, release                                         |

You can start _using_ Dowi for real after M4 — earlier milestones are usable but
incomplete, and M2's export means nothing you enter will be lost along the way.
