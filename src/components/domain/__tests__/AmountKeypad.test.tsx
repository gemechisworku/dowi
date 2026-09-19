import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { AmountKeypad } from '../AmountKeypad'

function Controlled({ decimals }: { decimals?: number }) {
  const [value, setValue] = useState('')
  return (
    <>
      <output data-testid="value">{value}</output>
      <AmountKeypad value={value} onChange={setValue} decimals={decimals} />
    </>
  )
}

describe('AmountKeypad', () => {
  it('builds up a value digit by digit', async () => {
    render(<Controlled />)
    await userEvent.click(screen.getByRole('button', { name: '1' }))
    await userEvent.click(screen.getByRole('button', { name: '2' }))
    expect(screen.getByTestId('value')).toHaveTextContent('12')
  })

  it('only allows one decimal point', async () => {
    render(<Controlled />)
    await userEvent.click(screen.getByRole('button', { name: '1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Decimal point' }))
    await userEvent.click(screen.getByRole('button', { name: 'Decimal point' }))
    await userEvent.click(screen.getByRole('button', { name: '5' }))
    expect(screen.getByTestId('value')).toHaveTextContent('1.5')
  })

  it('rejects more fraction digits than allowed', async () => {
    render(<Controlled decimals={2} />)
    for (const key of ['1', 'Decimal point', '2', '3', '4']) {
      await userEvent.click(screen.getByRole('button', { name: key }))
    }
    expect(screen.getByTestId('value')).toHaveTextContent('1.23')
  })

  it('rejects any decimal point for a 0-decimal currency', async () => {
    render(<Controlled decimals={0} />)
    await userEvent.click(screen.getByRole('button', { name: '1' }))
    await userEvent.click(screen.getByRole('button', { name: 'Decimal point' }))
    expect(screen.getByTestId('value')).toHaveTextContent('1')
  })

  it('backspaces one character at a time', async () => {
    render(<Controlled />)
    await userEvent.click(screen.getByRole('button', { name: '1' }))
    await userEvent.click(screen.getByRole('button', { name: '2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Backspace' }))
    expect(screen.getByTestId('value')).toHaveTextContent('1')
  })
})
