# Dowi — Product Requirements Document (E2E)

**Product:** Dowi (도우미 — "helper / assistant")
**Type:** Installable Progressive Web App (PWA), Android-first, offline-first
**Version:** 1.0 (MVP scope defined below, with explicitly deferred v1.1+ items)
**Owner:** Gemechis Worku
**Status:** Draft for review
**Last updated:** 2026-09-19

---

## 1. Summary

Dowi is a single-user personal assistant app that runs entirely on the user's own
device. It combines three tools that today live in three separate apps:

1. **Money** — record income and expenses in any currency, and see what you earned
   vs. what you spent by week, month, and financial year.
2. **Notes** — structured writing with headings, lists, highlights and bold, grouped
   by date and by collection.
3. **Tasks** — weekly planning and review, with subtasks/checklists, deadlines, notes,
   collections, and reminders on the phone.

There is **no account, no login, no server, and no cloud sync**. All data is stored in
the browser's IndexedDB on the device. The only way data leaves the device is if the
user explicitly exports a backup file.

### 1.1 Goals

| #   | Goal                                               | Success measure                                                                       |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| G1  | Capture a money entry in under 10 seconds          | ≤ 4 taps from app open to saved entry                                                 |
| G2  | Answer "did I earn more than I spent?" at a glance | Comparison visible on Home + one tap to full report                                   |
| G3  | Make the Monday-plan / Saturday-review habit stick | Reminder fires on configured days; review screen shows the week's plan in one list    |
| G4  | Feel like a native Android app                     | Installable, launches offline, < 2.5 s cold start on mid-range Android, 60 fps scroll |
| G5  | Never lose data                                    | Export/import backup; no destructive operation without confirm + undo                 |

### 1.2 Non-goals (explicitly out of scope for v1.0)

- User accounts, authentication, multi-user, roles, permissions.
- Cloud storage, sync across devices, server-side backup.
- Bank/SMS import, receipt OCR, automatic transaction categorisation.
- Live foreign-exchange rate fetching (requires network — see §5.3).
- Collaboration, sharing, comments.
- iOS-specific work (the PWA will load in iOS Safari but notifications and install
  behaviour are not tested or supported in v1.0).

---

## 2. Users and context

**Primary (and only) user persona:** the device owner. Technically comfortable,
uses an Android phone as the primary device, earns in more than one currency,
plans work weekly.

**Usage context:**

- One-handed, on a phone, often in a hurry (money capture) or reflective (notes,
  weekly review).
- Frequently offline or on poor connectivity — the app must be fully usable offline.
- Sessions are short and frequent (10–60 s) for capture, longer (2–10 min) for
  reports, planning and writing.

---

## 3. Platform, constraints and key decisions

### D1 — PWA, not native

Delivered as an installable PWA. Installed to the home screen from Chrome on Android,
runs in standalone mode (no browser chrome). Updates are pushed by redeploying the
app; the app detects a new service worker and offers "Update available — reload".

### D2 — Local-only storage

IndexedDB is the system of record. No network calls at runtime other than fetching
the app shell itself. **Risk:** clearing browser storage / uninstalling wipes data.
**Mitigation:** (a) request persistent storage via `navigator.storage.persist()`,
(b) full JSON export/import in Settings, (c) a "last backup was N days ago" nudge.

### D3 — Money is stored as integer minor units

No floating point for money. An amount is `{ amount: number (minor units), currency: "ETB" }`,
e.g. `12345` + `ETB` = 123.45 ETB. Minor-unit exponent comes from a currency table
(most are 2; JPY/KRW are 0; some are 3).

### D4 — Notifications are best-effort on a PWA _(decision required — see §12)_

A web app cannot reliably schedule a local notification to fire at a future time while
it is closed. Available mechanisms on Android/Chrome:

| Mechanism                                       | Reliability | Notes                                                                                                          |
| ----------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------- |
| Notification API while app is open              | High        | Works, but only when app is in foreground/recently backgrounded                                                |
| Service worker + `Periodic Background Sync`     | Medium      | Chrome/Android only, requires installed PWA + site engagement, OS decides the interval (min ~12 h in practice) |
| Web Push                                        | High        | Requires a push server — violates the "no cloud" constraint                                                    |
| Capacitor/TWA wrapper with `LocalNotifications` | High        | Same React codebase, produces a real APK, exact scheduled alarms                                               |

**v1.0 decision (OD-1, resolved):** build as a pure PWA — the reliable-when-open path,
periodic background sync, catch-up on open, and the in-app inbox as the backstop. All
scheduling goes through a single `ReminderScheduler` interface with a `WebScheduler`
implementation, so a `CapacitorScheduler` can be dropped in later without touching any
feature code. M7 testing records the actual delivery behaviour on the real device
(TESTING.md §M7 step 4); if it proves unreliable, the Capacitor wrap is added in M10.

### D4b — Visual direction

**Option A, "Soft Cards"** (`design/design-options.html`) is the chosen direction:
22 px radii, white cards on a light-gray canvas, a blue gradient hero for the headline
number, tinted squircle icon chips, a floating bottom nav with a filled-pill active
tab, and a contextual FAB. This sets token values and a few component variants — the
information architecture, component APIs and milestone plan are unaffected.

### D5 — Tech stack

| Layer                  | Choice                                                       | Why                                                                  |
| ---------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| Build                  | Vite 8 + TypeScript (strict)                                 | Fast, tiny output, first-class PWA plugin                            |
| UI                     | React 19                                                     | Ecosystem, hooks, familiarity                                        |
| Routing                | React Router 7 (declarative mode)                            | Nested layouts for the app shell                                     |
| Styling                | Tailwind CSS v4 + CSS custom-property design tokens          | Zero-runtime, tokens drive light/dark, easy to keep consistent       |
| Local DB               | Dexie 4 + `dexie-react-hooks` (`useLiveQuery`)               | Typed IndexedDB wrapper, reactive queries, versioned migrations      |
| State                  | Dexie live queries for data + Zustand for UI/session state   | No global data store to keep in sync with the DB                     |
| Rich text              | Tiptap 3 (StarterKit + Highlight + TaskList), lazy-loaded    | Exactly matches the required formatting set; stored as JSON          |
| Charts                 | Hand-built SVG chart components in our own component library | Keeps the bundle small; we only need bars, grouped bars, and a donut |
| Dates                  | `date-fns` (tree-shaken)                                     | Week/month/financial-year boundaries                                 |
| PWA                    | `vite-plugin-pwa` (Workbox)                                  | Precache app shell, update prompt, manifest                          |
| Unit/integration tests | Vitest + React Testing Library + `fake-indexeddb`            | Fast, runs the real Dexie layer                                      |
| E2E tests              | Playwright (Pixel 7 mobile emulation, light + dark)          | Real browser, real IndexedDB, screenshots                            |

**Performance budget:** initial JS ≤ 180 KB gzipped (Tiptap and chart-heavy report
screens lazy-loaded), Lighthouse PWA + Performance ≥ 90 on mid-range mobile throttling.

---

## 4. Information architecture

```
Dowi
├── Home (landing / dashboard)
├── Money
│   ├── Transactions list (filter: type, category, account, currency, date range)
│   ├── Add/Edit transaction
│   ├── Reports (day / week / month / financial year, income vs expense)
│   └── Categories & sources management
├── Notes
│   ├── Notes list (group by date | by collection)
│   ├── Note editor
│   └── Collections management
├── Tasks
│   ├── Today / Upcoming / All
│   ├── Weekly plan & weekly review
│   ├── Task detail (subtasks, deadline, notes)
│   └── Collections management
├── Notifications (in-app inbox + permission state)
└── Settings
    ├── Appearance (theme: system/light/dark)
    ├── Money (base currency, exchange rates, financial year start)
    ├── Reminders (weekly plan day/time, weekly review day/time, task due reminders, quiet hours)
    ├── Data (export, import, storage usage, erase all)
    └── About (version, update check)
```

**Navigation model**

- **Bottom nav (4 primary destinations):** Home · Money · Notes · Tasks.
  Always visible on top-level screens; hidden on full-screen editors.
- **Top app bar:** contextual title, a notifications bell with unread badge, and a
  settings/overflow entry. Detail screens replace the title with a back arrow.
- **Primary action:** a FAB (or an equivalent per the chosen design option) whose
  action is contextual — Home opens a quick-add sheet, Money adds a transaction,
  Notes creates a note, Tasks creates a task.

---

## 5. Feature specifications

### 5.1 Home / landing

The first screen after launch. It must answer "how am I doing and what's next?"
without any tapping.

**Contents**

1. **Greeting header** — time-aware greeting, today's date, and the current
   week number / financial-year label.
2. **Money summary card** — for the current period (user-togglable Week / Month /
   Year): total income, total expense, net, and a small comparison bar. Tapping
   opens the matching report.
3. **Today's tasks card** — up to 5 tasks due today or overdue, each with an inline
   checkbox that completes it without leaving Home. Overdue count is shown in red.
4. **Weekly plan/review banner** — appears on plan day ("Plan your week →") and on
   review day ("Review your week →"). Dismissible for the day.
5. **Recent notes card** — 3 most recently edited notes with title + snippet.
6. **Quick actions row** — Add income · Add expense · New note · New task.

**Empty state:** a single card explaining the three areas with one primary CTA each.

**Acceptance criteria**

- AC-H1: Home renders with no data and with 1,000+ records, both without layout shift.
- AC-H2: Money summary period toggle persists across app restarts.
- AC-H3: Completing a task from Home updates the card and the Tasks screen immediately.
- AC-H4: Every card links to its full feature screen.

### 5.2 Money — transactions (CRUD)

**Data captured per transaction**

| Field                     | Type                  | Required | Notes                                                                 |
| ------------------------- | --------------------- | -------- | --------------------------------------------------------------------- |
| `type`                    | `income` \| `expense` | ✓        | Drives colour and sign                                                |
| `amount`                  | integer minor units   | ✓        | > 0                                                                   |
| `currency`                | ISO-4217 code         | ✓        | Defaults to base currency; any currency allowed                       |
| `date`                    | date (local)          | ✓        | Defaults to today; date picker allows past/future                     |
| `categoryId`              | id                    | ✓        | Category list is type-scoped (income categories ≠ expense categories) |
| `sourceId`                | id                    | —        | Income only: employer, client, freelance, gift, …                     |
| `accountId`               | id                    | —        | Optional: Cash, Bank, Mobile money, …                                 |
| `note`                    | string                | —        | Free text, 0–500 chars                                                |
| `tags`                    | string[]              | —        | Optional, free-form                                                   |
| `attachmentIds`           | id[]                  | —        | _v1.1_ — deferred                                                     |
| `createdAt` / `updatedAt` | timestamp             | ✓        | System-managed                                                        |

**Operations**

- **Create:** from FAB or Home quick action. A bottom sheet with a numeric keypad,
  income/expense segmented toggle, amount + currency, category chips, date, optional
  note. Saves in ≤ 4 taps for the common case.
- **Read:** transactions list, reverse-chronological, grouped by day with a per-day
  subtotal. Sticky month header. Filters: type, date range, category, source,
  account, currency, text search on note. Infinite scroll / virtualised list.
- **Update:** tap a row → detail → Edit, same form pre-filled.
- **Delete:** swipe row or from detail; confirm dialog; **undo snackbar for 5 s**.

**Acceptance criteria**

- AC-M1: A transaction can be created, read in the list, edited, and deleted, and
  every change is reflected in reports without a reload.
- AC-M2: Amounts render with correct minor-unit precision and currency symbol/code
  per currency (e.g. ETB 1,234.50, ¥1,235, KD 1.234).
- AC-M3: Deleting shows undo; undo restores the exact record including id.
- AC-M4: Filters combine (AND) and are reflected in the URL so back/forward works.

### 5.3 Money — categories, sources, accounts, currencies

- **Categories:** full CRUD. Each has name, icon, colour, and `type`
  (`income`/`expense`). Seeded with a sensible default set on first run
  (expense: Food, Transport, Housing, Utilities, Health, Education, Shopping,
  Entertainment, Family, Other; income: Salary, Freelance, Business, Investment,
  Gift, Other). Deleting a category in use asks the user to reassign or keep as
  "Uncategorised" — never silently deletes transactions.
- **Sources** and **Accounts:** same CRUD pattern, both optional to use.
- **Currencies & exchange rates (D3, and the resolution of the "any currency" +
  "no cloud" tension):**
  - The user picks a **base currency** in Settings.
  - Each transaction keeps its **original currency and amount forever** — this is
    the truth and is never rewritten.
  - For any report that aggregates mixed currencies, amounts are converted to the
    base currency using a **user-maintained rate table** (Settings → Money →
    Exchange rates): `1 <currency> = <rate> <base>`, each with the date it was set.
  - Reports that contain converted values show an "≈" prefix and a footnote naming
    the rates used. A report in a single currency shows no "≈".
  - If a transaction's currency has no rate, the report shows a warning chip
    "3 transactions in USD excluded — add a rate" with a direct link to add it.
  - _v1.1:_ optional one-tap rate refresh when online, off by default.

**Acceptance criteria**

- AC-M5: CRUD works for categories, sources, accounts, and rates.
- AC-M6: A report mixing ETB and USD converts correctly and footnotes the rate.
- AC-M7: Missing-rate transactions are excluded from totals **and** surfaced, never
  silently dropped.

### 5.4 Money — reports

**Periods:** Day, Week, Month, Financial year. The financial-year start month is
configurable in Settings (default: January; Ethiopian users may prefer July/Hamle —
any month can be chosen). Week start day is configurable (default Monday).

**Report screen structure**

1. Period selector (segmented control: Day / Week / Month / FY) + a period stepper
   (‹ previous · current label · next ›) that never allows navigating past today's period
   _(forward navigation allowed only if future-dated transactions exist)_.
2. **Headline row:** Income · Expense · Net (net coloured green/red), plus the
   change vs. the previous comparable period (e.g. "Net ▲ 12% vs last month").
3. **Income vs expense comparison chart:** grouped bars over the sub-periods of the
   selected period — FY → 12 months, Month → weeks (or days), Week → 7 days,
   Day → categories.
4. **Breakdown by category:** donut + ranked list with amount, % of total, and count.
   Toggle income/expense.
5. **Breakdown by source** (income) and **by account**.
6. **Transactions in this period** — link through to the filtered list.
7. **Export this report** — CSV and a shareable plain-text summary.

**Acceptance criteria**

- AC-R1: Week/month/FY boundaries respect the configured week start and FY start.
- AC-R2: Sum of all category slices equals the headline total, to the minor unit.
- AC-R3: Switching periods recomputes in < 100 ms for 5,000 transactions.
- AC-R4: A period with no data shows a purposeful empty state, not a blank chart.
- AC-R5: CSV export opens correctly in a spreadsheet, one row per transaction.

### 5.5 Notes

**Editor capabilities (required set):** H1/H2/H3 headings, paragraph body, bold,
italic, underline, strikethrough, highlight (colour choice), bullet list, ordered
list, checklist, blockquote, inline code, code block, horizontal rule, link.
Toolbar is a scrollable bar docked above the keyboard, plus a `/` slash menu.

**Note model:** `id`, `title`, `contentJSON` (Tiptap doc), `contentText` (derived,
for search), `collectionId?`, `tags[]`, `pinned`, `color?`, `createdAt`, `updatedAt`,
`deletedAt?` (soft delete → Trash, purged after 30 days).

**List & grouping**

- Two grouping modes, toggled in the app bar: **By date** (Today / Yesterday /
  This week / This month / Earlier, based on `updatedAt`) and **By collection**.
- Pinned notes always float to the top of the first group.
- Full-text search across title + `contentText`.
- Card or list density toggle.

**Collections:** full CRUD, name + colour + icon. A note belongs to at most one
collection; tags cover the many-to-many case.

**Acceptance criteria**

- AC-N1: All listed formatting marks apply, persist after reload, and render
  identically in light and dark mode.
- AC-N2: Edits autosave (debounced 500 ms) and survive a hard app kill.
- AC-N3: Grouping toggle persists; both modes are correct across a date boundary
  (test with notes edited "yesterday").
- AC-N4: Deleting a collection offers "move notes to Unfiled" or "delete notes too",
  defaulting to the non-destructive option.
- AC-N5: Search returns results for text inside the body, not just the title.

### 5.6 Tasks

**Task model:** `id`, `title`, `notes?` (rich text, same editor, reduced toolbar),
`collectionId?`, `subtasks: {id, title, done}[]`, `dueAt?` (date + optional time),
`priority` (none/low/med/high), `status` (`todo`/`doing`/`done`), `completedAt?`,
`repeat?` (_v1.1_), `weekKey?` (ISO year-week, set when added to a weekly plan),
`reminderOffsets: number[]` (minutes before due), `createdAt`, `updatedAt`.

**Views**

- **Today** — due today + overdue, then "no date" quick list.
- **Upcoming** — grouped by day for the next 14 days, then "Later".
- **All / by collection** — with filters (status, priority, collection, has deadline).
- **Completed** — reverse-chronological, restorable.

**Weekly plan & weekly review** _(the habit loop from the brief)_

- **Plan day (default Monday, configurable):** a dedicated "Plan your week" screen.
  It shows the current week (Mon–Sun by config), lets the user add tasks directly
  into the week, and carries forward unfinished tasks from last week with a
  one-tap "move to this week" per task or "move all".
- **Review day (default Saturday, configurable):** a "Review your week" screen
  showing every task tagged to the week, split into Done / Not done, with the
  week's completion rate, a free-text reflection field saved as a note in a
  "Weekly reviews" collection, and a "Carry forward" action for unfinished items.
- **Not strict:** both screens are reachable any day from Tasks → the week chip.
  The reminders can be snoozed or turned off entirely, and dismissing never blocks
  anything. No streaks, no guilt UI.

**Subtasks/checklist:** add, reorder (drag), rename, toggle, delete. Parent shows
`3/5` progress. Completing all subtasks prompts (does not force) completing the parent.

**Acceptance criteria**

- AC-T1: Full CRUD on tasks, subtasks, and collections.
- AC-T2: A task created on the plan screen is tagged to the correct ISO week.
- AC-T3: The review screen lists exactly the tasks tagged to that week plus any
  completed that week, and the completion rate matches the counts.
- AC-T4: Overdue tasks are visually distinct and sort to the top of Today.
- AC-T5: Reflection text is saved as a retrievable note.

### 5.7 Notifications & reminders

**Types**

| Type                   | Default schedule                              | Configurable       |
| ---------------------- | --------------------------------------------- | ------------------ |
| Weekly plan reminder   | Monday 08:00                                  | Day + time, on/off |
| Weekly review reminder | Saturday 18:00                                | Day + time, on/off |
| Task due reminder      | At due time, and 1 day before for dated tasks | Offsets, on/off    |
| Daily agenda           | Off by default                                | Time, on/off       |
| Backup nudge           | If no export in 30 days                       | Interval, on/off   |

**Behaviour**

- Permission is requested **in context** (when the user first enables a reminder),
  never on first launch. A clear explainer precedes the browser prompt.
- **Quiet hours** (default 22:00–07:00) suppress all notifications; suppressed ones
  appear in the in-app inbox instead.
- **In-app notification inbox** (bell in the top bar): every reminder Dowi generates
  is written here regardless of whether the OS notification fired. This is the
  reliability backstop for D4 — the user never misses a reminder inside the app,
  even if Android throttles the background delivery.
- Tapping an OS notification deep-links to the relevant screen.
- Settings shows the real permission state and a "Send a test notification" button.

**Acceptance criteria**

- AC-P1: Enabling a reminder requests permission once and reflects grant/deny state.
- AC-P2: A scheduled reminder whose time has passed while the app was closed is
  delivered as a catch-up on next open (once, not repeatedly).
- AC-P3: Quiet hours suppress OS delivery but the inbox entry still exists.
- AC-P4: Tapping a notification opens the correct screen.
- AC-P5: Turning a reminder off stops both OS delivery and inbox entries.

### 5.8 Settings

- **Appearance:** theme (System / Light / Dark), text size (S/M/L), density.
- **Money:** base currency, exchange rates table (CRUD), financial-year start month,
  week start day, default account, hide-amounts toggle (privacy blur).
- **Reminders:** per §5.7, plus quiet hours and a test-notification button.
- **Data:** export all data to `.json`, import from `.json` (merge or replace, with a
  preview of what will change), storage usage, "request persistent storage", Trash,
  and **Erase all data** behind a type-to-confirm dialog.
- **About:** version, build date, changelog, check for update, open-source licences.

**Acceptance criteria**

- AC-S1: Every setting persists across restart and takes effect immediately.
- AC-S2: Export → wipe → import restores the app to a byte-identical state.
- AC-S3: Import of a malformed file fails safely with a readable error and no data loss.

---

## 6. Cross-cutting requirements

### 6.1 Design system

- **Primary:** blue. Tokenised ramp `--blue-50 … --blue-900`, with `--color-primary`
  mapping to `blue-600` (light) / `blue-400` (dark).
- **Semantic:** income/positive = green, expense/negative = red, warning = amber,
  neutral surfaces = white → gray-50/100 (light), gray-950 → gray-900/800 (dark).
- **All colour is referenced through semantic tokens** (`--color-surface`,
  `--color-text-muted`, …) — no raw hex in components. This is what makes
  dark mode a single switch.
- Type scale, spacing scale (4 px base), radii, elevation, and motion durations are
  all tokens. Reduced motion respected.
- **Reusable component library** (built once, used everywhere) — see §7 M1.

### 6.2 Accessibility

- Minimum touch target 44×44 px. Contrast ≥ 4.5:1 for text in both themes.
- Every interactive element is reachable and labelled for a screen reader.
- Focus visible; dialogs and sheets trap focus and restore it on close.
- Respects OS text-size scaling up to 200% without clipping.

### 6.3 Offline & installability

- Works with zero network after first load. No network-dependent UI states.
- `manifest.webmanifest` with maskable icons (192/512), theme colour, standalone
  display, portrait orientation, shortcuts for Add expense / New task / New note.
- Update flow: SW detects new version → non-blocking "Update available" snackbar →
  reload applies it.

### 6.4 Data safety

- Soft delete + undo for every destructive action.
- Dexie schema is versioned; every schema change ships a migration and a migration test.
- Export format is versioned JSON, documented in `docs/DATA-FORMAT.md`.

### 6.5 Privacy

- No analytics, no telemetry, no third-party requests at runtime. Fonts are
  self-hosted. This is a stated product property, verified by a test that asserts
  zero outbound requests after load.

---

## 7. Release plan — testable deliverables

Each milestone is independently reviewable and testable, and ends with a tagged
commit. Full step-by-step verification for each lives in `docs/TESTING.md`.

| #   | Milestone                 | Deliverable                                                                                                                               | How you test it                                                                      |
| --- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| M0  | Project setup             | Vite + TS + Tailwind + Router + PWA skeleton, git hooks, CI-less scripts                                                                  | `npm run dev` opens a blank shell; `npm run build && npm run preview` is installable |
| M1  | Design system & app shell | Tokens, light/dark, and the full reusable component kit; nav shell with 4 tabs + top bar; a `/kitchen-sink` route showing every component | Open `/kitchen-sink`, toggle theme, confirm every component in both modes            |
| M2  | Data layer                | Dexie schema v1, typed repositories, seed data, export/import, `fake-indexeddb` unit tests                                                | `npm run test` green; export → erase → import round-trip                             |
| M3  | Money capture             | Transaction CRUD + list + filters + categories/sources/accounts CRUD                                                                      | Add/edit/delete in every currency; filters; undo delete                              |
| M4  | Money reports             | Day/week/month/FY reports, comparison chart, breakdowns, CSV export                                                                       | Seeded fixture data produces known-correct totals                                    |
| M5  | Notes                     | Editor with full mark set, list with date/collection grouping, collections CRUD, search, trash                                            | Create a note using every format, reload, verify                                     |
| M6  | Tasks                     | Task/subtask CRUD, views, collections, weekly plan + weekly review screens                                                                | Plan a week Monday, complete some, review Saturday                                   |
| M7  | Notifications             | Scheduler, SW integration, in-app inbox, quiet hours, settings                                                                            | Set a reminder 2 min out; verify OS notification + inbox entry                       |
| M8  | Home                      | Landing dashboard wired to all three features                                                                                             | Verify each card against the underlying feature screen                               |
| M9  | Settings & data           | All settings, backup/restore, erase, persistent storage, about/update                                                                     | Change each setting, restart, verify persistence                                     |
| M10 | Polish & release          | A11y pass, perf budget, empty/error states, install + update flow, v1.0 tag                                                               | Lighthouse ≥ 90; install on the actual phone and use for a day                       |

---

## 8. Risks

| Risk                                                       | Impact                           | Mitigation                                                                          |
| ---------------------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------- |
| Android throttles/blocks background PWA notifications (D4) | Reminders unreliable             | In-app inbox backstop + catch-up delivery; Capacitor wrap as the escape hatch (§12) |
| Browser data cleared → total data loss                     | Severe                           | `storage.persist()`, backup nudges, one-tap export                                  |
| Mixed-currency reporting is confusing                      | Wrong conclusions about finances | Original currency never rewritten; "≈" marking; explicit missing-rate warnings      |
| Tiptap bundle weight                                       | Slow first load                  | Lazy-load the editor route only                                                     |
| Scope creep across three large features                    | Never ships                      | Strict milestone gating; v1.1 list kept explicit                                    |

---

## 9. Deferred to v1.1+

Attachments/receipt photos on transactions · recurring transactions · budgets and
spending limits · recurring tasks · task drag-reorder across days · note
version history · markdown import/export for notes · optional online FX refresh ·
widgets/home-screen shortcuts beyond manifest shortcuts · iOS support ·
encrypted export.

---

## 10. Glossary

- **FY (financial year):** 12-month period starting at the configured start month.
- **Base currency:** the single currency all mixed-currency reports are expressed in.
- **Minor units:** the smallest unit of a currency (cents, santim); money is stored as integers of these.
- **Week key:** ISO `YYYY-Www`, used to tag tasks to a planning week.

---

## 11. Open decisions

| ID   | Decision                                                     | Status                                                                                                                                                                                                                 |
| ---- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OD-1 | PWA-only reminders vs. Capacitor wrap for exact alarms (§12) | **Resolved 2026-09-19** — build as a PWA now; the scheduler sits behind a `ReminderScheduler` interface so a Capacitor adapter can be added in M10 _only if_ M7 testing on the real phone shows delivery is unreliable |
| OD-2 | Which of the three UI design directions to build (`design/`) | **Resolved 2026-09-19** — **Option A, "Soft Cards"**                                                                                                                                                                   |
| OD-3 | Base currency + financial-year start month defaults          | **Resolved 2026-09-19** — base currency **ETB**, financial year **January–December**, week starts **Monday**. All three changeable in Settings                                                                         |

## 12. OD-1 detail — reminder reliability

**Option A — Pure PWA (default plan).** Zero extra tooling; install straight from the
browser; reminders fire reliably while the app is open or recently used, are caught up
on next open, and always land in the in-app inbox. They may be late or missed when the
phone is idle for long periods.

**Option B — Same PWA, wrapped with Capacitor.** Identical React/Dexie codebase plus a
thin Android shell. Gains exact scheduled local notifications and a real APK. Costs:
Android Studio/JDK on the machine, an APK build+sideload step for each update instead
of a browser refresh. The web build keeps working either way — this is additive.
