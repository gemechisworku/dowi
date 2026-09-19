import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { useDatabase } from '@/app/db/useDatabase'
import type { Transaction } from '@/db/types'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { groupByMonthAndDay } from './groupTransactions'
import { useTransactionFilters } from './useTransactionFilters'
import { TransactionFilterSheet, type FilterFormValue } from './TransactionFilterSheet'
import { TransactionSheet } from './TransactionSheet'
import { Card } from '@/components/ui/Card'
import { ListItem } from '@/components/ui/ListItem'
import { IconButton } from '@/components/ui/IconButton'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { SwipeableRow } from '@/components/ui/SwipeableRow'
import { CategoryIcon } from '@/components/domain/CategoryIcon'
import { MoneyText } from '@/components/domain/MoneyText'
import { useSnackbar } from '@/components/ui/useSnackbar'

const PAGE_SIZE = 60

export function MoneyPage() {
  const { repos } = useDatabase()
  const { filters, setFilters, clearAll, activeCount } = useTransactionFilters()
  const categories = useLiveQuery(() => repos.categories.list(), [repos], EMPTY_ARRAY)
  const accounts = useLiveQuery(() => repos.accounts.list(), [repos], EMPTY_ARRAY)
  const sources = useLiveQuery(() => repos.sources.list(), [repos], EMPTY_ARRAY)

  const filtered = useLiveQuery(
    () => repos.transactions.listFiltered(filters),
    [repos, filters],
    EMPTY_ARRAY,
  )
  const sorted = useMemo(() => [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1)), [filtered])

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visible = sorted.slice(0, visibleCount)
  const groups = useMemo(() => groupByMonthAndDay(visible), [visible])
  const hasMore = visibleCount < sorted.length

  // Infinite scroll: reveal another page once the sentinel below the list
  // scrolls into view, rather than requiring a "Load more" tap.
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setVisibleCount((c) => c + PAGE_SIZE)
      },
      { rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore])

  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | undefined>(undefined)
  const { show } = useSnackbar()

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])
  const accountById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts])
  const sourceById = useMemo(() => new Map(sources.map((s) => [s.id, s])), [sources])

  function openEdit(tx: Transaction) {
    setEditing(tx)
  }

  async function handleQuickDelete(tx: Transaction) {
    await repos.transactions.remove(tx.id)
    show({
      message: 'Transaction deleted',
      action: { label: 'Undo', onClick: () => repos.transactions.restore(tx.id) },
    })
  }

  const filterChips: { key: keyof FilterFormValue; label: string }[] = []
  if (filters.type)
    filterChips.push({ key: 'type', label: filters.type === 'income' ? 'Income' : 'Expense' })
  if (filters.categoryId) {
    filterChips.push({
      key: 'categoryId',
      label: categoryById.get(filters.categoryId)?.name ?? 'Category',
    })
  }
  if (filters.sourceId)
    filterChips.push({ key: 'sourceId', label: sourceById.get(filters.sourceId)?.name ?? 'Source' })
  if (filters.accountId) {
    filterChips.push({
      key: 'accountId',
      label: accountById.get(filters.accountId)?.name ?? 'Account',
    })
  }
  if (filters.currency) filterChips.push({ key: 'currency', label: filters.currency })
  if (filters.fromDate || filters.toDate) {
    filterChips.push({
      key: 'from',
      label: `${filters.fromDate ?? '…'} → ${filters.toDate ?? '…'}`,
    })
  }
  if (filters.text) filterChips.push({ key: 'q', label: `"${filters.text}"` })

  function removeChip(key: keyof FilterFormValue) {
    if (key === 'from') setFilters({ from: undefined, to: undefined })
    else setFilters({ [key]: undefined })
  }

  return (
    <div className="relative flex flex-col pb-24">
      <div className="flex items-center justify-between gap-2 px-4 pt-2">
        <h1 className="text-xl font-bold tracking-tight">Money</h1>
        <div className="flex gap-2">
          <IconButton
            aria-label={activeCount > 0 ? `Filters, ${activeCount} active` : 'Filters'}
            icon="🎛️"
            badge={activeCount > 0}
            onClick={() => setFilterSheetOpen(true)}
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 py-2 text-sm">
        <Link
          to="/money/reports"
          className="whitespace-nowrap font-semibold"
          style={{ color: 'var(--color-primary)' }}
        >
          Reports
        </Link>
        <Link
          to="/money/categories"
          className="whitespace-nowrap font-semibold"
          style={{ color: 'var(--color-primary)' }}
        >
          Categories
        </Link>
        <Link
          to="/money/sources"
          className="whitespace-nowrap font-semibold"
          style={{ color: 'var(--color-primary)' }}
        >
          Sources
        </Link>
        <Link
          to="/money/accounts"
          className="whitespace-nowrap font-semibold"
          style={{ color: 'var(--color-primary)' }}
        >
          Accounts
        </Link>
        <Link
          to="/money/rates"
          className="whitespace-nowrap font-semibold"
          style={{ color: 'var(--color-primary)' }}
        >
          Exchange rates
        </Link>
      </div>

      {filterChips.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {filterChips.map((chip) => (
            <Chip key={chip.key} selected onClick={() => removeChip(chip.key)}>
              {chip.label} ✕
            </Chip>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="text-xs font-semibold underline"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Clear all
          </button>
        </div>
      )}

      <div className="px-4">
        {groups.length === 0 ? (
          <EmptyState
            icon="💸"
            title={activeCount > 0 ? 'No transactions match these filters' : 'No transactions yet'}
            description={activeCount > 0 ? undefined : 'Tap + to log your first income or expense.'}
          />
        ) : (
          groups.map((month) => (
            <div key={month.monthKey} className="mb-4">
              <div
                className="sticky top-0 z-10 py-1.5 text-xs font-bold uppercase tracking-wide"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
              >
                {month.label}
              </div>
              {month.days.map((day) => (
                <Card key={day.date} className="mb-2">
                  <div
                    className="mb-1 flex items-center justify-between text-xs font-semibold"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    <span>{day.date}</span>
                    <span className="flex gap-2">
                      {Object.entries(day.subtotals).map(([currency, net]) => (
                        <MoneyText
                          key={currency}
                          amountMinorUnits={net}
                          currency={currency}
                          sign={net >= 0 ? 'income' : 'expense'}
                          showSign
                        />
                      ))}
                    </span>
                  </div>
                  {day.transactions.map((tx) => {
                    const category = categoryById.get(tx.categoryId)
                    return (
                      <SwipeableRow key={tx.id} onSwipeLeft={() => void handleQuickDelete(tx)}>
                        <ListItem
                          onClick={() => openEdit(tx)}
                          leading={
                            <CategoryIcon icon={category?.icon ?? '📦'} color={category?.color} />
                          }
                          title={
                            tx.note ||
                            category?.name ||
                            (tx.type === 'income' ? 'Income' : 'Expense')
                          }
                          subtitle={[category?.name, accountById.get(tx.accountId ?? '')?.name]
                            .filter(Boolean)
                            .join(' · ')}
                          trailing={
                            <MoneyText
                              amountMinorUnits={tx.amountMinorUnits}
                              currency={tx.currency}
                              sign={tx.type}
                              showSign
                            />
                          }
                        />
                      </SwipeableRow>
                    )
                  })}
                </Card>
              ))}
            </div>
          ))
        )}

        {hasMore && (
          // Auto-loads via the IntersectionObserver above once this scrolls
          // into view; also directly tappable as a fallback.
          <div ref={sentinelRef} className="py-4 text-center">
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="text-sm font-semibold"
              style={{ color: 'var(--color-primary)' }}
            >
              Load more
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        aria-label="Add transaction"
        onClick={() => setAddOpen(true)}
        className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl text-white"
        style={{ background: 'var(--color-primary)', boxShadow: 'var(--shadow-floating)' }}
      >
        +
      </button>

      {addOpen && <TransactionSheet key="add" onClose={() => setAddOpen(false)} />}
      {editing && (
        <TransactionSheet
          key={editing.id}
          onClose={() => setEditing(undefined)}
          transaction={editing}
        />
      )}

      {filterSheetOpen && (
        <TransactionFilterSheet
          onClose={() => setFilterSheetOpen(false)}
          value={{
            type: filters.type,
            categoryId: filters.categoryId,
            sourceId: filters.sourceId,
            accountId: filters.accountId,
            currency: filters.currency,
            from: filters.fromDate,
            to: filters.toDate,
            q: filters.text,
          }}
          onApply={(value) =>
            setFilters({
              type: value.type,
              categoryId: value.categoryId,
              sourceId: value.sourceId,
              accountId: value.accountId,
              currency: value.currency,
              from: value.from,
              to: value.to,
              q: value.q,
            })
          }
        />
      )}
    </div>
  )
}
