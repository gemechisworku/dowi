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

## M3 — Money: capture & CRUD

**Deliverable:** you can record real income and expenses and manage your taxonomy.

- [ ] Add-transaction sheet: income/expense toggle, keypad, currency picker,
      category chips, date, account, source, note, tags
- [ ] Transaction list: grouped by day with subtotals, sticky month header,
      virtualised, infinite scroll
- [ ] Filters (type, date range, category, source, account, currency, text) reflected
      in the URL; filter chips with clear-all
- [ ] Transaction detail → Edit → Delete with confirm + 5 s undo snackbar
- [ ] Categories / sources / accounts management screens: full CRUD, icon + colour
      picker, reassign-on-delete flow
- [ ] Currency list + base currency; exchange-rate table CRUD

**Done when:** you can log a week of real spending in mixed currencies and edit/delete
any of it. **Tag:** `m3` · **Test guide:** TESTING.md §M3

---

## M4 — Money: reports

**Deliverable:** the "what did I earn vs spend" answer, for any period.

- [ ] Report screen: `PeriodSelector` (Day/Week/Month/FY) + `PeriodStepper`
- [ ] Headline Income / Expense / Net + delta vs previous comparable period
- [ ] `GroupedBarChart` income vs expense across sub-periods (FY→months,
      Month→weeks, Week→days, Day→categories)
- [ ] Category breakdown: donut + ranked list (amount, %, count), income/expense toggle
- [ ] Source and account breakdowns
- [ ] Mixed-currency handling: "≈" marking, rate footnote, missing-rate warning chip
      linking to Settings
- [ ] "View transactions in this period" → the filtered M3 list
- [ ] CSV export + plain-text summary share
- [ ] Aggregation runs off indexed queries; memoised; tested against fixtures

**Done when:** a fixture of known transactions produces exactly the expected totals in
every period, and the numbers match a hand calculation. **Tag:** `m4` · **Test guide:** TESTING.md §M4

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

## M6 — Tasks

**Deliverable:** the weekly plan → do → review loop.

- [ ] Task CRUD: title, rich-text notes, collection, priority, due date+time,
      reminder offsets
- [ ] Subtasks: add, rename, toggle, drag-reorder, delete; `n/m` progress on parent
- [ ] Views: Today (overdue first), Upcoming (14 days + Later), All/by collection,
      Completed (restorable); filters + search
- [ ] Swipe actions: complete / delete with undo
- [ ] Collections CRUD
- [ ] **Plan-the-week screen:** week header, add straight into the week, carry-forward
      list from last week with per-item and bulk "move to this week"
- [ ] **Review-the-week screen:** Done / Not done split, completion rate, reflection
      field saved into the "Weekly reviews" note collection, carry-forward action
- [ ] Both reachable any day from the week chip; nothing blocking or streak-based

**Done when:** you can plan a week, complete part of it, and produce a review whose
counts match reality. **Tag:** `m6` · **Test guide:** TESTING.md §M6

---

## M7 — Notifications & reminders

**Deliverable:** reminders that arrive, and an inbox that never loses one.

- [ ] Scheduler: computes the next fire time for weekly-plan, weekly-review, task-due
      and daily-agenda reminders; stored in the `notifications` table
- [ ] Service worker: `showNotification`, click → deep link, `periodicsync` handler
- [ ] Catch-up on app open: fire anything due since last run, exactly once
- [ ] Quiet hours suppression (OS delivery suppressed, inbox entry still written)
- [ ] In-app notification inbox with unread badge, mark-read, clear, deep links
- [ ] In-context permission request with an explainer; honest state display in Settings
- [ ] "Send a test notification" button
- [ ] All scheduling behind a `ReminderScheduler` interface; `WebScheduler` is the only
      implementation in v1.0. A `CapacitorScheduler` can be added in M10 without
      touching feature code — **only if** §M7 step 4 shows delivery is unreliable

**Done when:** a reminder set 2 minutes ahead arrives on the phone, deep-links
correctly, and appears in the inbox. **Tag:** `m7` · **Test guide:** TESTING.md §M7

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
