import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DonutChart } from '../DonutChart'

describe('DonutChart', () => {
  it('renders an accessible label and a data table matching the slices', () => {
    render(
      <DonutChart
        title="Expense by category"
        data={[
          { label: 'Food', value: 60, color: 'red' },
          { label: 'Transport', value: 40, color: 'blue' },
        ]}
      />,
    )
    expect(screen.getByRole('img', { name: 'Expense by category' })).toBeInTheDocument()
    // Each percentage appears twice: once in the visible legend, once in
    // the sr-only accessible table fallback.
    expect(screen.getAllByText('60%')).toHaveLength(2)
    expect(screen.getAllByText('40%')).toHaveLength(2)
  })

  it('renders a neutral empty ring instead of dividing by zero when total is 0', () => {
    render(
      <DonutChart title="Expense by category" data={[{ label: 'Food', value: 0, color: 'red' }]} />,
    )
    // Both the legend and the (hidden) data table render "0%" — no NaN/Infinity.
    expect(screen.getAllByText('0%').length).toBeGreaterThan(0)
    expect(screen.queryByText('NaN%')).not.toBeInTheDocument()
  })
})
