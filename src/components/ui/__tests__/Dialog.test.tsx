import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Dialog } from '../Dialog'

function Trigger({ onOpen }: { onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen}>
      Open
    </button>
  )
}

describe('Dialog', () => {
  it('renders as an alertdialog labelled by its title when open', () => {
    render(<Dialog open onClose={vi.fn()} title="About Dowi" />)
    expect(screen.getByRole('alertdialog', { name: 'About Dowi' })).toBeInTheDocument()
  })

  it('is absent from the DOM when closed', () => {
    render(<Dialog open={false} onClose={vi.fn()} title="About Dowi" />)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    render(<Dialog open onClose={onClose} title="About Dowi" />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('moves focus into the dialog on open and restores it to the trigger on close', async () => {
    const user = userEvent.setup()

    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <Trigger onOpen={() => setOpen(true)} />
          <Dialog
            open={open}
            onClose={() => setOpen(false)}
            title="Delete this category?"
            actions={
              <button type="button" onClick={() => setOpen(false)}>
                Confirm
              </button>
            }
          />
        </>
      )
    }

    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    trigger.focus()
    await user.click(trigger)

    const confirmButton = await screen.findByRole('button', { name: 'Confirm' })
    expect(confirmButton).toHaveFocus()

    await user.click(confirmButton)
    expect(trigger).toHaveFocus()
  })
})
