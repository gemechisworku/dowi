import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Sheet } from '../Sheet'

function ControlledSheet() {
  const [open, setOpen] = useState(true)
  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="Add expense">
      <button type="button">Amount field</button>
    </Sheet>
  )
}

describe('Sheet', () => {
  afterEach(() => {
    // Each test may leave a pushed history entry if it doesn't fully close.
    window.history.replaceState({}, '')
  })

  it('renders as a labelled dialog when open, and not at all when closed', () => {
    const { rerender } = render(<Sheet open={false} onClose={vi.fn()} title="Add expense" />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    rerender(<Sheet open onClose={vi.fn()} title="Add expense" />)
    expect(screen.getByRole('dialog', { name: 'Add expense' })).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    render(<Sheet open onClose={onClose} title="Add expense" />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on scrim click', async () => {
    const onClose = vi.fn()
    render(<Sheet open onClose={onClose} title="Add expense" />)
    // The scrim is the first aria-hidden absolutely-positioned div.
    const scrim = document.querySelector('[aria-hidden="true"].absolute.inset-0') as HTMLElement
    await userEvent.click(scrim)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not leave a stale history entry after closing via Escape', async () => {
    const before = window.history.length
    render(<ControlledSheet />)
    await userEvent.keyboard('{Escape}')
    // pushState on open + back() consuming it on close nets to no change.
    expect(window.history.length).toBe(before)
  })

  it('does not revert a URL change the sheet content itself made while open', async () => {
    // Regression test: a sheet whose content calls history.replaceState
    // (e.g. a filter panel updating ?type=income via useSearchParams) used
    // to have that change silently undone, because the sheet's own
    // "consume my pushed entry" cleanup called history.back() unconditionally
    // — and since replaceState modifies whatever entry is *current* (the
    // sheet's own pushed one), back() landed right before it, wiping the
    // change out along with the dummy entry.
    function FilterLikeSheet({ onClose }: { onClose: () => void }) {
      return (
        <Sheet open onClose={onClose} title="Filter">
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams(window.location.search)
              params.set('type', 'income')
              window.history.replaceState({}, '', `?${params}`)
              onClose()
            }}
          >
            Apply
          </button>
        </Sheet>
      )
    }

    function Harness() {
      const [open, setOpen] = useState(true)
      return open ? <FilterLikeSheet onClose={() => setOpen(false)} /> : null
    }

    render(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(window.location.search).toBe('?type=income')

    // Clean up the URL change this test made.
    window.history.replaceState({}, '', window.location.pathname)
  })
})
