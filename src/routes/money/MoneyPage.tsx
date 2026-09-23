import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDatabase } from '@/app/db/useDatabase'
import type { Settings, Transaction } from '@/db/types'
import { DEFAULT_SETTINGS } from '@/db/settingsRepo'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { groupByMonthAndDay } from './groupTransactions'
import { useTransactionFilters } from './useTransactionFilters'
import { TRANSACTION_PRESETS, presetDateRange } from './transactionPresets'
import { TransactionFilterSheet, type FilterFormValue } from './TransactionFilterSheet'
import { TransactionSheet } from './TransactionSheet'
import { MoneySubNav } from './MoneySubNav'
import { Card } from '@/components/ui/Card'
import { ListItem } from '@/components/ui/ListItem'
import { IconButton } from '@/components/ui/IconButton'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SwipeableRow } from '@/components/ui/SwipeableRow'
import { CategoryIcon } from '@/components/domain/CategoryIcon'
import { MoneyText } from '@/components/domain/MoneyText'
import { useSnackbar } from '@/components/ui/useSnackbar'

const PAGE_SIZE = 30

export function MoneyPage() {
  const { repos, settingsRepo } = useDatabase()
  const { filters, preset, page, setFilters, setPreset, setPage, clearAll, activeCount } =
    useTransactionFilters()
  const settings = useLiveQuery(
    () => settingsRepo.get(),
    [settingsRepo],
    DEFAULT_SETTINGS,
  ) as Settings
  const categories = useLiveQuery(() => repos.categories.list(), [repos], EMPTY_ARRAY)
  const accounts = useLiveQuery(() => repos.accounts.list(), [repos], EMPTY_ARRAY)
  const sources = useLiveQuery(() => repos.sources.list(), [repos], EMPTY_ARRAY)

  // Preset chips (Today/This week/This month/All) resolve their date bounds
  // fresh every render rather than freezing them into the URL — only
  // "custom" (the filter sheet's own From/To) reads fromDate/toDate from
  // `filters` directly. See transactionPresets.ts.
  const effectiveFilters = useMemo(() => {
    if (preset === 'custom') return filters
    const { fromDate, toDate } = presetDateRange(preset, settings.weekStartsOn)
    return { ...filters, fromDate, toDate }
  }, [filters, preset, settings.weekStartsOn])

  const filtered = useLiveQuery(
    () => repos.transactions.listFiltered(effectiveFilters),
    [repos, effectiveFilters],
    EMPTY_ARRAY,
  )
  const sorted = useMemo(() => [...filtered].sort((a, b) => (a.date < b.date ? 1 : -1)), [filtered])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visible = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const groups = useMemo(() => groupByMonthAndDay(visible), [visible])

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
    if (key === 'from') setPreset('all')
    else setFilters({ [key]: undefined })
  }

  return (
    <div className="relative flex flex-col pb-24">
      <div className="flex items-center justify-between gap-2 px-4 pt-2">
        <h1 className="text-xl font-bold tracking-tight">Transactions</h1>
        <div className="flex gap-2">
          <IconButton
            aria-label={activeCount > 0 ? `Filters, ${activeCount} active` : 'Filters'}
            icon="🎛️"
            badge={activeCount > 0}
            onClick={() => setFilterSheetOpen(true)}
          />
        </div>
      </div>

      <div className="px-4 pt-2">
        <MoneySubNav />
      </div>

      <div className="flex flex-wrap gap-2 px-4 pb-2 pt-1">
        {TRANSACTION_PRESETS.map((p) => (
          <Chip key={p.value} selected={preset === p.value} onClick={() => setPreset(p.value)}>
            {p.label}
          </Chip>
        ))}
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

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 py-4">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              ‹ Prev
            </Button>
            <span className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next ›
            </Button>
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
          onApply={(value) => {
            const isEmpty = Object.values(value).every((v) => v === undefined)
            if (isEmpty) {
              clearAll()
              return
            }
            setFilters({
              type: value.type,
              categoryId: value.categoryId,
              sourceId: value.sourceId,
              accountId: value.accountId,
              currency: value.currency,
              from: value.from,
              to: value.to,
              q: value.q,
              preset: 'custom',
            })
          }}
        />
      )}
    </div>
  )
}
