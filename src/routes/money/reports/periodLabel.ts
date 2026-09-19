import { getFinancialYearLabel } from '@/lib/period'
import type { Period } from '@/lib/period'
import type { ReportData } from './aggregate'

const DAY_FORMATTER = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const SHORT_DAY_FORMATTER = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' })
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })

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
    case 'year':
      return getFinancialYearLabel(range, fyStartMonth)
  }
}
