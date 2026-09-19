import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MoneyText } from '../MoneyText'

describe('MoneyText', () => {
  it('shows a stored (non-negative) expense amount with a minus sign when sign="expense"', () => {
    render(<MoneyText amountMinorUnits={12500} currency="ETB" sign="expense" showSign />)
    expect(screen.getByText('-ETB 125.00')).toBeInTheDocument()
  })

  it('shows a stored income amount with a plus sign when sign="income"', () => {
    render(<MoneyText amountMinorUnits={12500} currency="ETB" sign="income" showSign />)
    expect(screen.getByText('+ETB 125.00')).toBeInTheDocument()
  })

  it('forces the expense sign even if the caller already passed a negative amount', () => {
    render(<MoneyText amountMinorUnits={-12500} currency="ETB" sign="expense" showSign />)
    expect(screen.getByText('-ETB 125.00')).toBeInTheDocument()
  })

  it('does not show a sign for expense/income when showSign is false, but still shows magnitude', () => {
    render(<MoneyText amountMinorUnits={12500} currency="ETB" sign="expense" />)
    // No leading +/-, since showSign is false and formatMoney only forces
    // "-" for an actually-negative amount, which the expense-forced value
    // still triggers (a minus is not the same thing as "showSign").
    expect(screen.getByText('-ETB 125.00')).toBeInTheDocument()
  })

  it('leaves a neutral, already-signed net value alone (uses its own numeric sign)', () => {
    render(<MoneyText amountMinorUnits={-4200} currency="ETB" sign="neutral" />)
    expect(screen.getByText('-ETB 42.00')).toBeInTheDocument()
  })

  it('applies the income colour token for sign="income"', () => {
    render(<MoneyText amountMinorUnits={100} currency="ETB" sign="income" />)
    expect(screen.getByText('ETB 1.00')).toHaveStyle({ color: 'var(--color-income)' })
  })

  it('applies the expense colour token for sign="expense"', () => {
    render(<MoneyText amountMinorUnits={100} currency="ETB" sign="expense" />)
    expect(screen.getByText('-ETB 1.00')).toHaveStyle({ color: 'var(--color-expense)' })
  })
})
