import { useState } from 'react'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import { useLiveQuery } from 'dexie-react-hooks'
import { useDatabase } from '@/app/db/useDatabase'
import type { ExchangeRate } from '@/db/types'
import { Card } from '@/components/ui/Card'
import { ListItem } from '@/components/ui/ListItem'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { DatePicker } from '@/components/ui/DatePicker'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { todayString } from '@/lib/period'

/** Exchange-rate table CRUD (PRD §5.3) — one row per (currency, effective date), most recent first. */
export function RatesPage() {
  const { repos, settingsRepo } = useDatabase()
  const settings = useLiveQuery(() => settingsRepo.get(), [settingsRepo])
  const rates = useLiveQuery(() => repos.rates.list(), [repos], EMPTY_ARRAY)
  const sorted = [...rates].sort((a, b) => (a.effectiveDate < b.effectiveDate ? 1 : -1))

  const [sheetOpen, setSheetOpen] = useState(false)
  const [currency, setCurrency] = useState('')
  const [rateToBase, setRateToBase] = useState('')
  const [effectiveDate, setEffectiveDate] = useState(todayString())
  const [pendingDelete, setPendingDelete] = useState<ExchangeRate | null>(null)

  function openCreate() {
    setCurrency('')
    setRateToBase('')
    setEffectiveDate(todayString())
    setSheetOpen(true)
  }

  async function handleSave() {
    const code = currency.trim().toUpperCase()
    const rate = Number.parseFloat(rateToBase)
    if (!code || code.length !== 3 || !Number.isFinite(rate) || rate <= 0) return
    await repos.rates.create({ currency: code, rateToBase: rate, effectiveDate })
    setSheetOpen(false)
  }

  async function handleDelete() {
    if (!pendingDelete) return
    await repos.rates.remove(pendingDelete.id)
    setPendingDelete(null)
  }

  const base = settings?.baseCurrency ?? 'ETB'
  const rateValue = Number.parseFloat(rateToBase)
  const isValid = currency.trim().length === 3 && Number.isFinite(rateValue) && rateValue > 0

  return (
    <div className="flex flex-col gap-4 px-4 pb-8 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">Exchange rates</h1>
        <Button size="sm" onClick={openCreate}>
          Add
        </Button>
      </div>
      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
        Base currency is <strong>{base}</strong>. Reports convert any other currency using the most
        recent rate set on or before the report's date.
      </p>

      <Card>
        {sorted.length === 0 ? (
          <EmptyState
            icon="💱"
            title="No exchange rates yet"
            description={`Add a rate for any currency other than ${base} to include it in reports.`}
          />
        ) : (
          sorted.map((rate) => (
            <ListItem
              key={rate.id}
              title={`1 ${rate.currency} = ${rate.rateToBase} ${base}`}
              subtitle={`Set ${rate.effectiveDate}`}
              trailing={
                <IconButton
                  aria-label={`Delete rate for ${rate.currency} set ${rate.effectiveDate}`}
                  icon="🗑️"
                  variant="ghost"
                  onClick={() => setPendingDelete(rate)}
                />
              }
            />
          ))
        )}
      </Card>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Add exchange rate">
        <div className="flex flex-col gap-4">
          <Field label="Currency code" hint="3-letter ISO code, e.g. USD">
            {({ inputId }) => (
              <Input
                id={inputId}
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={3}
                placeholder="USD"
                autoFocus
              />
            )}
          </Field>
          <Field label={`Rate to ${base}`} hint={`1 <currency> = ? ${base}`}>
            {({ inputId }) => (
              <Input
                id={inputId}
                inputMode="decimal"
                value={rateToBase}
                onChange={(e) => setRateToBase(e.target.value)}
                placeholder="140.00"
              />
            )}
          </Field>
          <Field label="Effective date">
            {({ inputId }) => (
              <DatePicker
                id={inputId}
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            )}
          </Field>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setSheetOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            Save
          </Button>
        </div>
      </Sheet>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this rate?"
        description="Reports for dates on or after it will fall back to an earlier rate, or exclude the currency if none exists."
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />
    </div>
  )
}
