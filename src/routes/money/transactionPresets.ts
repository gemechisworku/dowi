import { getMonthRange, getWeekRange, todayString } from '@/lib/period'

/**
 * Quick date-range shortcuts for the transaction list (PRD-adjacent, M9
 * polish). "custom" means the user set From/To directly via the filter
 * sheet rather than picking one of these — see `useTransactionFilters`.
 */
export type TransactionPreset = 'today' | 'week' | 'month' | 'all' | 'custom'

export const TRANSACTION_PRESETS: { value: Exclude<TransactionPreset, 'custom'>; label: string }[] =
  [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This week' },
    { value: 'month', label: 'This month' },
    { value: 'all', label: 'All' },
  ]

/**
 * The inclusive "YYYY-MM-DD" date bounds for a given preset, recomputed
 * from *today* every render rather than frozen at the moment the preset
 * was chosen — so a bookmarked/reloaded "This month" always means the
 * actual current month, not whatever month it was when first selected.
 */
export function presetDateRange(
  preset: Exclude<TransactionPreset, 'custom'>,
  weekStartsOn: number,
): { fromDate?: string; toDate?: string } {
  const today = todayString()
  switch (preset) {
    case 'today':
      return { fromDate: today, toDate: today }
    case 'week': {
      const range = getWeekRange(today, weekStartsOn)
      return { fromDate: range.start, toDate: range.end }
    }
    case 'month': {
      const range = getMonthRange(today)
      return { fromDate: range.start, toDate: range.end }
    }
    case 'all':
      return { fromDate: undefined, toDate: undefined }
  }
}
