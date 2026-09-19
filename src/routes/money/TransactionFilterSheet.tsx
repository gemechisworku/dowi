import { useState } from 'react'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDatabase } from '@/app/db/useDatabase'
import type { TransactionType } from '@/db/types'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { DatePicker } from '@/components/ui/DatePicker'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

export interface FilterFormValue {
  type?: TransactionType
  categoryId?: string
  sourceId?: string
  accountId?: string
  currency?: string
  from?: string
  to?: string
  q?: string
}

export interface TransactionFilterSheetProps {
  onClose: () => void
  value: FilterFormValue
  onApply: (value: FilterFormValue) => void
}

/**
 * The caller mounts this only while it should be open (see MoneyPage) so
 * `draft`'s initializer always starts from the current `value` — no effect
 * needed to reset it each time the sheet reopens.
 */
export function TransactionFilterSheet({ onClose, value, onApply }: TransactionFilterSheetProps) {
  const { repos } = useDatabase()
  const categories = useLiveQuery(() => repos.categories.list(), [repos], EMPTY_ARRAY)
  const sources = useLiveQuery(() => repos.sources.list(), [repos], EMPTY_ARRAY)
  const accounts = useLiveQuery(() => repos.accounts.list(), [repos], EMPTY_ARRAY)

  const [draft, setDraft] = useState<FilterFormValue>(value)

  function patch(next: Partial<FilterFormValue>) {
    setDraft((prev) => ({ ...prev, ...next }))
  }

  return (
    <Sheet open onClose={onClose} title="Filter transactions">
      <div className="flex flex-col gap-4">
        <Field label="Type">
          {() => (
            <SegmentedControl
              label="Type"
              value={draft.type ?? 'all'}
              onChange={(v) => patch({ type: v === 'all' ? undefined : (v as TransactionType) })}
              options={[
                { value: 'all', label: 'All' },
                { value: 'income', label: 'Income' },
                { value: 'expense', label: 'Expense' },
              ]}
            />
          )}
        </Field>

        <Field label="Category">
          {({ inputId }) => (
            <Select
              id={inputId}
              placeholder="Any category"
              value={draft.categoryId ?? ''}
              onChange={(e) => patch({ categoryId: e.target.value || undefined })}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          )}
        </Field>

        <Field label="Source">
          {({ inputId }) => (
            <Select
              id={inputId}
              placeholder="Any source"
              value={draft.sourceId ?? ''}
              onChange={(e) => patch({ sourceId: e.target.value || undefined })}
              options={sources.map((s) => ({ value: s.id, label: s.name }))}
            />
          )}
        </Field>

        <Field label="Account">
          {({ inputId }) => (
            <Select
              id={inputId}
              placeholder="Any account"
              value={draft.accountId ?? ''}
              onChange={(e) => patch({ accountId: e.target.value || undefined })}
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />
          )}
        </Field>

        <Field label="Currency">
          {({ inputId }) => (
            <Input
              id={inputId}
              value={draft.currency ?? ''}
              onChange={(e) => patch({ currency: e.target.value.toUpperCase() || undefined })}
              placeholder="Any currency"
              maxLength={3}
            />
          )}
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            {({ inputId }) => (
              <DatePicker
                id={inputId}
                value={draft.from ?? ''}
                onChange={(e) => patch({ from: e.target.value || undefined })}
              />
            )}
          </Field>
          <Field label="To">
            {({ inputId }) => (
              <DatePicker
                id={inputId}
                value={draft.to ?? ''}
                onChange={(e) => patch({ to: e.target.value || undefined })}
              />
            )}
          </Field>
        </div>

        <Field label="Note contains">
          {({ inputId }) => (
            <Input
              id={inputId}
              value={draft.q ?? ''}
              onChange={(e) => patch({ q: e.target.value || undefined })}
            />
          )}
        </Field>

        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setDraft({})
              onApply({})
              onClose()
            }}
          >
            Clear all
          </Button>
          <Button
            onClick={() => {
              onApply(draft)
              onClose()
            }}
          >
            Apply
          </Button>
        </div>
      </div>
    </Sheet>
  )
}
