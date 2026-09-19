# Dowi — Testing Guide

One section per milestone in [PLAN.md](./PLAN.md). Each has **automated** checks (run
by you with one command) and a **manual script** (do these on the phone, in order).

## How to run things

```bash
npm run typecheck        # TypeScript, zero errors required
npm run lint             # ESLint
npm run test             # Vitest unit + integration (fake-indexeddb)
npm run test -- --ui     # Vitest interactive
npm run test:e2e         # Playwright, Pixel 7 emulation, light + dark
npm run build && npm run preview -- --host   # serve to your phone over LAN
```

**Testing on the actual phone.** Run `npm run preview -- --host`, note the LAN URL
(e.g. `http://192.168.1.10:4173`), open it in Chrome on Android, menu → _Add to Home
screen_. Service workers need a secure context: `localhost` is fine, a LAN IP is not
for notification testing — for those use `npx vite preview --host` behind
`ngrok`/`cloudflared`, or Chrome's `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
with your LAN origin added.

**Test data.** `npm run seed:demo` loads a fixed fixture (90 days, 2 currencies, known
totals) used by the report tests below. `npm run seed:clear` wipes it.

**Regression rule.** Before tagging any milestone, re-run the manual scripts for _all
previous_ milestones that touch the same data. Most bugs here will be "reports stopped
matching after I changed the schema".

---

## §M0 — Project setup

**Automated:** `npm run typecheck && npm run lint && npm run build` all pass.

**Manual**

1. `npm run dev` → app shell loads at `localhost:5173`, no console errors.
2. Tap each of the 4 bottom-nav placeholders → URL changes, back button works.
3. `npm run build && npm run preview -- --host` → open on the phone.
4. Chrome menu shows **Add to Home screen**. Install it.
5. Launch from the home screen → no browser address bar, correct name and icon,
   correct theme colour in the status bar.
6. Turn on airplane mode, relaunch → app still loads.
7. Rebuild with any visible change, reload → "Update available" snackbar appears;
   tapping it shows the new version.

**Pass:** all 7. **Common failure:** icon not maskable → check the manifest `purpose`.

---

## §M1 — Design system & app shell ✅ done

**Run it yourself:**

```bash
npm run test          # 40 Vitest unit/interaction tests
npm run test:e2e       # 20 Playwright tests (Pixel 7, light + dark) incl. axe scans
npm run build          # confirms the bundle budget (93.8 KB gz JS / 180 KB budget)
npm run dev             # then open http://localhost:5173/kitchen-sink
```

**Automated (in place)**

- Unit: `Button`, `Checkbox`, `SegmentedControl` (interaction + a11y roles);
  `Sheet` (renders/hides, closes on Escape, closes on scrim click, and — the one
  that actually caught a bug — leaves `history.length` unchanged after a
  non-back-button close); `Dialog` (focus moves in on open, restores to the trigger
  on close); `SnackbarProvider` (shows a message, runs the undo action exactly once,
  throws a clear error outside its provider); `DonutChart` (slice percentages, and
  the zero-total case renders `0%` rather than `NaN%`); `AmountKeypad` (digit
  entry, single decimal point, decimal-place limit, 0-decimal currencies, backspace);
  `formatMoney`/`formatMinorUnits`/`minorUnitExponent` (2/0/3-decimal currencies,
  signs, approximate marking).
- E2E (`e2e/kitchen-sink.spec.ts`): every section heading renders, no horizontal
  overflow at mobile width; the theme toggle switches `<html data-theme>` with zero
  console errors; a `Sheet` opens, is focus-trapped, and dismisses on Escape; an
  **axe accessibility scan of `/kitchen-sink` and every top-level route, in both
  light and dark, asserts zero violations.**

**Manual (on the phone)**

1. Open `/kitchen-sink`. Every component is visible and none overflows the viewport.
2. Toggle Light → Dark → System. Check specifically: card borders are visible in dark,
   disabled text is still readable, chart colours still distinguishable, no pure-black
   text on pure-white, and the native date/time picker icons are visible in dark mode.
3. Reload in dark mode → **no white flash** before the theme applies.
4. Every button/row is comfortably tappable one-handed (≥ 44 px).
5. Open a `Sheet` → drag to dismiss, tap the scrim to dismiss, back button dismisses.
6. Open a `Dialog` → focus is trapped; on close focus returns to the trigger.
7. Trigger a `Snackbar` with Undo → it appears above the bottom nav, not behind it.
8. Set Android system font size to largest → nothing clips or overlaps.
9. Bottom nav: switch tabs, scroll one tab, switch away and back → scroll position kept.
10. On an editor route the bottom nav is hidden; on top-level routes it is visible.
11. Rotate to landscape → layout adapts, nothing is cut off.

**Pass:** all 11 manual steps + the automated suite above (40 unit + 20 e2e, zero axe
violations). This milestone shipped with 4 real bugs found by the test suite itself —
see PLAN.md §M1 for what they were; it's the concrete case for keeping this gate.

---

## §M2 — Data layer ✅ done

**Run it yourself:**

```bash
npm run test           # 129 Vitest tests, incl. every repo, money/period maths, backup
npm run test:e2e        # adds 6 real-IndexedDB persistence tests to M1's 20
npm run dev              # then open http://localhost:5173/debug/data
```

**Automated (this is the most important test suite in the project — all in place)**

- Repos (`src/db/__tests__/softDeleteRepo.test.ts`, exercised via categories but
  covering the shared factory every list-based entity uses): create → read → list
  (excludes soft-deleted) → update (merges + bumps `updatedAt`) → soft-delete →
  `listTrashed()` → restore (clears `deletedAt`, every other field intact) →
  `hardDelete()`; `update()` on an unknown id throws, `remove()` on one is a no-op.
- `transactions.test.ts`: `listFiltered` by type/category/source/account/currency/
  date-range/note-text, combined with AND semantics, excluding soft-deleted rows;
  `reassignCategory` moves every affected transaction and returns the count.
- `rates.test.ts`: `getRateForCurrency` returns the most recent rate, respects an
  "as of" date, keeps currencies independent, and ignores a soft-deleted rate.
- `settingsRepo.test.ts` / `notificationsRepo.test.ts`: defaults match the resolved
  product decisions (ETB, January FY, Monday week); partial `update()` merges
  without clobbering untouched fields; the notification inbox's list/unread/
  mark-read/clear operations.
- `seed.test.ts`: seeding is idempotent (running it twice doesn't duplicate
  categories) and doesn't recreate a category the user deleted.
- `money.test.ts`: `parseAmountToMinorUnits` for 2/0/3-decimal currencies, `.50`,
  `0`, and rejects empty/negative/too-many-decimals/scientific-notation input;
  `convertMinorUnits` across differing decimal places; `sumConverted` — mixed
  currencies convert correctly, and an unconvertible currency is **excluded and
  counted**, never silently dropped (PRD AC-M7).
- `period.test.ts`: week boundaries for both a Monday and Sunday week-start,
  including one that crosses a year boundary; month boundaries in a leap and a
  non-leap February; FY ranges/labels for both a January and a July start,
  including that 15 June and 15 July land in different FYs under a July start;
  ISO week-key assignment across the tricky December/January boundary cases.
- `backup.test.ts`: full export → erase → import (`replace`) round-trips every
  table exactly; `replace` removes a record added after the snapshot was taken;
  `merge` overwrites by id while leaving untouched records alone; `validateBackup`
  rejects null/non-object/missing-version/newer-version/missing-table input; a
  failed import leaves the database completely untouched.
- E2E (`e2e/data-persistence.spec.ts`, real browser IndexedDB — the fake-indexeddb
  suite above can't prove this on its own): a record created via `/debug/data`
  survives a full page reload; Erase all empties every table; storage usage reads
  without error.

**Manual**

1. Open `/debug/data`, tap "Add a test category", force-close the app (or just
   reload), reopen → it is still there.
2. Tap "Export JSON" → a `.json` file lands in Downloads and is non-empty.
3. Tap "Erase all" → confirm → the categories list goes to 0.
4. Tap "Import JSON" and pick the file from step 2 → everything is back.
5. Tap "Check" under Storage → the used/quota/persisted values look sane.

_(This debug screen is temporary — PLAN.md's M9 replaces it with the real
Settings → Data UI. The steps above are the same actions, just via a plainer
screen.)_

**Pass:** 129 unit + 26 e2e tests green, and all 5 manual steps.

---

## §M3 — Money capture

**Automated**

- Form validation: zero/negative/empty amount blocked; missing category blocked.
- Create → appears in list; edit → list updates; delete → removed, undo → restored
  with the same id.
- Filters produce the correct subset (fixture-based); URL round-trips filter state.
- Category delete with transactions attached → reassign flow, no orphans.

**Manual**

1. From Home, tap the expense quick action. Time yourself: amount → category → save
   should take **under 10 seconds and ≤ 4 taps**.
2. Add an income in your base currency. Add one in a different currency (e.g. USD).
   Both show their own currency correctly in the list.
3. Add a JPY entry (0 decimals) and a KWD entry (3 decimals) → no phantom decimals.
4. Backdate an entry to last month → it lands in the right day group.
5. Scroll the list to 200+ entries → smooth, day subtotals correct, sticky month header.
6. Apply: type = expense + category = Food + this month. Only matching rows show.
   Press back → filters clear/restore as expected.
7. Swipe to delete a row → undo snackbar → tap Undo → the row returns unchanged.
8. Delete a category that has 5 transactions → you are asked what to do; choose
   reassign; verify those 5 now show the new category and none were deleted.
9. Edit a transaction's currency → the amount is not silently rescaled.

---

## §M4 — Money reports

**Automated** (against `seed:demo`, whose totals are known constants)

- Day / Week / Month / FY totals equal the fixture constants exactly.
- Sum of category slices === headline total (to the minor unit), for income and expense.
- Net === income − expense, always.
- Previous-period delta correct, including when the previous period is zero
  (must show "—", not `Infinity%` or `NaN`).
- Week-start = Sunday config shifts weekly totals as expected.
- FY start = July: a 15 June entry and a 15 July entry fall in different FYs.
- Mixed currency: with a USD rate set, converted total matches the hand calculation;
  with the rate removed, the total excludes it and the warning chip count is right.
- Empty period renders `EmptyState`, not a zero-height chart.
- Perf: aggregating 5,000 transactions completes in < 100 ms.
- CSV: correct header, one row per transaction, amounts as decimal strings, commas
  and quotes in notes escaped.

**Manual**

1. Open Reports → Month. Hand-add 3 income and 3 expense entries you can total
   mentally. Check Income, Expense and Net against your own arithmetic.
2. Step ‹ / › across months, including across the year boundary.
3. Switch Day → Week → Month → FY. Each shows a sensible sub-period chart
   (day→categories, week→7 days, month→weeks, FY→12 months).
4. Tap a category slice → the filtered transaction list opens with the right subset.
5. Add a USD expense with **no rate set** → warning chip appears with the right count;
   tap it → lands on the rates screen; add a rate → the chip disappears and the total
   increases by exactly the converted amount.
6. Export CSV → open in a spreadsheet → row count matches the list.
7. Check the whole screen in dark mode: chart bars, axis labels and the donut are all
   legible.

**Pass:** automated suite green **and** step 1 matches your own arithmetic. If step 1
ever fails, stop and fix before anything else — the reports are the product.

---

## §M5 — Notes

**Automated**

- Applying each mark/node produces the expected Tiptap JSON, and re-loading that JSON
  re-renders it.
- `contentText` derivation strips formatting and powers search hits inside bodies.
- Autosave debounce fires once per 500 ms of idle, not per keystroke.
- Grouping by date puts a note edited yesterday in "Yesterday", and a note edited at
  23:59 vs 00:01 into the right groups.
- Collection delete → notes move to Unfiled (default) or are deleted (explicit choice).
- Trash: soft delete → restore → note identical; purge after 30 days.

**Manual**

1. New note. Use **every** format: H1, H2, H3, body, bold, italic, underline,
   strikethrough, highlight (two colours), bullet list, numbered list, checklist,
   quote, inline code, code block, divider, link.
2. Force-close the app mid-sentence, reopen → the sentence is there.
3. Reload → every format above still renders identically.
4. Switch to dark mode → highlight colours are still readable (this is the usual bug).
5. Toggle grouping: By date ↔ By collection. Both are correct; the choice survives restart.
6. Pin a note → it floats to the top of the first group.
7. Search for a word that appears only in a body → the note is found.
8. Move a note between collections; delete a collection and choose "move to Unfiled"
   → the notes survive.
9. Type a long note (1,000+ words) → typing stays responsive, toolbar stays above the
   keyboard, no scroll jumping.

---

## §M6 — Tasks

**Automated**

- Task/subtask CRUD; parent progress `n/m` recomputes on every subtask toggle.
- A task created in the plan screen gets the correct ISO `weekKey`, including for
  dates in the first and last week of a year.
- Today view: overdue first, then due-today, then undated.
- Review screen: lists exactly `weekKey` tasks + tasks completed inside the week;
  completion rate === done/total.
- Carry-forward moves an unfinished task's `weekKey` to the new week and keeps its
  subtasks and notes.
- Completing all subtasks prompts but does not auto-complete the parent.

**Manual (run this across a real week if you can)**

1. Monday: open Plan your week. Add 5 tasks, 2 with deadlines, 1 with 3 subtasks.
2. Confirm all 5 show under this week's chip.
3. Tuesday–Friday: complete 3 of them, including all subtasks of the subtask one.
   Confirm the prompt to complete the parent appears and is skippable.
4. Let one deadline pass → it appears as overdue, in red, at the top of Today.
5. Saturday: open Review your week. Done = 3, Not done = 2, rate = 60 %.
6. Write a reflection → save → find it in Notes under "Weekly reviews".
7. Carry forward the 2 unfinished → they appear in next week's plan with their
   subtasks and notes intact.
8. Swipe-complete and swipe-delete a task → undo works for both.
9. Confirm nothing blocks you: dismiss the plan/review banners and keep using the app.

---

## §M7 — Notifications

> Must be tested on the real phone over HTTPS with the PWA installed. Desktop Chrome
> is only useful for the first two automated checks.

**Automated**

- Next-fire-time computation for each reminder type across day/week/DST boundaries.
- Quiet hours: a reminder inside the window writes an inbox entry and does **not**
  call `showNotification`.
- Catch-up: two missed reminders while closed fire exactly once each, never twice.
- Turning a reminder off removes its scheduled entries.
- Deep-link routing: each notification payload resolves to the right route.

**Manual**

1. Settings → Reminders → enable Weekly plan. The explainer appears **before** the
   browser permission prompt. Grant it.
2. Tap "Send a test notification" → it arrives on the phone within seconds.
3. Set a task due 2 minutes out with a 0-minute offset. Put the app in the background.
   → Notification arrives. Tap it → the app opens **on that task**.
4. Repeat but fully close the app for 10 minutes → note whether it arrives late or not
   at all, then open the app → the catch-up notification fires **once** and the inbox
   has the entry. _(This is the known PWA limitation from PRD §D4 — record the actual
   behaviour on your device here.)_
5. Set quiet hours to cover now → trigger a reminder → no OS notification, but the bell
   badge increments and the inbox has it.
6. Deny permission in Android settings → the app shows the denied state honestly with
   instructions, and does not keep re-prompting.
7. Turn every reminder off → nothing arrives over 24 h.
8. Weekly plan reminder on Monday and review reminder on Saturday, at the configured
   times, both deep-linking to the right screens.

**Record the results of step 4** — that is the evidence for whether OD-1 Option B
(Capacitor wrap) is needed.

---

## §M8 — Home

**Automated**

- Home with an empty DB renders the empty state; with the demo fixture renders all cards.
- Money summary numbers === the M4 report numbers for the same period.
- Today's tasks card === the first 5 of the Today view.
- The plan/review banner shows only on the configured days and stays dismissed for the day.
- No cumulative layout shift once data resolves (skeletons reserve the space).

**Manual**

1. Cold-launch from the home screen → Home paints in under ~2.5 s, no flash of
   unstyled or mis-themed content.
2. Every number on Home matches the corresponding feature screen — check Money
   income/expense/net against Reports for the same period.
3. Toggle Week/Month/Year → restart the app → the toggle is where you left it.
4. Complete a task from Home → the card updates and the Tasks screen agrees.
5. Tap each card → the right feature screen opens.
6. Each quick action opens the right create flow pre-set (expense sheet is on
   "expense", income sheet on "income").
7. With an empty database, the first-run state is helpful, not blank.

---

## §M9 — Settings & data

**Automated**

- Every setting: change → persisted → re-read after a simulated restart.
- Changing week-start / FY-start recomputes reports immediately (assert a changed total).
- Import merge vs replace behave differently and correctly; the diff preview counts match.
- Erase-all requires the typed confirmation; cancelling changes nothing.

**Manual**

1. Change theme, text size, base currency, FY start, week start — one at a time,
   restarting the app after each. All persist; all take effect immediately.
2. Change FY start to July → open the FY report → the range and label change and the
   totals change accordingly.
3. Enable "hide amounts" → amounts blur everywhere, including Home and reports.
4. Export → move the file off the phone → Erase all → Import → everything is back,
   including settings, categories and collections.
5. Import a deliberately corrupted file → a clear error, no data loss.
6. Check storage usage is reported and "request persistent storage" succeeds.

---

## §M10 — Release

**Automated**

- Lighthouse (mobile, throttled) ≥ 90 for Performance, Accessibility, Best Practices, PWA.
- Bundle: initial JS ≤ 180 KB gz; the Tiptap chunk is not in the initial load.
- `axe` scan on every top-level route, light and dark: zero violations.
- Network test: after load, a Playwright run asserts **zero** outbound requests to any
  third-party origin.
- Full E2E happy path: install → add income → add expense → check report → write a
  note → plan a week → complete a task → review the week → export → erase → import.

**Manual — the one-week soak**

1. Install the release build on your phone and delete any dev version.
2. Use it as your only tracker for a week: log every transaction, write notes, plan on
   Monday, review on Saturday.
3. Each day note: anything slow, anything you tapped twice, anything you expected that
   wasn't there, any number that looked wrong.
4. At the end of the week: export the data, confirm the file is complete, and confirm
   the monthly report matches your own expectations of what you earned and spent.

**Ship when:** the automated gates pass and the week's notes contain no correctness
bug. Cosmetic and convenience items go on the v1.1 list.

---

## Bug-report template

```
Milestone:      M4
Screen:         Reports → Month → September 2026
Device/Build:   Pixel 7 · Android 15 · Dowi 0.4.2
Expected:       Net = +18,420 ETB
Actual:         Net = +16,740 ETB
Steps:          1. seed:demo  2. open Reports  3. select Month  4. step to September
Notes:          The USD hosting entry looks excluded even though a rate exists.
```
