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

## M5 — Notes

**Deliverable:** real writing, organised.

- [ ] Tiptap editor (lazy chunk): H1–H3, bold, italic, underline, strike, highlight
      with colours, bullet/ordered/check lists, blockquote, code, code block, rule, link
- [ ] Sticky formatting toolbar above the keyboard + `/` slash menu
- [ ] Autosave (debounced 500 ms) + "saved" indicator; survives app kill
- [ ] Notes list: group **by date** or **by collection** (toggle persisted), pinned
      first, card/list density toggle
- [ ] Full-text search over title + derived plain text
- [ ] Collections CRUD with safe delete (move to Unfiled by default)
- [ ] Tags, pin, colour, duplicate, soft-delete Trash with restore + 30-day purge

**Done when:** a note using every supported format survives reload byte-identical and
renders correctly in both themes. **Tag:** `m5` · **Test guide:** TESTING.md §M5

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

## M8 — Home / landing

**Deliverable:** the dashboard from PRD §5.1, wired to live data.

- [ ] Greeting header with date, week number, FY label
- [ ] Money summary card with persisted Week/Month/Year toggle → links to M4
- [ ] Today's tasks card with inline completion → links to M6
- [ ] Plan/review banner on the configured days, dismissible for the day
- [ ] Recent notes card → links to M5
- [ ] Quick actions row (add income / expense / note / task)
- [ ] First-run empty state
- [ ] Skeletons while loading; no layout shift

**Done when:** every number on Home matches its feature screen exactly.
**Tag:** `m8` · **Test guide:** TESTING.md §M8

---

## M9 — Settings & data management

**Deliverable:** everything configurable, and your data under your control.

- [ ] Appearance: theme, text size, density
- [ ] Money: base currency, rates CRUD, FY start month, week start, default account,
      hide-amounts privacy blur
- [ ] Reminders: per-reminder day/time/offsets, quiet hours, test notification
- [ ] Data: export JSON, import (merge/replace with diff preview), storage usage,
      persistent-storage request, Trash, erase-all with type-to-confirm
- [ ] About: version, build date, changelog, check for update, licences

**Done when:** every setting persists across a cold restart and takes effect at once.
**Tag:** `m9` · **Test guide:** TESTING.md §M9

---

## M10 — Polish & release

**Deliverable:** v1.0 on your phone.

- [ ] Accessibility pass: labels, focus order, contrast in both themes, 200 % text,
      44 px targets, reduced motion
- [ ] Performance: bundle budget ≤ 180 KB gz initial, lazy routes, virtualised lists,
      Lighthouse ≥ 90 Performance/PWA/Accessibility/Best-practices
- [ ] Every empty, loading and error state reviewed
- [ ] Offline verification, install flow, update flow (new SW → snackbar → reload)
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
