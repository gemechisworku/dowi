import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox } from '../Checkbox'

describe('Checkbox', () => {
  it('toggles checked state and calls onChange', async () => {
    const onChange = vi.fn()
    render(<Checkbox name="agree" label="I agree" checked={false} onChange={onChange} />)
    const checkbox = screen.getByRole('checkbox', { name: 'I agree' })
    expect(checkbox).not.toBeChecked()
    await userEvent.click(checkbox)
    expect(onChange).toHaveBeenCalledOnce()
  })

  it('reflects a checked prop', () => {
    render(<Checkbox name="agree" label="I agree" checked readOnly />)
    expect(screen.getByRole('checkbox', { name: 'I agree' })).toBeChecked()
  })
})
