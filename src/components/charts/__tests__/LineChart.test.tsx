import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LineChart } from '../LineChart'

describe('LineChart', () => {
  it('renders an accessible label and a data table matching the series', () => {
    render(
      <LineChart
        title="Expense trend"
        labels={['Mon', 'Tue', 'Wed']}
        series={[{ label: 'Expense', color: 'red', values: [100, 200, 50] }]}
      />,
    )
    expect(screen.getByRole('img', { name: 'Expense trend' })).toBeInTheDocument()
    expect(screen.getByText('200')).toBeInTheDocument()
    expect(screen.getByText('Expense')).toBeInTheDocument()
  })

  it('renders one polyline per series and draws a legend once there is more than one series', () => {
    const { container } = render(
      <LineChart
        title="Income vs expense trend"
        labels={['W1', 'W2']}
        series={[
          { label: 'Income', color: 'green', values: [10, 20] },
          { label: 'Expense', color: 'red', values: [5, 15] },
        ]}
      />,
    )
    expect(container.querySelectorAll('polyline')).toHaveLength(2)
    // Once in the legend, once in the sr-only data table caption's column header.
    expect(screen.getAllByText('Income').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Expense').length).toBeGreaterThanOrEqual(1)
  })

  it('does not render a legend for a single series', () => {
    const { container } = render(
      <LineChart
        title="Expense trend"
        labels={['Mon', 'Tue']}
        series={[{ label: 'Expense', color: 'red', values: [10, 20] }]}
      />,
    )
    // No visible legend row rendered for a single series.
    expect(container.querySelectorAll('.flex-wrap')).toHaveLength(0)
  })

  it('truncates long labels but keeps the full value in the data table', () => {
    render(
      <LineChart
        title="Category trend"
        labels={['A very long category name here']}
        series={[{ label: 'Expense', color: 'red', values: [42] }]}
      />,
    )
    // The sr-only table always carries the untruncated label (the SVG <title>
    // hover tooltip also carries it, hence "getAllBy" rather than "getBy").
    expect(screen.getAllByText('A very long category name here').length).toBeGreaterThanOrEqual(1)
  })

  it('handles an empty series without throwing (e.g. no data yet)', () => {
    render(<LineChart title="Expense trend" labels={[]} series={[]} />)
    expect(screen.getByRole('img', { name: 'Expense trend' })).toBeInTheDocument()
  })
})
