import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SegmentedControl } from '../SegmentedControl'

const OPTIONS = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
] as const

describe('SegmentedControl', () => {
  it('exposes radiogroup semantics with one checked option', () => {
    render(<SegmentedControl label="Period" options={OPTIONS} value="week" onChange={vi.fn()} />)
    expect(screen.getByRole('radiogroup', { name: 'Period' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Week' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Month' })).toHaveAttribute('aria-checked', 'false')
  })

  it('calls onChange with the clicked option value', async () => {
    const onChange = vi.fn()
    render(<SegmentedControl label="Period" options={OPTIONS} value="week" onChange={onChange} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Month' }))
    expect(onChange).toHaveBeenCalledWith('month')
  })
})
