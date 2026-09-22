import { useState } from 'react'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDatabase } from '@/app/db/useDatabase'
import type { Transaction, TransactionType } from '@/db/types'
import { parseAmountToMinorUnits, minorUnitExponent } from '@/lib/money'
import { todayString } from '@/lib/period'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { TextArea } from '@/components/ui/TextArea'
import { DatePicker } from '@/components/ui/DatePicker'
import { Select } from '@/components/ui/Select'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { ChipGroup } from '@/components/ui/ChipGroup'
import { Chip } from '@/components/ui/Chip'
import { AmountKeypad } from '@/components/domain/AmountKeypad'
import { MoneyText } from '@/components/domain/MoneyText'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useSnackbar } from '@/components/ui/useSnackbar'

export interface TransactionSheetProps {
  onClose: () => void
  /** Present for edit, absent for create. */
  transaction?: Transaction
  /** Pre-selects income/expense when creating (e.g. from a quick-action). */
  initialType?: TransactionType
}

/**
 * The add/edit form for a single transaction (PRD §5.2). Deleting from here
 * asks for confirmation and offers a 5s undo, same pattern as every other
 * destructive action in the app.
 *
 * The caller mounts this only while it should be open, keyed by "add" or by
 * the transaction's id (see MoneyPage) — that's what gives each open a
 * fresh initial state below, rather than an effect resetting fields every
 * time the same instance is reopened (the pattern React's own docs prefer:
 * "resetting state when a prop changes" via key/remount, not useEffect).
 */
export function TransactionSheet({ onClose, transaction, initialType }: TransactionSheetProps) {
  const { repos, settingsRepo } = useDatabase()
  const settings = useLiveQuery(() => settingsRepo.get(), [settingsRepo])
  const categories = useLiveQuery(() => repos.categories.list(), [repos], EMPTY_ARRAY)
  const sources = useLiveQuery(() => repos.sources.list(), [repos], EMPTY_ARRAY)
  const accounts = useLiveQuery(() => repos.accounts.list(), [repos], EMPTY_ARRAY)
  const { show } = useSnackbar()

  const isEdit = Boolean(transaction)
  const [type, setType] = useState<TransactionType>(transaction?.type ?? initialType ?? 'expense')
  const [amount, setAmount] = useState(() =>
    transaction
      ? (transaction.amountMinorUnits / 10 ** minorUnitExponent(transaction.currency)).toString()
      : '',
  )
  const [currency, setCurrency] = useState(transaction?.currency ?? 'ETB')
  const [categoryId, setCategoryId] = useState(transaction?.categoryId ?? '')
  const [date, setDate] = useState(transaction?.date ?? todayString())
  const [accountId, setAccountId] = useState(transaction?.accountId ?? '')
  const [sourceId, setSourceId] = useState(transaction?.sourceId ?? '')
  const [note, setNote] = useState(transaction?.note ?? '')
  const [tagsInput, setTagsInput] = useState(transaction?.tags.join(', ') ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // `settings` loads asynchronously (Dexie/IndexedDB) and is never available
  // yet on this component's very first render, so reading it in a
  // `useState` initializer above (as this used to for currency, and as a
  // first pass at defaultAccountId did too) silently never applies: the
  // initializer only runs once, and nothing re-syncs it once `settings`
  // actually arrives a tick later. Applying it once, right when it first
  // becomes available, is React's own "adjusting state during render"
  // pattern (react.dev/learn/you-might-not-need-an-effect) rather than an
  // effect — it re-runs synchronously before anything paints, so there's
  // no flash of the wrong default. Only for a brand-new transaction, and
  // only once, so it never overwrites an existing transaction's own stored
  // values or a user's in-progress edit.
  const [settingsApplied, setSettingsApplied] = useState(false)
  if (!isEdit && !settingsApplied && settings) {
    setSettingsApplied(true)
    setCurrency(settings.baseCurrency)
    if (settings.defaultAccountId) setAccountId(settings.defaultAccountId)
  }

  const categoriesForType = categories.filter((c) => c.type === type)

  async function handleSave() {
    const minorUnits = parseAmountToMinorUnits(amount, currency)
    if (minorUnits === null || minorUnits <= 0) {
      setError('Enter a valid amount greater than zero.')
      return
    }
    if (!categoryId) {
      setError('Choose a category.')
      return
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const payload = {
      type,
      amountMinorUnits: minorUnits,
      currency: currency.toUpperCase(),
      date,
      categoryId,
      accountId: accountId || undefined,
      sourceId: type === 'income' ? sourceId || undefined : undefined,
      note: note.trim() || undefined,
      tags,
    }

    if (transaction) {
      await repos.transactions.update(transaction.id, payload)
      show({ message: 'Transaction updated' })
    } else {
      await repos.transactions.create(payload)
      show({ message: type === 'income' ? 'Income added' : 'Expense added' })
    }
    onClose()
  }

  async function handleDelete() {
    if (!transaction) return
    await repos.transactions.remove(transaction.id)
    setConfirmDelete(false)
    onClose()
    show({
      message: 'Transaction deleted',
      action: { label: 'Undo', onClick: () => repos.transactions.restore(transaction.id) },
    })
  }

  const previewMinorUnits = parseAmountToMinorUnits(amount, currency) ?? 0

  return (
    <Sheet open onClose={onClose} title={isEdit ? 'Edit transaction' : 'Add transaction'}>
      <div className="flex flex-col gap-4">
        <SegmentedControl
          label="Type"
          value={type}
          onChange={(next) => {
            setType(next)
            setCategoryId('')
          }}
          options={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
          ]}
        />

        <div className="text-center">
          <MoneyText
            amountMinorUnits={previewMinorUnits}
            currency={currency}
            sign={type}
            className="text-3xl font-bold"
          />
        </div>
        <AmountKeypad value={amount} onChange={setAmount} decimals={minorUnitExponent(currency)} />

        <Field label="Currency">
          {({ inputId }) => (
            <Input
              id={inputId}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              maxLength={3}
            />
          )}
        </Field>

        <ChipGroup label="Category">
          {categoriesForType.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              No {type} categories yet — add one from Money → Categories.
            </p>
          ) : (
            categoriesForType.map((c) => (
              <Chip
                key={c.id}
                selected={categoryId === c.id}
                onClick={() => setCategoryId(c.id)}
                icon={c.icon}
              >
                {c.name}
              </Chip>
            ))
          )}
        </ChipGroup>

        <Field label="Date">
          {({ inputId }) => (
            <DatePicker id={inputId} value={date} onChange={(e) => setDate(e.target.value)} />
          )}
        </Field>

        <Field label="Account" hint="Optional">
          {({ inputId }) => (
            <Select
              id={inputId}
              placeholder="No account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />
          )}
        </Field>

        {type === 'income' && (
          <Field label="Source" hint="Optional">
            {({ inputId }) => (
              <Select
                id={inputId}
                placeholder="No source"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                options={sources.map((s) => ({ value: s.id, label: s.name }))}
              />
            )}
          </Field>
        )}

        <Field label="Note" hint="Optional, up to 500 characters">
          {({ inputId }) => (
            <TextArea
              id={inputId}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={2}
            />
          )}
        </Field>

        <Field label="Tags" hint="Optional, comma-separated">
          {({ inputId }) => (
            <Input
              id={inputId}
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="weekly, family"
            />
          )}
        </Field>

        {error && (
          <p role="alert" className="text-sm font-medium" style={{ color: 'var(--color-expense)' }}>
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          {isEdit && (
            <Button variant="danger" onClick={() => setConfirmDelete(true)} className="mr-auto">
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this transaction?"
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </Sheet>
  )
}
