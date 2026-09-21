import { getIsoWeekKey, getWeekRange, shiftPeriod, todayString, type DateRange } from '@/lib/period'

export interface WeekInfo {
  weekKey: string
  range: DateRange
}

/**
 * The Monday–Sunday week containing `date`, and its ISO week key — always
 * Monday-start regardless of the user's own week-start setting, so the
 * displayed range always matches exactly what `Task.weekKey` tags
 * (PLAN §M6). Using the user's own `weekStartsOn` here instead would drift
 * from the ISO key by a day for anyone on a Sunday-start week, silently
 * showing the wrong range for tasks tagged into "this week".
 */
export function weekInfoFor(date: string): WeekInfo {
  return { weekKey: getIsoWeekKey(date), range: getWeekRange(date, 1) }
}

export function getThisWeek(): WeekInfo {
  return weekInfoFor(todayString())
}

export function getLastWeek(): WeekInfo {
  return weekInfoFor(shiftPeriod('week', todayString(), -1))
}

export function getNextWeek(): WeekInfo {
  return weekInfoFor(shiftPeriod('week', todayString(), 1))
}

const SHORT_DAY_FORMATTER = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' })

/** "Sep 15 – 21" style label for a week's range. */
export function formatWeekRangeLabel(range: DateRange): string {
  return `${SHORT_DAY_FORMATTER.format(new Date(`${range.start}T00:00:00`))} – ${SHORT_DAY_FORMATTER.format(new Date(`${range.end}T00:00:00`))}`
}
