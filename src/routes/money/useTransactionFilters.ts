import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { TransactionFilters } from '@/db/repositories'
import type { TransactionType } from '@/db/types'
import type { TransactionPreset } from './transactionPresets'

const KEYS = [
  'type',
  'categoryId',
  'sourceId',
  'accountId',
  'currency',
  'from',
  'to',
  'q',
  'preset',
  'page',
] as const

/** Filters from the 🎛️ sheet — distinct from `preset`, which drives the quick date chips and isn't itself an "advanced" filter. */
const ADVANCED_KEYS = ['type', 'categoryId', 'sourceId', 'accountId', 'currency', 'q'] as const

/**
 * Keeps the transaction list's filters in the URL (query params), so the
 * current view survives a refresh and can be shared/bookmarked. Uses
 * `replace` rather than `push` for every change — this intentionally
 * doesn't make the browser back button step through each filter tweak,
 * only through actual navigation (PRD AC-M4's "so back/forward works" is
 * satisfied for navigation *into* a filtered view, not for undoing every
 * keystroke of adjusting one).
 *
 * `preset` defaults to "today" when absent — a fresh visit to `/money`
 * shows only today's transactions rather than everything. Choosing one of
 * the "Today"/"This week"/"This month"/"All" chips just sets `preset`;
 * `MoneyPage` resolves its actual from/to bounds fresh on every render
 * (see `transactionPresets.ts`) rather than freezing them into the URL, so
 * a bookmarked "This month" always means the *current* month. Only
 * `preset=custom` (set implicitly when the filter sheet's own From/To or
 * any other field is used) reads `fromDate`/`toDate` from the URL.
 */
export function useTransactionFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const preset = (searchParams.get('preset') as TransactionPreset | null) ?? 'today'

  const filters: TransactionFilters = useMemo(
    () => ({
      type: (searchParams.get('type') as TransactionType | null) ?? undefined,
      categoryId: searchParams.get('categoryId') ?? undefined,
      sourceId: searchParams.get('sourceId') ?? undefined,
      accountId: searchParams.get('accountId') ?? undefined,
      currency: searchParams.get('currency') ?? undefined,
      fromDate: searchParams.get('from') ?? undefined,
      toDate: searchParams.get('to') ?? undefined,
      text: searchParams.get('q') ?? undefined,
    }),
    [searchParams],
  )

  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  function setFilters(
    next: Partial<
      Record<
        | 'type'
        | 'categoryId'
        | 'sourceId'
        | 'accountId'
        | 'currency'
        | 'from'
        | 'to'
        | 'q'
        | 'preset',
        string | undefined
      >
    >,
  ) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    // Any filter change invalidates whatever page you were on.
    params.delete('page')
    setSearchParams(params, { replace: true })
  }

  function setPreset(next: Exclude<TransactionPreset, 'custom'>) {
    const params = new URLSearchParams(searchParams)
    params.set('preset', next)
    params.delete('from')
    params.delete('to')
    params.delete('page')
    setSearchParams(params, { replace: true })
  }

  function setPage(next: number) {
    const params = new URLSearchParams(searchParams)
    if (next <= 1) params.delete('page')
    else params.set('page', String(next))
    setSearchParams(params, { replace: true })
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams)
    for (const key of KEYS) params.delete(key)
    setSearchParams(params, { replace: true })
  }

  const activeCount =
    ADVANCED_KEYS.filter((k) => searchParams.get(k)).length +
    (preset === 'custom' && (searchParams.get('from') || searchParams.get('to')) ? 1 : 0)

  return { filters, preset, page, setFilters, setPreset, setPage, clearAll, activeCount }
}
