import type { Transaction } from '@/db/types'

export interface DayGroup {
  date: string
  transactions: Transaction[]
  /** Net of this day's transactions per currency: income minus expense. */
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
