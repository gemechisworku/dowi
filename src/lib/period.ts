/**
 * Week/month/financial-year boundary math (PRD §5.4, D3's sibling decision
 * for dates). Everything here works in *local* calendar dates — deliberately
 * not UTC — because "today" and "this week" must match what the device's
 * clock and the user's own calendar say, not a UTC-shifted equivalent.
 *
 * Dates in and out are "YYYY-MM-DD" strings (Transaction.date's format) so
 * this module has no Date-object timezone footguns to worry about at its
 * public boundary; it only builds local Date objects internally for the
 * arithmetic, then formats straight back to a plain date string.
 */

export type Period = 'day' | 'week' | 'month' | 'quarter' | 'halfYear' | 'year'

export interface DateRange {
  /** Inclusive, "YYYY-MM-DD". */
  start: string
  /** Inclusive, "YYYY-MM-DD". */
  end: string
}

function toDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateString(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y as number, (m as number) - 1, d as number)
}

/** Today as a local "YYYY-MM-DD" string. */
export function todayString(): string {
  return toDateString(new Date())
}

/**
 * The Monday-first-or-Sunday-first week containing `date`, per
 * `weekStartsOn` (0 = Sunday .. 6 = Saturday, matching Date#getDay()).
 */
export function getWeekRange(date: string, weekStartsOn: number): DateRange {
  const d = parseDateString(date)
  const day = d.getDay()
  const diff = (day - weekStartsOn + 7) % 7
  const start = new Date(d)
  start.setDate(d.getDate() - diff)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start: toDateString(start), end: toDateString(end) }
}

export function getMonthRange(date: string): DateRange {
  const d = parseDateString(date)
  const start = new Date(d.getFullYear(), d.getMonth(), 1)
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return { start: toDateString(start), end: toDateString(end) }
}

/**
 * The financial year containing `date`, given the configured start month
 * (1 = January .. 12 = December). For a January start this is a plain
 * calendar year; for any other start month it spans two calendar years.
 */
export function getFinancialYearRange(date: string, fyStartMonth: number): DateRange {
  const d = parseDateString(date)
  const year = d.getFullYear()
  const month = d.getMonth() + 1 // 1-12

  const startYear = month >= fyStartMonth ? year : year - 1
  const start = new Date(startYear, fyStartMonth - 1, 1)
  const end = new Date(startYear + 1, fyStartMonth - 1, 0) // day before next FY starts
  return { start: toDateString(start), end: toDateString(end) }
}

/** A human label for a financial year range, e.g. "FY 2026" (Jan start) or "FY 2026/27" (mid-year start). */
export function getFinancialYearLabel(range: DateRange, fyStartMonth: number): string {
  const startYear = parseDateString(range.start).getFullYear()
  if (fyStartMonth === 1) return `FY ${startYear}`
  const endYear = parseDateString(range.end).getFullYear()
  return `FY ${startYear}/${String(endYear).slice(-2)}`
}

/** How many whole calendar months `date` falls after the start of its financial year (0-based). */
function monthsIntoFy(date: string, fyStartMonth: number): number {
  const fy = getFinancialYearRange(date, fyStartMonth)
  const fyStart = parseDateString(fy.start)
  const d = parseDateString(date)
  return (d.getFullYear() - fyStart.getFullYear()) * 12 + (d.getMonth() - fyStart.getMonth())
}

/**
 * The `blockMonths`-wide, FY-start-aligned block containing `date` — e.g.
 * with `blockMonths = 3` this is the quarter (Q1..Q4) of the financial year
 * that starts at `fyStartMonth`, not a fixed calendar quarter.
 */
function getFyBlockRange(date: string, fyStartMonth: number, blockMonths: number): DateRange {
  const fy = getFinancialYearRange(date, fyStartMonth)
  const fyStart = parseDateString(fy.start)
  const blockIndex = Math.floor(monthsIntoFy(date, fyStartMonth) / blockMonths)
  const blockStart = new Date(
    fyStart.getFullYear(),
    fyStart.getMonth() + blockIndex * blockMonths,
    1,
  )
  const blockEnd = new Date(blockStart.getFullYear(), blockStart.getMonth() + blockMonths, 0)
  return { start: toDateString(blockStart), end: toDateString(blockEnd) }
}

/** The financial-year-aligned quarter containing `date` (blocks of 3 months, starting at `fyStartMonth`). */
export function getQuarterRange(date: string, fyStartMonth: number): DateRange {
  return getFyBlockRange(date, fyStartMonth, 3)
}

/** The financial-year-aligned half-year containing `date` (blocks of 6 months, starting at `fyStartMonth`). */
export function getHalfYearRange(date: string, fyStartMonth: number): DateRange {
  return getFyBlockRange(date, fyStartMonth, 6)
}

function getFyBlockLabel(
  range: DateRange,
  fyStartMonth: number,
  blockMonths: number,
  prefix: string,
): string {
  const fy = getFinancialYearRange(range.start, fyStartMonth)
  const blockIndex = Math.floor(monthsIntoFy(range.start, fyStartMonth) / blockMonths)
  return `${prefix}${blockIndex + 1} ${getFinancialYearLabel(fy, fyStartMonth)}`
}

/** A human label for a quarter range, e.g. "Q1 FY 2026" — relative to the FY it falls in. */
export function getQuarterLabel(range: DateRange, fyStartMonth: number): string {
  return getFyBlockLabel(range, fyStartMonth, 3, 'Q')
}

/** A human label for a half-year range, e.g. "H1 FY 2026" — relative to the FY it falls in. */
export function getHalfYearLabel(range: DateRange, fyStartMonth: number): string {
  return getFyBlockLabel(range, fyStartMonth, 6, 'H')
}

export function getRangeForPeriod(
  period: Period,
  date: string,
  opts: { weekStartsOn: number; fyStartMonth: number },
): DateRange {
  switch (period) {
    case 'day':
      return { start: date, end: date }
    case 'week':
      return getWeekRange(date, opts.weekStartsOn)
    case 'month':
      return getMonthRange(date)
    case 'quarter':
      return getQuarterRange(date, opts.fyStartMonth)
    case 'halfYear':
      return getHalfYearRange(date, opts.fyStartMonth)
    case 'year':
      return getFinancialYearRange(date, opts.fyStartMonth)
  }
}

/** Shifts `date` by `count` periods (negative to go back), landing on the same day-of-period where that's meaningful. */
export function shiftPeriod(period: Period, date: string, count: number): string {
  const d = parseDateString(date)
  switch (period) {
    case 'day':
      d.setDate(d.getDate() + count)
      break
    case 'week':
      d.setDate(d.getDate() + count * 7)
      break
    case 'month':
      d.setMonth(d.getMonth() + count)
      break
    case 'quarter':
      d.setMonth(d.getMonth() + count * 3)
      break
    case 'halfYear':
      d.setMonth(d.getMonth() + count * 6)
      break
    case 'year':
      d.setFullYear(d.getFullYear() + count)
      break
  }
  return toDateString(d)
}

/** ISO-8601 week key "YYYY-Www" for `date` (always Monday-start, per the ISO standard — independent of the user's own week-start setting, since it's an interchange format for tagging tasks, not a display range). */
export function getIsoWeekKey(date: string): string {
  const d = parseDateString(date)
  // Shift to the Thursday of this ISO week, then read its year — the ISO
  // week-numbering year, per the standard definition.
  const target = new Date(d)
  const dayNr = (d.getDay() + 6) % 7 // Monday=0 .. Sunday=6
  target.setDate(d.getDate() - dayNr + 3)
  const isoYear = target.getFullYear()
  const jan4 = new Date(isoYear, 0, 4)
  const jan4DayNr = (jan4.getDay() + 6) % 7
  const week1Monday = new Date(jan4)
  week1Monday.setDate(jan4.getDate() - jan4DayNr)
  const weekNumber = Math.round((target.getTime() - week1Monday.getTime()) / (7 * 86400000)) + 1
  return `${isoYear}-W${String(weekNumber).padStart(2, '0')}`
}
