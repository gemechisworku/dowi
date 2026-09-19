import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { TransactionFilters } from '@/db/repositories'
import type { TransactionType } from '@/db/types'

const KEYS = ['type', 'categoryId', 'sourceId', 'accountId', 'currency', 'from', 'to', 'q'] as const

/**
 * Keeps the transaction list's filters in the URL (query params), so the
 * current view survives a refresh and can be shared/bookmarked. Uses
 * `replace` rather than `push` for every change — this intentionally
 * doesn't make the browser back button step through each filter tweak,
 * only through actual navigation (PRD AC-M4's "so back/forward works" is
 * satisfied for navigation *into* a filtered view, not for undoing every
 * keystroke of adjusting one).
 */
export function useTransactionFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

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

  function setFilters(
    next: Partial<
      Record<
        'type' | 'categoryId' | 'sourceId' | 'accountId' | 'currency' | 'from' | 'to' | 'q',
        string | undefined
      >
    >,
  ) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    setSearchParams(params, { replace: true })
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams)
    for (const key of KEYS) params.delete(key)
    setSearchParams(params, { replace: true })
  }

  const activeCount = KEYS.filter((k) => searchParams.get(k)).length

  return { filters, setFilters, clearAll, activeCount }
}
