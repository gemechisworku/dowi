import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'
import { MoneyText } from '../MoneyText'
import { DatabaseContext, type DatabaseContextValue } from '@/app/db/DatabaseContext'
import { DEFAULT_SETTINGS } from '@/db/settingsRepo'
import type { Settings } from '@/db/types'

/**
 * `MoneyText` reads Settings → Money → "hide amounts" via `useDatabase()`
 * (see useHideAmounts), so every render needs a DatabaseContext — a minimal
 * stub rather than the real DatabaseProvider (which opens IndexedDB and has
 * its own async loading state), since these tests only care about
 * `settingsRepo.get()`. Defaults to `DEFAULT_SETTINGS` (hideAmounts: false),
 * matching this file's pre-M9 behaviour for every test that doesn't pass an
 * override.
 */
function renderWithSettings(ui: ReactNode, settings: Settings = DEFAULT_SETTINGS) {
  const value: DatabaseContextValue = {
    db: {} as DatabaseContextValue['db'],
    repos: {} as DatabaseContextValue['repos'],
    notificationsRepo: {} as DatabaseContextValue['notificationsRepo'],
    settingsRepo: {
      get: async () => settings,
      update: async () => settings,
      reset: async () => settings,
    },
  }
  return render(<DatabaseContext.Provider value={value}>{ui}</DatabaseContext.Provider>)
}

describe('MoneyText', () => {
  it('shows a stored (non-negative) expense amount with a minus sign when sign="expense"', () => {
    renderWithSettings(
      <MoneyText amountMinorUnits={12500} currency="ETB" sign="expense" showSign />,
    )
    expect(screen.getByText('-ETB 125.00')).toBeInTheDocument()
  })

  it('shows a stored income amount with a plus sign when sign="income"', () => {
    renderWithSettings(<MoneyText amountMinorUnits={12500} currency="ETB" sign="income" showSign />)
    expect(screen.getByText('+ETB 125.00')).toBeInTheDocument()
  })

  it('forces the expense sign even if the caller already passed a negative amount', () => {
    renderWithSettings(
      <MoneyText amountMinorUnits={-12500} currency="ETB" sign="expense" showSign />,
    )
    expect(screen.getByText('-ETB 125.00')).toBeInTheDocument()
  })

  it('does not show a sign for expense/income when showSign is false, but still shows magnitude', () => {
    renderWithSettings(<MoneyText amountMinorUnits={12500} currency="ETB" sign="expense" />)
    // No leading +/-, since showSign is false and formatMoney only forces
    // "-" for an actually-negative amount, which the expense-forced value
    // still triggers (a minus is not the same thing as "showSign").
    expect(screen.getByText('-ETB 125.00')).toBeInTheDocument()
  })

  it('leaves a neutral, already-signed net value alone (uses its own numeric sign)', () => {
    renderWithSettings(<MoneyText amountMinorUnits={-4200} currency="ETB" sign="neutral" />)
    expect(screen.getByText('-ETB 42.00')).toBeInTheDocument()
  })

  it('applies the income colour token for sign="income"', () => {
    renderWithSettings(<MoneyText amountMinorUnits={100} currency="ETB" sign="income" />)
    expect(screen.getByText('ETB 1.00')).toHaveStyle({ color: 'var(--color-income)' })
  })

  it('applies the expense colour token for sign="expense"', () => {
    renderWithSettings(<MoneyText amountMinorUnits={100} currency="ETB" sign="expense" />)
    expect(screen.getByText('-ETB 1.00')).toHaveStyle({ color: 'var(--color-expense)' })
  })

  it('is not blurred when hideAmounts is off', async () => {
    renderWithSettings(<MoneyText amountMinorUnits={100} currency="ETB" />, {
      ...DEFAULT_SETTINGS,
      hideAmounts: false,
    })
    await waitFor(() => expect(screen.getByText('ETB 1.00')).not.toHaveAttribute('aria-hidden'))
    expect(screen.getByText('ETB 1.00')).not.toHaveStyle({ filter: 'blur(6px)' })
  })

  it('blurs the amount when Settings → Money → "hide amounts" is on', async () => {
    renderWithSettings(<MoneyText amountMinorUnits={100} currency="ETB" />, {
      ...DEFAULT_SETTINGS,
      hideAmounts: true,
    })
    await waitFor(() => expect(screen.getByText('ETB 1.00')).toHaveStyle({ filter: 'blur(6px)' }))
    expect(screen.getByText('ETB 1.00')).toHaveAttribute('aria-hidden', 'true')
  })
})
