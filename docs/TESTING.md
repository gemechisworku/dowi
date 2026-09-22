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

## §M3 — Money capture ✅ done

**Run it yourself:**

```bash
npm run test           # 144 Vitest tests
npm run test:e2e        # 50 Playwright tests, incl. e2e/money.spec.ts
npm run dev              # then open http://localhost:5173/money
```

**Automated (in place)**

- `e2e/money.spec.ts` (real IndexedDB): the add sheet opens on the very first tap;
  seeded categories appear Food-first (not scrambled); adding an expense shows it
  with a minus sign in the right category; editing pre-fills the form and persists
  changes; deleting offers undo, which restores the exact transaction; filtering by
  type narrows the list and shows a removable chip that, removed, restores the full
  list; deleting a category in use requires picking a replacement before the
  confirm button enables, and reassigns every affected transaction; deleting an
  unused category shows a plain confirm instead.
- Unit: `groupByMonthAndDay` (day/month grouping, per-currency net subtotal sign,
  newest-first ordering, empty input); `MoneyText` (forces the correct +/− prefix
  from the `sign` prop regardless of the stored value's own sign — the exact bug
  described below); `createSoftDeleteRepo`'s creation-order guarantee; the seed
  script's category-ordering regression test.
- The kitchen-sink accessibility sweep now includes `/money/categories`,
  `/money/sources`, `/money/accounts`, `/money/rates` — zero violations.

**Manual**

1. From Money, tap the **+** FAB. Time yourself: amount → category → save should
   take **under 10 seconds and ≤ 4 taps**.
2. Add an income in your base currency. Add one in a different currency (e.g. USD).
   Both show their own currency correctly in the list.
3. Add a JPY entry (0 decimals) and a KWD entry (3 decimals) → no phantom decimals.
4. Backdate an entry to last month → it lands in the right day group, under the
   right sticky month header.
5. Scroll the list past 60 entries → the next page loads automatically as you
   near the bottom (or tap "Load more"); day subtotals stay correct throughout.
6. Open Filters, set type = Expense + a category, tap Apply. Only matching rows
   show, and a removable chip appears for each active filter. Refresh the page →
   the filters (and the URL) survive. Tap a chip's ✕ → that filter alone clears.
   _(By design the browser back button does **not** step through each filter
   tweak — only Clear all / removing a chip does. See PLAN.md §M3.)_
7. Swipe a row left → the delete action reveals; releasing past the threshold
   deletes it with an undo snackbar → tap Undo → the row returns unchanged.
8. Money → Categories → delete a category that has transactions → you're asked to
   choose a replacement category (the confirm button stays disabled until you do)
   → verify those transactions now show the new category and none were deleted.
   Delete a category with **no** transactions → a plain "Delete this?" confirm,
   no reassign picker.
9. Edit a transaction's currency → the amount is not silently rescaled (it's the
   same stored minor-units number, now just labelled with the new code — this is
   intentional; re-enter the amount if you actually meant to convert it).
10. Add a source and an account (Money → Sources / Accounts), then confirm they
    appear as options in the add-transaction sheet.
11. Money → Exchange rates → add a rate for a foreign currency → it appears in the
    list as "1 XXX = N ETB, set <date>".

---

## §M4 — Money reports ✅ done

**Run it yourself:**

```bash
npm run test           # 190 Vitest tests
npm run test:e2e        # 70 Playwright tests, incl. e2e/reports.spec.ts + e2e/reports-perf.spec.ts
npm run dev              # then open http://localhost:5173/money
```

**Automated (in place)**

- `aggregate.test.ts` (25 cases, fixture-based, no `seed:demo` — there is no demo
  seed yet, that's an M10 deliverable): day/week/month/FY totals match hand-computed
  fixture constants exactly; sum of category slices === headline total for income
  and expense; net === income − expense always; previous-period delta correct
  including the zero-previous-period edge case (shows `null`, never `NaN`/`Infinity`);
  week-start and FY-start configuration change the boundaries as expected; mixed
  currency handled via `sumConverted`, excluded currencies reported not dropped;
  every sub-period bucket shape (day→categories, week→7 days, month→weeks,
  year→12 months); a 5,000-transaction perf case under 100 ms.
- `csv.test.ts` (8 cases): correct header, one row per transaction, amounts as plain
  decimal strings (no thousands separator), commas/quotes/newlines in notes escaped.
- `summary.test.ts` (6 cases): the share summary's headline figures, top-3-expense
  cap, "Uncategorised" fallback, and the negative-net sign.
- `e2e/reports.spec.ts` (real IndexedDB): headline income/expense/net match
  transactions entered through the M3 add-transaction sheet; the expense breakdown
  is ranked by amount and sums to the expense total; switching the breakdown toggle
  shows the income side instead; CSV export downloads one row per transaction plus
  the header; "View transactions" opens the money list filtered to the report
  range; Share uses the Web Share API when available (verified via a stubbed
  `navigator.share`) and falls back to the clipboard with a confirmation snackbar
  when it isn't; a day with no transactions shows both empty states, not a
  zero-height chart (the one sub-period shape that can genuinely be empty — week/
  month/year always render structural buckets even with nothing in them).
- `e2e/reports-perf.spec.ts`: imports a 5,000-transaction backup via the M2 debug
  data screen and times a real `/money` load end to end (IndexedDB read +
  aggregation + chart render) — under a 1.5 s budget (observed ~50 ms locally).
- The kitchen-sink accessibility sweep now also covers `/money` — zero
  violations, both themes.

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
7. Tap Share → on a device with the Web Share API, the OS share sheet opens with the
   headline + top expenses as plain text; elsewhere, it copies to the clipboard and
   shows a confirmation snackbar. Paste it somewhere and check the figures match.
8. Check the whole screen in dark mode: chart bars, axis labels and the donut are all
   legible. (Verified via a scripted Chromium pass at Pixel-7 width in both themes —
   see PLAN.md §M4's bug notes for the one layout issue it caught: three action
   buttons in one row wrapped "View transactions" onto two lines, fixed by giving it
   its own full-width row above Share/Export CSV.)

**Pass:** automated suite green **and** step 1 matches your own arithmetic. If step 1
ever fails, stop and fix before anything else — the reports are the product.

### Post-M4 — Money section navigation

Reports is now `/money`'s index (what the Money bottom-nav tab opens), the
transaction list moved to `/money/transactions`, and a shared `MoneySubNav`
pill-tab row now appears on all six Money screens (PLAN.md has the full writeup).

```bash
npm run test:e2e -- e2e/money-nav.spec.ts   # 18 Playwright tests
```

- The Money tab opens Reports directly, not the transaction list.
- Each of the six screens (`/money`, `/money/transactions`, `/money/categories`,
  `/money/sources`, `/money/accounts`, `/money/rates`) shows the sub-nav with
  exactly its own tab marked `aria-current="page"` and **in the viewport** — the
  regression test for the actual bug this caught: Accounts and Rates sit past the
  fold of the 6-tab row at phone width, so without auto-scroll-into-view the
  active tab could be marked correctly but scrolled off-screen, leaving nothing
  visible to show which section you're on.
- The sub-nav carries you directly between two non-adjacent sections (Rates →
  Categories) with no detour through Reports.
- The bottom-nav Money tab stays highlighted across every Money screen.

**Manual:** from Home, tap Money → lands on Reports. From Reports, use the sub-nav
to reach Rates (the last tab) → it scrolls into view and is clearly highlighted.
Tap Categories from there → jumps straight there. Repeat in dark mode.

---

## §M5 — Notes ✅ done

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

## §M6 — Tasks ✅ done

**Run it yourself:**

```bash
npm run test           # 228 Vitest tests
npm run test:e2e        # 122 Playwright tests, incl. e2e/tasks.spec.ts + e2e/tasks-week.spec.ts
npm run dev              # then open http://localhost:5173/tasks
```

**Automated (in place)**

- `taskViews.test.ts` (22 cases): overdue/due-today are day-granularity, not
  time-of-day (a task due later today is "due today", not overdue the instant its
  time passes); Today puts overdue before due-today, each sorted by time; Upcoming
  groups by day for 14 days then folds the rest into one trailing "Later" group,
  excluding done and past-dated tasks; All excludes done and filters by
  collection/search (case-insensitive, combinable); Completed sorts most-recent
  first.
- `dueLabel.test.ts` (9 cases) / `week.test.ts` (7 cases, incl. an ISO-week
  year-boundary case already covered for `getIsoWeekKey` itself back in M2 — this
  just checks the wrapper doesn't reprocess that result) — the due-date and
  week-range display formatting.
- `e2e/tasks.spec.ts` (real IndexedDB): capture with priority/due date/subtasks;
  a due-dated task appears in Today, an undated one doesn't (but does in All);
  the checkbox completes a task **without** opening its edit sheet (see the bug
  note below); tapping the row does open it, and edits persist; swipe-delete
  offers undo; subtask progress recomputes on toggle; search + collection filters
  combine on the All view; deleting a collection in use moves its tasks to Unfiled.
- `e2e/tasks-week.spec.ts`: quick-add lands a task in this week; completing it from
  the Plan screen works; Review splits Done/Not-done with the right completion
  rate; carrying forward empties this week's Not-done list; saving a reflection
  persists as a real note and reloads back correctly (a regression test for the
  bug note below).
- The accessibility sweep now also covers `/tasks`, `/tasks/collections`,
  `/tasks/plan`, `/tasks/review` — zero violations, both themes.

**Not automated / not built:** the original draft of this section called for a
"mark the parent done too?" prompt on completing a task's last subtask. That
didn't make it into this pass — completing all subtasks updates the `n/m` count but
never touches the parent's own status, full stop, no prompt. Worth adding as a
follow-up if it turns out to matter in practice; flagging here rather than quietly
dropping it.

**Manual (run this across a real week if you can)**

1. Open Tasks. Add 5 tasks: 2 with due dates (one today, one next week), 1 with 3
   subtasks, 2 with no due date.
2. Today shows only the one due today (plus anything overdue, above it). Upcoming
   shows the next-week one under its day heading. All shows all 5, filterable by
   search and by collection.
3. Complete 3 of the 5 via their checkbox — confirm the edit sheet never opens when
   you tap the checkbox itself, only when you tap elsewhere on the row.
4. Toggle 2 of the 3 subtasks on the subtask task → its row shows "2/3 subtasks".
5. Let a due date pass (or backdate one via Edit) → it shows "Overdue · <date>" in
   red, above anything merely due today, in the Today view.
6. Open Plan the week (from Tasks' own row of tabs, or the "This week" card's
   "Plan" button) → quick-add a task straight into the week.
7. Open Review the week → Done/Not-done split and completion rate match what you
   just did. Write a reflection, save it, then reload the page — the same text is
   still there (it's a real note, in Notes → Weekly reviews, not just local state).
8. Carry forward the Not-done tasks → Review the week again → they're gone from
   this week's split (moved to next week's `weekKey`).
9. Swipe a task left → Delete reveals; confirm undo restores it exactly.
10. Delete a collection that has tasks in it → those tasks move to Unfiled, nothing
    is deleted.
11. From every one of Tasks/Collections/Plan/Review, confirm the sub-nav row gets
    you directly to any of the other three — no detour required.

**Pass:** automated suite green and all 11 manual steps hold, in both themes.

**Bugs the test suite caught and fixed before merge:**

- **Tapping a task's checkbox also opened its edit sheet.** The checkbox is a
  clickable `leading` element inside a row that's itself clickable (tap row → open
  to edit) — without stopping propagation, a checkbox tap bubbled up and fired the
  row's own click too. Fixed in the shared `TaskCheckbox` component itself, not
  just this call site, so any future row that pairs it with a row-level `onClick`
  is safe by construction.
- **A saved weekly reflection never loaded back in on reopen.** Seeding the
  reflection field from data that loads asynchronously (`useLiveQuery`) via a
  `useState` initializer only ever captured that hook's synchronous first-render
  value (always empty), not the real data a moment later. Fixed by moving the
  field into its own component, mounted only once the real data has actually
  arrived, so its `useState` initializer runs against a fresh, correct value —
  see PLAN.md §M6 for why an effect-based fix was rejected (correctly flagged by
  `react-hooks/set-state-in-effect`).
- **Quick-adding a second task on Plan-the-week could wipe out its own title.**
  The field was cleared _after_ the write it submitted resolved, so typing the
  next title before that finished could get clobbered by the delayed clear.
  Looked like ordinary test flake at first — padding the timeout didn't fix it,
  which is what gave away that the field was actually being emptied, not just
  slow. Fixed by clearing before the write, not after.

---

## §M7 — Notifications ✅ done

> The scheduler, inbox and Settings controls are verified below against real
> IndexedDB in a real (headless) browser. Actual OS notification delivery —
> whether it arrives, on time, while backgrounded or fully closed — can only be
> proven on a real phone; see **Manual** below. Headless Chromium always reports
> `Notification.permission` as `"denied"` (confirmed empirically, even with
> Playwright's `grantPermissions`), so the 'default'-permission explainer dialog
> and a real 'granted' delivery aren't reachable in the automated suite at all —
> both are covered by `scheduler.test.ts` with the permission module mocked
> instead.

**Run it yourself:**

```bash
npm run test           # 250 Vitest tests
npm run test:e2e        # 138 Playwright tests, incl. e2e/notifications.spec.ts
npm run dev              # then open http://localhost:5173/settings
```

**Automated (in place)**

- `reminders.test.ts` (14 cases): quiet hours across a same-day window, an
  overnight window (22:00–07:00, both sides of midnight), disabled, and the
  degenerate zero-length case; weekly-plan/review fire once their day+time has
  passed and not before, are never raised twice for the same occurrence, and drop
  out of the 3-day catch-up window once stale; daily agenda falls back to
  yesterday's occurrence before today's has arrived; task-due raises one
  reminder per offset once each has passed, skipping completed tasks and tasks
  with no due date, and is a global no-op when disabled; the backup nudge uses
  first-run as its baseline with no prior export, resets from a real export, and
  recurs from its own previous occurrence when the user still hasn't exported.
- `scheduler.test.ts` (7 cases, `../permission` and `../deliver` mocked): an
  inbox entry is written whether or not OS delivery succeeds; OS delivery itself
  is gated on both permission **and** quiet hours independently; repeated
  `catchUp()` calls never raise the same occurrence twice; `sendTest()` requests
  permission only when it's still undecided, and never touches the inbox.
- `notificationsRepo.test.ts` gains a `markDelivered()` case.
- `e2e/notifications.spec.ts` (real IndexedDB): the denied-permission state is
  shown honestly and doesn't re-prompt when a reminder is toggled; a test
  notification reports it's blocked rather than claiming success; quiet hours'
  time pickers show/hide with the switch and the setting survives a reload; a
  reminder whose day/time has already passed is caught up on the very next app
  open, appears in the inbox, and its tap deep-links to the right screen — all
  without needing OS permission, since the inbox write itself is unconditional;
  Clear all empties the inbox.
- The accessibility sweep now also covers `/notifications` and `/settings` —
  zero violations, both themes.

**Manual (real phone, over HTTPS, PWA installed)**

1. Settings → Reminders → enable Weekly plan. The explainer appears **before** the
   browser permission prompt. Grant it.
2. Tap "Send a test notification" → it arrives on the phone within seconds.
3. Set a task due 2 minutes out with a 0-minute offset (from its own Edit sheet —
   the per-task "Remind me" chips, not Settings). Put the app in the background.
   → Notification arrives. Tap it → the app opens **on that task**.
4. Repeat but fully close the app for 10 minutes → note whether it arrives late or not
   at all, then open the app → the catch-up notification fires **once** and the inbox
   has the entry. _(This is the known PWA limitation from PRD §D4 — record the actual
   behaviour on your device here.)_
5. Set quiet hours to cover now → trigger a reminder → no OS notification, but the bell
   badge increments and the inbox has it.
6. Deny permission in Android settings → the app shows the denied state honestly with
   instructions, and does not keep re-prompting.
7. Turn every reminder off → nothing new arrives over 24 h (existing inbox history
   from before it was turned off is left alone — only future occurrences stop).
8. Weekly plan reminder on Monday and review reminder on Saturday, at the configured
   times, both deep-linking to the right screens.

**Record the results of step 4** — that is the evidence for whether OD-1 Option B
(Capacitor wrap) is needed.

**Pass:** automated suite green (both themes) and all 8 manual steps hold.

**Bugs the test suite caught and fixed before merge:**

- **The service worker failed to register at all in the production build.** The
  kitchen-sink suite's "no console error" check caught `ServiceWorker script
evaluation failed` the first time the full e2e suite ran against a real preview
  build. vite-plugin-pwa's `injectManifest` strategy builds the service worker as
  an ES module by default (needed here — the bundle references `import.meta`),
  but the plugin's auto-generated production `<script>` registration always
  passes `type: 'classic'` to `navigator.serviceWorker.register()` regardless —
  confirmed as the actual cause by registering the identical built file by hand
  with `{ type: 'module' }` (works) and without (the exact same failure). Fixed
  by building the service worker itself as a classic IIFE
  (`injectManifest.rollupFormat: 'iife'`) so the two stay in sync without a
  hand-rolled registration call.
- Not a shipped bug — caught by lint before it ever ran: the first draft of the
  task-due deep link's `?taskId=` handling on `TasksPage` synced the URL into
  `editing` state from inside a `useEffect`, which `react-hooks/set-state-in-effect`
  flagged immediately. Same fix shape as M6's `ReviewWeekPage` reflection bug —
  derived from render instead of synced via effect.

---

## §M8 — Home ✅ done

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
