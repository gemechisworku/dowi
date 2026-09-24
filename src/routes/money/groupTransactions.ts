import type { Transaction, TransactionType } from '@/db/types'

export interface DayGroup {
  date: string
  transactions: Transaction[]
  /**
   * Net of this day's transactions per currency: income minus expense.
   * Excludes recurring-generated transactions (`Transaction.recurringId`
   * set) — they get their own summary section on the page instead of being
   * folded into a day's total, same reasoning as Reports' headline totals.
   */
  subtotals: Record<string, number>
}

export interface MonthGroup {
  /** "YYYY-MM" */
  monthKey: string
  label: string
  days: DayGroup[]
}

const MONTH_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })

/** Groups already-sorted (newest first) transactions by day, then by month, computing each day's per-currency net. */
export function groupByMonthAndDay(transactions: Transaction[]): MonthGroup[] {
  const dayMap = new Map<string, Transaction[]>()
  for (const tx of transactions) {
    const list = dayMap.get(tx.date)
    if (list) list.push(tx)
    else dayMap.set(tx.date, [tx])
  }

  const days: DayGroup[] = Array.from(dayMap.entries()).map(([date, txs]) => {
    const subtotals: Record<string, number> = {}
    for (const tx of txs) {
      if (tx.recurringId) continue
      const sign = tx.type === 'income' ? 1 : -1
      subtotals[tx.currency] = (subtotals[tx.currency] ?? 0) + sign * tx.amountMinorUnits
    }
    return { date, transactions: txs, subtotals }
  })

  const monthMap = new Map<string, DayGroup[]>()
  for (const day of days) {
    const monthKey = day.date.slice(0, 7)
    const list = monthMap.get(monthKey)
    if (list) list.push(day)
    else monthMap.set(monthKey, [day])
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([monthKey, monthDays]) => ({
      monthKey,
      label: MONTH_FORMATTER.format(new Date(`${monthKey}-01T00:00:00`)),
      days: monthDays.sort((a, b) => (a.date < b.date ? 1 : -1)),
    }))
}

export interface RecurringGroup {
  recurringId: string
  /** Every transaction in a group shares the same `recurringId`, hence the same template, hence the same type. */
  type: TransactionType
  /** Newest first, matching the order transactions are passed in. */
  transactions: Transaction[]
  /** Per-currency sum of `amountMinorUnits` (magnitude only — `type` carries the sign). */
  subtotals: Record<string, number>
}

/**
 * Groups recurring-generated transactions (`Transaction.recurringId` set) by
 * which recurring item generated them — the "own section, summed per item"
 * counterpart to `groupByMonthAndDay`'s day-by-day grouping for everything
 * else. A weekly item filtered to "This month" collapses its several
 * occurrences into one group here, while a monthly item's single occurrence
 * just becomes a group of one.
 */
export function groupRecurring(transactions: Transaction[]): RecurringGroup[] {
  const groups = new Map<string, RecurringGroup>()
  for (const tx of transactions) {
    if (!tx.recurringId) continue
    let group = groups.get(tx.recurringId)
    if (!group) {
      group = { recurringId: tx.recurringId, type: tx.type, transactions: [], subtotals: {} }
      groups.set(tx.recurringId, group)
    }
    group.transactions.push(tx)
    group.subtotals[tx.currency] = (group.subtotals[tx.currency] ?? 0) + tx.amountMinorUnits
  }
  return Array.from(groups.values())
}
