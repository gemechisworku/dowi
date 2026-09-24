# Changelog

Dowi is still in initial development — nothing has shipped as a numbered
release yet, so this starts as a single placeholder entry rather than a full
history. Settings → About shows this file's most recent entry (or a
"pre-release" fallback if this file is ever missing).

## 0.3.0 — recurring transactions & Reports overhaul

- New Money → Recurring: set up rent, subscriptions, salary, or anything else
  that repeats, with a weekly/bi-weekly/monthly/yearly (or custom every-N)
  interval, an optional end date, and a per-item choice between
  auto-recording on the due date or getting a notification to confirm first.
- Editing a recurring item only changes future occurrences — anything it's
  already recorded stays untouched.
- Fixed Reports charts clipping or overlapping long category names and many
  bars — they now scroll horizontally instead of squeezing everything into
  the screen width.
- Reports now only compares income vs expense at Month/Quarter/6 Months/Year
  (not Day/Week, where that comparison isn't meaningful); Week gets a new
  day-by-day expense trend line chart, and Month/Quarter/6 Months/Year get an
  expense trend chart alongside the income vs expense comparison.
- Added Quarter and 6 Months as report periods, aligned to your financial
  year start setting.
- Added a "by category over time" chart to compare how different categories'
  spending trends across several periods, not just within a single period.
- Reports' Day chart no longer mixes income into the expense-by-category
  breakdown; Week's expense-trend chart now labels each day by weekday
  initial (in your configured week-start order) instead of a raw date.
- Recurring payments no longer count toward your regular daily/weekly/monthly
  totals on Reports or Transactions — each now gets its own "Recurring"
  section, summed according to its own schedule (so a weekly item shows as
  one combined figure when you're looking at a month, while a monthly item
  just shows its one occurrence).

## 0.2.0 — notification & Money/Home polish

- Fixed morning/evening reminders arriving bunched together; both now
  respect "already logged today."
- Evening reminder now sends a day recap once something's been logged,
  instead of just staying silent.
- New notification detail page, daily streak reward overlay, optional
  display-name personalization, Money date presets + paging, red Expense
  text on Home, and a proactive update-available prompt.

## 0.1.0 — initial development

- Money, Notes, Tasks, Home, reminders/notifications, and Settings built out
  through milestone M9. Not yet released.
