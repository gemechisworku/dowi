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
import { getShortPeriodLabel } from './periodLabel'
import { MAX_CATEGORY_SLICES } from './chartColors'

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

export interface RecurringBreakdownEntry {
  recurringId: string
  /** Read from the occurrences themselves, not the template, so this still works if the template was later deleted. */
  type: TransactionType
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
  /** Transactions actually in range (any currency, including recurring-generated ones), for "view transactions" / CSV export — a raw export, not a total, so nothing is hidden from it. */
  transactions: Transaction[]
  /**
   * Excludes recurring-generated transactions (`Transaction.recurringId` set)
   * — a recurring item's occurrences are shown in `recurringBreakdown`
   * instead, summed according to its own interval rather than folded into
   * this period's regular income/expense totals. See `recurringBreakdown`.
   */
  income: ConvertedSum
  expense: ConvertedSum
  netMinorUnits: number
  /** null when there's nothing to compare against (previous period had zero net). Also excludes recurring, for the same reason as `income`/`expense`. */
  netDeltaPct: number | null
  /**
   * For the report's sub-period charts. Excludes recurring-generated
   * transactions, same as `income`/`expense`. For period="day" these are
   * expense categories, not time sub-periods (income is excluded — see
   * `buildSubPeriods`). For period="week" each bucket is one day, labeled by
   * weekday initial.
   */
  subPeriods: SubPeriodBucket[]
  /** Excludes recurring-generated transactions, same as `income`/`expense`. */
  categoryBreakdown: { income: BreakdownEntry[]; expense: BreakdownEntry[] }
  sourceBreakdown: BreakdownEntry[]
  accountBreakdown: BreakdownEntry[]
  /** Every currency with at least one excluded (no-rate) transaction in range, and how many. Excludes recurring-generated transactions, same as `income`/`expense`. */
  excludedCurrencies: Record<string, number>
  /**
   * One entry per recurring item with at least one occurrence in range, its
   * amount summed across every occurrence that fell in range — so a
   * monthly item viewed at month granularity shows its single occurrence,
   * while a weekly item viewed at month granularity shows the sum of every
   * week's occurrence that month. Deliberately excluded from every total
   * above (see PRD: recurring payments have their own section, not mixed
   * into daily/weekly/monthly totals).
   */
  recurringBreakdown: RecurringBreakdownEntry[]
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

/**
 * Sums every recurring-generated transaction in range by its recurringId —
 * this is what lets a weekly item's several occurrences within a month
 * collapse into one "this month" figure, while a monthly item's single
 * occurrence just passes through unchanged. `type` is read per-group from
 * the occurrences themselves (not the template) so this keeps working even
 * if the template was later deleted.
 */
function buildRecurringBreakdown(
  recurringTransactions: Transaction[],
  opts: ReportOptions,
): RecurringBreakdownEntry[] {
  const buckets = new Map<
    string,
    { type: TransactionType; amountMinorUnits: number; count: number }
  >()
  for (const t of recurringTransactions) {
    if (!t.recurringId) continue
    const converted = toBaseOrNull(t, opts)
    if (converted === null) continue
    const bucket = buckets.get(t.recurringId) ?? { type: t.type, amountMinorUnits: 0, count: 0 }
    bucket.amountMinorUnits += converted
    bucket.count += 1
    buckets.set(t.recurringId, bucket)
  }
  return Array.from(buckets.entries())
    .map(([recurringId, v]) => ({ recurringId, ...v }))
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
    // "Day → expense categories": one bucket per expense category present
    // that day, not a time sub-period. Income is deliberately excluded —
    // income-vs-expense isn't a meaningful comparison at day granularity
    // (that's what this bucketing itself replaces), so mixing income
    // categories into what reads as an expense breakdown would be
    // misleading.
    const byCategory = new Map<string, Transaction[]>()
    for (const t of transactions) {
      if (t.type !== 'expense') continue
      const list = byCategory.get(t.categoryId)
      if (list) list.push(t)
      else byCategory.set(t.categoryId, [t])
    }
    return Array.from(byCategory.entries())
      .map(([categoryId, txs]) => bucketFor(txs, categoryId))
      .sort((a, b) => b.expenseMinorUnits - a.expenseMinorUnits)
  }

  if (period === 'week') {
    // Labeled by weekday initial (e.g. "M", "T"), not the raw date — the
    // order still follows the configured week-start day since `range.start`
    // (and so `cursor`'s starting point) already comes from getWeekRange's
    // weekStartsOn.
    const days: SubPeriodBucket[] = []
    let cursor = range.start
    while (cursor <= range.end) {
      const dayTxs = transactions.filter((t) => t.date === cursor)
      const label = new Intl.DateTimeFormat('en-US', { weekday: 'narrow' }).format(
        new Date(`${cursor}T00:00:00`),
      )
      days.push(bucketFor(dayTxs, label))
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

  // period === 'quarter' | 'halfYear' | 'year': one bucket per calendar
  // month spanned by the range — works unchanged for any range length since
  // it just walks range.start to range.end a month at a time.
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

  // Recurring-generated transactions get their own section (`recurringBreakdown`,
  // summed per item) instead of being folded into the period's regular
  // totals/charts/breakdowns below — a weekly rent showing up 4-5 times a
  // month would otherwise inflate "this month's expense" in a way that
  // doesn't reflect a one-off comparison against other months/categories.
  const nonRecurring = inThisRange.filter((t) => !t.recurringId)
  const recurringOnly = inThisRange.filter((t) => t.recurringId)

  const income = sumByType(nonRecurring, 'income', opts)
  const expense = sumByType(nonRecurring, 'expense', opts)
  const netMinorUnits = income.totalMinorUnits - expense.totalMinorUnits

  const previousAnchor = shiftPeriod(period, anchorDate, -1)
  const previousRange = getRangeForPeriod(period, previousAnchor, opts)
  const inPreviousRangeNonRecurring = filterByRange(transactions, previousRange).filter(
    (t) => !t.recurringId,
  )
  const previousIncome = sumByType(inPreviousRangeNonRecurring, 'income', opts)
  const previousExpense = sumByType(inPreviousRangeNonRecurring, 'expense', opts)
  const previousNet = previousIncome.totalMinorUnits - previousExpense.totalMinorUnits

  const netDeltaPct =
    previousNet === 0 ? null : ((netMinorUnits - previousNet) / Math.abs(previousNet)) * 100

  const expenseTxs = nonRecurring.filter((t) => t.type === 'expense')
  const incomeTxs = nonRecurring.filter((t) => t.type === 'income')

  return {
    period,
    range,
    transactions: inThisRange,
    income,
    expense,
    netMinorUnits,
    netDeltaPct,
    subPeriods: buildSubPeriods(nonRecurring, period, range, opts),
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
      nonRecurring.filter((t) => t.accountId),
      (t) => t.accountId,
      opts,
      (t) => (t.type === 'income' ? 1 : -1),
    ),
    excludedCurrencies: mergeExcluded(income.excluded, expense.excluded),
    recurringBreakdown: buildRecurringBreakdown(recurringOnly, opts),
  }
}

/** True once `anchorDate`'s period would be entirely in the future relative to today — used to disable the "next period" stepper. */
export function isFuturePeriod(period: Period, anchorDate: string, opts: ReportOptions): boolean {
  const range = getRangeForPeriod(period, anchorDate, opts)
  return range.start > todayString()
}

/** One category's spend across the trend window, oldest period first, in base-currency minor units. */
export interface CategoryTrendSeries {
  categoryId: string
  values: number[]
}

export interface CategoryTrendData {
  periodLabels: string[]
  series: CategoryTrendSeries[]
}

/**
 * Spend per category across `windowSize` consecutive periods ending at
 * `anchorDate`'s period (oldest -> newest), so categories can be compared
 * against each other over time (e.g. Groceries across the last 6 months).
 * Reuses `buildReport` per period rather than re-deriving aggregation logic
 * — simplest correct approach given in-memory transaction volumes.
 */
export function buildCategoryTrend(
  transactions: readonly Transaction[],
  period: Period,
  anchorDate: string,
  type: TransactionType,
  windowSize: number,
  opts: ReportOptions,
): CategoryTrendData {
  const perPeriodBreakdown: BreakdownEntry[][] = []
  const ranges: DateRange[] = []

  for (let k = windowSize - 1; k >= 0; k--) {
    const anchor = shiftPeriod(period, anchorDate, -k)
    const report = buildReport(transactions, period, anchor, opts)
    perPeriodBreakdown.push(report.categoryBreakdown[type])
    ranges.push(report.range)
  }
  const periodLabels = ranges.map((range) => getShortPeriodLabel(period, range, opts.fyStartMonth))

  // Rank every categoryId seen anywhere in the window by its total across
  // the whole window, so the same top categories get a series even if one
  // of them happened to be #0 in a single period but not overall.
  const totalsByCategory = new Map<string, number>()
  for (const breakdown of perPeriodBreakdown) {
    for (const entry of breakdown) {
      totalsByCategory.set(
        entry.key,
        (totalsByCategory.get(entry.key) ?? 0) + entry.amountMinorUnits,
      )
    }
  }
  const ranked = Array.from(totalsByCategory.entries()).sort((a, b) => b[1] - a[1])
  const topCategoryIds = ranked.slice(0, MAX_CATEGORY_SLICES - 1).map(([id]) => id)
  const topSet = new Set(topCategoryIds)
  const hasOther = ranked.length > topCategoryIds.length

  const series: CategoryTrendSeries[] = topCategoryIds.map((categoryId) => ({
    categoryId,
    // Zero-fill periods where the category had no spend, rather than
    // omitting the point — every series stays aligned with periodLabels.
    values: perPeriodBreakdown.map(
      (breakdown) => breakdown.find((e) => e.key === categoryId)?.amountMinorUnits ?? 0,
    ),
  }))

  if (hasOther) {
    series.push({
      categoryId: 'other',
      values: perPeriodBreakdown.map((breakdown) =>
        breakdown.filter((e) => !topSet.has(e.key)).reduce((sum, e) => sum + e.amountMinorUnits, 0),
      ),
    })
  }

  return { periodLabels, series }
}
