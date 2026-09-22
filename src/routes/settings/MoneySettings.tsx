import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router'
import { useDatabase } from '@/app/db/useDatabase'
import { EMPTY_ARRAY } from '@/lib/emptyArray'
import type { Settings } from '@/db/types'
import { Card } from '@/components/ui/Card'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Switch } from '@/components/ui/Switch'

const WEEK_START_OPTIONS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

const MONTH_OPTIONS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
].map((label, i) => ({ value: String(i + 1), label }))

export interface MoneySettingsProps {
  settings: Settings
  onPatch: (patch: Partial<Settings>) => Promise<void>
}

/**
 * Settings → Money (PRD §5.8). Rates CRUD already has its own full screen
 * (`/money/rates`, linked below) — this only exposes the account-wide
 * knobs: base currency, FY start month, week start day, default account,
 * and the hide-amounts privacy blur (wired up in MoneyText/useHideAmounts).
 */
export function MoneySettings({ settings, onPatch }: MoneySettingsProps) {
  const { repos } = useDatabase()
  const accounts = useLiveQuery(() => repos.accounts.list(), [repos], EMPTY_ARRAY)
  const [currencyInput, setCurrencyInput] = useState(settings.baseCurrency)

  // `settings` starts out as `DEFAULT_SETTINGS` (SettingsPage's useLiveQuery
  // default) and is replaced by the real persisted row a tick later —
  // MoneySettings itself doesn't remount when that happens (only its
  // `settings` prop changes), so a plain `useState` initializer above would
  // freeze on that first, possibly-wrong default forever. Resyncing
  // whenever the prop actually changes — React's "adjusting state during
  // render" pattern (react.dev/learn/you-might-not-need-an-effect) — fixes
  // that without clobbering an in-progress edit (which only ever changes
  // `currencyInput`, never `settings.baseCurrency`, until this field is
  // blurred).
  const [syncedBaseCurrency, setSyncedBaseCurrency] = useState(settings.baseCurrency)
  if (settings.baseCurrency !== syncedBaseCurrency) {
    setSyncedBaseCurrency(settings.baseCurrency)
    setCurrencyInput(settings.baseCurrency)
  }

  async function commitCurrency() {
    const code = currencyInput.trim().toUpperCase()
    if (code.length !== 3) {
      setCurrencyInput(settings.baseCurrency)
      return
    }
    setCurrencyInput(code)
    if (code !== settings.baseCurrency) await onPatch({ baseCurrency: code })
  }

  return (
    <section>
      <SectionHeader title="Money" />
      <Card className="flex flex-col gap-5">
        <Field label="Base currency" hint="3-letter code, e.g. ETB, USD">
          {({ inputId }) => (
            <Input
              id={inputId}
              value={currencyInput}
              onChange={(e) => setCurrencyInput(e.target.value.toUpperCase())}
              onBlur={commitCurrency}
              maxLength={3}
              className="w-24 uppercase"
            />
          )}
        </Field>

        <Field label="Financial-year start month">
          {({ inputId }) => (
            <Select
              id={inputId}
              options={MONTH_OPTIONS}
              value={String(settings.fyStartMonth)}
              onChange={(e) => onPatch({ fyStartMonth: Number(e.target.value) })}
            />
          )}
        </Field>

        <Field label="Week starts on">
          {({ inputId }) => (
            <Select
              id={inputId}
              options={WEEK_START_OPTIONS}
              value={String(settings.weekStartsOn)}
              onChange={(e) => onPatch({ weekStartsOn: Number(e.target.value) })}
            />
          )}
        </Field>

        <Field label="Default account" hint="Pre-fills new transactions">
          {({ inputId }) => (
            <Select
              id={inputId}
              placeholder="No default"
              value={settings.defaultAccountId ?? ''}
              onChange={(e) => onPatch({ defaultAccountId: e.target.value || undefined })}
              options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            />
          )}
        </Field>

        <Switch
          label="Hide amounts"
          checked={settings.hideAmounts}
          onChange={(e) => onPatch({ hideAmounts: e.target.checked })}
        />
        <p className="-mt-3 pl-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Blurs every amount in the app — Home, reports, transaction lists — until you turn it back
          off.
        </p>

        {/* A styled Link rather than <Button><Link>…</Link></Button> — Button renders a
            <button>, and nesting an <a> inside one is both invalid HTML and a
            nested-interactive-element accessibility violation. */}
        <Link
          to="/money/rates"
          className="inline-flex h-11 w-fit items-center justify-center rounded-[var(--radius-pill)] px-4 text-[15px] font-semibold"
          style={{
            background: 'var(--color-surface-2)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
          }}
        >
          Manage exchange rates
        </Link>
      </Card>
    </section>
  )
}
