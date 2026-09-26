import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDatabase } from '@/app/db/useDatabase'
import type { RecurringTransaction } from '@/db/types'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { formatIntervalLabel } from '@/lib/recurrence'
import { RecurringSheet } from './RecurringSheet'
import { MoneySubNav } from './MoneySubNav'
import { Card } from '@/components/ui/Card'
import { ListItem } from '@/components/ui/ListItem'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { SwipeableRow } from '@/components/ui/SwipeableRow'
import { CategoryIcon } from '@/components/domain/CategoryIcon'
import { MoneyText } from '@/components/domain/MoneyText'
import { useSnackbar } from '@/components/ui/useSnackbar'
import { PageHeaderBand } from '@/components/ui/PageHeaderBand'

const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })

function formatNextDue(date: string): string {
  // `date` is a local "YYYY-MM-DD" — parse as local, not UTC, so the label
  // never shows a day off from what's stored.
  const [y, m, d] = date.split('-').map(Number)
  return DATE_FORMATTER.format(new Date(y as number, (m as number) - 1, d as number))
}

/**
 * `/money/recurring` — the list of recurring income/expense templates (PRD
 * §9). Same shape as MoneyPage: a FAB opens `RecurringSheet` for create,
 * tapping a row opens it for edit, swipe-left soft-deletes with undo. The
 * actual occurrence generation/reminders happen elsewhere (the catch-up
 * scheduler, `src/lib/recurrence.ts`) — this screen only manages templates.
 */
export function RecurringPage() {
  const { repos } = useDatabase()
  const templates = useLiveQuery(() => repos.recurring.list(), [repos], EMPTY_ARRAY)
  const categories = useLiveQuery(() => repos.categories.list(), [repos], EMPTY_ARRAY)
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const sorted = useMemo(
    () => [...templates].sort((a, b) => (a.nextDueDate < b.nextDueDate ? -1 : 1)),
    [templates],
  )

  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringTransaction | undefined>(undefined)
  const { show } = useSnackbar()

  async function handleQuickDelete(template: RecurringTransaction) {
    await repos.recurring.remove(template.id)
    show({
      message: 'Recurring item deleted',
      action: { label: 'Undo', onClick: () => repos.recurring.restore(template.id) },
    })
  }

  return (
    <div className="relative flex flex-col pb-24">
      <PageHeaderBand>
        <h1 className="text-2xl font-bold">Recurring</h1>
        <MoneySubNav />
      </PageHeaderBand>

      <div className="px-4 pt-2">
        {sorted.length === 0 ? (
          <EmptyState
            icon="🔁"
            title="No recurring items yet"
            description="Tap + to set up rent, subscriptions, or anything else that repeats."
          />
        ) : (
          <Card className="mb-2">
            {sorted.map((template) => {
              const category = categoryById.get(template.categoryId)
              return (
                <SwipeableRow
                  key={template.id}
                  onSwipeLeft={() => void handleQuickDelete(template)}
                >
                  <ListItem
                    onClick={() => setEditing(template)}
                    leading={<CategoryIcon icon={category?.icon ?? '📦'} color={category?.color} />}
                    title={template.name}
                    subtitle={
                      <span className="flex items-center gap-1.5">
                        <span>
                          {formatIntervalLabel(template.interval)} · Next{' '}
                          {formatNextDue(template.nextDueDate)}
                        </span>
                        <Badge tone={template.autoRecord ? 'primary' : 'warning'}>
                          {template.autoRecord ? 'Auto' : 'Remind'}
                        </Badge>
                        {template.paused && <Badge tone="neutral">Paused</Badge>}
                      </span>
                    }
                    trailing={
                      <MoneyText
                        amountMinorUnits={template.amountMinorUnits}
                        currency={template.currency}
                        sign={template.type}
                        showSign
                      />
                    }
                  />
                </SwipeableRow>
              )
            })}
          </Card>
        )}
      </div>

      <button
        type="button"
        aria-label="Add recurring item"
        onClick={() => setAddOpen(true)}
        className="fixed bottom-24 right-5 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl text-white"
        style={{ background: 'var(--color-primary)', boxShadow: 'var(--shadow-floating)' }}
      >
        +
      </button>

      {addOpen && <RecurringSheet key="add" onClose={() => setAddOpen(false)} />}
      {editing && (
        <RecurringSheet key={editing.id} onClose={() => setEditing(undefined)} template={editing} />
      )}
    </div>
  )
}
