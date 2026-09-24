import { useState } from 'react'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDatabase } from '@/app/db/useDatabase'
import type {
  RecurrenceInterval,
  RecurrenceUnit,
  RecurringTransaction,
  TransactionType,
} from '@/db/types'
import { parseAmountToMinorUnits, minorUnitExponent } from '@/lib/money'
import { occurrenceAt } from '@/lib/recurrence'
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

export interface RecurringSheetProps {
  onClose: () => void
  /** Present for edit, absent for create. */
  template?: RecurringTransaction
}

type PresetKey = 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom'

const PRESETS: { key: PresetKey; label: string; interval: RecurrenceInterval }[] = [
  { key: 'weekly', label: 'Weekly', interval: { unit: 'week', every: 1 } },
  { key: 'biweekly', label: 'Bi-weekly', interval: { unit: 'week', every: 2 } },
  { key: 'monthly', label: 'Monthly', interval: { unit: 'month', every: 1 } },
  { key: 'yearly', label: 'Yearly', interval: { unit: 'year', every: 1 } },
]

function presetForInterval(interval: RecurrenceInterval): PresetKey {
  const match = PRESETS.find(
    (p) => p.interval.unit === interval.unit && p.interval.every === interval.every,
  )
  return match?.key ?? 'custom'
}

const UNIT_OPTIONS: { value: RecurrenceUnit; label: string }[] = [
  { value: 'week', label: 'Weeks' },
  { value: 'month', label: 'Months' },
  { value: 'year', label: 'Years' },
]

/**
 * The add/edit form for a recurring income/expense template (PRD §9).
 * Mirrors `TransactionSheet`'s structure/primitives closely, adding the
 * recurrence-specific fields: name, repeat interval (presets + custom),
 * start/end date, and the auto-record vs. remind-and-confirm choice.
 *
 * Editing only ever changes the template — it doesn't touch any
 * already-recorded Transaction, and future occurrences are always computed
 * fresh from startDate + interval + occurrenceIndex rather than stored
 * individually (see `src/lib/recurrence.ts`).
 */
export function RecurringSheet({ onClose, template }: RecurringSheetProps) {
  const { repos, settingsRepo } = useDatabase()
  const settings = useLiveQuery(() => settingsRepo.get(), [settingsRepo])
  const categories = useLiveQuery(() => repos.categories.list(), [repos], EMPTY_ARRAY)
  const sources = useLiveQuery(() => repos.sources.list(), [repos], EMPTY_ARRAY)
  const accounts = useLiveQuery(() => repos.accounts.list(), [repos], EMPTY_ARRAY)
  const { show } = useSnackbar()

  const isEdit = Boolean(template)
  const [name, setName] = useState(template?.name ?? '')
  const [type, setType] = useState<TransactionType>(template?.type ?? 'expense')
  const [amount, setAmount] = useState(() =>
    template
      ? (template.amountMinorUnits / 10 ** minorUnitExponent(template.currency)).toString()
      : '',
  )
  const [currency, setCurrency] = useState(template?.currency ?? 'ETB')
  const [categoryId, setCategoryId] = useState(template?.categoryId ?? '')
  const [accountId, setAccountId] = useState(template?.accountId ?? '')
  const [sourceId, setSourceId] = useState(template?.sourceId ?? '')
  const [note, setNote] = useState(template?.note ?? '')
  const [tagsInput, setTagsInput] = useState(template?.tags.join(', ') ?? '')

  const [intervalUnit, setIntervalUnit] = useState<RecurrenceUnit>(
    template?.interval.unit ?? 'month',
  )
  const [intervalEvery, setIntervalEvery] = useState(template?.interval.every ?? 1)
  const [preset, setPreset] = useState<PresetKey>(() =>
    presetForInterval(template?.interval ?? { unit: 'month', every: 1 }),
  )

  const [startDate, setStartDate] = useState(template?.startDate ?? todayString())
  const [hasEndDate, setHasEndDate] = useState(Boolean(template?.endDate))
  const [endDate, setEndDate] = useState(template?.endDate ?? '')
  const [autoRecord, setAutoRecord] = useState(template?.autoRecord ?? true)
  const [paused, setPaused] = useState(template?.paused ?? false)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Same "adjust state during render, once" pattern as TransactionSheet —
  // only for a brand-new template, and only once, so it never overwrites
  // an existing template's own stored values.
  const [settingsApplied, setSettingsApplied] = useState(false)
  if (!isEdit && !settingsApplied && settings) {
    setSettingsApplied(true)
    setCurrency(settings.baseCurrency)
    if (settings.defaultAccountId) setAccountId(settings.defaultAccountId)
  }

  const categoriesForType = categories.filter((c) => c.type === type)

  function selectPreset(key: PresetKey) {
    setPreset(key)
    const found = PRESETS.find((p) => p.key === key)
    if (found) {
      setIntervalUnit(found.interval.unit)
      setIntervalEvery(found.interval.every)
    }
  }

  function setCustomUnit(unit: RecurrenceUnit) {
    setIntervalUnit(unit)
    setPreset(presetForInterval({ unit, every: intervalEvery }))
  }

  function setCustomEvery(every: number) {
    setIntervalEvery(every)
    setPreset(presetForInterval({ unit: intervalUnit, every }))
  }

  async function handleSave() {
    const minorUnits = parseAmountToMinorUnits(amount, currency)
    if (minorUnits === null || minorUnits <= 0) {
      setError('Enter a valid amount greater than zero.')
      return
    }
    if (!name.trim()) {
      setError('Give this recurring item a name.')
      return
    }
    if (!categoryId) {
      setError('Choose a category.')
      return
    }
    if (!Number.isInteger(intervalEvery) || intervalEvery < 1) {
      setError('Enter how many weeks/months/years between occurrences (at least 1).')
      return
    }
    if (hasEndDate && endDate && endDate < startDate) {
      setError('End date must be on or after the start date.')
      return
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)

    const interval: RecurrenceInterval = { unit: intervalUnit, every: intervalEvery }

    const basePayload = {
      name: name.trim(),
      type,
      amountMinorUnits: minorUnits,
      currency: currency.toUpperCase(),
      categoryId,
      accountId: accountId || undefined,
      sourceId: type === 'income' ? sourceId || undefined : undefined,
      note: note.trim() || undefined,
      tags,
      interval,
      startDate,
      endDate: hasEndDate && endDate ? endDate : undefined,
      autoRecord,
      paused,
    }

    if (template) {
      // Interval/startDate may have changed — recompute the cached
      // nextDueDate from the template's existing occurrenceIndex so it
      // never goes stale (the catch-up scheduler recomputes occurrences
      // from scratch, but this cache is what the list screen displays).
      await repos.recurring.update(template.id, {
        ...basePayload,
        nextDueDate: occurrenceAt(startDate, interval, template.occurrenceIndex),
      })
      show({ message: 'Recurring item updated' })
    } else {
      await repos.recurring.create(basePayload)
      show({ message: 'Recurring item added' })
    }
    onClose()
  }

  async function handleDelete() {
    if (!template) return
    await repos.recurring.remove(template.id)
    setConfirmDelete(false)
    onClose()
    show({
      message: 'Recurring item deleted',
      action: { label: 'Undo', onClick: () => repos.recurring.restore(template.id) },
    })
  }

  const previewMinorUnits = parseAmountToMinorUnits(amount, currency) ?? 0

  return (
    <Sheet open onClose={onClose} title={isEdit ? 'Edit recurring item' : 'New recurring item'}>
      <div className="flex flex-col gap-4">
        <Field label="Name" required>
          {({ inputId }) => (
            <Input
              id={inputId}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Rent, Netflix, salary…"
              maxLength={100}
            />
          )}
        </Field>

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

        <ChipGroup label="Repeats">
          {PRESETS.map((p) => (
            <Chip key={p.key} selected={preset === p.key} onClick={() => selectPreset(p.key)}>
              {p.label}
            </Chip>
          ))}
          <Chip selected={preset === 'custom'} onClick={() => selectPreset('custom')}>
            Custom
          </Chip>
        </ChipGroup>

        {preset === 'custom' && (
          <div className="flex gap-3">
            <div className="w-24">
              <Field label="Every">
                {({ inputId }) => (
                  <Input
                    id={inputId}
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={intervalEvery}
                    onChange={(e) => setCustomEvery(Math.max(1, Number(e.target.value) || 1))}
                  />
                )}
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Unit">
                {({ inputId }) => (
                  <Select
                    id={inputId}
                    value={intervalUnit}
                    onChange={(e) => setCustomUnit(e.target.value as RecurrenceUnit)}
                    options={UNIT_OPTIONS}
                  />
                )}
              </Field>
            </div>
          </div>
        )}

        <Field label="Start date">
          {({ inputId }) => (
            <DatePicker
              id={inputId}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          )}
        </Field>

        <ChipGroup label="End date">
          <Chip selected={!hasEndDate} onClick={() => setHasEndDate(false)}>
            No end date
          </Chip>
          <Chip selected={hasEndDate} onClick={() => setHasEndDate(true)}>
            Ends on…
          </Chip>
        </ChipGroup>
        {hasEndDate && (
          <Field label="Ends on">
            {({ inputId }) => (
              <DatePicker
                id={inputId}
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            )}
          </Field>
        )}

        <SegmentedControl
          label="When due"
          value={autoRecord ? 'auto' : 'remind'}
          onChange={(next) => setAutoRecord(next === 'auto')}
          options={[
            { value: 'auto', label: 'Add automatically' },
            { value: 'remind', label: 'Remind me to confirm' },
          ]}
        />

        {isEdit && (
          <ChipGroup label="Status">
            <Chip selected={!paused} onClick={() => setPaused(false)}>
              Active
            </Chip>
            <Chip selected={paused} onClick={() => setPaused(true)}>
              Paused
            </Chip>
          </ChipGroup>
        )}

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
        title="Delete this recurring item?"
        description="Past transactions it already created stay untouched — only future occurrences stop."
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </Sheet>
  )
}
