import { getFinancialYearLabel, getHalfYearLabel, getQuarterLabel } from '@/lib/period'
import type { DateRange, Period } from '@/lib/period'
import type { ReportData } from './aggregate'

const DAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const SHORT_DAY_FORMATTER = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' })
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })
const SHORT_MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short' })

/** A human label for the report's current period, e.g. "September 2026" or "FY 2026/27". */
export function getPeriodLabel(
  period: Period,
  report: Pick<ReportData, 'range'>,
  fyStartMonth: number,
): string {
  const { range } = report
  switch (period) {
    case 'day':
      return DAY_FORMATTER.format(new Date(`${range.start}T00:00:00`))
    case 'week':
      return `${SHORT_DAY_FORMATTER.format(new Date(`${range.start}T00:00:00`))} – ${SHORT_DAY_FORMATTER.format(new Date(`${range.end}T00:00:00`))}`
    case 'month':
      return MONTH_FORMATTER.format(new Date(`${range.start}T00:00:00`))
    case 'quarter':
      return getQuarterLabel(range, fyStartMonth)
    case 'halfYear':
      return getHalfYearLabel(range, fyStartMonth)
    case 'year':
      return getFinancialYearLabel(range, fyStartMonth)
  }
}

/**
 * A SHORT label for one sub-period within a trend (e.g. the category-trend
 * chart's x-axis) — distinct from `getPeriodLabel`'s full stepper-header
 * label, which is too long to repeat once per point on a chart axis.
 */
export function getShortPeriodLabel(
  period: Period,
  range: DateRange,
  fyStartMonth: number,
): string {
  switch (period) {
    case 'day':
      return SHORT_DAY_FORMATTER.format(new Date(`${range.start}T00:00:00`))
    case 'week':
      return `${SHORT_DAY_FORMATTER.format(new Date(`${range.start}T00:00:00`))} – ${SHORT_DAY_FORMATTER.format(new Date(`${range.end}T00:00:00`))}`
    case 'month':
      return SHORT_MONTH_FORMATTER.format(new Date(`${range.start}T00:00:00`))
    case 'quarter':
      return getQuarterLabel(range, fyStartMonth).split(' ')[0]!
    case 'halfYear':
      return getHalfYearLabel(range, fyStartMonth).split(' ')[0]!
    case 'year':
      return getFinancialYearLabel(range, fyStartMonth)
  }
}
