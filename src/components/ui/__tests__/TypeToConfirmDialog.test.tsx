import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TypeToConfirmDialog } from '../TypeToConfirmDialog'
import { matchesConfirmPhrase } from '@/lib/confirmPhrase'

describe('matchesConfirmPhrase', () => {
  it('matches the exact phrase', () => {
    expect(matchesConfirmPhrase('ERASE', 'ERASE')).toBe(true)
  })

  it('tolerates surrounding whitespace', () => {
    expect(matchesConfirmPhrase('  ERASE  ', 'ERASE')).toBe(true)
  })

  it('is case-sensitive', () => {
    expect(matchesConfirmPhrase('erase', 'ERASE')).toBe(false)
  })

  it('rejects a partial or empty match', () => {
    expect(matchesConfirmPhrase('ERAS', 'ERASE')).toBe(false)
    expect(matchesConfirmPhrase('', 'ERASE')).toBe(false)
  })
})

describe('TypeToConfirmDialog', () => {
  it('keeps the confirm button disabled until the exact phrase is typed', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <TypeToConfirmDialog
        open
        title="Erase all data?"
        confirmPhrase="ERASE"
        confirmLabel="Erase everything"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    )

    const confirmButton = screen.getByRole('button', { name: 'Erase everything' })
    expect(confirmButton).toBeDisabled()

    const input = screen.getByLabelText('Type ERASE to confirm')
    await user.type(input, 'ERAS')
    expect(confirmButton).toBeDisabled()

    await user.type(input, 'E')
    expect(confirmButton).toBeEnabled()

    await user.click(confirmButton)
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('clears the typed text each time it reopens', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <TypeToConfirmDialog
        open
        title="Erase all data?"
        confirmPhrase="ERASE"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    await user.type(screen.getByLabelText('Type ERASE to confirm'), 'ERASE')
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled()

    rerender(
      <TypeToConfirmDialog
        open={false}
        title="Erase all data?"
        confirmPhrase="ERASE"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    rerender(
      <TypeToConfirmDialog
        open
        title="Erase all data?"
        confirmPhrase="ERASE"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled()
    expect(screen.getByLabelText('Type ERASE to confirm')).toHaveValue('')
  })
})
