import { shiftPeriod } from '@/lib/period'

export interface CalendarCell {
  /** "YYYY-MM-DD", or null for a leading/trailing padding cell outside the month. */
  date: string | null
  count: number
}

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })

/** "Month YYYY" label for a "YYYY-MM" key, e.g. "June 2026". */
export function getMonthLabel(monthKey: string): string {
  return MONTH_FORMATTER.format(new Date(`${monthKey}-01T00:00:00`))
}

/** The "YYYY-MM" key one month before/after (negative to go back), for a month-stepper. */
export function shiftMonthKey(monthKey: string, count: number): string {
  return shiftPeriod('month', `${monthKey}-01`, count).slice(0, 7)
}

/**
 * A 7-wide grid of weeks for the given month, padded with null-date cells
 * so every week is a full row and the weekday columns line up — a normal
 * calendar-app layout (not GitHub's continuous week-strip), per the ask for
 * "a monthly date calendar". `weekStartsOn` matches the rest of the app's
 * own convention (Settings' week-start-day), so Money/Reports and this page
 * agree on what a "week" starts on.
 */
export function buildMonthGrid(
  monthKey: string,
  weekStartsOn: number,
  activityByDate: ReadonlyMap<string, number>,
): CalendarCell[][] {
  const [year, month] = monthKey.split('-').map(Number) as [number, number]
  const daysInMonth = new Date(year, month, 0).getDate()
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const leadingBlanks = (firstWeekday - weekStartsOn + 7) % 7

  const cells: CalendarCell[] = []
  for (let i = 0; i < leadingBlanks; i++) cells.push({ date: null, count: 0 })
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ date, count: activityByDate.get(date) ?? 0 })
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, count: 0 })

  const weeks: CalendarCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

/** Buckets a raw same-day count into a fixed 0-4 shading level for the calendar's sequential fill. */
export function intensityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 3
  return 4
}

/**
 * Every date in the current unbroken streak, for the calendar's "part of
 * your active streak" marker — derived from the same two fields
 * StreakState already tracks (streakRepo.ts), not a separate log: the
 * streak is by definition a contiguous run ending on `lastActiveDate`.
 */
export function getCurrentStreakDates(
  lastActiveDate: string | null,
  currentStreak: number,
): Set<string> {
  if (!lastActiveDate || currentStreak <= 0) return new Set()
  const dates = new Set<string>()
  for (let back = 0; back < currentStreak; back++) {
    dates.add(shiftPeriod('day', lastActiveDate, -back))
  }
  return dates
}
