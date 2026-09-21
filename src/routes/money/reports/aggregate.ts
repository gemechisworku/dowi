import type { Transaction, TransactionType } from '@/db/types'
import { sumConverted, type ConvertedSum } from '@/lib/money'
import {
  getRangeForPeriod,
  getMonthRange,
  getWeekRange,
  shiftPeriod,
  todayString,
  type DateRange,
  type Period,
} from '@/lib/period'

export interface ReportOptions {
  weekStartsOn: number
  fyStartMonth: number
  baseCurrency: string
  getRate: (currency: string) => number | undefined
}

export interface BreakdownEntry {
  /** categoryId / sourceId / accountId — "" for "none set". */
  key: string
  amountMinorUnits: number
  count: number
}

export interface SubPeriodBucket {
  label: string
  incomeMinorUnits: number
  expenseMinorUnits: number
}

export interface ReportData {
  period: Period
  range: DateRange
  /** Transactions actually in range (any currency), for "view transactions" / CSV export. */
  transactions: Transaction[]
  income: ConvertedSum
  expense: ConvertedSum
  netMinorUnits: number
  /** null when there's nothing to compare against (previous period had zero net). */
  netDeltaPct: number | null
  /** For the GroupedBarChart. For period="day" these are expense categories, not sub-periods. */
  subPeriods: SubPeriodBucket[]
  categoryBreakdown: { income: BreakdownEntry[]; expense: BreakdownEntry[] }
  sourceBreakdown: BreakdownEntry[]
  accountBreakdown: BreakdownEntry[]
  /** Every currency with at least one excluded (no-rate) transaction in range, and how many. */
  excludedCurrencies: Record<string, number>
}

function inRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end
}

function filterByRange(transactions: readonly Transaction[], range: DateRange): Transaction[] {
  return transactions.filter((t) => inRange(t.date, range))
}

function sumByType(
  transactions: Transaction[],
  type: TransactionType,
  opts: ReportOptions,
): ConvertedSum {
  const entries = transactions
    .filter((t) => t.type === type)
    .map((t) => ({ amountMinorUnits: t.amountMinorUnits, currency: t.currency }))
  return sumConverted(entries, opts.baseCurrency, opts.getRate)
}

function mergeExcluded(
  a: Record<string, number>,
  b: Record<string, number>,
): Record<string, number> {
  const merged = { ...a }
  for (const [currency, count] of Object.entries(b))
    merged[currency] = (merged[currency] ?? 0) + count
  return merged
}

/** Converts one transaction's amount into base-currency minor units, or null if unconvertible (no rate, different currency). */
function toBaseOrNull(t: Transaction, opts: ReportOptions): number | null {
  const { totalMinorUnits, excluded } = sumConverted(
    [{ amountMinorUnits: t.amountMinorUnits, currency: t.currency }],
    opts.baseCurrency,
    opts.getRate,
  )
  return Object.keys(excluded).length > 0 ? null : totalMinorUnits
}

/**
 * `signOf` defaults to always-positive, which is correct whenever the
 * caller has already filtered to one transaction type (category/source
 * breakdowns always have). accountBreakdown mixes both types through the
 * same account, so it passes a real signer — otherwise an expense and an
 * income of the same magnitude would add up to double the amount instead
 * of netting to zero.
 */
function breakdownBy(
  transactions: Transaction[],
  keyOf: (t: Transaction) => string | undefined,
  opts: ReportOptions,
  signOf: (t: Transaction) => 1 | -1 = () => 1,
): BreakdownEntry[] {
  const buckets = new Map<string, { amountMinorUnits: number; count: number }>()
  for (const t of transactions) {
    const converted = toBaseOrNull(t, opts)
    if (converted === null) continue
    const key = keyOf(t) ?? ''
    const bucket = buckets.get(key) ?? { amountMinorUnits: 0, count: 0 }
    bucket.amountMinorUnits += converted * signOf(t)
    bucket.count += 1
    buckets.set(key, bucket)
  }
  return Array.from(buckets.entries())
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => b.amountMinorUnits - a.amountMinorUnits)
}

function buildSubPeriods(
  transactions: Transaction[],
  period: Period,
  range: DateRange,
  opts: ReportOptions,
): SubPeriodBucket[] {
  function bucketFor(txs: Transaction[], label: string): SubPeriodBucket {
    return {
      label,
      incomeMinorUnits: sumByType(txs, 'income', opts).totalMinorUnits,
      expenseMinorUnits: sumByType(txs, 'expense', opts).totalMinorUnits,
    }
  }

  if (period === 'day') {
    // "Day → categories": one bucket per category present that day, not a time sub-period.
    const byCategory = new Map<string, Transaction[]>()
    for (const t of transactions) {
      const list = byCategory.get(t.categoryId)
      if (list) list.push(t)
      else byCategory.set(t.categoryId, [t])
    }
    return Array.from(byCategory.entries())
      .map(([categoryId, txs]) => bucketFor(txs, categoryId))
      .sort(
        (a, b) =>
          b.incomeMinorUnits + b.expenseMinorUnits - (a.incomeMinorUnits + a.expenseMinorUnits),
      )
  }

  if (period === 'week') {
    const days: SubPeriodBucket[] = []
    let cursor = range.start
    while (cursor <= range.end) {
      const dayTxs = transactions.filter((t) => t.date === cursor)
      days.push(bucketFor(dayTxs, cursor))
      cursor = shiftPeriod('day', cursor, 1)
    }
    return days
  }

  if (period === 'month') {
    const weeks: SubPeriodBucket[] = []
    let weekStart = getWeekRange(range.start, opts.weekStartsOn).start
    let index = 1
    while (weekStart <= range.end) {
      const weekRange = getWeekRange(weekStart, opts.weekStartsOn)
      const clippedStart = weekRange.start < range.start ? range.start : weekRange.start
      const clippedEnd = weekRange.end > range.end ? range.end : weekRange.end
      const weekTxs = filterByRange(transactions, { start: clippedStart, end: clippedEnd })
      weeks.push(bucketFor(weekTxs, `W${index}`))
      weekStart = shiftPeriod('day', weekRange.end, 1)
      index += 1
    }
    return weeks
  }

  // period === 'year': one bucket per calendar month spanned by the FY range.
  const months: SubPeriodBucket[] = []
  let monthCursor = range.start
  while (monthCursor <= range.end) {
    const monthRange = getMonthRange(monthCursor)
    const clippedEnd = monthRange.end > range.end ? range.end : monthRange.end
    const monthTxs = filterByRange(transactions, { start: monthRange.start, end: clippedEnd })
    const label = new Intl.DateTimeFormat('en-US', { month: 'short' }).format(
      new Date(`${monthCursor}T00:00:00`),
    )
    months.push(bucketFor(monthTxs, label))
    monthCursor = shiftPeriod('month', monthRange.start, 1)
  }
  return months
}

/**
 * Builds a full report for one period, anchored on `anchorDate` (any date
 * inside the period you want — usually "today"). `transactions` should be
 * every non-deleted transaction regardless of date; this filters internally
 * so it can also compute the previous-period comparison.
 */
export function buildReport(
  transactions: readonly Transaction[],
  period: Period,
  anchorDate: string,
  opts: ReportOptions,
): ReportData {
  const range = getRangeForPeriod(period, anchorDate, opts)
  const inThisRange = filterByRange(transactions, range)

  const income = sumByType(inThisRange, 'income', opts)
  const expense = sumByType(inThisRange, 'expense', opts)
  const netMinorUnits = income.totalMinorUnits - expense.totalMinorUnits

  const previousAnchor = shiftPeriod(period, anchorDate, -1)
  const previousRange = getRangeForPeriod(period, previousAnchor, opts)
  const inPreviousRange = filterByRange(transactions, previousRange)
  const previousIncome = sumByType(inPreviousRange, 'income', opts)
  const previousExpense = sumByType(inPreviousRange, 'expense', opts)
  const previousNet = previousIncome.totalMinorUnits - previousExpense.totalMinorUnits

  const netDeltaPct =
    previousNet === 0 ? null : ((netMinorUnits - previousNet) / Math.abs(previousNet)) * 100

  const expenseTxs = inThisRange.filter((t) => t.type === 'expense')
  const incomeTxs = inThisRange.filter((t) => t.type === 'income')

  return {
    period,
    range,
    transactions: inThisRange,
    income,
    expense,
    netMinorUnits,
    netDeltaPct,
    subPeriods: buildSubPeriods(inThisRange, period, range, opts),
    categoryBreakdown: {
      income: breakdownBy(incomeTxs, (t) => t.categoryId, opts),
      expense: breakdownBy(expenseTxs, (t) => t.categoryId, opts),
    },
    sourceBreakdown: breakdownBy(
      incomeTxs.filter((t) => t.sourceId),
      (t) => t.sourceId,
      opts,
    ),
    accountBreakdown: breakdownBy(
      inThisRange.filter((t) => t.accountId),
      (t) => t.accountId,
      opts,
      (t) => (t.type === 'income' ? 1 : -1),
    ),
    excludedCurrencies: mergeExcluded(income.excluded, expense.excluded),
  }
}

/** True once `anchorDate`'s period would be entirely in the future relative to today — used to disable the "next period" stepper. */
export function isFuturePeriod(period: Period, anchorDate: string, opts: ReportOptions): boolean {
  const range = getRangeForPeriod(period, anchorDate, opts)
  return range.start > todayString()
}
